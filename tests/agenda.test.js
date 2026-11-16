import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  daysUntil, colorFor, upcoming, validate, formatDay, isValidItem, newId,
} from '../js/agenda.js';
import { loadAgenda, saveAgenda } from '../js/storage.js';

const fake = () => {
  const m = new Map();
  return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)) };
};
const throwing = {
  getItem() { throw new Error('blocked'); },
  setItem() { throw new Error('blocked'); },
};

const now = new Date(2026, 10, 16, 15, 0); // segunda, 16/11/2026, 15:00

test('daysUntil conta dias de calendário', () => {
  assert.equal(daysUntil('2026-11-16', now), 0);
  assert.equal(daysUntil('2026-11-17', now), 1);
  assert.equal(daysUntil('2026-11-15', now), -1);
  assert.equal(daysUntil('2026-11-16', new Date(2026, 10, 16, 23, 59)), 0);
  assert.equal(daysUntil('2027-01-02', new Date(2026, 11, 30, 10, 0)), 3);
  assert.equal(daysUntil('2026-12-01', new Date(2026, 10, 30, 0, 0)), 1);
});

test('colorFor segue 0 / 1–3 / 4–7 / 8+', () => {
  const c = date => colorFor({ date, time: '09:00' }, now);
  assert.equal(c('2026-11-16'), 'today');
  assert.equal(c('2026-11-17'), 'near');
  assert.equal(c('2026-11-19'), 'near');
  assert.equal(c('2026-11-20'), 'week');
  assert.equal(c('2026-11-23'), 'week');
  assert.equal(c('2026-11-24'), null);
});

test('hoje com horário já passado continua vermelho', () => {
  assert.equal(colorFor({ date: '2026-11-16', time: '08:00' }, now), 'today');
});

test('upcoming tira vencidos e ordena por data e horário', () => {
  const items = [
    { id: 'a', date: '2026-11-20', time: '10:00', text: 'A' },
    { id: 'b', date: '2026-11-15', time: '23:59', text: 'B' },
    { id: 'c', date: '2026-11-16', time: '18:00', text: 'C' },
    { id: 'd', date: '2026-11-16', time: '09:00', text: 'D' },
  ];
  assert.deepEqual(upcoming(items, now).map(i => i.id), ['d', 'c', 'a']);
  assert.equal(items.length, 4); // não altera o original
});

test('validate', () => {
  const ok = { date: '2026-11-16', time: '08:00', text: 'Dentista' };
  assert.equal(validate(ok, now), null);
  assert.equal(validate({ ...ok, date: '' }, now), 'Escolha a data.');
  assert.equal(validate({ ...ok, time: '' }, now), 'Escolha o horário.');
  assert.equal(validate({ ...ok, text: '   ' }, now), 'Escreva o que é o compromisso.');
  assert.equal(validate({ ...ok, date: '2026-11-15' }, now), 'Essa data já passou.');
});

test('formatDay', () => {
  assert.equal(formatDay('2026-11-16', now), 'Hoje');
  assert.equal(formatDay('2026-11-17', now), 'Amanhã');
  assert.equal(formatDay('2026-11-19', now), 'Qui 19/11');
  assert.equal(formatDay('2026-11-22', now), 'Dom 22/11');
  assert.equal(formatDay('2027-01-04', now), 'Seg 04/01/2027');
});

test('isValidItem', () => {
  const ok = { id: 'x', date: '2026-11-16', time: '09:00', text: 'A' };
  assert.equal(isValidItem(ok), true);
  for (const bad of [null, 'x', [], { ...ok, id: '' }, { ...ok, date: '2026-13-40' },
    { ...ok, date: '2026-02-30' }, { ...ok, time: '25:00' }, { ...ok, time: '9:00' },
    { ...ok, text: '  ' }, { ...ok, text: 5 }]) {
    assert.equal(isValidItem(bad), false, JSON.stringify(bad));
  }
});

test('newId não repete', () => {
  assert.equal(new Set(Array.from({ length: 200 }, newId)).size, 200);
});

test('saveAgenda/loadAgenda ida e volta', () => {
  const s = fake();
  const items = [{ id: 'a', date: '2026-11-20', time: '10:00', text: 'Dentista' }];
  assert.equal(saveAgenda(items, s), true);
  assert.deepEqual(loadAgenda(s), items);
  assert.notEqual(s.getItem('app-pessoal:agenda'), null);
});

test('loadAgenda ignora dado corrompido item a item', () => {
  for (const raw of ['{{', 'null', '"x"', '{"a":1}']) {
    const s = fake(); s.setItem('app-pessoal:agenda', raw);
    assert.deepEqual(loadAgenda(s), []);
  }
  const s = fake();
  s.setItem('app-pessoal:agenda', JSON.stringify([
    { id: 'ok', date: '2026-11-20', time: '10:00', text: 'A', extra: 1 },
    { id: 'm', date: '2026-13-40', time: '10:00', text: 'B' },
    { id: 'h', date: '2026-11-20', time: '25:00', text: 'C' },
    { date: '2026-11-20', time: '10:00', text: 'D' },
    7,
  ]));
  assert.deepEqual(loadAgenda(s), [{ id: 'ok', date: '2026-11-20', time: '10:00', text: 'A' }]);
});

test('store que lança ou ausente: nada quebra', () => {
  assert.deepEqual(loadAgenda(throwing), []);
  assert.equal(saveAgenda([], throwing), false);
  assert.deepEqual(loadAgenda(), []);
});
