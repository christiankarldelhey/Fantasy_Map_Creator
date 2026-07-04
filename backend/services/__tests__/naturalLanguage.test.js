import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  describeLandscape,
  describeRoads,
  collectTerrainNotes,
  collectRoadNotes,
  collectClimateNotes,
  collectLocationNotes,
  pickTodaysWayIn,
} from '../naturalLanguage.js';

// ---------------------------------------------------------------------------
// describeLandscape
// ---------------------------------------------------------------------------

test('describeLandscape uses regional phrases when available', () => {
  const terrainPhrases = {
    Ithilien: {
      forest: ['The woods of Ithilien are thick and watchful.'],
    },
  };
  const rng = () => 0;
  const text = describeLandscape(['forest'], [], [{ name: 'Ithilien' }], terrainPhrases, rng);
  assert.ok(text.includes('The woods of Ithilien are thick and watchful.'));
});

test('describeLandscape falls back to generic phrases when regional phrases are missing', () => {
  const terrainPhrases = {};
  const rng = () => 0;
  const text = describeLandscape(['forest'], [], [{ name: 'Dagorlad' }], terrainPhrases, rng);
  assert.ok(text.includes('woodland'));
});

test('describeLandscape describes plain when no biome or altitude is present', () => {
  const terrainPhrases = {
    Rohan: {
      plain: ['The grasslands of Rohan roll green and endless.'],
    },
  };
  const rng = () => 0;
  const text = describeLandscape([], [], [{ name: 'Rohan' }], terrainPhrases, rng);
  assert.ok(text.includes('The grasslands of Rohan roll green and endless.'));
});

test('describeLandscape falls back to default plain description when no data', () => {
  const text = describeLandscape([], [], [{ name: 'Unknown' }], {}, () => 0);
  assert.equal(text, 'Open, even country, with no great rise or wood to speak of.');
});

// ---------------------------------------------------------------------------
// describeRoads
// ---------------------------------------------------------------------------

test('describeRoads uses regional road phrases when available', () => {
  const terrainPhrases = {
    Gondor: {
      road: ['A well-kept Gondorian road of fitted stone.'],
    },
  };
  const rng = () => 0;
  const text = describeRoads({ road: 10 }, [{ name: 'Gondor' }], terrainPhrases, rng);
  assert.ok(text.includes('A well-kept Gondorian road of fitted stone.'));
});

test('describeRoads falls back to generic road phrases when regional phrases are missing', () => {
  const terrainPhrases = {};
  const rng = () => 0;
  const text = describeRoads({ road: 10 }, [{ name: 'Unknown' }], terrainPhrases, rng);
  assert.ok(text.includes('made roads'));
});

// ---------------------------------------------------------------------------
// collectTerrainNotes
// ---------------------------------------------------------------------------

test('collectTerrainNotes returns bullet-ready regional notes', () => {
  const terrainPhrases = {
    Ithilien: {
      forest: ['The woods of Ithilien are thick and watchful.'],
      hills: ['Low green hills under a southern sun.'],
    },
  };
  const notes = collectTerrainNotes(['forest'], ['hills'], [{ name: 'Ithilien' }], terrainPhrases, () => 0);
  assert.equal(notes.length, 2);
  assert.ok(notes[0].startsWith('- forest:'));
  assert.ok(notes[0].includes('The woods of Ithilien are thick and watchful.'));
  assert.ok(notes[1].startsWith('- hills:'));
});

test('collectTerrainNotes falls back to generic phrases when regional phrases are missing', () => {
  const notes = collectTerrainNotes(['forest'], [], [{ name: 'Unknown' }], {}, () => 0);
  assert.equal(notes.length, 1);
  assert.ok(notes[0].startsWith('- forest: woodland'));
});

test('collectTerrainNotes adds plain note when no biome or altitude is present', () => {
  const notes = collectTerrainNotes([], [], [{ name: 'Unknown' }], {}, () => 0);
  assert.equal(notes.length, 1);
  assert.ok(notes[0].startsWith('- plain:'));
});

