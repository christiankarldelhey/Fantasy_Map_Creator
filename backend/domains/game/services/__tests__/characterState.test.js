import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  clamp,
  countCombat,
  countTension,
  sumShadowWeight,
  countFriendlyTalks,
  computeEnergyDelta,
  computeTemperatureEnergyCost,
  computeWindEnergyCost,
  computeRestRecoveryMultiplier,
  computeShadowDelta,
  isHarshWeatherAllDay,
  isQuietNight,
  classifyRegionFamilies,
  isSanctuary,
  passedSettlement,
  shadowSpawnFactor,
  energyBand,
  shadowBand,
  buildConditionBlock,
  buildEndStateBlock,
  buildDayNote,
  resolveFate,
  WOUND_COSTS,
  TUNING,
} from '../character/characterState.js';

// Helpers
const enc = (form, shadow_weight = 0, name = 'X', phase = 'morning', entity = null) => ({
  phase,
  interaction: { form },
  entity: entity || { name, shadow_weight, type: 'humans' },
});

// ---------------------------------------------------------------------------
// clamp
// ---------------------------------------------------------------------------
test('clamp keeps values within [0,100] and rounds', () => {
  assert.equal(clamp(120), 100);
  assert.equal(clamp(-5), 0);
  assert.equal(clamp(49.6), 50);
});

// ---------------------------------------------------------------------------
// encounter classification
// ---------------------------------------------------------------------------
test('countCombat / countTension classify forms', () => {
  const list = [enc('attacks'), enc('stalks'), enc('watches'), enc('brief_exchange'), enc('drifts_closer')];
  assert.equal(countCombat(list), 1);
  assert.equal(countTension(list), 3);
});

test('sumShadowWeight sums signed weights', () => {
  const list = [enc('attacks', 8), enc('brief_exchange', -3), enc('scenery', 0)];
  assert.equal(sumShadowWeight(list), 5);
});

test('countFriendlyTalks counts only friendly forms with good, non-evil beings', () => {
  const goodElf = { type: 'elves', shadow_weight: -3 };
  const goodHuman = { type: 'humans', shadow_weight: 0 };
  const evilHuman = { type: 'humans', shadow_weight: 4 };
  assert.equal(countFriendlyTalks([enc('brief_exchange', 0, 'X', 'morning', goodElf)]), 1);
  assert.equal(countFriendlyTalks([enc('brief_exchange', 0, 'X', 'morning', goodHuman)]), 1);
  assert.equal(countFriendlyTalks([enc('brief_exchange', 0, 'X', 'morning', evilHuman)]), 0);
  assert.equal(countFriendlyTalks([enc('attacks', 0, 'X', 'morning', goodHuman)]), 0);
});

// ---------------------------------------------------------------------------
// energy delta
// ---------------------------------------------------------------------------
test('computeEnergyDelta: walking + combat + tension costs', () => {
  const { delta, parts } = computeEnergyDelta({
    distanceKm: 30,               // 3 units × -3 = -9
    encounters: [enc('attacks'), enc('stalks')], // -15 -6
    restQuality: null,
    harshWeatherAllDay: false,
    quietNight: false,
  });
  assert.equal(parts.walk, -9);
  assert.equal(parts.combat, -15);
  assert.equal(parts.tension, -6);
  assert.equal(delta, -30);
});

test('computeEnergyDelta: rest recovery + quiet night bonus', () => {
  const { delta, parts } = computeEnergyDelta({
    distanceKm: 0,
    encounters: [],
    restQuality: 3,               // +30 (trimmed recovery scale)
    harshWeatherAllDay: true,     // -6
    quietNight: true,             // +8
  });
  assert.equal(parts.recovery, 30);
  assert.equal(parts.weather, -6);
  assert.equal(parts.quietBonus, 8);
  assert.equal(delta, 32);
});

// ---------------------------------------------------------------------------
// temperature energy cost
// ---------------------------------------------------------------------------
test('computeTemperatureEnergyCost: normal range and missing data', () => {
  assert.equal(computeTemperatureEnergyCost(15), 0);
  assert.equal(computeTemperatureEnergyCost(5), 0);
  assert.equal(computeTemperatureEnergyCost(null), 0);
  assert.equal(computeTemperatureEnergyCost(undefined), 0);
});

