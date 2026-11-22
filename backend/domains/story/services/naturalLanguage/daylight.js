// ============================================================================
// Daylight: sunrise/sunset anchors from date and latitude
// ----------------------------------------------------------------------------
// The simulated climate has no solar fields, but every climate zone binds a
// REAL-WORLD analog (climate_zones.analog_lat — Forochel is the Finnmark
// coast, Talath Muil is the Cairngorms). So the day's sun is computed from
// the analog's true latitude: a November dusk fails early in Scotland, and
// the sun may not rise at all on the Finnmark coast.
//
// Astronomy: solar declination over the year, hour angle at the official
// 90.833° zenith (atmospheric refraction + solar disc — the same definition
// almanacs use), equation of time shifting solar noon off 12:00 by up to
// ~16 min. Times are clock-solar hours — the world has no timezones.
//
// Polar edge: when the analog sits above the arctic circle the formula
// reports {polar: 'day'} (midnight sun) or {polar: 'night'} (the sun never
// rises) instead of hours — narrate that, not digits.
//
// The anchors drive two things:
//   - the narrator's clock phrases (a November dusk fails early, not at 19:00)
//   - the per-event variant key: dawn | day | dusk | night, so prose authored
//     'al_atardecer' is chosen only while the light actually fails.
//
// The dusk window is a generous two hours before sunset, per design.
// ============================================================================

export const DEFAULT_DAYLIGHT = { sunrise: 7, sunset: 19, polar: null };

/** Generous window before sunset (hours) that still reads as dusk. */
export const DUSK_WINDOW_HOURS = 2;

/** Official sunrise zenith: 90° + 34' refraction + 16' solar radius. */
const ZENITH_DEG = 90.833;

function dayOfYear(dateISO) {
  const [y, m, d] = String(dateISO || '').split('-').map(Number);
  if (!y || !m || !d) return null;
  return Math.floor((Date.UTC(y, m - 1, d) - Date.UTC(y, 0, 1)) / 86400000) + 1;
}

/** Equation of time in minutes (solar noon drifts off 12:00, ±16 min). */
function equationOfTime(n) {
  const b = ((n - 81) * 360) / 365 * (Math.PI / 180);
  return 9.87 * Math.sin(2 * b) - 7.53 * Math.cos(b) - 1.5 * Math.sin(b);
}

/**
 * Sunrise/sunset in clock-solar hours for a date at a latitude.
 * @param {string} dateISO YYYY-MM-DD
 * @param {number} latDeg degrees north — use the climate zone's analog_lat
 *   (real world), falling back to the map latitude
 * @returns {{sunrise: number|null, sunset: number|null, polar: string|null}}
 *   polar 'day' = midnight sun, 'night' = the sun never rises; DEFAULT when
 *   inputs are missing.
 */
export function daylightFor(dateISO, latDeg) {
  const n = dayOfYear(dateISO);
  const lat = latDeg == null ? null : Number(latDeg);
  if (!n || !Number.isFinite(lat)) return { ...DEFAULT_DAYLIGHT };

  const rad = Math.PI / 180;
  const decl = 23.44 * Math.sin((((284 + n) * 360) / 365) * rad);
  const cosHour = (Math.sin(-(ZENITH_DEG - 90) * rad)
    - Math.sin(lat * rad) * Math.sin(decl * rad))
    / (Math.cos(lat * rad) * Math.cos(decl * rad));

  if (cosHour >= 1) return { sunrise: null, sunset: null, polar: 'night' };
  if (cosHour <= -1) return { sunrise: null, sunset: null, polar: 'day' };

  const daylightHours = (2 * Math.acos(cosHour) / rad) / 15;
  const noon = 12 - equationOfTime(n) / 60;
  const round2 = (v) => Math.round(v * 100) / 100;
  return {
    sunrise: round2(noon - daylightHours / 2),
    sunset: round2(noon + daylightHours / 2),
    polar: null,
  };
}

/**
 * The solar key an event at `hourFloat` falls under:
 *   'dawn'  — half an hour before to an hour and a half after sunrise
 *   'dusk'  — the generous window before sunset, through the setting itself
 *   'night' — after dusk, or before dawn; all day under polar night
 *   'day'   — the light hours in between; all day under midnight sun
 * @param {number} hourFloat
 * @param {{sunrise: number, sunset: number, polar: string}} daylight
 * @returns {'dawn'|'dusk'|'night'|'day'|null} null when hour is unknown
 */
export function solarKey(hourFloat, daylight) {
  if (hourFloat == null) return null;
  const dl = daylight || DEFAULT_DAYLIGHT;
  if (dl.polar === 'night') return 'night';
  if (dl.polar === 'day') return 'day';
  const { sunrise, sunset } = dl;
  if (sunrise == null || sunset == null) return 'day';
  if (hourFloat >= sunrise - 0.5 && hourFloat < sunrise + 1.5) return 'dawn';
  if (hourFloat >= sunset - DUSK_WINDOW_HOURS && hourFloat < sunset + 0.5) return 'dusk';
  if (hourFloat < sunrise - 0.5 || hourFloat >= sunset + 0.5) return 'night';
  return 'day';
}
