import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  levelToWeight,
  adjustLevelForPhase,
  buildRegionPool,
  rollEncounter,
  pickFromPool,
  simulatePhaseEncounters,
  createSeededRng,
  formatHour,
  WEIGHT_BASE,
  DAY_PHASE,
  NIGHT_PHASE,
} from '../encounters.js';

// ---------------------------------------------------------------------------
// levelToWeight
// ---------------------------------------------------------------------------
test('levelToWeight grows exponentially with level', () => {
  assert.equal(levelToWeight(0, 2), 1);
  assert.equal(levelToWeight(1, 2), 2);
  assert.equal(levelToWeight(3, 2), 8);
  assert.ok(levelToWeight(8) > levelToWeight(7));
});

// ---------------------------------------------------------------------------
// adjustLevelForPhase
// ---------------------------------------------------------------------------
test('adjustLevelForPhase shifts and clamps levels', () => {
  // Night: nocturnal +1, day -1, all-day unchanged
  assert.equal(adjustLevelForPhase(5, 'nocturnal', NIGHT_PHASE), 6);
  assert.equal(adjustLevelForPhase(5, 'day', NIGHT_PHASE), 4);
  assert.equal(adjustLevelForPhase(5, 'all-day', NIGHT_PHASE), 5);

  // Day: day +1, nocturnal -1, all-day unchanged
  assert.equal(adjustLevelForPhase(5, 'day', DAY_PHASE), 6);
  assert.equal(adjustLevelForPhase(5, 'nocturnal', DAY_PHASE), 4);
  assert.equal(adjustLevelForPhase(5, 'all-day', DAY_PHASE), 5);

  // Clamp to [1, 8]
  assert.equal(adjustLevelForPhase(8, 'nocturnal', NIGHT_PHASE), 8);
  assert.equal(adjustLevelForPhase(1, 'day', NIGHT_PHASE), 1);
});

// ---------------------------------------------------------------------------
// buildRegionPool
// ---------------------------------------------------------------------------
const sampleEntities = [
  { id: 'a', name: 'Wolves', active: 'nocturnal', probability_by_region: [{ region: 'The Shire', probability: 6 }] },
  { id: 'b', name: 'Rabbits', active: 'day', probability_by_region: [{ region: 'The Shire', probability: 3 }] },
  { id: 'c', name: 'Eagles', active: 'all-day', probability_by_region: [{ region: 'Misty Mountains', probability: 8 }] },
];

test('buildRegionPool filters by region and normalizes to ~100%', () => {
  const pool = buildRegionPool('The Shire', DAY_PHASE, sampleEntities);
  assert.equal(pool.length, 2);
  const total = pool.reduce((s, p) => s + p.probability, 0);
  assert.ok(Math.abs(total - 100) < 1e-6);
});

test('buildRegionPool applies phase adjustment to weights', () => {
  const day = buildRegionPool('The Shire', DAY_PHASE, sampleEntities);
  const night = buildRegionPool('The Shire', NIGHT_PHASE, sampleEntities);

  const wolvesDay = day.find((p) => p.entity.name === 'Wolves').probability;
  const wolvesNight = night.find((p) => p.entity.name === 'Wolves').probability;

  // Wolves are nocturnal: should be more likely at night than during the day.
  assert.ok(wolvesNight > wolvesDay);
});

test('buildRegionPool returns empty pool for region with no entities', () => {
  const pool = buildRegionPool('Mordor', DAY_PHASE, sampleEntities);
  assert.equal(pool.length, 0);
});

// ---------------------------------------------------------------------------
// rollEncounter
// ---------------------------------------------------------------------------
test('rollEncounter respects the chance threshold', () => {
  assert.equal(rollEncounter(0, () => 0.0), false);
  assert.equal(rollEncounter(20, () => 0.1), true); // 10 < 20
  assert.equal(rollEncounter(20, () => 0.5), false); // 50 < 20 -> false
  assert.equal(rollEncounter(100, () => 0.99), true);
});

// ---------------------------------------------------------------------------
// pickFromPool
// ---------------------------------------------------------------------------
test('pickFromPool selects deterministically with a fixed rng', () => {
  const pool = buildRegionPool('The Shire', DAY_PHASE, sampleEntities);
  // rng near 0 picks the first (heaviest) item
  const first = pickFromPool(pool, () => 0.0);
  assert.equal(first.name, pool[0].entity.name);
});

