import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  clamp,
  countCombat,
  countTension,
  sumShadowWeight,
  computeEnergyDelta,
  computeTemperatureEnergyCost,
  computeRestRecoveryMultiplier,
  computeShadowDelta,
  isHarshWeatherAllDay,
  isQuietNight,
  classifyRegionFamilies,
  shadowSpawnFactor,
  energyBand,
  shadowBand,
  buildConditionBlock,
  buildDayNote,
  TUNING,
} from '../characterState.js';

// Helpers
const enc = (form, shadow_weight = 0, name = 'X', phase = 'morning') => ({
  phase,
  interaction: { form },
  entity: { name, shadow_weight },
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

// ---------------------------------------------------------------------------
// energy delta
// ---------------------------------------------------------------------------
test('computeEnergyDelta: walking + combat + tension costs', () => {
  const { delta, parts } = computeEnergyDelta({
    distanceKm: 30,               // 2 units × -2 = -4
    encounters: [enc('attacks'), enc('stalks')], // -15 -5
    restQuality: null,
    harshWeatherAllDay: false,
    quietNight: false,
  });
  assert.equal(parts.walk, -4);
  assert.equal(parts.combat, -15);
  assert.equal(parts.tension, -5);
  assert.equal(delta, -24);
});

test('computeEnergyDelta: rest recovery + quiet night bonus', () => {
  const { delta, parts } = computeEnergyDelta({
    distanceKm: 0,
    encounters: [],
    restQuality: 3,               // +45
    harshWeatherAllDay: true,     // -5
    quietNight: true,             // +10
  });
  assert.equal(parts.recovery, 45);
  assert.equal(parts.weather, -5);
  assert.equal(parts.quietBonus, 10);
  assert.equal(delta, 50);
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

test('computeEnergyDelta: temperature stacks with harsh weather', () => {
  const { delta, parts } = computeEnergyDelta({
    distanceKm: 0,
    encounters: [],
    restQuality: null,
    harshWeatherAllDay: true, // -5
    quietNight: false,
    meanTemperature: 30,      // -3
  });
  assert.equal(parts.weather, -5);
  assert.equal(parts.temperature, -3);
  assert.equal(delta, -8);
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
    restQuality: 1,            // base +15
    quietNight: true,          // base +10
    meanTemperature: -7,       // 0.1x multiplier for unsheltered, plus -8 temp cost
  });
  assert.equal(parts.temperature, -8);
  assert.equal(parts.recovery, 1.5);
  assert.equal(parts.quietBonus, 1);
  assert.equal(delta, -5.5);
});

test('computeEnergyDelta: indoor location keeps full recovery and quiet bonus', () => {
  const { delta, parts } = computeEnergyDelta({
    distanceKm: 0,
    encounters: [],
    restQuality: 1,            // +15
    quietNight: true,          // +10
    meanTemperature: -7,       // -8 temperature cost still applies
    overnightLocation: { indoor: true },
  });
  assert.equal(parts.temperature, -8);
  assert.equal(parts.recovery, 15);
  assert.equal(parts.quietBonus, 10);
  assert.equal(delta, 17);
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
  assert.equal(delta, 28);
});

test('shadow floor rule: negative encounters cannot push below 0', () => {
  const start = 5;
  const { delta } = computeShadowDelta({
    shadowEffect: -2,             // -20
    encounters: [enc('brief_exchange', -4)],
    throughEnemyRegion: false,
    quietFriendlyDay: true,       // -2
  });
  assert.ok(delta < 0);
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
