// ============================================================================
// World notes — host-side world voice (issue #52)
// ----------------------------------------------------------------------------
// The day data must arrive at the mind-engine already verbalized: phrases,
// never numbers. rng is fixed (() => 0 → always the first option) so the
// output is deterministic.
// ============================================================================
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildWorldNotes } from '../worldNotes.js';

const rng = () => 0;

const DAY = {
  day_number: 3,
  date: '1950-01-21',
  regions: [{ name: 'lone-lands', description_summary: 'Bleak open country.' }],
  road_types: { road: 12.5, trail: 2.0 },
  terrain_phrases: {},
  elevation_profile: { dawn_m: 300, midday_m: 1100, dusk_m: 500, significant: true, total_gain_m: 400, total_loss_m: 50 },
  climate: [
    { time: '1950-01-21 08:00:00', phase: 'morning', climate: { temperature_2m: 1.0, cloud_cover: 10, wind_speed_10m: 5, precipitation: 0 } },
    { time: '1950-01-21 14:00:00', phase: 'afternoon', climate: { temperature_2m: 8.0, cloud_cover: 50, wind_speed_10m: 25, precipitation: 0.4 } },
    { time: '1950-01-21 21:00:00', phase: 'night', climate: { temperature_2m: -1.0, cloud_cover: 90, wind_speed_10m: 8, precipitation: 0 } },
  ],
  nighttime_climate: [
    { time: '1950-01-21 23:00:00', climate: { temperature_2m: -2.0, wind_speed_10m: 8, precipitation: 0 } },
  ],
  moon_phase: { phase: 'full_moon' },
  biomes: [{ type: 'forest', hour_float: 9.5, total_area_km2: 30 }],
  locations: [{ name: 'Amon Sul', type: 'ruin', hour_float: 14.2, distance_km: 0.4, description: 'A broken watchtower.' }],
  water_crossings: [{ name: 'The Brandywine', crossing_type: 'bridge', hour_float: 10.0, description: 'Wide and brown.' }],
  meals: [
    { slot: 'midday', food: 'tavern_meal', drink: 'waterskin' },
    { slot: 'evening', food: null, drink: 'water' },
  ],
  overnight_location: { name: 'Dale', type: 'city', distance_km: 0.3, indoor: true, description: 'A town of toy-makers.' },
  overnight_interaction: { title: 'Shelter', description: 'A warm hall.' },
  encounters: [],
};

function notes(overrides = {}) {
  return buildWorldNotes({
    day: DAY,
    tripName: 'Bree to Rivendell',
    characterName: 'Tester',
    characterState: { energy: 20, shadow: 80, wounded: 'wounded', recentNotes: ['combat:wolves'] },
    equipmentState: { rations: 1, waterHeld: 0, waterCapacity: 1, coins: 0 },
    fate: 'dead_exhaustion',
    previousDay: { day_number: 2, regions: ['lone-lands'], locations: ['Bree'], encounters: [{ name: 'Wolves' }] },
    recentDayClimates: [],
    rng,
    ...overrides,
  });
}

test('world notes carry every verbalized field the prompt consumes', () => {
  const wn = notes();
  for (const key of [
    'climate_state', 'weather', 'meals', 'terrain', 'locations', 'water',
    'night_lead', 'lands', 'condition', 'equipage', 'end_state',
    'journey_context',
  ]) {
    assert.ok(key in wn, `missing ${key}`);
  }
});

test('weather is phrased per phase — prose, never numbers', () => {
  const { weather } = notes();
  assert.equal(weather.morning, 'bitter cold and clear skies');
  assert.match(weather.afternoon, /cold|windy|rain|snow/);
  assert.equal(weather.night, 'bitter cold and heavy cloud cover');
  assert.ok(!/\d/.test(`${weather.morning}${weather.afternoon}${weather.night}`));
});

test('terrain, locations and water are grouped by phase as note lines', () => {
  const wn = notes();
  assert.deepEqual(wn.terrain.afternoon, []);
  assert.deepEqual(wn.terrain.morning, ['- forest (in the mid-morning): woodland']);
  assert.match(wn.locations.afternoon[0], /Amon Sul \(ruin\):/);
  assert.match(wn.water.morning, /Brandywine.*bridge/i);
  assert.equal(wn.water.afternoon, null);
});

test('lands carries regions, road notes and the climbing effort', () => {
  const { lands } = notes();
  assert.match(lands, /Lands crossed/);
  assert.match(lands, /lone-lands: Bleak open country\./);
  assert.match(lands, /road: .+ \(12\.5 km\)/);
  assert.match(lands, /Terrain effort/);
});

test('condition, equipage and end_state render bands, not numbers', () => {
  const wn = notes();
  assert.match(wn.condition, /TRAVELLER'S CONDITION/);
  assert.match(wn.condition, /Tester/);
  assert.match(wn.condition, /a fight with wolves/);
  assert.match(wn.equipage, /EQUIPAGE/);
  assert.match(wn.equipage, /waterskin is empty/);
  assert.match(wn.equipage, /purse is empty/);
  assert.match(wn.end_state, /FINAL CHAPTER/);
  assert.ok(!/energy|20|80/.test(wn.condition));
});

test('journey_context keeps destination and yesterday in one block', () => {
  const { journey_context } = notes();
  assert.match(journey_context, /Ultimate Destination: Rivendell/);
  assert.match(journey_context, /In Chapter 2 \(yesterday\)/);
  assert.match(journey_context, /lone-lands/);
});

test('night_lead joins the camp and the conditions', () => {
  const { night_lead } = notes();
  assert.match(night_lead, /Overnight camp:/);
  assert.match(night_lead, /Dale \(city\)/);
  assert.match(night_lead, /Nighttime conditions/);
});

test('meals render the canonical slugs through their display names', () => {
  const { meals } = notes();
  assert.match(meals.afternoon, /a hot meal bought at the inn/);
  assert.match(meals.night, /no supper|water from the skin|water/);
});

test('a dead fate suppresses nothing the host still owes', () => {
  const wn = notes({ fate: 'living' });
  assert.equal(wn.end_state, '');
});

// Settlements lived, not just passed — 'entered' beats distance math and
// 'hostile' is never "passed close by". (Ported from the Python suite
// when the world voice moved host-side, #54.)
test('collectLocationNotes tells entry from passing by', async () => {
  const { collectLocationNotes } = await import('../placeNotes.js');
  const notes = collectLocationNotes([
    { name: 'Esgaroth', type: 'town', hour_float: 10.45, distance_km: 0.01, entered: true },
    { name: 'Amon Sul', type: 'ruins', distance_km: 4.0 },
    { name: 'Dol Guldur', type: 'fortified city', distance_km: 0.3, hostile: true },
  ]);
  assert.match(notes[0], /the day ends here/);
  assert.doesNotMatch(notes[0], /passed close by/);
  assert.match(notes[1], /passed at some distance/);
  assert.match(notes[2], /enemy country/);
});
