import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CUPS, GOAL_ML, totalMl, fillRatio, formatLiters, formatProgress } from '../js/water.js';

test('CUPS tem 3×910 e 3×1000', () => {
  assert.deepEqual(CUPS.map(c => c.ml), [910, 910, 910, 1000, 1000, 1000]);
  assert.deepEqual(CUPS.map(c => c.label), ['910 ml', '910 ml', '910 ml', '1 L', '1 L', '1 L']);
  assert.equal(GOAL_ML, 4000);
});
test('totalMl soma marcados', () =>
  assert.equal(totalMl([true, true, false, false, false, true]), 2820));
test('todos marcados = 5730', () => assert.equal(totalMl(Array(6).fill(true)), 5730));
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