test('computeTemperatureEnergyCost: cold and heat bands', () => {
  assert.equal(computeTemperatureEnergyCost(3), -3);   // 0-5 °C
  assert.equal(computeTemperatureEnergyCost(0), -3);   // 0-5 °C
  assert.equal(computeTemperatureEnergyCost(-2), -5);  // -5-0 °C
  assert.equal(computeTemperatureEnergyCost(-7), -8);  // -10--5 °C
  assert.equal(computeTemperatureEnergyCost(-12), -11); // -15--10 °C
  assert.equal(computeTemperatureEnergyCost(-20), -14); // below -15
  assert.equal(computeTemperatureEnergyCost(30), -3);   // 28-32 °C
  assert.equal(computeTemperatureEnergyCost(34), -6);   // 32-36 °C
  assert.equal(computeTemperatureEnergyCost(38), -9);   // 36-40 °C
  assert.equal(computeTemperatureEnergyCost(45), -12);  // above 40
});

test('computeWindEnergyCost: sustained wind drains energy by bands', () => {
  assert.equal(computeWindEnergyCost(10), 0);
  assert.equal(computeWindEnergyCost(25), -3);
  assert.equal(computeWindEnergyCost(40), -6);
  assert.equal(computeWindEnergyCost(55), -9);
});

test('computeEnergyDelta: soft cap reduces recovery as energy fills up', () => {
  const low = computeEnergyDelta({ distanceKm: 0, encounters: [], restQuality: 3, currentEnergy: 20 });
  const mid = computeEnergyDelta({ distanceKm: 0, encounters: [], restQuality: 3, currentEnergy: 70 });
  const full = computeEnergyDelta({ distanceKm: 0, encounters: [], restQuality: 3, currentEnergy: 95 });
  assert.equal(low.parts.recovery, 30);
  assert.equal(mid.parts.recovery, 15); // (100-70)/60 = 0.5 × 30
  assert.equal(full.parts.recovery, 2.5); // (100-95)/60 ≈ 0.0833 × 30
});

test('computeEnergyDelta: interrupted sleep sharply cuts recovery', () => {
  const { parts } = computeEnergyDelta({
    distanceKm: 0,
    encounters: [],
    restQuality: 3,
    quietNight: false,         // night was not quiet => interrupted
    interruptedNight: true,
    currentEnergy: 20,
  });
  assert.equal(parts.recovery, 12); // 30 × 0.4
});

test('computeEnergyDelta: sanctuary bypasses soft cap', () => {
  const { parts } = computeEnergyDelta({
    distanceKm: 0,
    encounters: [],
    restQuality: 3,
    currentEnergy: 99,
    sanctuary: true,
  });
  assert.equal(parts.recovery, 30);
});

test('computeEnergyDelta: temperature stacks with harsh weather', () => {
  const { delta, parts } = computeEnergyDelta({
    distanceKm: 0,
    encounters: [],
    restQuality: null,
    harshWeatherAllDay: true, // -6
    quietNight: false,
    meanTemperature: 30,      // -3
  });
  assert.equal(parts.weather, -6);
  assert.equal(parts.temperature, -3);
  assert.equal(delta, -9);
});

test('computeRestRecoveryMultiplier: sheltered or mild temperatures keep full recovery', () => {
  assert.equal(computeRestRecoveryMultiplier(15, false), 1);
  assert.equal(computeRestRecoveryMultiplier(2, false), 0.5); // 0-5°C still costs some recovery
  assert.equal(computeRestRecoveryMultiplier(-10, true), 1);
  assert.equal(computeRestRecoveryMultiplier(40, true), 1);
});

test('computeRestRecoveryMultiplier: cold and heat reduce recovery when unsheltered', () => {
  assert.equal(computeRestRecoveryMultiplier(3, false), 0.5);
  assert.equal(computeRestRecoveryMultiplier(-1, false), 0.25);
  assert.equal(computeRestRecoveryMultiplier(-7, false), 0.1);
  assert.equal(computeRestRecoveryMultiplier(-12, false), 0);
  assert.equal(computeRestRecoveryMultiplier(30, false), 0.5);
  assert.equal(computeRestRecoveryMultiplier(34, false), 0.25);
  assert.equal(computeRestRecoveryMultiplier(38, false), 0.1);
});

test('computeEnergyDelta: cold camping reduces recovery and quiet bonus', () => {
  const { delta, parts } = computeEnergyDelta({
    distanceKm: 0,
    encounters: [],
    restQuality: 1,            // base +10
    quietNight: true,          // base +8
    meanTemperature: -7,       // 0.1x multiplier for unsheltered, plus -8 temp cost
  });
  assert.equal(parts.temperature, -8);
  assert.equal(parts.recovery, 1);
  assert.equal(parts.quietBonus, 0.8);
  assert.equal(delta, -6.2);
});

