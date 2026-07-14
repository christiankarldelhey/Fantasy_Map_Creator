import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  describeLandscape,
  describeRoads,
  describeWaterCrossings,
  collectTerrainNotes,
  collectRoadNotes,
  collectClimateNotes,
  collectClimateNotesByPhase,
  collectNighttimeConditions,
  collectLocationNotes,
  pickTodaysWayIn,
  phaseForHour,
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
  assert.ok(notes[0].includes('small forest')); // < 10 km²
  assert.ok(notes[1].includes('hills:')); // >= 10 km², no prefix
  assert.ok(!notes[1].includes('small'));
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

test('collectClimateNotes buckets night from a stored phase (post-midnight)', () => {
  const climate = [
    { time: '1950-07-03 19:00:00', phase: 'night', climate: { temperature_2m: 12, cloud_cover: 30, wind_speed_10m: 14, precipitation: 0 } },
    { time: '1950-07-04 01:00:00', phase: 'night', climate: { temperature_2m: 1, cloud_cover: 90, wind_speed_10m: 28, precipitation: 0.5 } },
  ];
  const notes = collectClimateNotes(climate);
  const night = notes.find((n) => n.startsWith('- night:'));
  assert.ok(night, 'expected a night note');
  // Averaged: bitter/cold, overcast, windy and wet should surface
  assert.ok(night.includes('windy'));
  assert.ok(night.includes('wet'));
});

test('collectClimateNotesByPhase returns one phrase per phase', () => {
  const climate = [
    { time: '1950-07-03 07:00:00', phase: 'morning', climate: { temperature_2m: 14, cloud_cover: 95, wind_speed_10m: 5, precipitation: 0 } },
    { time: '1950-07-03 13:00:00', phase: 'afternoon', climate: { temperature_2m: 20, cloud_cover: 40, wind_speed_10m: 6, precipitation: 0 } },
  ];
  const byPhase = collectClimateNotesByPhase(climate);
  assert.ok(typeof byPhase.morning === 'string' && byPhase.morning.length > 0);
  assert.ok(typeof byPhase.afternoon === 'string' && byPhase.afternoon.length > 0);
  assert.equal(byPhase.night, null);
});

// ---------------------------------------------------------------------------
// phaseForHour
// ---------------------------------------------------------------------------

test('phaseForHour maps clock hours to narrative phases', () => {
  assert.equal(phaseForHour(7), 'morning');
  assert.equal(phaseForHour(12.9), 'morning');
  assert.equal(phaseForHour(13), 'afternoon');
  assert.equal(phaseForHour(18.5), 'afternoon');
  assert.equal(phaseForHour(19), 'night');
  assert.equal(phaseForHour(2), 'night');
  assert.equal(phaseForHour(null), 'night');
});

// ---------------------------------------------------------------------------
// describeWaterCrossings
// ---------------------------------------------------------------------------

test('describeWaterCrossings appends description when present', () => {
  const crossings = [
    { name: 'Lhun', type: 'river', crossing_type: 'bridge', hour_float: 10, description: 'The Lhun runs broad and cold.' },
  ];
  const text = describeWaterCrossings(crossings, () => 0);
  assert.ok(text.startsWith('- '));
  assert.ok(text.includes('Lhun'));
  assert.ok(text.includes('The Lhun runs broad and cold.'));
});

test('describeWaterCrossings omits description separator when absent', () => {
  const crossings = [
    { name: null, type: 'stream', crossing_type: 'ford', hour_float: 15, description: null },
  ];
  const text = describeWaterCrossings(crossings, () => 0.9);
  assert.ok(text.startsWith('- '));
  assert.ok(!text.includes(' — '));
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

// ---------------------------------------------------------------------------
// collectNighttimeConditions
// ---------------------------------------------------------------------------

function makeNightSample(hour, temperature_2m, wind_speed_10m, precipitation, cloud_cover = 0) {
  const nextDay = hour < 20;
  const stampHour = String(hour).padStart(2, '0');
  const date = nextDay ? '1950-06-02' : '1950-06-01';
  return {
    time: `${date} ${stampHour}:00:00`,
    phase: 'night',
    climate: {
      time: `${date} ${stampHour}:00:00`,
      temperature_2m,
      wind_speed_10m,
      precipitation,
      cloud_cover,
    },
  };
}

test('collectNighttimeConditions detects a stormy night', () => {
  const samples = [
    makeNightSample(20, 12, 10, 0),
    makeNightSample(23, 10, 28, 0.8),
    makeNightSample(2, 9, 35, 1.2),
    makeNightSample(5, 8, 18, 0.3),
    makeNightSample(7, 7, 12, 0.1),
  ];
  const notes = collectNighttimeConditions(samples, () => 0);
  assert.ok(notes.some((n) => /storm|wind|shelter/i.test(n)), 'should mention a storm or shelter');
});

test('collectNighttimeConditions detects cold seeping into sleep', () => {
  const samples = [
    makeNightSample(20, -2, 5, 0),
    makeNightSample(23, -3, 6, 0),
    makeNightSample(2, -4, 7, 0),
    makeNightSample(5, -5, 5, 0),
    makeNightSample(7, -2, 4, 0),
  ];
  const notes = collectNighttimeConditions(samples, () => 0);
  assert.ok(notes.some((n) => /cold|frost|shiver/i.test(n)), 'should mention the cold');
});

test('collectNighttimeConditions detects dawn rain', () => {
  const samples = [
    makeNightSample(20, 10, 5, 0),
    makeNightSample(23, 9, 6, 0),
    makeNightSample(2, 8, 7, 0),
    makeNightSample(5, 7, 8, 0.6),
    makeNightSample(7, 7, 9, 0.4),
  ];
  const notes = collectNighttimeConditions(samples, () => 0);
  assert.ok(notes.some((n) => /dawn|rain|shower/i.test(n)), 'should mention dawn rain');
});

test('collectNighttimeConditions falls back to calm night when nothing notable', () => {
  const samples = [
    makeNightSample(20, 12, 5, 0),
    makeNightSample(23, 11, 6, 0),
    makeNightSample(2, 10, 5, 0),
    makeNightSample(5, 10, 6, 0),
    makeNightSample(7, 12, 5, 0),
  ];
  const notes = collectNighttimeConditions(samples, () => 0);
  assert.equal(notes.length, 1);
  assert.ok(notes[0].startsWith('-'));
});
