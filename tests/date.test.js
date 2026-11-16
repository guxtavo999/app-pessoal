import { test } from 'node:test';
import assert from 'node:assert/strict';
import { todayKey, msUntilMidnight } from '../js/date.js';

test('todayKey usa data local com zero à esquerda', () =>
  assert.equal(todayKey(new Date(2026, 0, 5, 23, 59)), '2026-01-05'));
test('msUntilMidnight às 23:59:00 = 60000', () =>
  assert.equal(msUntilMidnight(new Date(2026, 0, 5, 23, 59, 0, 0)), 60000));
test('msUntilMidnight à 00:00 = 24h', () =>
  assert.equal(msUntilMidnight(new Date(2026, 0, 5, 0, 0, 0, 0)), 86400000));
