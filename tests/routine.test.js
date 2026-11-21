import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_TASKS, isOverdue, msUntilNextEvent, validateTask, isValidTask, move, newTaskId } from '../js/routine.js';
import { loadRoutineDay, saveRoutineDay, loadRoutineTasks, saveRoutineTasks } from '../js/storage.js';
import rotina from '../js/tabs/rotina.js';

const fake = () => {
  const m = new Map();
  return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)) };
};
const throwing = {
  getItem() { throw new Error('blocked'); },
  setItem() { throw new Error('blocked'); },
};

// ---------- lista padrão ----------
test('DEFAULT_TASKS mantém a rotina de antes, com os ids antigos', () => {
  assert.deepEqual(DEFAULT_TASKS.map(t => [t.id, t.time, t.text]), [
    ['skincare-morning', '', 'Skin care matinal'],
    ['remedios-morning', '', 'Remédios matinais'],
    ['topiramato-11', '11:00', 'Topiramato'],
    ['topiramato-18', '18:00', 'Topiramato'],
    ['skincare-night', '', 'Skin care noturna'],
  ]);
  assert.ok(DEFAULT_TASKS.every(isValidTask));
});

// ---------- lista salva ----------
test('loadRoutineTasks sem nada salvo = lista padrão (cópia editável)', () => {
  const tasks = loadRoutineTasks(fake());
  assert.deepEqual(tasks, DEFAULT_TASKS.map(t => ({ ...t })));
  tasks[0].text = 'mudou';
  assert.equal(DEFAULT_TASKS[0].text, 'Skin care matinal');
});

test('saveRoutineTasks/loadRoutineTasks ida e volta na chave rotina:tarefas', () => {
  const s = fake();
  const tasks = [{ id: 'a', time: '07:30', text: 'Academia' }, { id: 'b', time: '', text: 'Ler' }];
  assert.equal(saveRoutineTasks(tasks, s), true);
  assert.deepEqual(loadRoutineTasks(s), tasks);
  assert.deepEqual(JSON.parse(s.getItem('app-pessoal:rotina:tarefas')), tasks);
});

test('lista vazia salva continua vazia (não volta ao padrão)', () => {
  const s = fake();
  saveRoutineTasks([], s);
  assert.deepEqual(loadRoutineTasks(s), []);
});

test('loadRoutineTasks descarta tarefas inválidas uma a uma e campos extras', () => {
  const s = fake();
  s.setItem('app-pessoal:rotina:tarefas', JSON.stringify([
    { id: 'ok', time: '', text: 'Boa', extra: 1 },
    { id: '', time: '', text: 'sem id' },
    { id: 'x', time: '25:00', text: 'hora ruim' },
    { id: 'y', time: '', text: '   ' },
    null, 5, 'str',
  ]));
  assert.deepEqual(loadRoutineTasks(s), [{ id: 'ok', time: '', text: 'Boa' }]);
});

test('loadRoutineTasks com JSON quebrado ou formato errado = lista padrão', () => {
  for (const raw of ['{{', '{}', '"x"', 'null']) {
    const s = fake();
    s.setItem('app-pessoal:rotina:tarefas', raw);
    assert.equal(loadRoutineTasks(s).length, DEFAULT_TASKS.length, raw);
  }
});

test('storage bloqueado: tarefas = padrão e save = false, sem lançar', () => {
  assert.equal(loadRoutineTasks(throwing).length, DEFAULT_TASKS.length);
  assert.equal(saveRoutineTasks([], throwing), false);
});

// ---------- marcações do dia ----------
test('loadRoutineDay sem dado = {}', () => assert.deepEqual(loadRoutineDay('2026-11-16', fake()), {}));

test('saveRoutineDay/loadRoutineDay ida e volta, guardando por id na chave rotina:', () => {
  const s = fake();
  assert.equal(saveRoutineDay('2026-11-16', { 'skincare-morning': true, 'topiramato-11': true }, s), true);
  assert.deepEqual(loadRoutineDay('2026-11-16', s), { 'skincare-morning': true, 'topiramato-11': true });
  assert.deepEqual(JSON.parse(s.getItem('app-pessoal:rotina:2026-11-16')), { 'skincare-morning': true, 'topiramato-11': true });
});

