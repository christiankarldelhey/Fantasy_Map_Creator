import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  levelToWeight,
  adjustLevelForPhase,
  adjustLevelForRoadAndPopulation,
  buildRegionPool,
  rollEncounter,
  pickFromPool,
  simulatePhaseEncounters,
  createSeededRng,
  formatHour,
  WEIGHT_BASE,
  PHASE_MORNING,
  PHASE_AFTERNOON,
  PHASE_NIGHT,
  ENCOUNTER_CHANCE,
  INTELLIGENT_TYPES,
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
  assert.equal(adjustLevelForPhase(5, 'nocturnal', PHASE_NIGHT), 6);
  assert.equal(adjustLevelForPhase(5, 'day', PHASE_NIGHT), 4);
  assert.equal(adjustLevelForPhase(5, 'all-day', PHASE_NIGHT), 5);

  // Morning/Afternoon: day +1, nocturnal -1, all-day unchanged
  assert.equal(adjustLevelForPhase(5, 'day', PHASE_MORNING), 6);
  assert.equal(adjustLevelForPhase(5, 'nocturnal', PHASE_MORNING), 4);
  assert.equal(adjustLevelForPhase(5, 'all-day', PHASE_MORNING), 5);
  assert.equal(adjustLevelForPhase(5, 'day', PHASE_AFTERNOON), 6);
  assert.equal(adjustLevelForPhase(5, 'nocturnal', PHASE_AFTERNOON), 4);
  assert.equal(adjustLevelForPhase(5, 'all-day', PHASE_AFTERNOON), 5);

  // Clamp to [1, 8]
  assert.equal(adjustLevelForPhase(8, 'nocturnal', PHASE_NIGHT), 8);
  assert.equal(adjustLevelForPhase(1, 'day', PHASE_NIGHT), 1);
});

// ---------------------------------------------------------------------------
// adjustLevelForRoadAndPopulation
// ---------------------------------------------------------------------------
test('adjustLevelForRoadAndPopulation is no-op for non-intelligent types', () => {
  assert.equal(adjustLevelForRoadAndPopulation(5, 'carnivores', 'road_major', 1.0), 5);
  assert.equal(adjustLevelForRoadAndPopulation(5, 'insects', 'off_road', 0.0), 5);
  assert.equal(adjustLevelForRoadAndPopulation(4, 'undead', 'road', 0.8), 4);
});

test('adjustLevelForRoadAndPopulation applies road_type delta to intelligent types', () => {
  // off_road: -2
  assert.equal(adjustLevelForRoadAndPopulation(5, 'humans', 'off_road', 0.5), 3);
  // trail: 0
  assert.equal(adjustLevelForRoadAndPopulation(5, 'humans', 'trail', 0.5), 5);
  // road: +2
  assert.equal(adjustLevelForRoadAndPopulation(5, 'humans', 'road', 0.5), 7);
  // road_major: +3
  assert.equal(adjustLevelForRoadAndPopulation(5, 'humans', 'road_major', 0.5), 8); // clamped from 8
});

test('adjustLevelForRoadAndPopulation applies population_ratio delta', () => {
  // ratio 1.0 → +2 pop delta; ratio 0.0 → -2 pop delta (with trail = 0 road delta)
  assert.equal(adjustLevelForRoadAndPopulation(5, 'elves', 'trail', 1.0), 7);
  assert.equal(adjustLevelForRoadAndPopulation(5, 'elves', 'trail', 0.0), 3);
  assert.equal(adjustLevelForRoadAndPopulation(5, 'elves', 'trail', 0.5), 5);
});

test('adjustLevelForRoadAndPopulation clamps result to [1, 8]', () => {
  // road_major (+3) + ratio 1.0 (+2) + high base level: should clamp at 8
  assert.equal(adjustLevelForRoadAndPopulation(7, 'orcs', 'road_major', 1.0), 8);
  // off_road (-2) + ratio 0.0 (-2) + low base level: should clamp at 1
  assert.equal(adjustLevelForRoadAndPopulation(2, 'hobbits', 'off_road', 0.0), 1);
});

