import { test } from 'node:test';
import assert from 'node:assert/strict';

import { resolveDayState } from '../character/dayState.js';
import { TUNING } from '../character/characterState.js';

// Minimal day: walked a stretch, quiet night, no settlements, mild weather.
function makeDay(overrides = {}) {
  return {
    day_number: 1,
    distance_km: 18,
    encounters: [],
    regions: [{ name: 'Testland', cultural_family: null }],
    climate: [],
    biomes: [],
    locations: [],
    water_crossings: [],
    water_sources: [],
    overnight_location: null,
    overnight_interaction: { rest_quality: 2, shadow_effect: 0 },
    commands: [],
    ...overrides,
  };
}

const startState = {
  energy: 60,
  shadow: 10,
  coins: 4,
  days_without_food: 2,
  days_without_water: 0,
  fatigue: 0,
  wounded: 'none',
};

const baseEffects = {
  coldShift: 0,
  restBonus: 0,
  rations: 0,
  waterHeld: 0.5,
  waterCapacity: 3,
};

// ---------------------------------------------------------------------------
// C27: day.commands — encounter gifts the host applies outright
// ---------------------------------------------------------------------------

test('commands: a meal gift feeds the traveller without a ration', () => {
  const day = makeDay({
    commands: [{ type: 'meal', hour_float: 14, food: "the farm wife's soup" }],
  });
  const r = resolveDayState({ day, startState, effects: baseEffects, inventoryRows: [] });
  const midday = r.meals.find((m) => m.slot === 'midday');
  assert.equal(midday.provided, true);
  assert.equal(midday.food, "the farm wife's soup");
  // Half fed: the streak holds but does not grow.
  assert.equal(r.food.newDaysWithoutFood, 2);
  assert.equal(r.food.consumed, true);
});

test('commands: meal slot follows the encounter hour', () => {
  const day = makeDay({
    commands: [{ type: 'meal', hour_float: 17.5, food: 'a share of the pot' }],
  });
  const r = resolveDayState({ day, startState, effects: baseEffects, inventoryRows: [] });
  assert.equal(r.meals.find((m) => m.slot === 'evening').provided, true);
  assert.equal(r.meals.find((m) => m.slot === 'midday').provided ?? null, null);
});

test('commands: water_refill tops the skin and clears the thirst streak', () => {
  const day = makeDay({
    commands: [{ type: 'water_refill' }],
  });
  const r = resolveDayState({
    day,
    startState: { ...startState, days_without_water: 2 },
    effects: baseEffects,
    inventoryRows: [],
  });
  assert.equal(r.water.refilled, true);
  assert.equal(r.water.waterAfter, baseEffects.waterCapacity);
  assert.equal(r.water.newDaysWithoutWater, 0);
});

test('commands: a coin gift lands before lodging and can pay the bed', () => {
  const day = makeDay({
    commands: [{ type: 'coins', amount: 10 }],
    overnight_location: { name: 'Inn', type: 'inn', indoor: true },
    overnight_interaction: { region: { cultural_family: null, name: 'Testland' }, rest_quality: 2 },
  });
  const r = resolveDayState({ day, startState, effects: baseEffects, inventoryRows: [] });
  // 4 + 10 gifted → pays the 5-coin bed.
  assert.equal(r.lodging.paid, true);
  assert.equal(r.lodging.coinsAfter, 9);
});

test('commands: item grants surface for persistence', () => {
  const day = makeDay({
    commands: [{ type: 'item', slug: 'common_arrows', qty: 8 }],
  });
  const r = resolveDayState({ day, startState, effects: baseEffects, inventoryRows: [] });
  assert.deepEqual(r.grants, [{ slug: 'common_arrows', qty: 8 }]);
});

test('commands: heal steps the wound down a tier', () => {
  // rest_quality 0 so the night's own healing does not mask the gift.
  const day = makeDay({
    commands: [{ type: 'heal' }],
    overnight_interaction: { rest_quality: 0, shadow_effect: 0 },
  });
  const r = resolveDayState({
    day,
    startState: { ...startState, wounded: 'badly_wounded' },
    effects: baseEffects,
    inventoryRows: [],
  });
  assert.equal(r.conditions.wounded, 'wounded');
});

test('commands: heal on an unwounded traveller is a no-op', () => {
  const day = makeDay({ commands: [{ type: 'heal' }] });
  const r = resolveDayState({ day, startState, effects: baseEffects, inventoryRows: [] });
  assert.equal(r.conditions.wounded, 'none');
});

// ---------------------------------------------------------------------------
// #83: paid board is bought, not given
// ---------------------------------------------------------------------------

test('lodging: a paid inn board marks meals paid, never provided', () => {
  const day = makeDay({
    overnight_location: { name: 'Inn', type: 'inn', indoor: true },
    overnight_interaction: { region: { cultural_family: null, name: 'Testland' }, rest_quality: 2 },
  });
  const r = resolveDayState({
    day,
    startState: { ...startState, coins: 10 },
    effects: baseEffects,
    inventoryRows: [],
  });
  assert.equal(r.lodging.paid, true);
  assert.equal(r.meals.every((m) => !m.provided && m.paid === true), true);
  // They still ate: the meal events report eaten, sourced to the tavern.
  const mealEvents = r.dayEvents.filter((e) => e.type === 'meal');
  assert.equal(mealEvents.length > 0, true);
  assert.equal(mealEvents.every((e) => e.eaten === true && e.source === 'tavern'), true);
});

