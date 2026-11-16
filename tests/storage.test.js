import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadDay, saveDay, getLastTab, setLastTab } from '../js/storage.js';

const fake = () => {
  const m = new Map();
  return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)) };
};
const throwing = {
  getItem() { throw new Error('blocked'); },
  setItem() { throw new Error('blocked'); },
};
const empty = Array(6).fill(false);

test('loadDay sem dado = 6 false', () => assert.deepEqual(loadDay('2026-11-15', fake()), empty));
test('saveDay/loadDay ida e volta', () => {
  const s = fake();
  saveDay('2026-11-15', [true, false, false, false, false, true], s);
  assert.deepEqual(loadDay('2026-11-15', s), [true, false, false, false, false, true]);
});
test('loadDay de outro dia começa zerado e não altera o anterior', () => {
  const s = fake();
  saveDay('2026-11-15', Array(6).fill(true), s);
  assert.deepEqual(loadDay('2026-11-16', s), empty);
  assert.deepEqual(loadDay('2026-11-15', s), Array(6).fill(true));
});
test('JSON inválido ou tamanho errado = 6 false', () => {
  for (const raw of ['{{', '[true]', '"x"', 'null']) {
    const s = fake();
    s.setItem('app-pessoal:agua:2026-11-15', raw);
    assert.deepEqual(loadDay('2026-11-15', s), empty);
  }
});
test('store que lança: nada quebra', () => {
  assert.deepEqual(loadDay('2026-11-15', throwing), empty);
  assert.doesNotThrow(() => saveDay('2026-11-15', empty, throwing));
  assert.doesNotThrow(() => setLastTab('agua', throwing));
  assert.equal(getLastTab(throwing), null);
});
test('sem localStorage global: nada quebra', () => {
  assert.deepEqual(loadDay('2026-11-15'), empty);
  assert.equal(getLastTab(), null);
});
test('lastTab ida e volta', () => {
  const s = fake();
  setLastTab('agua', s);
  assert.equal(getLastTab(s), 'agua');
});

test('saveDay informa se salvou', () => {
  assert.equal(saveDay('2026-11-15', empty, fake()), true);
  assert.equal(saveDay('2026-11-15', empty, throwing), false);
});
test('chaves com prefixo do app (origem github.io é compartilhada)', () => {
  const s = fake();
  saveDay('2026-11-15', empty, s);
  setLastTab('agua', s);
  assert.notEqual(s.getItem('app-pessoal:agua:2026-11-15'), null);
  assert.equal(s.getItem('app-pessoal:ultimaAba'), 'agua');
});
