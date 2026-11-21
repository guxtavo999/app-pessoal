import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_CUPS, GOAL_ML, totalMl, fillRatio, formatLiters, formatProgress, cupLabel, isValidCup, validateCups, newCupId } from '../js/water.js';
import { loadDay, saveDay, loadCups, saveCups } from '../js/storage.js';
import agua from '../js/tabs/agua.js';

const fake = () => {
  const m = new Map();
  return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)) };
};
const throwing = {
  getItem() { throw new Error('blocked'); },
  setItem() { throw new Error('blocked'); },
};
const all = cups => Object.fromEntries(cups.map(c => [c.id, true]));

test('DEFAULT_CUPS tem 3×910 e 3×1000 com ids c1..c6', () => {
  assert.deepEqual(DEFAULT_CUPS.map(c => c.ml), [910, 910, 910, 1000, 1000, 1000]);
  assert.deepEqual(DEFAULT_CUPS.map(c => c.id), ['c1', 'c2', 'c3', 'c4', 'c5', 'c6']);
  assert.deepEqual(DEFAULT_CUPS.map(c => cupLabel(c.ml)), ['910 ml', '910 ml', '910 ml', '1 L', '1 L', '1 L']);
  assert.equal(GOAL_ML, 4000);
});
test('totalMl soma só os marcados (por id)', () =>
  assert.equal(totalMl(DEFAULT_CUPS, { c1: true, c2: true, c6: true, c3: false }), 2820));
test('todos marcados = 5730', () => assert.equal(totalMl(DEFAULT_CUPS, all(DEFAULT_CUPS)), 5730));
test('totalMl ignora marcação de copo que não existe', () => assert.equal(totalMl([{ id: 'a', ml: 500 }], { a: true, sumiu: true }), 500));
test('fillRatio 0, parcial, teto em 1', () => {
  assert.equal(fillRatio(0), 0);
  assert.equal(fillRatio(2000), 0.5);
  assert.equal(fillRatio(5730), 1);
});
test('formatLiters', () => {
  assert.equal(formatLiters(0), '0');
  assert.equal(formatLiters(910), '0,91');
  assert.equal(formatLiters(1000), '1');
  assert.equal(formatLiters(1910), '1,91');
  assert.equal(formatLiters(4000), '4');
});
test('formatProgress acima da meta continua contando', () => {
  assert.equal(formatProgress(2820), '2,82 / 4 L');
  assert.equal(formatProgress(5730), '5,73 / 4 L');
});
test('cupLabel: ml abaixo de 1 L, litros a partir de 1 L', () => {
  assert.equal(cupLabel(250), '250 ml');
  assert.equal(cupLabel(999), '999 ml');
  assert.equal(cupLabel(1000), '1 L');
  assert.equal(cupLabel(1500), '1,5 L');
});

// ---------- validação ----------
test('validateCups: aceita valores inteiros de 1 a 5000', () => {
  assert.equal(validateCups([{ ml: '500' }, { ml: ' 1000 ' }]), null);
});
test('validateCups: recusa lista vazia, vazio, zero, decimal, acima do máximo e mais de 20', () => {
  assert.equal(validateCups([]), 'Deixe pelo menos um copo.');
  for (const ml of ['', '0', '-5', '2.5', 'abc', '5001']) assert.match(validateCups([{ ml }]), /entre 1 e 5000/, ml);
  assert.match(validateCups(Array.from({ length: 21 }, () => ({ ml: '100' }))), /No máximo 20/);
});
test('isValidCup', () => {
  assert.equal(isValidCup({ id: 'a', ml: 300 }), true);
  for (const x of [null, [], { id: '', ml: 300 }, { id: 'a', ml: 0 }, { id: 'a', ml: 1.5 }, { id: 'a', ml: '300' }]) assert.equal(isValidCup(x), false);
});
test('newCupId: único', () => assert.equal(new Set(Array.from({ length: 200 }, newCupId)).size, 200));

