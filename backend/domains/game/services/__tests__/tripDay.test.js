import { test } from 'node:test';
import assert from 'node:assert/strict';

import { encountersBeforeSettlement, overnightDistanceKm, terrainCategoriesFor, rotateTerrainPhrases } from '../world/tripDay.js';

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

// 0.5 deg of latitude is ~55.6 km everywhere; 0.5 deg of longitude at lat 45 is ~39.3 km.
test('overnightDistanceKm: leg ending on the settlement is 0 km away', () => {
  assert.equal(overnightDistanceKm([10, 45], [10, 45]), 0);
});

test('overnightDistanceKm: settlement 0.5 deg north of the leg end is ~55.6 km away', () => {
  assert.equal(overnightDistanceKm([10, 45], [10, 45.5]), 55.6);
});

test('overnightDistanceKm: settlement 0.5 deg east at lat 45 is ~39.3 km away', () => {
  assert.equal(overnightDistanceKm([10, 45], [10.5, 45]), 39.3);
});

test('overnightDistanceKm: missing coordinates are unknown, not 0', () => {
  assert.equal(overnightDistanceKm([10, 45], null), null);
});

// --- terrainCategoriesFor ---------------------------------------------------

test('terrainCategoriesFor: loads only the terrain actually crossed', () => {
  const cats = terrainCategoriesFor(
    { biomes: [{ type: 'forest' }], altitude: ['hills'] },
    { trail: 30.0 }
  );
  assert.deepEqual([...cats].sort(), ['forest', 'hills', 'trail']);
});

test('terrainCategoriesFor: empty context falls back to plain', () => {
  const cats = terrainCategoriesFor({ biomes: [], altitude: [] }, { trail: 10.0 });
  assert.deepEqual([...cats].sort(), ['plain', 'trail']);
});

test('terrainCategoriesFor: road category only when road was walked', () => {
  const cats = terrainCategoriesFor(
    { biomes: [], altitude: ['mountains_low'] },
    { road_major: 5.0, off_road: 12.0 }
  );
  assert.deepEqual([...cats].sort(), ['mountains_low']);
});

// --- rotateTerrainPhrases ----------------------------------------------------

const PHRASES = () => ({
  Fornost: {
    trail: ['phrase A', 'phrase B', 'phrase C'],
    hills: ['hill A'],
  },
});

test('rotateTerrainPhrases: resolves each cell to a single phrase', () => {
  const map = PHRASES();
  rotateTerrainPhrases(map, {}, () => 0);
  assert.deepEqual(map.Fornost.trail, ['phrase A']);
  assert.deepEqual(map.Fornost.hills, ['hill A']);
});

test('rotateTerrainPhrases: never repeats a phrase while alternatives remain', () => {
  const used = {};
  const picks = new Set();
  for (let i = 0; i < 3; i++) {
    const map = PHRASES();
    rotateTerrainPhrases(map, used, () => 0);
    picks.add(map.Fornost.trail[0]);
  }
  assert.equal(picks.size, 3);
});

test('rotateTerrainPhrases: resets a cell once every phrase is used', () => {
  const used = {};
  for (let i = 0; i < 4; i++) {
    rotateTerrainPhrases(PHRASES(), used, () => 0);
  }
  // After 3 picks the cell reset; the 4th pick starts the cycle again
  assert.equal(used['Fornost|trail'].length, 1);
});

test('rotateTerrainPhrases: single-phrase cells always yield that phrase', () => {
  const used = {};
  for (let i = 0; i < 5; i++) {
    const map = PHRASES();
    rotateTerrainPhrases(map, used, Math.random);
    assert.deepEqual(map.Fornost.hills, ['hill A']);
  }
});
