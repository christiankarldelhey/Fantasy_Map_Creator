import { test } from 'node:test';
import assert from 'node:assert/strict';

import { resolveDayState } from '../character/dayState.js';

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

test('commands: unknown/malformed commands are ignored', () => {
  const day = makeDay({
    commands: [{ type: 'nonsense' }, null, 'not-an-object', { type: 'item', slug: 'x', qty: -3 }],
  });
  const r = resolveDayState({ day, startState, effects: baseEffects, inventoryRows: [] });
  assert.deepEqual(r.grants, []);
  assert.equal(r.lodging.coinsAfter, 4);
});