// ---------- copos salvos ----------
test('loadCups sem nada salvo = padrão (cópia editável)', () => {
  const cups = loadCups(fake());
  assert.deepEqual(cups, DEFAULT_CUPS.map(c => ({ ...c })));
  cups[0].ml = 1;
  assert.equal(DEFAULT_CUPS[0].ml, 910);
});
test('saveCups/loadCups ida e volta na chave agua:copos', () => {
  const s = fake();
  const cups = [{ id: 'a', ml: 500 }, { id: 'b', ml: 750 }];
  assert.equal(saveCups(cups, s), true);
  assert.deepEqual(loadCups(s), cups);
  assert.deepEqual(JSON.parse(s.getItem('app-pessoal:agua:copos')), cups);
});
test('loadCups descarta copos inválidos; sem nenhum válido volta ao padrão', () => {
  const s = fake();
  s.setItem('app-pessoal:agua:copos', JSON.stringify([{ id: 'a', ml: 500, x: 1 }, { id: 'b', ml: -1 }, null]));
  assert.deepEqual(loadCups(s), [{ id: 'a', ml: 500 }]);
  for (const raw of ['{{', '[]', '{}', 'null']) {
    s.setItem('app-pessoal:agua:copos', raw);
    assert.equal(loadCups(s).length, 6, raw);
  }
});
test('storage bloqueado: copos = padrão, save = false', () => {
  assert.equal(loadCups(throwing).length, 6);
  assert.equal(saveCups([{ id: 'a', ml: 1 }], throwing), false);
});

// ---------- marcações do dia ----------
test('saveDay/loadDay ida e volta por id', () => {
  const s = fake();
  assert.equal(saveDay('2026-11-21', { c1: true, x9: true }, s), true);
  assert.deepEqual(loadDay('2026-11-21', s), { c1: true, x9: true });
});
test('loadDay converte o formato antigo (lista de 6) para c1..c6', () => {
  const s = fake();
  s.setItem('app-pessoal:agua:2026-11-21', JSON.stringify([true, false, false, false, false, true]));
  assert.deepEqual(loadDay('2026-11-21', s), { c1: true, c6: true });
});
test('loadDay: sem dado, corrompido ou valores não-true = {}', () => {
  assert.deepEqual(loadDay('2026-11-21', fake()), {});
  for (const raw of ['{{', '[true]', '"x"', 'null', '{"c1":1,"c2":"true"}']) {
    const s = fake();
    s.setItem('app-pessoal:agua:2026-11-21', raw);
    assert.deepEqual(loadDay('2026-11-21', s), {}, raw);
  }
});
test('storage bloqueado: loadDay = {} e saveDay = false', () => {
  assert.deepEqual(loadDay('2026-11-21', throwing), {});
  assert.equal(saveDay('2026-11-21', { c1: true }, throwing), false);
});

// ---------- aba ----------
test('cleanup da Água remove os ouvintes que ela pôs no #view', () => {
  const noop = () => {};
  const node = () => ({ textContent: '', querySelector: node, classList: { toggle() {} }, setAttribute() {} });
  globalThis.document = { visibilityState: 'visible', addEventListener: noop, removeEventListener: noop };
  globalThis.window = { addEventListener: noop, removeEventListener: noop };
  try {
    const listeners = [];
    const view = {
      addEventListener: (type, fn) => listeners.push([type, fn]),
      removeEventListener: (type, fn) => {
        const i = listeners.findIndex(([t, f]) => t === type && f === fn);
        if (i >= 0) listeners.splice(i, 1);
      },
      set innerHTML(_) {},
      querySelector: node,
    };
    const cleanup = agua.mount(view);
    assert.ok(listeners.length > 0);
    cleanup();
    assert.equal(listeners.length, 0);
  } finally {
    delete globalThis.document;
    delete globalThis.window;
  }
});
