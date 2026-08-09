import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  aggregateEffects,
  feltTemperature,
  computeFastingCost,
  computeThirstCost,
  computeWaterNeed,
  resolveDailyFood,
  resolveDailyMeals,
  chooseDailyMeal,
  chooseMealItems,
  resolveDailyWater,
  buildEquipmentBlock,
  resolveLodging,
} from '../character/inventory.js';
import { TUNING } from '../character/characterState.js';

// ---------------------------------------------------------------------------
// aggregateEffects
// ---------------------------------------------------------------------------
test('aggregateEffects sums cold_shift from garments', () => {
  const rows = [
    { category: 'garment', qty: 1, condition: 3, equipped: true, effects: { cold_shift: 3 } },
    { category: 'garment', qty: 1, condition: 3, equipped: true, effects: { cold_shift: 6 } },
  ];
  const agg = aggregateEffects(rows);
  assert.equal(agg.coldShift, 9);
});

test('aggregateEffects scales cold_shift by condition', () => {
  const rows = [
    { category: 'garment', qty: 1, condition: 1, equipped: true, effects: { cold_shift: 6 } },
  ];
  const agg = aggregateEffects(rows);
  assert.equal(agg.coldShift, 2); // 6 * (1/3) = 2
});

test('aggregateEffects caps cold_shift at MAX_COLD_SHIFT', () => {
  const rows = [
    { category: 'garment', qty: 1, condition: 3, equipped: true, effects: { cold_shift: 8 } },
    { category: 'garment', qty: 1, condition: 3, equipped: true, effects: { cold_shift: 6 } },
  ];
  const agg = aggregateEffects(rows);
  assert.equal(agg.coldShift, TUNING.MAX_COLD_SHIFT);
});

test('aggregateEffects counts rations by qty', () => {
  const rows = [
    { category: 'provision', qty: 5, condition: 3, equipped: false, effects: { rations: 1 } },
    { category: 'provision', qty: 2, condition: 3, equipped: false, effects: { rations: 1 } },
  ];
  const agg = aggregateEffects(rows);
  assert.equal(agg.rations, 7);
});

test('aggregateEffects counts arrows by qty', () => {
  const rows = [
    { category: 'ammunition', qty: 12, condition: 3, equipped: false, effects: { ammunition: 'arrow' } },
  ];
  const agg = aggregateEffects(rows);
  assert.equal(agg.arrows, 12);
});

test('aggregateEffects only counts equipped weapon tiers', () => {
  const rows = [
    { category: 'weapon', qty: 1, condition: 3, equipped: true, effects: { melee_tier: 2 } },
    { category: 'weapon', qty: 1, condition: 3, equipped: false, effects: { melee_tier: 3 } },
  ];
  const agg = aggregateEffects(rows);
  assert.equal(agg.meleeTier, 2); // only equipped counts
});

test('aggregateEffects sums rest_bonus from tools', () => {
  const rows = [
    { category: 'tool', qty: 1, condition: 3, equipped: false, effects: { rest_bonus: 1 } },
  ];
  const agg = aggregateEffects(rows);
  assert.equal(agg.restBonus, 1);
});

test('aggregateEffects returns zeros for empty inventory', () => {
  const agg = aggregateEffects([]);
  assert.deepEqual(agg, { coldShift: 0, restBonus: 0, rations: 0, arrows: 0, meleeTier: 0, rangedTier: 0, waterCapacity: 0, waterHeld: 0, totalWeightKg: 0, containerRowId: null });
});

// ---------------------------------------------------------------------------
// feltTemperature
// ---------------------------------------------------------------------------
test('feltTemperature adds coldShift below threshold', () => {
  assert.equal(feltTemperature(-8, 6), -2);
});

test('feltTemperature does nothing above threshold', () => {
  assert.equal(feltTemperature(20, 6), 20);
});

test('feltTemperature passes through null', () => {
  assert.equal(feltTemperature(null, 6), null);
});

test('feltTemperature at threshold does nothing', () => {
  assert.equal(feltTemperature(15, 6), 15);
});

// ---------------------------------------------------------------------------
// computeFastingCost
// ---------------------------------------------------------------------------
test('computeFastingCost returns 0 when not fasting', () => {
  assert.equal(computeFastingCost(0), 0);
});

