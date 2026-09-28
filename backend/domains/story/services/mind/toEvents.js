// ============================================================================
// Day -> events[] translator
// ----------------------------------------------------------------------------
// Node is the host: it owns the mechanical world and must translate a
// resolved day into the Story Engine's strict events[] contract before
// calling the mind. Event types are free strings; the fields each type
// carries are aligned with mind.facets (A3) so banding/readings resolve:
//
//   climate   — one per phase, aggregated raw metrics
//               data: {temperature_2m, cloud_cover, wind_speed_10m,
//                      precipitation}
//   travel    — data: {distance_km, walking_hours}
//   terrain   — data: {terrain_phrases (map of phase->phrases)}
//   place     — one per visited location: data: {name, kind}
//   water     — one per crossing: data: {name, kind}
//   meal      — one per meal: data: {food: name, drink: name, phase}
//   rest      — overnight: data: {rest_quality, shadow_effect}
//   encounter — one per encounter: data: {entity, phase, interaction?}
//               where: {region} from the encounter's own region
//   body      — characterState snapshot: data: {energy, shadow, wounded,
//               fatigue, days_without_food, days_without_water}
//   region    — region transitions implicit: every event carries
//               where.region when known
//
// Mind hooks (B1/B2): encounter events carry data.check = {skill,
// difficulty} for the gates & rolls pass, and thread/resolves markers for
// the needs engine — a harmful outcome opens `thread:unfinished_encounter:
// <slug>`, an unscathed re-encounter resolves it.
//
// All `when` share {episode: day.day_number, date: day.date}; phase-scoped
// events add when.phase (+hour for encounters).
// ============================================================================

import { innerClimate, meanOf, sumOf } from '../../../map/services/data/climateData.js';

function phaseOfHour(hourFloat) {
  if (hourFloat == null) return null;
  if (hourFloat >= 6 && hourFloat < 12) return 'morning';
  if (hourFloat >= 12 && hourFloat < 18) return 'afternoon';
  return 'night';
}

function sampleHour(sample) {
  const t = sample?.time;
  if (typeof t === 'string') {
    const m = t.match(/T(\d{2})/);
    if (m) return parseInt(m[1], 10);
  }
  return null;
}

function regionOf(day, phase = null) {
  const regions = day?.regions;
  if (!regions) return null;
  if (Array.isArray(regions)) return regions[0]?.name || regions[0] || null;
  if (phase && typeof regions === 'object') {
    const perPhase = regions[phase];
    const first = Array.isArray(perPhase) ? perPhase[0] : perPhase;
    return first?.name || first || null;
  }
  return regions.name || null;
}

function when(day, extra = {}) {
  return { episode: day.day_number, date: day.date, ...extra };
}

function where(region) {
  return region ? { region } : undefined;
}

function climateEvents(day) {
  const samples = Array.isArray(day.climate) ? day.climate : [];
  const byPhase = { morning: [], afternoon: [], night: [] };
  for (const s of samples) {
    const weather = innerClimate(s);
    if (!weather) continue;
    byPhase[phaseOfHour(sampleHour(s)) || 'night'].push(weather);
  }
  const events = [];
  for (const [phase, records] of Object.entries(byPhase)) {
    if (records.length === 0) continue;
    events.push({
      type: 'climate',
      when: when(day, { phase }),
      where: where(regionOf(day, phase)),
      data: {
        temperature_2m: meanOf(records.map((w) => w.temperature_2m)),
        cloud_cover: meanOf(records.map((w) => w.cloud_cover)),
        wind_speed_10m: meanOf(records.map((w) => w.wind_speed_10m)),
        precipitation: sumOf(records.map((w) => w.precipitation)),
        hours: records.length,
      },
    });
  }
  return events;
}

// Reading an encounter's signs is a tracking check (B1): the mind gates on
// the character's skill and rolls vs a difficulty scaled by the entity's
// danger (entities carry 0-5; some callers pass a normalized 0-1).
function encounterCheck(entity) {
  const danger = entity.danger_level ?? entity.danger;
  const check = { skill: 'tracking' };
  if (typeof danger === 'number') {
    const onGameScale = danger > 1 ? danger : danger * 5;
    check.difficulty = Math.min(10, Math.round(4 + onGameScale));
  }
  return check;
}