test('pickFromPool returns null on empty pool', () => {
  assert.equal(pickFromPool([], () => 0.5), null);
});

// ---------------------------------------------------------------------------
// formatHour
// ---------------------------------------------------------------------------
test('formatHour formats fractional hours and wraps past midnight', () => {
  assert.equal(formatHour(7), '07:00');
  assert.equal(formatHour(7.5), '07:30');
  assert.equal(formatHour(25), '01:00');
});

// ---------------------------------------------------------------------------
// simulatePhaseEncounters
// ---------------------------------------------------------------------------
test('simulatePhaseEncounters is deterministic with a seeded rng', () => {
  const region = {
    name: 'The Shire',
    hours_to_encounter: 6,
    chance_of_encounter: 100, // force hits to test scheduling
    entities: sampleEntities,
  };

  const run = () =>
    simulatePhaseEncounters({
      startHour: 7,
      phaseHours: 12,
      phase: DAY_PHASE,
      getRegionInfo: () => region,
      rng: createSeededRng(42),
      overrideHours: null,
      overrideChance: null,
    });

  const a = run();
  const b = run();
  assert.deepEqual(a, b);

  // 12 hours / 6 hour cadence with 100% chance => 2 encounters
  assert.equal(a.encounters.length, 2);
  assert.equal(a.encounters[0].region, 'The Shire');
  assert.ok(a.encounters[0].entity);
  assert.ok(Array.isArray(a.usedEntityIds));
});

test('simulatePhaseEncounters produces no encounters at 0% chance', () => {
  const region = {
    name: 'The Shire',
    hours_to_encounter: 4,
    chance_of_encounter: 0,
    entities: sampleEntities,
  };

  const result = simulatePhaseEncounters({
    startHour: 7,
    phaseHours: 12,
    phase: DAY_PHASE,
    getRegionInfo: () => region,
    rng: createSeededRng(7),
    overrideHours: null,
    overrideChance: null,
  });

  assert.equal(result.encounters.length, 0);
});

test('simulatePhaseEncounters handles regions changing mid-phase', () => {
  const shire = { name: 'The Shire', hours_to_encounter: 4, chance_of_encounter: 100, entities: sampleEntities };
  const misty = { name: 'Misty Mountains', hours_to_encounter: 4, chance_of_encounter: 100, entities: sampleEntities };

  // First half in The Shire, second half in Misty Mountains
  const result = simulatePhaseEncounters({
    startHour: 7,
    phaseHours: 12,
    phase: DAY_PHASE,
    getRegionInfo: (elapsed) => (elapsed <= 6 ? shire : misty),
    rng: createSeededRng(99),
    overrideHours: null,
    overrideChance: null,
  });

  const regionsHit = new Set(result.encounters.map((e) => e.region));
  assert.ok(regionsHit.has('The Shire'));
  assert.ok(regionsHit.has('Misty Mountains'));
});

test('simulatePhaseEncounters excludes entities used in previous phase', () => {
  const region = {
    name: 'The Shire',
    hours_to_encounter: 2,
    chance_of_encounter: 100, // force hits
    entities: sampleEntities,
  };

  // Day phase
  const dayResult = simulatePhaseEncounters({
    startHour: 7,
    phaseHours: 12,
    phase: DAY_PHASE,
    getRegionInfo: () => region,
    rng: createSeededRng(42),
    overrideHours: null,
    overrideChance: null,
  });

  // Night phase with entities from day excluded
  const nightResult = simulatePhaseEncounters({
    startHour: 19,
    phaseHours: 12,
    phase: NIGHT_PHASE,
    getRegionInfo: () => region,
    rng: createSeededRng(42),
    overrideHours: null,
    overrideChance: null,
    excludedEntityIds: dayResult.usedEntityIds,
  });

  // Ensure day phase had encounters
  assert.ok(dayResult.encounters.length > 0);
  assert.ok(dayResult.usedEntityIds.length > 0);

  // Ensure night phase does not include any entity from day
  const nightEntityIds = nightResult.encounters.map((e) => e.entity.id);
  for (const id of dayResult.usedEntityIds) {
    assert.ok(!nightEntityIds.includes(id), `Entity ${id} from day should not appear in night`);
  }
});
