// ============================================================================
// Persistent conditions — the causes behind the traveller's energy level
// ----------------------------------------------------------------------------
// Energy (in characterState.js) is still computed the same way it always was:
// computeEnergyDelta already folds in distance, combat, tension, weather and
// rest quality into a single number, and that formula is battle-tested.
//
// This module adds a SEPARATE, persistent layer on top: fatigue (physical
// tiredness that accumulates day over day) and wounded (a lingering injury
// state, distinct from the one-off wound energy cost applied per encounter).
// Hunger and thirst are NOT tracked here — they already exist as
// days_without_food / days_without_water and are read directly where needed.
//
// These conditions are informational today (surfaced in the prompt and in
// CharacterPage) and are the foundation for skillCheck.js modifiers later.
// Pure and testable: no DB access happens in this file.
// ============================================================================

import { TUNING, clamp } from './characterState.js';

// ---------------------------------------------------------------------------
// TUNING — kept separate from characterState.TUNING since these are a new,
// still-simple mechanic. Merge into the main TUNING block later if desired.
// ---------------------------------------------------------------------------
export const CONDITIONS_TUNING = {
  // Fatigue rise (per day), simple additive causes.
  FATIGUE_RISE_PER_WALK_UNIT: 4,      // per TUNING.WALK_KM_UNIT of distance
  FATIGUE_RISE_PER_COMBAT: 12,
  FATIGUE_RISE_PER_TENSION: 5,
  FATIGUE_RISE_HARSH_WEATHER: 8,
  FATIGUE_RISE_INTERRUPTED_NIGHT: 10,
  // Fatigue fall (per day), indexed by resolved rest_quality (0..3).
  FATIGUE_FALL_REST_QUALITY: [0, 5, 15, 25],
  // A night of rest_quality >= this, with no new wound, heals wounded one tier.
  WOUND_HEAL_REST_QUALITY_MIN: 2,
};

// Ordered from best to worst so we can compare severity.
export const WOUND_ORDER = ['none', 'wounded', 'badly_wounded'];

// Maps interaction outcome strings (as returned by rollResistance /
// tallyWoundCosts) to the persistent condition's enum values.
const OUTCOME_TO_CONDITION = {
  unscathed: 'none',
  wounded: 'wounded',
  'badly wounded': 'badly_wounded',
  slain: 'badly_wounded', // the trip ends anyway; keep the enum well-formed
};

function worstOutcome(outcomes) {
  let worst = 'none';
  for (const o of outcomes || []) {
    const mapped = OUTCOME_TO_CONDITION[o] || 'none';
    if (WOUND_ORDER.indexOf(mapped) > WOUND_ORDER.indexOf(worst)) worst = mapped;
  }
  return worst;
}

/**
 * Resolve the day's persistent conditions from the previous state and the
 * day's already-computed drivers (distance, encounters, weather, rest).
 *
 * @param {Object} p
 * @param {number} [p.previousFatigue=0]
 * @param {string} [p.previousWounded='none']
 * @param {number} [p.distanceKm=0]
 * @param {Array<string>} [p.encounterOutcomes=[]] - outcomes from the day's encounters
 * @param {number} [p.combatCount=0]
 * @param {number} [p.tensionCount=0]
 * @param {boolean} [p.harshWeatherAllDay=false]
 * @param {boolean} [p.interruptedNight=false]
 * @param {number|null} [p.restQuality=null] - resolved overnight rest_quality (0..3)
 * @returns {{ fatigue:number, wounded:string }}
 */
export function resolveConditions({
  previousFatigue = 0,
  previousWounded = 'none',
  distanceKm = 0,
  encounterOutcomes = [],
  combatCount = 0,
  tensionCount = 0,
  harshWeatherAllDay = false,
  interruptedNight = false,
  restQuality = null,
}) {
  // --- Fatigue: rises with exertion, falls with quality rest. ---
  const walkUnits = Math.round((distanceKm || 0) / TUNING.WALK_KM_UNIT);
  let fatigueDelta = walkUnits * CONDITIONS_TUNING.FATIGUE_RISE_PER_WALK_UNIT;
  fatigueDelta += combatCount * CONDITIONS_TUNING.FATIGUE_RISE_PER_COMBAT;
  fatigueDelta += tensionCount * CONDITIONS_TUNING.FATIGUE_RISE_PER_TENSION;
  if (harshWeatherAllDay) fatigueDelta += CONDITIONS_TUNING.FATIGUE_RISE_HARSH_WEATHER;
  if (interruptedNight) fatigueDelta += CONDITIONS_TUNING.FATIGUE_RISE_INTERRUPTED_NIGHT;

  const restFall = restQuality != null
    ? (CONDITIONS_TUNING.FATIGUE_FALL_REST_QUALITY[restQuality] || 0)
    : 0;
  fatigueDelta -= restFall;

  const fatigue = clamp(previousFatigue + fatigueDelta, 0, 100);

  // --- Wounded: persists the worst outcome; heals one tier on a quality
  //     rest night with no new wound. ---
  const todaysWorst = worstOutcome(encounterOutcomes);
  let wounded = previousWounded;
  if (WOUND_ORDER.indexOf(todaysWorst) > WOUND_ORDER.indexOf(previousWounded)) {
    wounded = todaysWorst;
  } else if (
    todaysWorst === 'none'
    && restQuality != null
    && restQuality >= CONDITIONS_TUNING.WOUND_HEAL_REST_QUALITY_MIN
  ) {
    const idx = WOUND_ORDER.indexOf(previousWounded);
    if (idx > 0) wounded = WOUND_ORDER[idx - 1];
  }

  return { fatigue, wounded };
}

// ---------------------------------------------------------------------------
// Qualitative bands (numbers never emitted to the narrator)
// ---------------------------------------------------------------------------
export const FATIGUE_MENTION_THRESHOLD = 40;

export function isFatigued(fatigue) {
  return Number.isFinite(fatigue) && fatigue > FATIGUE_MENTION_THRESHOLD;
}
