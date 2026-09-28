// ============================================================================
// toOpenPayload — the flat episode-open wire body
// ----------------------------------------------------------------------------
// Builds exactly the OpenEpisodeRequest shape (story-engine/app/mind/models.py,
// extra='forbid'). Whitelists are the contract: any field the story-engine
// does not read stays out; a new unwhitelisted field would 422 loudly.
//
// Node owns day/trip/character; toEvents owns events[].data (the single
// free-form field). The narrator-facing halves (day, blocks, continuity)
// are whitelisted to what the prompt pipeline actually reads — verified
// against app/prompt + app/natural_language.
// ============================================================================

import { toEvents } from './toEvents.js';

const pick = (obj, keys) =>
  Object.fromEntries(keys.filter((k) => obj?.[k] !== undefined).map((k) => [k, obj[k]]));

function slimCharacter(c) {
  return {
    // Mind identity + gates
    id: String(c.id ?? ''),
    name: c.name ?? null,
    brain_profile: c.brain_profile || c.slug || null,
    skills: {
      tracking: c.skill_tracking ?? 0,
      persuasion: c.skill_persuasion ?? 0,
      ranged: c.skill_ranged ?? 0,
      melee: c.skill_melee ?? 0,
      lore: c.skill_lore ?? 0,
    },
    energy: c.energy ?? null,
    shadow: c.shadow ?? null,
    conditions: [
      c.wounded && c.wounded !== 'none' ? 'wounded' : null,
      c.sick ? 'sick' : null,
    ].filter(Boolean),
    // Narrator prose material
    description: c.description ?? null,
    entity_name: c.entity_name ?? null,
    system_prompt: c.system_prompt ?? null,
    introduction_instructions: c.introduction_instructions ?? null,
    wounded: c.wounded ?? null,
  };
}

function slimClimate(sample) {
  if (!sample) return null;
  const inner = sample.climate?.climate ?? sample.climate ?? null;
  return {
    time: sample.time ?? null,
    phase: sample.phase ?? null,
    climate: inner
      ? pick(inner, ['cloud_cover', 'precipitation', 'temperature_2m', 'wind_speed_10m'])
      : null,
  };
}

function slimEncounter(e) {
  return {
    hour: e.hour ?? null,
    phase: e.phase ?? null,
    region: e.region ?? null,
    entity: e.entity
      ? pick(e.entity, ['name', 'type', 'active', 'description', 'description_summary'])
      : null,
    interaction: e.interaction
      ? pick(e.interaction, ['form', 'outcome', 'prose_hint', 'dialogue_content', 'hintKey', 'night_timing'])
      : null,
  };
}

function slimDay(d) {
  return {
    date: d.date ?? null,
    day_number: d.day_number ?? null,
    is_last_day: d.is_last_day ?? null,
    distance_km: d.distance_km ?? null,
    walking_hours: d.walking_hours ?? null,
    road_types: d.road_types ?? {},
    regions: (d.regions || []).map((r) =>
      pick(r, ['id', 'name', 'cultural_family', 'description', 'description_summary'])
    ),
    terrain_phrases: d.terrain_phrases ?? {},
    biomes: (d.biomes || []).map((b) =>
      pick(b, ['type', 'hour_float', 'fraction', 'total_area_km2'])
    ),
    locations: (d.locations || []).map((l) =>
      pick(l, ['name', 'type', 'region', 'hour', 'hour_float', 'distance_km', 'title', 'indoor'])
    ),
    water_crossings: (d.water_crossings || []).map((w) =>
      pick(w, ['name', 'type', 'crossing_type', 'hour_float'])
    ),
    climate: (d.climate || []).map(slimClimate).filter(Boolean),
    nighttime_climate: (d.nighttime_climate || []).map(slimClimate).filter(Boolean),
    moon_phase: d.moon_phase ? pick(d.moon_phase, ['phase', 'age_days', 'illumination']) : null,
    encounters: (d.encounters || []).map(slimEncounter),
    meals: (d.meals || []).map((m) => pick(m, ['slot', 'food', 'drink'])),
    overnight_location: d.overnight_location ?? null,
    overnight_interaction: d.overnight_interaction ?? null,
    elevation_profile: d.elevation_profile ?? null,
  };
}

/**
 * The flat POST /episodes body — OpenEpisodeRequest, snake_case throughout.
 * `stateContext` feeds only the mind's `body` event (via toEvents), it is
 * not part of the wire itself.
 */
export function toOpenPayload({
  gameId,
  day,
  trip,
  character,
  language = 'english',
  conditionBlock = '',
  equipmentBlock = '',
  endStateBlock = '',
  previousDaySummary = null,
  bannedPhrases = [],
  recentDayClimates = [],
  previousOpenings = [],
  stateContext = null,
}) {
  return {
    game_id: gameId,
    episode_ref: `trip:${trip.id}:day:${day.day_number}`,
    language,
    character: slimCharacter(character),
    events: toEvents({ day, trip, character, stateContext }),
    day: slimDay(day),
    trip_name: trip.name ?? null,
    condition_block: conditionBlock,
    equipment_block: equipmentBlock,
    end_state_block: endStateBlock,
    previous_day_summary: previousDaySummary,
    banned_phrases: bannedPhrases,
    recent_day_climates: recentDayClimates,
    previous_openings: previousOpenings,
  };
}

/**
 * Map the flat open body back onto the stateless /narrate-day contract
 * (NarrateDayRequest, camelCase) — used by the fallback path only.
 */
export function toNarrateDayBody(openBody) {
  return {
    day: openBody.day,
    trip: { name: openBody.trip_name },
    character: openBody.character,
    language: openBody.language,
    conditionBlock: openBody.condition_block,
    equipmentBlock: openBody.equipment_block,
    endStateBlock: openBody.end_state_block,
    previousDaySummary: openBody.previous_day_summary,
    bannedPhrases: openBody.banned_phrases,
    recentDayClimates: openBody.recent_day_climates,
    previousOpenings: openBody.previous_openings,
  };
}