test('computeFastingCost escalates with days', () => {
  assert.equal(computeFastingCost(1), -4);
  assert.equal(computeFastingCost(2), -9);
  assert.equal(computeFastingCost(3), -15);
  assert.equal(computeFastingCost(5), -15); // capped at last band
});

// ---------------------------------------------------------------------------
// resolveDailyFood
// ---------------------------------------------------------------------------
test('resolveDailyFood consumes a ration and resets streak', () => {
  const result = resolveDailyFood({ rations: 3, daysWithoutFood: 2 });
  assert.equal(result.consumed, true);
  assert.equal(result.newDaysWithoutFood, 0);
  assert.equal(result.rationsAfter, 2);
});

test('resolveDailyFood increments streak when no rations', () => {
  const result = resolveDailyFood({ rations: 0, daysWithoutFood: 1 });
  assert.equal(result.consumed, false);
  assert.equal(result.newDaysWithoutFood, 2);
  assert.equal(result.rationsAfter, 0);
});

test('chooseDailyMeal respects priority and saves lembas for last', () => {
  const rows = [
    { id: 1, slug: 'lembas', category: 'provision', qty: 1, effect_when_used: { category: 'energy', value: 12 } },
    { id: 2, slug: 'dried_meat', category: 'provision', qty: 1, effect_when_used: { category: 'energy', value: 8 } },
    { id: 3, slug: 'trail_rations', category: 'provision', qty: 1, effect_when_used: { category: 'energy', value: 8 } },
    { id: 4, slug: 'cheese_wheel', category: 'provision', qty: 1, effect_when_used: { category: 'energy', value: 8 } },
  ];
  assert.equal(chooseDailyMeal(rows).slug, 'dried_meat');
  assert.equal(chooseDailyMeal([rows[0], rows[2], rows[3]]).slug, 'cheese_wheel');
  assert.equal(chooseDailyMeal([rows[0]]).slug, 'lembas');
});

test('resolveDailyFood uses effect_when_used for the energy bonus', () => {
  const rows = [
    { id: 1, slug: 'dried_meat', category: 'provision', qty: 1, effect_when_used: { category: 'energy', value: 8 } },
  ];
  const result = resolveDailyFood({ rations: 1, daysWithoutFood: 0, rows });
  assert.equal(result.consumed, true);
  assert.equal(result.energyBonus, 8);
});

// ---------------------------------------------------------------------------
// resolveDailyMeals — two meals a day
// ---------------------------------------------------------------------------
const provision = (id, slug, value = 8, qty = 1) => ({
  id,
  slug,
  category: 'provision',
  qty,
  prose_singular: `a portion of ${slug.replace(/_/g, ' ')}`,
  effect_when_used: { category: 'energy', value },
});

test('chooseMealItems respects the quantity actually carried', () => {
  const rows = [provision(1, 'dried_meat', 8, 1), provision(2, 'trail_rations', 8, 3)];
  const picks = chooseMealItems(rows, 2);
  assert.deepEqual(picks.map((r) => r.slug), ['dried_meat', 'trail_rations']);
});

test('chooseMealItems can eat the same provision twice', () => {
  const rows = [provision(2, 'trail_rations', 8, 3)];
  const picks = chooseMealItems(rows, 2);
  assert.deepEqual(picks.map((r) => r.id), [2, 2]);
});

test('resolveDailyMeals fills midday and evening and splits the energy', () => {
  const rows = [provision(1, 'dried_meat', 8, 1), provision(2, 'trail_rations', 8, 3)];
  const r = resolveDailyMeals({ rations: 4, daysWithoutFood: 2, rows, waterDrunk: 0.75 });
  assert.deepEqual(r.meals.map((m) => m.slot), ['midday', 'evening']);
  assert.equal(r.meals[0].food, 'a portion of dried meat');
  assert.equal(r.meals[0].waterLitres, 0.375);
  assert.equal(r.energyBonus, 8); // 4 + 4
  assert.equal(r.newDaysWithoutFood, 0);
  assert.equal(r.rationsAfter, 2);
  assert.deepEqual(r.itemIds, [1, 2]);
});

test('resolveDailyMeals with a single ration only fills midday and holds the streak', () => {
  const rows = [provision(1, 'dried_meat', 8, 1)];
  const r = resolveDailyMeals({ rations: 1, daysWithoutFood: 2, rows, waterDrunk: 0 });
  assert.equal(r.meals[0].food, 'a portion of dried meat');
  assert.equal(r.meals[1].food, null);
  assert.equal(r.energyBonus, 4);
  assert.equal(r.newDaysWithoutFood, 2); // unchanged: half fed
  assert.equal(r.rationsAfter, 0);
});

