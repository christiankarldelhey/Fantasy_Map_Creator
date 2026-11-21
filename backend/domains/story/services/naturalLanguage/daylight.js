// ============================================================================
// Daylight: sunrise/sunset anchors from date and latitude
// ----------------------------------------------------------------------------
// The simulated climate has no solar fields, so the day derives its own
// anchors the way a traveller would — from the calendar and the latitude of
// the road. Solar declination over the year gives the horizon hour-angle;
// times are solar (noon = 12), close enough for fiction.
//
// The anchors drive two things:
//   - the narrator's clock phrases (a November dusk fails early, not at 19:00)
//   - the per-event variant key: dawn | day | dusk | night, so prose authored
//     'al_atardecer' is chosen only while the light actually fails.
//
// The dusk window is a generous two hours before sunset, per design.
// ============================================================================

export const DEFAULT_DAYLIGHT = { sunrise: 7, sunset: 19 };

/** Generous window before sunset (hours) that still reads as dusk. */
export const DUSK_WINDOW_HOURS = 2;

function dayOfYear(dateISO) {
  const [y, m, d] = String(dateISO || '').split('-').map(Number);
  if (!y || !m || !d) return null;
  return Math.floor((Date.UTC(y, m - 1, d) - Date.UTC(y, 0, 1)) / 86400000) + 1;
}

/**
 * {sunrise, sunset} in clock hours for a date at a latitude.
 * @param {string} dateISO YYYY-MM-DD
 * @param {number} latDeg degrees north
 * @returns {{sunrise: number, sunset: number}} DEFAULT_DAYLIGHT when the
 *   inputs are missing or the day is polar (always day / always night).
 */
export function daylightFor(dateISO, latDeg) {
  const n = dayOfYear(dateISO);
  const lat = latDeg == null ? null : Number(latDeg);
  if (!n || !Number.isFinite(lat)) return { ...DEFAULT_DAYLIGHT };

  const decl = 23.44 * Math.sin((((284 + n) * 360) / 365) * (Math.PI / 180));
  const cosHour = -Math.tan((lat * Math.PI) / 180) * Math.tan((decl * Math.PI) / 180);
  const daylightHours = (2 * Math.acos(Math.max(-1, Math.min(1, cosHour))) * 180) / Math.PI / 15;
  if (daylightHours <= 2 || daylightHours >= 22) return { ...DEFAULT_DAYLIGHT };

  const round2 = (v) => Math.round(v * 100) / 100;
  return { sunrise: round2(12 - daylightHours / 2), sunset: round2(12 + daylightHours / 2) };
}

/**
 * The solar key an event at `hourFloat` falls under:
 *   'dawn'  — half an hour before to an hour and a half after sunrise
 *   'dusk'  — the generous window before sunset, through the setting itself
 *   'night' — after dusk, or before dawn
 *   'day'   — the light hours in between
 * @param {number} hourFloat
 * @param {{sunrise: number, sunset: number}} daylight
 * @returns {'dawn'|'dusk'|'night'|'day'|null} null when hour is unknown
 */
export function solarKey(hourFloat, daylight) {
  if (hourFloat == null) return null;
  const { sunrise, sunset } = daylight || DEFAULT_DAYLIGHT;
  if (hourFloat >= sunrise - 0.5 && hourFloat < sunrise + 1.5) return 'dawn';
  if (hourFloat >= sunset - DUSK_WINDOW_HOURS && hourFloat < sunset + 0.5) return 'dusk';
  if (hourFloat < sunrise - 0.5 || hourFloat >= sunset + 0.5) return 'night';
  return 'day';
}
