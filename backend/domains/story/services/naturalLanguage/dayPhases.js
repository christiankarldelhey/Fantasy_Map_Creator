// ============================================================================
// Day phases and clock -> prose time
// ----------------------------------------------------------------------------
// Restored to Node as part of the world-voice migration (issue #52): the
// story-engine Python copy is app/day_phases.py.
// ============================================================================

export const NARRATIVE_PHASES = ['morning', 'afternoon', 'night'];

export const MORNING_START_HOUR = 7;
export const AFTERNOON_START_HOUR = 13;
export const NIGHT_START_HOUR = 19;

export const WALK_END_HOUR = 19;

/** An empty { morning, afternoon, night } accumulator of lists. */
export function emptyPhaseBuckets() {
  return { morning: [], afternoon: [], night: [] };
}

/** Map a clock hour (float) to a narrative phase. */
export function phaseForHour(hourFloat) {
  if (hourFloat == null) return 'night';
  if (hourFloat >= MORNING_START_HOUR && hourFloat < AFTERNOON_START_HOUR) return 'morning';
  if (hourFloat >= AFTERNOON_START_HOUR && hourFloat < NIGHT_START_HOUR) return 'afternoon';
  return 'night';
}

/** Group items carrying an `hour_float` into the three narrative phases. */
export function groupByPhase(items) {
  const buckets = emptyPhaseBuckets();
  for (const item of items || []) {
    const hourFloat = item && typeof item === 'object' ? item.hour_float : null;
    buckets[phaseForHour(hourFloat)].push(item);
  }
  return buckets;
}

/** Parse the hour out of a "YYYY-MM-DD HH:mm:ss" stamp, or null when unreadable. */
export function hourOfTimestamp(time) {
  if (!time) return null;
  const hour = parseInt(String(time).slice(11, 13), 10);
  return Number.isNaN(hour) ? null : hour;
}

/** Derive the phase of a climate sample: its stored phase, else its timestamp. */
export function phaseForClimateSample(sample) {
  const phase = sample && sample.phase;
  if (phase && NARRATIVE_PHASES.includes(phase)) return phase;
  const hour = hourOfTimestamp(sample && sample.time);
  if (hour == null) return 'night';
  return phaseForHour(hour);
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