test('adjustLevelForRoadAndPopulation works for all INTELLIGENT_TYPES', () => {
  for (const type of INTELLIGENT_TYPES) {
    const result = adjustLevelForRoadAndPopulation(5, type, 'road', 0.5);
    assert.ok(result >= 1 && result <= 8, `type ${type} produced out-of-range level ${result}`);
  }
});

// ---------------------------------------------------------------------------
// buildRegionPool
// ---------------------------------------------------------------------------
const sampleEntities = [
  { id: 'a', name: 'Wolves', type: 'carnivores', active: 'nocturnal', probability_by_region: [{ region: 'The Shire', probability: 6 }] },
  { id: 'b', name: 'Hobbits', type: 'hobbits', active: 'day', probability_by_region: [{ region: 'The Shire', probability: 3 }] },
  { id: 'c', name: 'Eagles', type: 'great_eagles', active: 'all-day', probability_by_region: [{ region: 'Misty Mountains', probability: 8 }] },
];

test('buildRegionPool filters by region and normalizes to ~100%', () => {
  const pool = buildRegionPool('The Shire', PHASE_MORNING, sampleEntities);
  assert.equal(pool.length, 2);
  const total = pool.reduce((s, p) => s + p.probability, 0);
  assert.ok(Math.abs(total - 100) < 1e-6);
});

test('buildRegionPool applies phase adjustment to weights', () => {
  const morning = buildRegionPool('The Shire', PHASE_MORNING, sampleEntities);
  const night = buildRegionPool('The Shire', PHASE_NIGHT, sampleEntities);

  const wolvesMorning = morning.find((p) => p.entity.name === 'Wolves').probability;
  const wolvesNight = night.find((p) => p.entity.name === 'Wolves').probability;

  // Wolves are nocturnal: should be more likely at night than during the morning.
  assert.ok(wolvesNight > wolvesMorning);
});

test('buildRegionPool returns empty pool for region with no entities', () => {
  const pool = buildRegionPool('Mordor', PHASE_MORNING, sampleEntities);
  assert.equal(pool.length, 0);
});

test('buildRegionPool boosts intelligent entities on road_major vs off_road', () => {
  const offRoad = buildRegionPool('The Shire', PHASE_MORNING, sampleEntities, undefined, [], 'off_road', 0.5);
  const royal = buildRegionPool('The Shire', PHASE_MORNING, sampleEntities, undefined, [], 'road_major', 0.5);

  const hobbitsOffRoad = offRoad.find((p) => p.entity.name === 'Hobbits').probability;
  const hobbitsRoyal = royal.find((p) => p.entity.name === 'Hobbits').probability;

  // Hobbits are intelligent: should be more likely on royal roads than off_road
  assert.ok(hobbitsRoyal > hobbitsOffRoad, 'Hobbits should be more probable on royal roads');

  // Wolves (carnivores, non-intelligent) should not be affected relatively speaking:
  // their absolute weight is constant but their share changes as hobbits grow
  const wolvesOffRoad = offRoad.find((p) => p.entity.name === 'Wolves').probability;
  const wolvesRoyal = royal.find((p) => p.entity.name === 'Wolves').probability;
  assert.ok(wolvesOffRoad > wolvesRoyal, 'Non-intelligent wolves should have lower share as intelligent entities are boosted');
});

test('buildRegionPool scales intelligent entities with population_ratio', () => {
  const shire = buildRegionPool('The Shire', PHASE_MORNING, sampleEntities, undefined, [], 'trail', 1.0);
  const waste = buildRegionPool('The Shire', PHASE_MORNING, sampleEntities, undefined, [], 'trail', 0.0);

  const hobbitsShire = shire.find((p) => p.entity.name === 'Hobbits').probability;
  const hobbitsWaste = waste.find((p) => p.entity.name === 'Hobbits').probability;

  assert.ok(hobbitsShire > hobbitsWaste, 'Intelligent entities more probable in high-population regions');
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
  const pool = buildRegionPool('The Shire', PHASE_MORNING, sampleEntities);
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
    entities: sampleEntities,
    road_type: 'road',
    population_ratio: 1.0,
  };

  const run = () =>
    simulatePhaseEncounters({
      startHour: 7,
      phaseHours: 6,
      phase: PHASE_MORNING,
      getRegionInfo: () => region,
      rng: createSeededRng(42),
    });

  const a = run();
  const b = run();
  assert.deepEqual(a, b);

  // With 55% chance, we get either 0 or 1 encounter per phase
  assert.ok(a.encounters.length <= 1);
  if (a.encounters.length > 0) {
    assert.equal(a.encounters[0].region, 'The Shire');
    assert.ok(a.encounters[0].entity);
    assert.equal(a.encounters[0].phase, PHASE_MORNING);
  }
  assert.ok(Array.isArray(a.usedEntityIds));
});