test('computeEnergyDelta: indoor location keeps full recovery and quiet bonus', () => {
  const { delta, parts } = computeEnergyDelta({
    distanceKm: 0,
    encounters: [],
    restQuality: 1,            // +10
    quietNight: true,          // +8
    meanTemperature: -7,       // -8 temperature cost still applies
    overnightLocation: { indoor: true },
  });
  assert.equal(parts.temperature, -8);
  assert.equal(parts.recovery, 10);
  assert.equal(parts.quietBonus, 8);
  assert.equal(delta, 10);
});

// ---------------------------------------------------------------------------
// inventory-related energy delta (no-regression + new params)
// ---------------------------------------------------------------------------
test('computeEnergyDelta: no-regression — new params default to zero', () => {
  const { delta, parts } = computeEnergyDelta({
    distanceKm: 30,
    encounters: [enc('attacks'), enc('stalks')],
    restQuality: null,
    harshWeatherAllDay: false,
    quietNight: false,
  });
  assert.equal(parts.walk, -9);
  assert.equal(parts.combat, -15);
  assert.equal(parts.tension, -6);
  assert.equal(parts.fastingCost, 0);
  assert.equal(delta, -30);
});

test('computeEnergyDelta: cold shift reduces temperature cost', () => {
  const without = computeEnergyDelta({ meanTemperature: -8, restQuality: null });
  const withCloak = computeEnergyDelta({ meanTemperature: -8, coldShift: 6, restQuality: null });
  // -8 → cost band -10..-5 = -8; felt -2 → cost band -5..0 = -5
  assert.equal(without.parts.temperature, -8);
  assert.equal(withCloak.parts.temperature, -5);
  assert.ok(withCloak.delta > without.delta);
});

test('computeEnergyDelta: cold shift improves outdoor rest multiplier', () => {
  const without = computeEnergyDelta({ meanTemperature: -8, restQuality: 1, quietNight: false });
  const withCloak = computeEnergyDelta({ meanTemperature: -8, coldShift: 6, restQuality: 1, quietNight: false });
  // -8 → multiplier 0.1; felt -2 → multiplier 0.25
  assert.ok(withCloak.parts.recovery > without.parts.recovery);
});

test('computeEnergyDelta: cold shift has no effect above threshold', () => {
  const a = computeEnergyDelta({ meanTemperature: 20, coldShift: 6, restQuality: null });
  const b = computeEnergyDelta({ meanTemperature: 20, coldShift: 0, restQuality: null });
  assert.equal(a.delta, b.delta);
});

test('computeEnergyDelta: three days fasting costs more than one', () => {
  const one = computeEnergyDelta({ daysWithoutFood: 1, restQuality: null });
  const three = computeEnergyDelta({ daysWithoutFood: 3, restQuality: null });
  assert.equal(one.parts.fastingCost, -4);
  assert.equal(three.parts.fastingCost, -15);
  assert.ok(three.delta < one.delta);
});

test('computeEnergyDelta: fasting spoils rest recovery', () => {
  const fed = computeEnergyDelta({ restQuality: 3, currentEnergy: 20 });
  const fasting = computeEnergyDelta({ restQuality: 3, currentEnergy: 20, daysWithoutFood: 2 });
  assert.ok(fasting.parts.recovery < fed.parts.recovery);
});

test('computeEnergyDelta: recoveryOverride replaces rest recovery (paid lodging)', () => {
  const { parts } = computeEnergyDelta({
    restQuality: 2,
    currentEnergy: 40,
    recoveryOverride: 30,
  });
  assert.equal(parts.recovery, 30); // no soft cap applied
});

test('computeEnergyDelta: recoveryOverride affected by interrupted sleep', () => {
  const { parts } = computeEnergyDelta({
    restQuality: 2,
    currentEnergy: 40,
    recoveryOverride: 30,
    interruptedNight: true,
  });
  assert.equal(parts.recovery, 12); // 30 × 0.4
});

test('computeEnergyDelta: thirst worsens recovery and adds thirstCost', () => {
  const fed = computeEnergyDelta({ daysWithoutWater: 0, restQuality: 1, quietNight: false });
  const thirsty = computeEnergyDelta({ daysWithoutWater: 2, restQuality: 1, quietNight: false });
  assert.equal(thirsty.parts.thirstCost, -14);
  assert.ok(thirsty.parts.recovery < fed.parts.recovery);
});

