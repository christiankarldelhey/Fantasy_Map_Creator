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
//                      precipitation, hours}
//   travel    — data: {distance_km, walking_hours}
//   terrain   — data: {terrain_phrases (map of phase->phrases)}
//   place     — one per visited location: data: {name, kind}
//   water     — one per crossing: data: {name, kind}
//   meal      — one per meal slot: data: {slot, eaten, food, drink}
//   rest      — overnight: data: {rest_quality, shadow_effect, place,
//               description} — the place's own prose carries the night
//   encounter — one per encounter: data: {entity, entity_type, danger,
//               form, outcome, prose_hint, intensity, check,
//               topic, substance} — form is how contact happened
//               (sign_only/sound_only/confronts...), outcome only exists
//               when a resistance roll ran. When the interaction resolved
//               dialogue, topic tags the theme and substance carries the
//               lived content (what passed between them, what the
//               traveller did) — the mind's memory of contact is a
//               happening, not a noun.
//               where: {region} from the encounter's own region
//   body      — characterState snapshot: data: {energy, shadow, wounded,
//               fatigue, days_without_food, days_without_water};
//               end-of-day values win over start-of-day when present
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

import { innerClimate, meanOf, sumOf } from '../../adapters/mapClient.js';

function phaseOfHour(hourFloat) {
  if (hourFloat == null) return null;
  if (hourFloat >= 6 && hourFloat < 12) return 'morning';
  if (hourFloat >= 12 && hourFloat < 18) return 'afternoon';
  return 'night';
}

function sampleHour(sample) {
  const t = sample?.time;
  if (typeof t === 'string') {
    // Time strings arrive as 'YYYY-MM-DD HH:MM:SS' (space) or ISO 'T'.
    const m = t.match(/[T ](\d{2}):/);
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
    // Samplers stamp an explicit phase; the clock hour is the fallback.
    byPhase[s.phase || phaseOfHour(sampleHour(s)) || 'night'].push(weather);
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

// Reading an encounter's signs is a tracking check (B1) — and the
// difficulty is DETECTABILITY, not danger (C8): a corpse-candle that
// confronts you needs no tracking to be noticed; a distant howl or a
// boot-print in the mud is real ranger work. Danger still travels in
// data.danger for the affect channel — how dangerous the thing is and
// how easy it is to notice are different facts.
const FORM_DIFFICULTY = {
  // Imposed contact — you'd notice it asleep (and indeed these wake).
  attacks: 3, confronts: 3, sudden_peril: 4, hinders_passage: 4,
  aid_or_trade: 3, brief_exchange: 3, harvest_shelter: 3,
  reacts_withdraws: 4, drifts_closer: 5, mistaken_for_object: 5,
  // You must notice it — subtlety is the check.
  observed_activity: 5, watches: 7, glimpsed_far: 7,
  stalks: 8, sound_only: 8, sign_only: 9, presence_felt: 9,
  passed_by: 7, scenery: 7,
};

function encounterCheck(entity, interaction) {
  const check = { skill: 'tracking' };
  const formDifficulty = FORM_DIFFICULTY[interaction?.form];
  if (formDifficulty != null) {
    check.difficulty = formDifficulty;
    return check;
  }
  // Unknown/no form: fall back to danger-scaled difficulty.
  const danger = entity.danger_level ?? entity.danger;
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
          entity_type: e.entity.type || e.entity.entity_type || null,
          danger: e.entity.danger_level ?? e.entity.danger ?? null,
          // How contact happened matters more than its mechanical result:
          // 'sign_only' is a different experience than 'confronts'.
          form: e.interaction?.form ?? null,
          prose_hint: e.interaction?.prose_hint ?? null,
          intensity: e.interaction?.intensity ?? null,
          // C16: the substance of contact. 'topic' is tag material
          // ('news_and_rumor' recurring is a theme); 'substance' is
          // prose material — what was said/offered/done, resolved
          // host-side — the pack composes how the memory reads.
          topic: e.interaction?.dialogue_content?.topic ?? null,
          substance: (() => {
            const dc = e.interaction?.dialogue_content;
            if (!dc) return null;
            return {
              attitude: dc.npc_attitude ?? null,
              content: dc.concrete_content ?? null,
              tension: dc.tension ?? null,
              stance: dc.traveller_stance ?? null,
            };
          })(),
          outcome,
          check: encounterCheck(e.entity, e.interaction),
          // B5: a before_sleep encounter may carry a real choice —
          // stay or move on — with authored options. The mind weighs
          // them; the host decides and applies their commands.
          decision: e.interaction?.decision ?? null,
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

// Resolved meals carry a slot ('midday' halt on the road, 'evening' meal
// at camp) — map it onto the phase vocabulary so the two never blur.
const SLOT_PHASE = { midday: 'afternoon', evening: 'night' };

function mealEvents(day) {
  return (day.meals || []).map((m) => {
    const food = m.food?.name || m.food || null;
    return {
      type: 'meal',
      when: when(day, {
        phase: SLOT_PHASE[m.slot] || m.phase || phaseOfHour(m.hour_float),
      }),
      where: where(regionOf(day)),
      data: {
        slot: m.slot || null,
        // A skipped meal is an absence the mind should feel, not a gap.
        eaten: food != null || m.itemId != null || m.slug === 'tavern_meal',
        food,
        drink: m.drink?.name || m.drink || null,
      },
    };
  });
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
      // The place's authored prose carries the texture of the night
      // ('the will itself feels weighed and probed') — numbers alone
      // left the worst nights invisible to the mind.
      description: overnight.description ?? null,
      // 'hardcoded_fallback' = open sky: the mind supplies its own
      // open-sky reading rather than trusting a host sentence (C13).
      scope: overnight.scope ?? null,
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
      // End-of-day truth wins over the morning snapshot: the hunger streak
      // after today's meals, the wound after today's outcomes.
      wounded: endState?.wounded ?? startState?.wounded ?? null,
      days_without_food:
        endState?.days_without_food ?? startState?.days_without_food ?? null,
      days_without_water:
        endState?.days_without_water ?? startState?.days_without_water ?? null,
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
            // terrain_phrases is {region: {category: [phrases]}} — two
            // levels of nesting before the strings.
            terrain_phrases: Object.values(day.terrain_phrases || {})
              .flatMap((r) => Object.values(r))
              .flat()
              .slice(0, 6),
            biomes: (day.biomes || [])
              .map((b) => ({ type: b?.type || b?.name || null, hour_float: b?.hour_float ?? null }))
              .slice(0, 6),
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