test('loadRoutineDay ignora valores que não são true', () => {
  const s = fake();
  s.setItem('app-pessoal:rotina:2026-11-16', JSON.stringify({ 'skincare-morning': true, 'topiramato-11': false, 'topiramato-18': 'true', 'remedios-morning': 1 }));
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

// ---------- validação e edição ----------
test('validateTask: horário opcional, descrição obrigatória', () => {
  assert.equal(validateTask({ time: '', text: 'Ler' }), null);
  assert.equal(validateTask({ time: '08:15', text: 'Ler' }), null);
  assert.equal(validateTask({ time: '8:15', text: 'Ler' }), 'Horário inválido.');
  assert.equal(validateTask({ time: '', text: '  ' }), 'Escreva a descrição da tarefa.');
});

test('move: sobe, desce e não sai das pontas', () => {
  const t = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
  assert.deepEqual(move(t, 'b', -1).map(x => x.id), ['b', 'a', 'c']);
  assert.deepEqual(move(t, 'b', 1).map(x => x.id), ['a', 'c', 'b']);
  assert.equal(move(t, 'a', -1), t);
  assert.equal(move(t, 'c', 1), t);
  assert.equal(move(t, 'zz', 1), t);
  assert.deepEqual(t.map(x => x.id), ['a', 'b', 'c']);
});

test('newTaskId: único e não vazio', () => {
  const ids = new Set(Array.from({ length: 200 }, newTaskId));
  assert.equal(ids.size, 200);
});

// ---------- atrasada ----------
const T11 = DEFAULT_TASKS.find(t => t.id === 'topiramato-11');
const T18 = DEFAULT_TASKS.find(t => t.id === 'topiramato-18');
const SKIN = DEFAULT_TASKS.find(t => t.id === 'skincare-morning');
const at = (h, m = 0, s = 0) => new Date(2026, 10, 16, h, m, s);

test('isOverdue: tarefa sem horário nunca fica atrasada', () => assert.equal(isOverdue(SKIN, {}, at(23, 59)), false));
test('isOverdue: antes do horário não está atrasada', () => assert.equal(isOverdue(T11, {}, at(10, 59, 59)), false));
test('isOverdue: no horário exato (11:00) já está atrasada', () => assert.equal(isOverdue(T11, {}, at(11, 0)), true));
test('isOverdue: 18:05 sem marcar = atrasada', () => assert.equal(isOverdue(T18, {}, at(18, 5)), true));
test('isOverdue: marcada nunca é atrasada', () => assert.equal(isOverdue(T11, { 'topiramato-11': true }, at(15, 0)), false));
test('isOverdue: 11:00 atrasada não contamina 18:00 ainda futura', () => {
  assert.equal(isOverdue(T11, {}, at(15, 0)), true);
  assert.equal(isOverdue(T18, {}, at(15, 0)), false);
});

// ---------- próximo evento (ms até a próxima mudança na tela) ----------
const H = 3600000;
const D = DEFAULT_TASKS;
test('msUntilNextEvent: antes das 11:00 espera até 11:00 (+1 s de folga)', () => assert.equal(msUntilNextEvent(D, {}, at(9)), 2 * H + 1000));
test('msUntilNextEvent: entre as tarefas espera até 18:00', () => assert.equal(msUntilNextEvent(D, {}, at(12)), 6 * H + 1000));
test('msUntilNextEvent: no horário exato já olha a próxima tarefa', () => assert.equal(msUntilNextEvent(D, {}, at(11, 0)), 7 * H + 1000));
test('msUntilNextEvent: depois da última tarefa espera a meia-noite', () => assert.equal(msUntilNextEvent(D, {}, at(23)), 1 * H + 1000));
test('msUntilNextEvent: pula tarefa já marcada', () => assert.equal(msUntilNextEvent(D, { 'topiramato-11': true }, at(9)), 9 * H + 1000));
test('msUntilNextEvent: usa a lista recebida (tarefa nova às 10:00)', () => {
  assert.equal(msUntilNextEvent([...D, { id: 'n', time: '10:00', text: 'Nova' }], {}, at(9)), 1 * H + 1000);
});
test('msUntilNextEvent: lista vazia espera a meia-noite', () => assert.equal(msUntilNextEvent([], {}, at(23)), 1 * H + 1000));
test('msUntilNextEvent: sempre positivo, mesmo 1 ms antes da meia-noite', () => assert.ok(msUntilNextEvent(D, {}, new Date(2026, 10, 16, 23, 59, 59, 999)) > 0));

// ---------- aba ----------
test('cleanup da Rotina remove os ouvintes que ela pôs no #view', () => {
  const noop = () => {};
  const node = () => ({ innerHTML: '', hidden: false, textContent: '', append() {}, classList: { toggle() {} }, setAttribute() {}, insertAdjacentHTML() {}, dataset: {} });
  globalThis.document = { visibilityState: 'visible', addEventListener: noop, removeEventListener: noop, createElement: node };
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
    const cleanup = rotina.mount(view);
    assert.ok(listeners.length > 0);
    cleanup();
    assert.equal(listeners.length, 0);
  } finally {
    delete globalThis.document;
    delete globalThis.window;
  }
});
