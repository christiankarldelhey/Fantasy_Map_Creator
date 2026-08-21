// ============================================================================
// Day phases and clock -> prose time
// ----------------------------------------------------------------------------
// The narrative day has exactly three phases, aligned with the encounter engine:
//   morning   07:00 - 13:00
//   afternoon 13:00 - 19:00
//   night     19:00 - 07:00 (the camp window, crossing midnight)
// Every module that buckets data by time must go through here.
// ============================================================================

import { WALK_END_HOUR } from '../../adapters/gameClient.js';

export const NARRATIVE_PHASES = ['morning', 'afternoon', 'night'];

export const MORNING_START_HOUR = 7;
export const AFTERNOON_START_HOUR = 13;
export const NIGHT_START_HOUR = 19;

/** An empty { morning, afternoon, night } accumulator of arrays. */
export function emptyPhaseBuckets() {
  return { morning: [], afternoon: [], night: [] };
}

/**
 * Map a clock hour (float) to a narrative phase.
 * @param {number|null} hourFloat
 * @returns {'morning'|'afternoon'|'night'}
 */
export function phaseForHour(hourFloat) {
  if (hourFloat == null) return 'night';
  if (hourFloat >= MORNING_START_HOUR && hourFloat < AFTERNOON_START_HOUR) return 'morning';
  if (hourFloat >= AFTERNOON_START_HOUR && hourFloat < NIGHT_START_HOUR) return 'afternoon';
  return 'night';
}

/**
 * Group items carrying an `hour_float` into the three narrative phases.
 * @param {Array<{hour_float?: number}>} items
 * @returns {{morning: Array, afternoon: Array, night: Array}}
 */
export function groupByPhase(items) {
  const buckets = emptyPhaseBuckets();
  for (const item of items || []) {
    buckets[phaseForHour(item?.hour_float)].push(item);
  }
  return buckets;
}

/** Derive the phase of a climate sample: its stored phase, else its timestamp. */
export function phaseForClimateSample(sample) {
  if (sample?.phase && NARRATIVE_PHASES.includes(sample.phase)) return sample.phase;
  const hour = hourOfTimestamp(sample?.time);
  if (hour == null) return 'night';
  return phaseForHour(hour);
}

/** Parse the hour out of a "YYYY-MM-DD HH:mm:ss" stamp, or null when unreadable. */
export function hourOfTimestamp(time) {
  if (!time) return null;
  const hour = parseInt(String(time).slice(11, 13), 10);
  return Number.isNaN(hour) ? null : hour;
}

/** Map a clock hour (float) to a coarse time-of-day phrase for the notes. */
export function timeOfDayPhrase(hourFloat) {
  if (hourFloat == null) return 'somewhere along the way';
  if (hourFloat < 9) return 'in the early morning';
  if (hourFloat < 11) return 'in the mid-morning';
  if (hourFloat < 13) return 'toward midday';
  if (hourFloat < 15) return 'in the early afternoon';
  if (hourFloat < 17) return 'in the late afternoon';
  if (hourFloat < WALK_END_HOUR) return 'as evening drew near';
  return 'after dark';
}