test('computeEnergyDelta: drinking enough removes thirst penalties', () => {
  const without = computeEnergyDelta({ daysWithoutWater: 1, restQuality: 1, quietNight: false });
  const withWater = computeEnergyDelta({ daysWithoutWater: 1, drankWater: true, restQuality: 1, quietNight: false });
  assert.equal(withWater.parts.thirstCost, 0);
  assert.ok(withWater.delta > without.delta);
});

test('computeEnergyDelta: consumedFood adds meal bonus', () => {
  const without = computeEnergyDelta({ restQuality: null });
  const withFood = computeEnergyDelta({ restQuality: null, consumedFood: true });
  assert.equal(without.parts.mealBonus, 0);
  assert.equal(withFood.parts.mealBonus, TUNING.MEAL_ENERGY_BONUS);
  assert.equal(withFood.delta - without.delta, TUNING.MEAL_ENERGY_BONUS);
});

test('computeEnergyDelta: meal bonus uses effect_when_used value', () => {
  const base = computeEnergyDelta({ restQuality: null, consumedFood: true });
  const lembas = computeEnergyDelta({ restQuality: null, consumedFood: true, mealEnergyBonus: 12 });
  assert.equal(base.parts.mealBonus, TUNING.MEAL_ENERGY_BONUS);
  assert.equal(lembas.parts.mealBonus, 12);
});

test('computeEnergyDelta: meal bonus reduced by interrupted sleep', () => {
  const { parts } = computeEnergyDelta({
    consumedFood: true,
    interruptedNight: true,
  });
  assert.equal(parts.mealBonus, TUNING.MEAL_ENERGY_BONUS * TUNING.INTERRUPTED_SLEEP_MULTIPLIER);
});

test('computeEnergyDelta: meal bonus not affected by fasting multiplier', () => {
  const fed = computeEnergyDelta({ consumedFood: true, daysWithoutFood: 0 });
  const fasting = computeEnergyDelta({ consumedFood: true, daysWithoutFood: 3 });
  // mealBonus is the same regardless of fasting (eating resets fasting)
  assert.equal(fed.parts.mealBonus, fasting.parts.mealBonus);
});

// ---------------------------------------------------------------------------
// shadow delta + floor rule
// ---------------------------------------------------------------------------
test('computeShadowDelta: overnight × 10 + encounter weights + region', () => {
  const { delta, parts } = computeShadowDelta({
    shadowEffect: 2,                                   // +20
    encounters: [enc('attacks', 8), enc('brief_exchange', -3)], // +5
    throughEnemyRegion: true,                          // +3
    quietFriendlyDay: false,
  });
  assert.equal(parts.overnight, 20);
  assert.equal(parts.encounterSum, 5);
  assert.equal(parts.enemyRegion, 3);
  assert.equal(parts.naturalDecay, 0); // no decay in enemy land
  // brief_exchange with a good human (shadow_weight -3) also triggers friendlyTalk -2
  assert.equal(parts.friendlyTalk, -2);
  assert.equal(delta, 26);
});

test('shadow floor rule: negative encounters cannot push below 0', () => {
  const start = 5;
  const { delta, parts } = computeShadowDelta({
    shadowEffect: -2,             // -20
    encounters: [enc('brief_exchange', -4)],
    throughEnemyRegion: false,
    quietFriendlyDay: true,       // -2
  });
  assert.ok(delta < 0);
  assert.equal(parts.naturalDecay, -1); // gentle drift in non-enemy land
  assert.equal(clamp(start + delta), 0); // clamped at the floor
});

test('energy cannot exceed 100', () => {
  assert.equal(clamp(90 + 45), 100);
});

// ---------------------------------------------------------------------------
// weather helpers
// ---------------------------------------------------------------------------
test('isHarshWeatherAllDay requires rain+wind in every phase', () => {
  const wet = (phase) => ({ phase, climate: { precipitation: 1, wind_speed_10m: 25 } });
  const dry = (phase) => ({ phase, climate: { precipitation: 0, wind_speed_10m: 5 } });
  assert.equal(isHarshWeatherAllDay([wet('morning'), wet('afternoon'), wet('night')]), true);
  assert.equal(isHarshWeatherAllDay([wet('morning'), dry('afternoon'), wet('night')]), false);
  assert.equal(isHarshWeatherAllDay([]), false);
});

