import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  aggregateEffects,
  feltTemperature,
  computeFastingCost,
  resolveDailyFood,
  buildEquipmentBlock,
  resolveLodging,
} from '../inventory.js';
import { TUNING } from '../characterState.js';

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
  assert.deepEqual(agg, { coldShift: 0, restBonus: 0, rations: 0, arrows: 0, meleeTier: 0, rangedTier: 0 });
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

// ---------------------------------------------------------------------------
// buildEquipmentBlock
// ---------------------------------------------------------------------------
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
