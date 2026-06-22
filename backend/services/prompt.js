import { WALK_START_HOUR, WALK_END_HOUR } from './tripDay.js';

// ============================================================================
// Prompt builder (no AI)
// ----------------------------------------------------------------------------
// Turns a generated day object into a structured, Tolkien-flavoured prompt
// ready to be sent to an LLM (e.g. Gemini). Divides the 12 walking hours into
// three stages (morning / midday / afternoon) plus the night at camp, and
// injects climate, regions, biomes, elevation, road type, locations and the
// encounter table with their hours.
// ============================================================================

function fmtList(arr, fallback = 'none') {
  if (!arr || arr.length === 0) return fallback;
  return arr.join(', ');
}

function describeClimate(climate) {
  if (!climate) return 'Climate data unavailable.';
  const parts = [];
  const w = climate.weather || climate;
  if (w.temperature_2m != null) parts.push(`temperature ~${Math.round(w.temperature_2m)}°C`);
  if (w.precipitation != null) parts.push(`precipitation ${w.precipitation} mm`);
  if (w.cloud_cover != null) parts.push(`cloud cover ${Math.round(w.cloud_cover)}%`);
  if (w.wind_speed_10m != null) parts.push(`wind ${Math.round(w.wind_speed_10m)} km/h`);
  if (w.snowfall != null && w.snowfall > 0) parts.push(`snowfall ${w.snowfall} cm`);
  const koppen = climate.koppen || w.koppen;
  if (koppen) parts.push(`Köppen ${koppen}`);
  return parts.length ? parts.join(', ') : 'mild, unremarkable weather';
}

function describeRoadTypes(roadTypes) {
  const entries = Object.entries(roadTypes || {});
  if (entries.length === 0) return 'no clear path';
  const labels = { road: 'roads', trail: 'trails', off_road: 'cross-country' };
  return entries
    .sort((a, b) => b[1] - a[1])
    .map(([type, km]) => `${labels[type] || type} (${km} km)`)
    .join(', ');
}

function stageFor(hourFloat) {
  const span = WALK_END_HOUR - WALK_START_HOUR;
  const third = span / 3;
  // Night hours: 19:00–24:00 or 0:00–7:00
  if (hourFloat >= WALK_END_HOUR || hourFloat < WALK_START_HOUR) return 'night';
  if (hourFloat < WALK_START_HOUR + third) return 'morning';
  if (hourFloat < WALK_START_HOUR + 2 * third) return 'midday';
  return 'afternoon';
}

function describeEncounter(e) {
  const ent = e.entity || {};
  const danger = ent.danger != null ? `, danger ${ent.danger}/5` : '';
  return `${e.hour} — ${ent.name} (${ent.type || 'creature'}, ${ent.active || 'all-day'}${danger}) in ${e.region}`;
}

/**
 * Build the narration prompt for a day object.
 * @param {Object} day - output of generateDay
 * @param {Object} [trip] - parent trip (for name/context)
 * @returns {string}
 */
export function buildDayPrompt(day, trip = {}) {
  const stages = { morning: [], midday: [], afternoon: [], night: [] };
  for (const e of day.encounters || []) {
    stages[stageFor(e.hour_float)].push(e);
  }

  const encounterSection = (key, label) => {
    const list = stages[key];
    if (!list || list.length === 0) return `- ${label}: no encounters`;
    return `- ${label}:\n${list.map((e) => `    * ${describeEncounter(e)}`).join('\n')}`;
  };

  const tripName = trip.name || 'the journey';

  return `You are a master storyteller writing in the descriptive, evocative style of J.R.R. Tolkien.
Write Chapter ${day.day_number} of "${tripName}". Each chapter narrates a single day of travel.
Be richly descriptive of the terrain, the weather and the encounters. Stay grounded in the facts below; do not invent place names or creatures that are not provided. Write in flowing prose, not bullet points.

=== DAY ${day.day_number} — ${day.date} ===
Distance covered: ${day.distance_km} km over ~${day.walking_hours} hours of marching (from ${WALK_START_HOUR}:00 to ${WALK_END_HOUR}:00).
Regions crossed (in order): ${fmtList(day.regions)}.
Biomes: ${fmtList(day.biomes)}.
Elevation/terrain: ${fmtList(day.altitude)}.
Path traveled: ${describeRoadTypes(day.road_types)}.
Notable places passed near: ${fmtList((day.locations || []).map((l) => l.name))}.
Weather through the day: ${describeClimate(day.climate)}.

=== STRUCTURE THE CHAPTER IN FOUR PARTS ===
1. Morning (${WALK_START_HOUR}:00–11:00):
${encounterSection('morning', 'Encounters')}
2. Midday (11:00–15:00):
${encounterSection('midday', 'Encounters')}
3. Afternoon (15:00–${WALK_END_HOUR}:00):
${encounterSection('afternoon', 'Encounters')}
4. Night at camp (${WALK_END_HOUR}:00–${WALK_START_HOUR}:00):
${encounterSection('night', 'Encounters')}

For each encounter, weave its hour, nature and danger into the narrative. If a part has no encounters, describe the journey, the landscape and the company's mood during that stretch.`;
}