test('isQuietNight: false if a nocturnal encounter or a storm', () => {
  assert.equal(isQuietNight([], []), true);
  assert.equal(isQuietNight([enc('attacks', 0, 'X', 'night')], []), false);
  assert.equal(isQuietNight([], [{ climate: { precipitation: 2, wind_speed_10m: 0 } }]), false);
  assert.equal(isQuietNight([], [{ climate: { precipitation: 0, wind_speed_10m: 3 } }]), true);
});

// ---------------------------------------------------------------------------
// region families + spawn factor
// ---------------------------------------------------------------------------
test('classifyRegionFamilies detects enemy and friendly', () => {
  assert.deepEqual(classifyRegionFamilies(['hobbit', 'sindar']), { throughEnemy: false, anyFriendly: true });
  assert.deepEqual(classifyRegionFamilies(['enemy']), { throughEnemy: true, anyFriendly: false });
  assert.deepEqual(classifyRegionFamilies(['dwarven'], ['Moria']), { throughEnemy: true, anyFriendly: true });
  assert.deepEqual(classifyRegionFamilies(['dunadan_north', 'northman']), { throughEnemy: false, anyFriendly: true });
});

test('isSanctuary recognises curated elven havens', () => {
  assert.equal(isSanctuary({ id: 472 }, {}), true);  // Imladris/Rivendell
  assert.equal(isSanctuary({ id: 536 }, {}), true);  // Caras Galadhon
  assert.equal(isSanctuary({ id: 493 }, {}), true);  // Cerin Amroth
  assert.equal(isSanctuary({ id: 482 }, {}), true);  // Mithlond
  assert.equal(isSanctuary({ id: 999 }, {}), false);
  assert.equal(isSanctuary({}, { rest_quality: 4 }), true);
});

test('computeShadowDelta: restful refuge, friendly talk, sanctuary and decay', () => {
  const { delta, parts } = computeShadowDelta({
    shadowEffect: 0,
    encounters: [enc('brief_exchange', 1, 'Elf', 'morning', { type: 'elves', shadow_weight: -3 })],
    throughEnemyRegion: false,
    quietFriendlyDay: false,
    restQuality: 3,
    restInLocation: true,
    restNonEnemy: true,
    sanctuary: true,
  });
  assert.equal(parts.encounterSum, -3); // entity weight
  assert.equal(parts.friendlyTalk, -2); // form-based relief, one friendly talk
  assert.equal(parts.restfulRefuge, -6); // REST_SHADOW_FALL[3]
  assert.equal(parts.sanctuaryFall, -15); // strong sanctuary relief
  assert.equal(parts.naturalDecay, -1); // natural drift in non-enemy land
  assert.ok(delta < 0);
});

test('shadowSpawnFactor bands', () => {
  assert.equal(shadowSpawnFactor(10), 1.0);
  assert.equal(shadowSpawnFactor(30), 1.2);
  assert.equal(shadowSpawnFactor(60), 1.4);
  assert.equal(shadowSpawnFactor(90), 1.6);
});

// ---------------------------------------------------------------------------
// bands + condition block
// ---------------------------------------------------------------------------
test('energyBand / shadowBand thresholds', () => {
  assert.equal(energyBand(90), 'fresh');
  assert.equal(energyBand(60), 'normal');
  assert.equal(energyBand(30), 'worn');
  assert.equal(energyBand(10), 'spent');
  assert.equal(shadowBand(10), 'clear');
  assert.equal(shadowBand(30), 'unease');
  assert.equal(shadowBand(50), 'shadowed');
  assert.equal(shadowBand(80), 'burdened');
});

test('buildConditionBlock omitted when energy normal and shadow clear', () => {
  assert.equal(buildConditionBlock({ characterName: 'Aranath', energy: 65, shadow: 10 }), '');
});

test('buildConditionBlock included and never emits numbers', () => {
  const block = buildConditionBlock({
    characterName: 'Aranath',
    energy: 30,
    shadow: 50,
    recentNotes: ['a fight with the Cave Bear'],
  });
  assert.ok(block.includes("TRAVELLER'S CONDITION"));
  assert.ok(block.includes('Aranath'));
  assert.ok(block.includes('a fight with the Cave Bear'));
  assert.equal(/\b\d+\b/.test(block), false, 'no digits in the block');
});