test('collectTerrainNotes handles biome objects with area_km2', () => {
  const biomes = [{ type: 'forest', area_km2: 5.2 }, { type: 'hills', area_km2: 25.3 }];
  const notes = collectTerrainNotes(biomes, [], ['Dunland'], {});
  assert.equal(notes.length, 2);
  assert.ok(notes[0].includes('pequeño forest')); // < 10 km²
  assert.ok(notes[1].includes('hills:')); // >= 10 km², no prefix
  assert.ok(!notes[1].includes('pequeño'));
});

test('collectTerrainNotes includes time of day when hour_float is present', () => {
  const biomes = [{ type: 'marsh', area_km2: 15.0, hour_float: 11.5 }];
  const notes = collectTerrainNotes(biomes, [], ['Dunland'], {});
  assert.equal(notes.length, 1);
  assert.ok(notes[0].includes('marsh'));
  assert.ok(notes[0].includes('toward midday'));
});

// ---------------------------------------------------------------------------
// collectRoadNotes
// ---------------------------------------------------------------------------

test('collectRoadNotes returns bullet-ready road notes with distance', () => {
  const terrainPhrases = {
    Gondor: {
      road: ['A well-kept Gondorian road of fitted stone.'],
    },
  };
  const notes = collectRoadNotes({ road: 12.5 }, [{ name: 'Gondor' }], terrainPhrases, () => 0);
  assert.equal(notes.length, 1);
  assert.ok(notes[0].startsWith('- road:'));
  assert.ok(notes[0].includes('(12.5 km)'));
  assert.ok(notes[0].includes('A well-kept Gondorian road of fitted stone.'));
});

// ---------------------------------------------------------------------------
// collectClimateNotes
// ---------------------------------------------------------------------------

test('collectClimateNotes returns phase-based weather notes', () => {
  const climate = [
    { time: '1950-07-03 09:00:00', climate: { temperature_2m: 22, cloud_cover: 20, wind_speed_10m: 9, precipitation: 0 } },
    { time: '1950-07-03 15:00:00', climate: { temperature_2m: 25, cloud_cover: 74, wind_speed_10m: 10, precipitation: 0 } },
  ];
  const notes = collectClimateNotes(climate, () => 0);
  assert.ok(notes.some((n) => n.startsWith('- morning:')));
  assert.ok(notes.some((n) => n.startsWith('- afternoon:')));
});

// ---------------------------------------------------------------------------
// pickTodaysWayIn
// ---------------------------------------------------------------------------

test('pickTodaysWayIn returns a deterministic focus with a fixed rng', () => {
  const focus = pickTodaysWayIn(() => 0);
  assert.ok(typeof focus === 'string' && focus.length > 0);
});

// ---------------------------------------------------------------------------
// collectLocationNotes
// ---------------------------------------------------------------------------

test('collectLocationNotes returns bullet-ready location notes', () => {
  const locations = [
    { name: 'Amon Sûl', type: 'ruins', hour_float: 12, distance_km: 0.5, description: 'Ancient watchtower.' },
  ];
  const notes = collectLocationNotes(locations);
  assert.equal(notes.length, 1);
  assert.ok(notes[0].startsWith('- Amon Sûl (ruins):'));
  assert.ok(notes[0].includes('passed close by'));
  assert.ok(notes[0].includes('toward midday'));
  assert.ok(notes[0].includes('Ancient watchtower.'));
});

test('collectLocationNotes marks passes through when distance_km is 0', () => {
  const locations = [
    { name: 'Tharbad', type: 'fortified town', hour_float: 16.45, distance_km: 0, description: 'A Númenórean river port.' },
  ];
  const notes = collectLocationNotes(locations);
  assert.equal(notes.length, 1);
  assert.ok(notes[0].includes('passes through'));
  assert.ok(notes[0].includes('in the late afternoon'));
});

test('collectLocationNotes returns default when no locations', () => {
  const notes = collectLocationNotes([]);
  assert.equal(notes.length, 1);
  assert.ok(notes[0].includes('No settlements or landmarks of note'));
});