test('resolveDailyMeals with nothing to eat grows the hunger streak', () => {
  const r = resolveDailyMeals({ rations: 0, daysWithoutFood: 1, rows: [], waterDrunk: 0 });
  assert.equal(r.consumed, false);
  assert.equal(r.newDaysWithoutFood, 2);
  assert.deepEqual(r.itemIds, []);
});

test('resolveDailyMeals at a paid inn feeds both meals without spending rations', () => {
  const rows = [provision(1, 'dried_meat', 8, 2)];
  const r = resolveDailyMeals({ rations: 2, daysWithoutFood: 3, rows, waterDrunk: 1, tavernMeal: true });
  assert.equal(r.consumed, true);
  assert.equal(r.rationsAfter, 2);
  assert.equal(r.newDaysWithoutFood, 0);
  assert.deepEqual(r.itemIds, []);
  assert.ok(r.meals.every((m) => m.food));
});

// ---------------------------------------------------------------------------
// buildEquipmentBlock
// ---------------------------------------------------------------------------
test('buildEquipmentBlock heading is in English', () => {
  const result = buildEquipmentBlock({ coldShift: 0, meanTemperature: -5, rations: 1, daysWithoutFood: 3, coins: 3 });
  assert.ok(result.startsWith('=== EQUIPAGE ==='));
});

test('buildEquipmentBlock returns empty string when nothing crosses threshold', () => {
  const result = buildEquipmentBlock({
    coldShift: 6,
    meanTemperature: -5,
    rations: 7,
    daysWithoutFood: 0,
    coins: 100,
    turnedAway: false,
  });
  assert.equal(result, '');
});

test('buildEquipmentBlock never contains digits', () => {
  const result = buildEquipmentBlock({
    coldShift: 0,
    meanTemperature: -5,
    rations: 1,
    daysWithoutFood: 3,
    coins: 3,
    turnedAway: false,
  });
  assert.ok(result.length > 0);
  assert.doesNotMatch(result, /\d/);
});

test('computeWaterNeed scales with temperature bands', () => {
  assert.equal(computeWaterNeed(-5), 0.5);
  assert.equal(computeWaterNeed(10), 0.75);
  assert.equal(computeWaterNeed(25), 1.0);
  assert.equal(computeWaterNeed(35), 1.5);
});

test('computeThirstCost escalates faster than hunger', () => {
  assert.equal(computeThirstCost(1), -6);
  assert.equal(computeThirstCost(2), -14);
  assert.equal(computeThirstCost(3), -22);
});

test('resolveDailyWater refills from a source', () => {
  const r = resolveDailyWater({ waterHeld: 0, capacity: 1, meanTemperature: 20, refillAvailable: true, rainMm: 0, frozen: false, daysWithoutWater: 0 });
  assert.equal(r.refilled, true);
  assert.equal(r.waterAfter, 0.25); // 1 capacity - 0.75 need
  assert.equal(r.newDaysWithoutWater, 0);
});

test('resolveDailyWater tops up from rain', () => {
  const r = resolveDailyWater({ waterHeld: 0.2, capacity: 1, meanTemperature: 20, refillAvailable: false, rainMm: TUNING.RAIN_REFILL_MM, frozen: false, daysWithoutWater: 1 });
  assert.equal(r.drank, 0.45); // 0.2 + 0.25 rain, all of it is drunk
  assert.equal(r.waterAfter, 0); // nothing left
  assert.equal(r.newDaysWithoutWater, 1); // still short of 0.75 need
});

test('resolveDailyWater keeps thirst streak when no water', () => {
  const r = resolveDailyWater({ waterHeld: 0, capacity: 1, meanTemperature: 20, refillAvailable: false, rainMm: 0, frozen: false, daysWithoutWater: 2 });
  assert.equal(r.drank, 0);
  assert.equal(r.newDaysWithoutWater, 3);
});