test('simulatePhaseEncounters respects ENCOUNTER_CHANCE', () => {
  const region = {
    name: 'The Shire',
    entities: sampleEntities,
    road_type: 'trail',
    population_ratio: 0.5,
  };

  // With RNG that always returns 0.99 (99%), should fail 55% check
  const resultLow = simulatePhaseEncounters({
    startHour: 7,
    phaseHours: 6,
    phase: PHASE_MORNING,
    getRegionInfo: () => region,
    rng: () => 0.99,
  });
  assert.equal(resultLow.encounters.length, 0);

  // With RNG that always returns 0.0 (0%), should pass 55% check
  const resultHigh = simulatePhaseEncounters({
    startHour: 7,
    phaseHours: 6,
    phase: PHASE_MORNING,
    getRegionInfo: () => region,
    rng: () => 0.0,
  });
  assert.equal(resultHigh.encounters.length, 1);
});

test('simulatePhaseEncounters handles null region', () => {
  const result = simulatePhaseEncounters({
    startHour: 7,
    phaseHours: 6,
    phase: PHASE_MORNING,
    getRegionInfo: () => null,
    rng: createSeededRng(42),
  });

  assert.equal(result.encounters.length, 0);
  assert.equal(result.usedEntityIds.length, 0);
});

test('simulatePhaseEncounters excludes entities used in previous phase', () => {
  const region = {
    name: 'The Shire',
    entities: sampleEntities,
    road_type: 'off_road',
    population_ratio: 0.5,
  };

  // Morning phase with RNG that forces encounter
  const morningResult = simulatePhaseEncounters({
    startHour: 7,
    phaseHours: 6,
    phase: PHASE_MORNING,
    getRegionInfo: () => region,
    rng: () => 0.0, // Force encounter
  });

  // Afternoon phase with entities from morning excluded
  const afternoonResult = simulatePhaseEncounters({
    startHour: 13,
    phaseHours: 6,
    phase: PHASE_AFTERNOON,
    getRegionInfo: () => region,
    rng: () => 0.0, // Force encounter
    excludedEntityIds: morningResult.usedEntityIds,
  });

  // Ensure morning phase had an encounter
  assert.equal(morningResult.encounters.length, 1);
  assert.equal(morningResult.usedEntityIds.length, 1);

  // Ensure afternoon phase does not include the same entity
  const afternoonEntityIds = afternoonResult.encounters.map((e) => e.entity.id);
  for (const id of morningResult.usedEntityIds) {
    assert.ok(!afternoonEntityIds.includes(id), `Entity ${id} from morning should not appear in afternoon`);
  }
});

test('simulatePhaseEncounters produces at most one encounter per phase', () => {
  const region = {
    name: 'The Shire',
    entities: sampleEntities,
    road_type: 'road_major',
    population_ratio: 1.0,
  };

  // Test all three phases
  for (const phase of [PHASE_MORNING, PHASE_AFTERNOON, PHASE_NIGHT]) {
    const result = simulatePhaseEncounters({
      startHour: phase === PHASE_MORNING ? 7 : phase === PHASE_AFTERNOON ? 13 : 19,
      phaseHours: phase === PHASE_NIGHT ? 12 : 6,
      phase,
      getRegionInfo: () => region,
      rng: createSeededRng(42),
    });
    assert.ok(result.encounters.length <= 1, `Phase ${phase} should have at most 1 encounter`);
  }
});
