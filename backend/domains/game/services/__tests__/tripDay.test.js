import { test } from 'node:test';
import assert from 'node:assert/strict';

import { encountersBeforeSettlement } from '../world/tripDay.js';

const ENCOUNTERS = [
  { hour_float: 9.5, phase: 'morning', entity: { name: 'Deer' } },
  { hour_float: 14.0, phase: 'afternoon', entity: { name: 'Orc scout' } },
  { hour_float: 16.5, phase: 'afternoon', entity: { name: 'Wolf pack' } },
  { hour_float: 21.0, phase: 'night', entity: { name: 'Warg' } },
];

test('encountersBeforeSettlement: wild camp keeps every encounter', () => {
  const out = encountersBeforeSettlement(ENCOUNTERS, 15.0, false);
  assert.equal(out.length, 4);
});

test('encountersBeforeSettlement: settlement drops everything after arrival', () => {
  // Reached the town at ~15:00 (8 walking hours after 07:00)
  const out = encountersBeforeSettlement(ENCOUNTERS, 15.0, true);
  assert.deepEqual(out.map((e) => e.entity.name), ['Deer', 'Orc scout']);
});

test('encountersBeforeSettlement: night encounters never happen inside walls', () => {
  const out = encountersBeforeSettlement(ENCOUNTERS, 19.0, true);
  assert.ok(out.every((e) => e.phase !== 'night'));
});

test('encountersBeforeSettlement: empty input stays empty', () => {
  assert.deepEqual(encountersBeforeSettlement([], 15.0, true), []);
  assert.deepEqual(encountersBeforeSettlement(null, 15.0, true), []);
});