function encounterEvents(day) {
  return (day.encounters || [])
    .filter((e) => e && e.entity)
    .map((e) => ({
      type: 'encounter',
      when: when(day, { phase: e.phase || phaseOfHour(e.hour_float), hour: e.hour_float }),
      where: where(e.region || regionOf(day, e.phase)),
      data: (() => {
        const slug = e.entity.slug || e.entity.name || e.entity.id;
        const outcome = e.interaction?.outcome ?? null;
        const data = {
          entity: slug,
          entity_name: e.entity.name || null,
          entity_id: e.entity.id,
          danger: e.entity.danger_level ?? e.entity.danger ?? null,
          interaction: outcome,
          check: encounterCheck(e.entity),
        };
        // Needs (B2): surviving a hostile contact leaves an open thread
        // the mind keeps alive until the same entity is faced unscathed
        // or the host resolves it in the close outcome.
        if (outcome === 'wounded' || outcome === 'badly wounded') {
          data.thread = `unfinished_encounter:${slug}`;
        } else if (outcome === 'unscathed') {
          data.resolves = `unfinished_encounter:${slug}`;
        }
        return data;
      })(),
    }));
}

function mealEvents(day) {
  return (day.meals || []).map((m) => ({
    type: 'meal',
    when: when(day, { phase: m.phase || phaseOfHour(m.hour_float) }),
    where: where(regionOf(day)),
    data: {
      food: m.food?.name || m.food || null,
      drink: m.drink?.name || m.drink || null,
    },
  }));
}

function placeEvents(day) {
  return (day.locations || []).map((loc) => ({
    type: 'place',
    when: when(day, { phase: loc.phase || phaseOfHour(loc.hour_float) }),
    where: where(loc.region || regionOf(day)),
    data: { name: loc.name || loc.id, kind: loc.type || null },
  }));
}

function waterEvents(day) {
  return (day.water_crossings || []).map((w) => ({
    type: 'water',
    when: when(day, { phase: w.phase || phaseOfHour(w.hour_float) }),
    where: where(w.region || regionOf(day)),
    data: { name: w.name || null, kind: w.type || null },
  }));
}

function restEvent(day) {
  const overnight = day.overnight_interaction || day.overnight_location;
  if (!overnight) return null;
  return {
    type: 'rest',
    when: when(day, { phase: 'night' }),
    where: where(regionOf(day)),
    data: {
      rest_quality: overnight.rest_quality ?? null,
      shadow_effect: overnight.shadow_effect ?? null,
      place: overnight.name || overnight.id || null,
    },
  };
}

function bodyEvent(day, stateContext) {
  if (!stateContext) return null;
  const { startState, endState } = stateContext;
  if (!startState && !endState) return null;
  return {
    type: 'body',
    when: when(day),
    data: {
      // Facets declare 0-1; state is 0-100 in the game DB.
      energy: (endState?.energy ?? startState?.energy ?? 100) / 100,
      shadow: (endState?.shadow ?? startState?.shadow ?? 0) / 100,
      wounded: startState?.wounded ?? null,
      days_without_food: startState?.days_without_food ?? null,
      days_without_water: startState?.days_without_water ?? null,
    },
  };
}

/**
 * Translate a resolved game day into the events[] the mind perceives.
 * @param {Object} params
 * @param {Object} params.day - resolved day (same object narrateDay receives)
 * @param {Object} params.trip
 * @param {Object} params.character - narrator character snapshot
 * @param {Object} [params.stateContext] - {startState, endState} for body
 * @returns {Array} events[] contract
 */
export function toEvents({ day, trip, character, stateContext }) {
  const events = [
    ...climateEvents(day),
    ...(day.distance_km
      ? [{
          type: 'travel',
          when: when(day),
          where: where(regionOf(day)),
          data: {
            distance_km: day.distance_km,
            walking_hours: day.walking_hours,
          },
        }]
      : []),
    ...(day.terrain_phrases
      ? [{
          type: 'terrain',
          when: when(day),
          where: where(regionOf(day)),
          data: {
            terrain_phrases: Object.values(day.terrain_phrases || {}).flat().slice(0, 6),
            biomes: (day.biomes || []).map((b) => b.name || b).slice(0, 6),
          },
        }]
      : []),
    ...encounterEvents(day),
    ...mealEvents(day),
    ...placeEvents(day),
    ...waterEvents(day),
    ...(restEvent(day) ? [restEvent(day)] : []),
    ...(bodyEvent(day, stateContext) ? [bodyEvent(day, stateContext)] : []),
  ];
  return events;
}
