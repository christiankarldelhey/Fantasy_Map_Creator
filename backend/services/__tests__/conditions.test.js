import { test } from 'node:test';
import assert from 'node:assert/strict';

import { resolveConditions, CONDITIONS_TUNING, isFatigued, FATIGUE_MENTION_THRESHOLD } from '../character/conditions.js';

// ---------------------------------------------------------------------------
// fatigue
// ---------------------------------------------------------------------------
test('resolveConditions: fatigue rises with distance, combat, tension and interrupted sleep', () => {
  const { fatigue } = resolveConditions({
    previousFatigue: 0,
    distanceKm: 30, // 3 walk units × 4 = 12
    combatCount: 1, // +12
    tensionCount: 1, // +5
    harshWeatherAllDay: true, // +8
    interruptedNight: true, // +10
    restQuality: null,
  });
  assert.equal(fatigue, 12 + 12 + 5 + 8 + 10);
});

test('resolveConditions: fatigue falls with quality rest', () => {
  const { fatigue } = resolveConditions({
    previousFatigue: 50,
    distanceKm: 0,
    restQuality: 3, // -25
  });
  assert.equal(fatigue, 25);
});

test('resolveConditions: fatigue clamps within [0, 100]', () => {
  const low = resolveConditions({ previousFatigue: 5, restQuality: 3 });
  const high = resolveConditions({ previousFatigue: 95, distanceKm: 300, combatCount: 5 });
  assert.equal(low.fatigue, 0);
  assert.equal(high.fatigue, 100);
});

// ---------------------------------------------------------------------------
// wounded
// ---------------------------------------------------------------------------
test('resolveConditions: a new wound outcome sets wounded, worse outcome overrides', () => {
  const first = resolveConditions({ previousWounded: 'none', encounterOutcomes: ['wounded'] });
  assert.equal(first.wounded, 'wounded');

  const worse = resolveConditions({ previousWounded: 'wounded', encounterOutcomes: ['badly wounded'] });
  assert.equal(worse.wounded, 'badly_wounded');
});

test('resolveConditions: a milder outcome does not downgrade an existing wound', () => {
  const { wounded } = resolveConditions({ previousWounded: 'badly_wounded', encounterOutcomes: ['wounded'] });
  assert.equal(wounded, 'badly_wounded');
});

test('resolveConditions: quality rest with no new wound heals one tier', () => {
  const { wounded } = resolveConditions({
    previousWounded: 'badly_wounded',
    encounterOutcomes: ['unscathed'],
    restQuality: CONDITIONS_TUNING.WOUND_HEAL_REST_QUALITY_MIN,
  });
  assert.equal(wounded, 'wounded');
});

test('resolveConditions: poor rest does not heal wounds', () => {
  const { wounded } = resolveConditions({
    previousWounded: 'wounded',
    encounterOutcomes: [],
    restQuality: CONDITIONS_TUNING.WOUND_HEAL_REST_QUALITY_MIN - 1,
  });
  assert.equal(wounded, 'wounded');
});

test('resolveConditions: none stays none with no outcomes', () => {
  const { wounded } = resolveConditions({ previousWounded: 'none', encounterOutcomes: [] });
  assert.equal(wounded, 'none');
});

// ---------------------------------------------------------------------------
// isFatigued
// ---------------------------------------------------------------------------
test('isFatigued respects the mention threshold', () => {
  assert.equal(isFatigued(FATIGUE_MENTION_THRESHOLD), false);
  assert.equal(isFatigued(FATIGUE_MENTION_THRESHOLD + 1), true);
  assert.equal(isFatigued(0), false);
});
