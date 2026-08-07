// ============================================================================
// Moon phrases for the night weather line
// ----------------------------------------------------------------------------
// Only the two phases the traveller would actually notice are surfaced: the new
// moon (absolute dark, always worth saying) and the full moon (only when the sky
// is open enough to see it).
// ============================================================================

const MOON_NIGHT_PHRASES = {
  new_moon: 'no moon rises; the dark is absolute away from the fire',
  waxing_crescent: 'a thin waxing crescent follows the sunset',
  first_quarter: 'the moon stands at first quarter, half-lit in the south',
  waxing_gibbous: 'a waxing gibbous moon brightens the east',
  full_moon: 'the full moon is bright; the land lies pale and open',
  waning_gibbous: 'a waning gibbous moon lights the camp early, then dims',
  last_quarter: 'the last-quarter moon rises late and cold',
  waning_crescent: 'a waning crescent fades before dawn',
};

const HEAVY_CLOUD_COVER = 70;

/**
 * Short moon phrase for the night weather line, or null when the moon is not
 * worth mentioning.
 * @param {{phase:string, illumination:number}|null} moon
 * @param {number|null} meanCloud - mean night cloud cover (%)
 * @returns {string|null}
 */
export function formatMoonNightPhrase(moon, meanCloud) {
  if (!moon?.phase) return null;
  if (moon.phase === 'new_moon') return MOON_NIGHT_PHRASES.new_moon;
  if (moon.phase !== 'full_moon') return null;
  if (typeof meanCloud === 'number' && meanCloud >= HEAVY_CLOUD_COVER) return null;
  return MOON_NIGHT_PHRASES.full_moon;
}