test('buildEquipmentBlock emits thirst and hunger', () => {
  const block = buildEquipmentBlock({
    coldShift: 6,
    meanTemperature: -5,
    rations: 7,
    daysWithoutFood: 3,
    daysWithoutWater: 2,
    waterHeld: 0,
    waterCapacity: 1,
    coins: 100,
    turnedAway: false,
  });
  assert.ok(block.includes('thirst') || block.includes('throat') || block.includes('waterskin') || block.includes('lips'));
  assert.ok(block.includes('hunger') || block.includes('hollow') || block.includes('neither food'));
  assert.equal(block.match(/\d+/g), null);
});

test('buildEquipmentBlock mentions turned away', () => {
  const result = buildEquipmentBlock({
    coldShift: 6,
    meanTemperature: -5,
    rations: 7,
    daysWithoutFood: 0,
    coins: 0,
    turnedAway: true,
  });
  assert.ok(result.includes('turned away'));
});

// ---------------------------------------------------------------------------
// resolveLodging
// ---------------------------------------------------------------------------
test('resolveLodging: no overnight location → camp, nothing changes', () => {
  const result = resolveLodging({ overnightLocation: null, overnightInteraction: null, coins: 50, currentEnergy: 50 });
  assert.equal(result.paid, false);
  assert.equal(result.cost, 0);
  assert.equal(result.coinsAfter, 50);
  assert.equal(result.sheltered, false);
  assert.equal(result.turnedAway, false);
});

test('resolveLodging: outdoor location → camp, nothing changes', () => {
  const result = resolveLodging({ overnightLocation: { indoor: false }, overnightInteraction: null, coins: 50, currentEnergy: 50 });
  assert.equal(result.paid, false);
  assert.equal(result.sheltered, false);
  assert.equal(result.turnedAway, false);
});

test('resolveLodging: sanctuary → free, sheltered, no override', () => {
  const result = resolveLodging({ overnightLocation: { indoor: true }, overnightInteraction: null, coins: 50, currentEnergy: 50, sanctuary: true });
  assert.equal(result.paid, false);
  assert.equal(result.cost, 0);
  assert.equal(result.coinsAfter, 50);
  assert.equal(result.sheltered, true);
  assert.equal(result.turnedAway, false);
  assert.equal(result.recoveryOverride, null);
});

test('resolveLodging: indoor with coins → pays 5, recovers half of missing', () => {
  const result = resolveLodging({ overnightLocation: { indoor: true }, overnightInteraction: { region: { cultural_family: 'northman' } }, coins: 50, currentEnergy: 40 });
  assert.equal(result.paid, true);
  assert.equal(result.cost, TUNING.LODGING_COST);
  assert.equal(result.coinsAfter, 45);
  assert.equal(result.sheltered, true);
  assert.equal(result.turnedAway, false);
  assert.equal(result.recoveryOverride, 30); // (100 - 40) * 0.5 = 30
});

test('resolveLodging: indoor with coins at high energy → small recovery', () => {
  const result = resolveLodging({ overnightLocation: { indoor: true }, overnightInteraction: { region: { cultural_family: 'northman' } }, coins: 50, currentEnergy: 90 });
  assert.equal(result.recoveryOverride, 5); // (100 - 90) * 0.5 = 5
});

test('resolveLodging: no coins, friendly family → charity shelter', () => {
  const result = resolveLodging({ overnightLocation: { indoor: true }, overnightInteraction: { region: { cultural_family: 'hobbit' } }, coins: 0, currentEnergy: 50 });
  assert.equal(result.paid, false);
  assert.equal(result.cost, 0);
  assert.equal(result.coinsAfter, 0);
  assert.equal(result.restQuality, TUNING.UNPAID_FRIENDLY_REST_QUALITY);
  assert.equal(result.sheltered, true);
  assert.equal(result.turnedAway, false);
});

test('resolveLodging: no coins, hostile family → turned away', () => {
  const result = resolveLodging({ overnightLocation: { indoor: true }, overnightInteraction: { region: { cultural_family: 'enemy' } }, coins: 0, currentEnergy: 50 });
  assert.equal(result.paid, false);
  assert.equal(result.sheltered, false);
  assert.equal(result.turnedAway, true);
});

test('resolveLodging: no coins, indifferent family → turned away', () => {
  const result = resolveLodging({ overnightLocation: { indoor: true }, overnightInteraction: { region: { cultural_family: 'easterling' } }, coins: 0, currentEnergy: 50 });
  assert.equal(result.turnedAway, true);
  assert.equal(result.sheltered, false);
});
