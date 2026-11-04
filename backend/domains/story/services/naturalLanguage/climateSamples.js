// ============================================================================
// Climate sample helpers
// ----------------------------------------------------------------------------
// Restored to Node as part of the world-voice migration (issue #52): the
// mind-engine Python twin was removed in #54 — this module is the only copy. Pure functions over the
// `climate` array already embedded in the `day` payload — no DB.
// ============================================================================

/** Pull the inner weather record from a climate sample (handles the nesting). */
export function innerClimate(sample) {
  if (!sample) return null;
  const c = sample.climate || sample;
  return c.climate || c;
}

/** Unwrap a whole climate array into plain weather records, dropping blanks. */
export function climateRecords(climateArray) {
  if (!Array.isArray(climateArray)) return [];
  return climateArray.map(innerClimate).filter(Boolean);
}

/** Unwrap a climate array keeping the sample timestamp alongside the record. */
export function timedClimateRecords(climateArray) {
  if (!Array.isArray(climateArray)) return [];
  const result = [];
  for (const s of climateArray) {
    const weather = innerClimate(s);
    if (weather) result.push({ time: s.time, weather });
  }
  return result;
}

/** Arithmetic mean of the finite numbers in the list, or null when there are none. */
export function meanOf(nums) {
  const xs = (nums || []).filter((n) => typeof n === 'number' && Number.isFinite(n));
  if (xs.length === 0) return null;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

/** Sum of the finite numbers in the list (0 when empty). */
export function sumOf(nums) {
  return (nums || [])
    .filter((n) => typeof n === 'number' && Number.isFinite(n))
    .reduce((a, b) => a + b, 0);
}