test('commands: unknown/malformed commands are ignored', () => {
  const day = makeDay({
    commands: [{ type: 'nonsense' }, null, 'not-an-object', { type: 'item', slug: 'x', qty: -3 }],
  });
  const r = resolveDayState({ day, startState, effects: baseEffects, inventoryRows: [] });
  assert.deepEqual(r.grants, []);
  assert.equal(r.lodging.coinsAfter, 4);
});

// ---------------------------------------------------------------------------
// Forced halt — nobody walks themselves dead
// ---------------------------------------------------------------------------

test('halt: a traveller who wakes spent does not march', () => {
  const r = resolveDayState({
    day: makeDay(),
    startState: { ...startState, energy: 10, days_without_food: 0 },
    effects: baseEffects,
    inventoryRows: [],
  });
  assert.equal(r.halted, true);
  assert.equal(r.fate.fate, 'living');
  // The march is waived: opening + the night's own share (rest ~20,
  // quiet-night ~8 — deprivation multipliers do not apply here).
  assert.ok(r.newEnergy > 10);
  assert.ok(r.dayEvents.some((e) => e.type === 'halt'));
});

test('halt: the rest comes early when the march would empty the body', () => {
  const r = resolveDayState({
    day: makeDay({ distance_km: 30, biomes: [{ type: 'desert' }] }),
    startState: {
      ...startState,
      energy: 26,
      days_without_food: 3,
      days_without_water: 3,
    },
    effects: { ...baseEffects, rations: 0, waterHeld: 0 },
    inventoryRows: [],
  });
  // 26 − walk(9) − fasting(15) − thirst(22) lands far below zero: the
  // halt is what stands between the traveller and dead_exhaustion.
  assert.equal(r.halted, true);
  assert.equal(r.fate.fate, 'living');
  // What remains is only what the night gives back — small, but alive.
  assert.ok(r.newEnergy > 0 && r.newEnergy < 26);
  assert.ok(r.dayEvents.some((e) => e.type === 'halt'));
});

test('halt: a night that gives nothing back is the extreme that kills', () => {
  const r = resolveDayState({
    day: makeDay({
      distance_km: 30,
      biomes: [{ type: 'desert' }],
      climate: [{ climate: { temperature_2m: -20, wind_speed_10m: 5, precipitation: 0 } }],
      rng: () => 0.01, // the worst die: the freezing check is lost too
      overnight_interaction: { rest_quality: 0, shadow_effect: 0 },
    }),
    startState: {
      ...startState,
      energy: 26,
      skill_endurance: 0,
      days_without_food: 3,
      days_without_water: 3,
    },
    effects: { ...baseEffects, rations: 0, waterHeld: 0 },
    inventoryRows: [],
  });
  // The halt cannot save a night that returns nothing at −20°C.
  assert.equal(r.fate.fate, 'dead_exhaustion');
});

// ---------------------------------------------------------------------------
// Freezing-night endurance check
// ---------------------------------------------------------------------------

const FROZEN_CLIMATE = (temp) => [{
  climate: { temperature_2m: temp, wind_speed_10m: 5, precipitation: 0 },
}];

test('cold check: a freezing unsheltered night rolls endurance — a loss loses the night', () => {
  const day = makeDay({
    climate: FROZEN_CLIMATE(-5),
    rng: () => 0.01, // roll 1: the worst possible die
  });
  const r = resolveDayState({
    day,
    startState: { ...startState, skill_endurance: 0, days_without_food: 0 },
    effects: baseEffects,
    inventoryRows: [],
  });
  assert.equal(r.coldCheck.success, false);
  // restMultiplier 0 + the freezing cost: far less than a rested 60.
  assert.ok(r.newEnergy < r.openingEnergy - TUNING.FREEZING_NIGHT_COST);
});

test('cold check: a warm cloak (coldShift) spares the roll entirely', () => {
  const day = makeDay({
    climate: FROZEN_CLIMATE(-5),
    rng: () => 0.01,
  });
  const r = resolveDayState({
    day,
    startState: { ...startState, skill_endurance: 0, days_without_food: 0 },
    effects: { ...baseEffects, coldShift: 12 }, // felt -5 + 12 = 7°C
    inventoryRows: [],
  });
  assert.equal(r.coldCheck, null);
});

test('cold check: an indoor bed never rolls — a roof is the point of a roof', () => {
  const day = makeDay({
    climate: FROZEN_CLIMATE(-20),
    overnight_location: { name: 'Inn', type: 'inn', indoor: true },
    overnight_interaction: { region: { cultural_family: null, name: 'Testland' }, rest_quality: 2 },
    rng: () => 0.01,
  });
  const r = resolveDayState({
    day,
    startState: { ...startState, coins: 10, skill_endurance: 0, days_without_food: 0 },
    effects: baseEffects,
    inventoryRows: [],
  });
  assert.equal(r.coldCheck, null);
});

test('cold check: a bad miss leaves a wound — frostbite, not death', () => {
  const day = makeDay({
    climate: FROZEN_CLIMATE(-10),
    rng: () => 0.01, // roll 1 vs difficulty 6 → margin -5
  });
  const r = resolveDayState({
    day,
    startState: { ...startState, skill_endurance: 0, days_without_food: 0, wounded: 'none' },
    effects: baseEffects,
    inventoryRows: [],
  });
  assert.equal(r.conditions.wounded, 'wounded');
  assert.equal(r.fate.fate, 'living');
});
