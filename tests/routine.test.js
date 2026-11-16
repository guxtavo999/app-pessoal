import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TASKS } from '../js/routine.js';
import { loadRoutineDay, saveRoutineDay } from '../js/storage.js';

const fake = () => {
  const m = new Map();
  return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)) };
};
const throwing = {
  getItem() { throw new Error('blocked'); },
  setItem() { throw new Error('blocked'); },
};

test('TASKS tem as 5 tarefas na ordem pedida', () => {
  assert.deepEqual(TASKS.map(t => t.label), [
    'Skin care matinal',
    'Remédios matinais',
    '11:00 Topiramato',
    '18:00 Topiramato',
    'Skin care noturna',
  ]);
});

test('TASKS: ids únicos e horários só nos Topiramatos', () => {
  assert.equal(new Set(TASKS.map(t => t.id)).size, TASKS.length);
  assert.deepEqual(TASKS.filter(t => t.time).map(t => [t.id, t.time]), [
    ['topiramato-11', '11:00'],
    ['topiramato-18', '18:00'],
  ]);
});

test('loadRoutineDay sem dado = {}', () => assert.deepEqual(loadRoutineDay('2026-11-16', fake()), {}));

test('saveRoutineDay/loadRoutineDay ida e volta, guardando por id na chave rotina:', () => {
  const s = fake();
  assert.equal(saveRoutineDay('2026-11-16', { 'skincare-morning': true, 'topiramato-11': true }, s), true);
  assert.deepEqual(loadRoutineDay('2026-11-16', s), { 'skincare-morning': true, 'topiramato-11': true });
  assert.deepEqual(JSON.parse(s.getItem('app-pessoal:rotina:2026-11-16')), { 'skincare-morning': true, 'topiramato-11': true });
});

test('loadRoutineDay ignora ids desconhecidos e valores que não são true', () => {
  const s = fake();
  s.setItem('app-pessoal:rotina:2026-11-16', JSON.stringify({ 'skincare-morning': true, 'id-que-nao-existe': true, 'topiramato-11': false, 'topiramato-18': 'true', 'remedios-morning': 1 }));
  assert.deepEqual(loadRoutineDay('2026-11-16', s), { 'skincare-morning': true });
});

test('loadRoutineDay com JSON inválido ou formato errado = {}', () => {
  for (const raw of ['{{', '[true]', '"x"', 'null', '5']) {
    const s = fake();
    s.setItem('app-pessoal:rotina:2026-11-16', raw);
    assert.deepEqual(loadRoutineDay('2026-11-16', s), {}, raw);
  }
});

test('loadRoutineDay de outro dia começa zerado e não altera o anterior', () => {
  const s = fake();
  saveRoutineDay('2026-11-16', { 'skincare-night': true }, s);
  assert.deepEqual(loadRoutineDay('2026-11-17', s), {});
  assert.deepEqual(loadRoutineDay('2026-11-16', s), { 'skincare-night': true });
});

test('storage bloqueado: load = {} e save = false, sem lançar', () => {
  assert.deepEqual(loadRoutineDay('2026-11-16', throwing), {});
  assert.equal(saveRoutineDay('2026-11-16', { 'skincare-morning': true }, throwing), false);
});

test('marcação por id: incluir tarefa nova não desloca marcações antigas', () => {
  const s = fake();
  saveRoutineDay('2026-11-16', { 'topiramato-18': true }, s);
  const marks = loadRoutineDay('2026-11-16', s);
  assert.equal(marks['topiramato-18'], true);
  assert.equal(marks['topiramato-11'], undefined);
});
