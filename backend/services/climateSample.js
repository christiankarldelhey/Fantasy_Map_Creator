// ============================================================================
// Climate sample helpers
// ----------------------------------------------------------------------------
// Single source of truth for reading the hourly climate array stored on a
// trip_day. The raw samples arrive nested ({ time, climate: { climate: {...} } })
// depending on where they were produced, so every consumer must unwrap them the
// same way. Anything that needs "how was the weather that day" in numbers
// belongs here; anything that turns numbers into prose belongs in
// naturalLanguage/.
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
  return climateArray.map((s) => innerClimate(s)).filter(Boolean);
}

/** Unwrap a climate array keeping the sample timestamp alongside the record. */
export function timedClimateRecords(climateArray) {
  if (!Array.isArray(climateArray)) return [];
  return climateArray
    .map((s) => ({ time: s.time, weather: innerClimate(s) }))
    .filter((s) => s.weather);
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

/**
 * Day-level weather aggregates used by the state engine and the prompt blocks.
 * @param {Array} climateArray - hourly samples as stored on trip_days.climate
 * @returns {{ meanTemperature: number|null, meanWind: number|null,
 *   meanCloud: number|null, totalPrecipitation: number }}
 */
export function climateStats(climateArray) {
  const records = climateRecords(climateArray);
  return {
    meanTemperature: meanOf(records.map((w) => w.temperature_2m)),
    meanWind: meanOf(records.map((w) => w.wind_speed_10m)),
    meanCloud: meanOf(records.map((w) => w.cloud_cover)),
    totalPrecipitation: sumOf(records.map((w) => w.precipitation || 0)),
  };
}