test('buildConditionBlock mentions a persistent wound even with normal energy/shadow', () => {
  const block = buildConditionBlock({
    characterName: 'Aranath',
    energy: 65,
    shadow: 10,
    wounded: 'wounded',
  });
  assert.notEqual(block, '');
  assert.ok(block.includes('wound'));
});

test('buildConditionBlock badly_wounded uses its own sentence', () => {
  const block = buildConditionBlock({
    characterName: 'Aranath',
    energy: 65,
    shadow: 10,
    wounded: 'badly_wounded',
  });
  assert.ok(block.includes('badly wounded'));
});

// ---------------------------------------------------------------------------
// buildDayNote
// ---------------------------------------------------------------------------
test('buildDayNote prioritises combat, then tension, then rest place', () => {
  assert.equal(
    buildDayNote({ encounters: [enc('attacks', 8, 'the Bear')] }, {}),
    'a fight with the Bear'
  );
  assert.equal(
    buildDayNote({ encounters: [enc('stalks', 5, 'Wargs')] }, {}),
    'Wargs shadowing the road'
  );
  assert.equal(
    buildDayNote(
      { encounters: [], overnight_location: { name: 'Rivendell' } },
      { rest_quality: 3 }
    ),
    "a night's rest at Rivendell"
  );
});

// ---------------------------------------------------------------------------
// resolveFate
// ---------------------------------------------------------------------------
test('resolveFate returns living when thresholds are safe', () => {
  const result = resolveFate({ energy: 50, shadow: 40, encounterOutcomes: ['unscathed'] });
  assert.equal(result.fate, 'living');
  assert.equal(result.status, 'active');
  assert.equal(result.halted, false);
});

test('resolveFate: energy 0 is death by exhaustion', () => {
  const result = resolveFate({ energy: 0, shadow: 30, encounterOutcomes: [] });
  assert.equal(result.fate, 'dead_exhaustion');
  assert.equal(result.status, 'dead');
  assert.equal(result.halted, true);
});

test('resolveFate: shadow 100 is death by shadow corruption', () => {
  const result = resolveFate({ energy: 50, shadow: 100, encounterOutcomes: [] });
  assert.equal(result.fate, 'dead_shadow');
  assert.equal(result.status, 'dead');
  assert.equal(result.halted, true);
});

test('resolveFate: slain takes precedence over exhaustion', () => {
  const result = resolveFate({ energy: 0, shadow: 100, encounterOutcomes: ['slain'] });
  assert.equal(result.fate, 'slain');
});

// ---------------------------------------------------------------------------
// WOUND_COSTS
// ---------------------------------------------------------------------------
test('WOUND_COSTS drained energy for wounded and badly wounded', () => {
  assert.equal(WOUND_COSTS.wounded.energy, -10);
  assert.equal(WOUND_COSTS['badly wounded'].energy, -25);
  assert.equal(WOUND_COSTS.unscathed.energy, 0);
});

// ---------------------------------------------------------------------------
// buildEndStateBlock
// ---------------------------------------------------------------------------
test('buildEndStateBlock is empty when the character is alive', () => {
  assert.equal(buildEndStateBlock('living', 'Aranath'), '');
});

test('buildEndStateBlock contains shadow corruption wording for dead_shadow', () => {
  const block = buildEndStateBlock('dead_shadow', 'Aranath');
  assert.ok(block.includes('shadow'));
  assert.ok(block.includes('corruption'));
  assert.ok(block.includes('Aranath'));
});

// ---------------------------------------------------------------------------
// passedSettlement — resupply opportunity
// ---------------------------------------------------------------------------
test('passedSettlement: sleeping indoors counts', () => {
  assert.equal(passedSettlement({ overnight_location: { indoor: true }, locations: [] }), true);
});

test('passedSettlement: a town within reach of the leg counts', () => {
  assert.equal(passedSettlement({ locations: [{ type: 'town', distance_km: 3 }] }), true);
});

test('passedSettlement: a town too far off the road does not count', () => {
  assert.equal(passedSettlement({ locations: [{ type: 'town', distance_km: 40 }] }), false);
});

test('passedSettlement: ruins and watchtowers are not resupply points', () => {
  assert.equal(passedSettlement({ locations: [{ type: 'ruins', distance_km: 1 }, { type: 'watchtower', distance_km: 2 }] }), false);
});

test('passedSettlement: an empty day is false and does not throw', () => {
  assert.equal(passedSettlement({}), false);
  assert.equal(passedSettlement(null), false);
});
