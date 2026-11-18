// ============================================================================
// Day -> events[] translator
// ----------------------------------------------------------------------------
// Node is the host: it owns the mechanical world and must translate a
// resolved day into the Mind Engine's strict events[] contract before
// calling the mind. Event types are free strings; the fields each type
// carries are aligned with mind.facets (A3) so banding/readings resolve:
//
//   climate   — one per phase, aggregated raw metrics
//               data: {temperature_2m, cloud_cover, wind_speed_10m,
//                      precipitation, hours, reading, tags[]} — the host
//               declares the weather tiers ('weather:storm'…) and the
//               one-line reading; the mind never derives tags or prose
//               from raw numbers
//   land      — the umbrella for every kind of land-contact; data.subtype
//               discriminates the shape:
//               · terrain — data: {subtype:'terrain', terrain_phrases
//                 (map of phase->phrases), reading}
//               · place — one per visited/sighted location:
//                 data: {subtype:'place', name, place (subject slug),
//                 kind, description, population, inhabitants,
//                 distance_km, tags[], reading} — 'settlement' for
//                 inhabited places, 'entered' for the one the traveller
//                 actually stopped at, 'hostile' for enemy-kingdom
//                 places skirted from outside. Beyond its reach (>1km,
//                 never inside) a place is only a silhouette: it carries
//                 sighted_far and drops aspect, presence, population and
//                 inhabitants — what nobody got close enough to know
//               · water — one per crossing: data: {subtype:'water',
//                 name, place, kind, reading}
//               · region — one per land ENTERED today (not in
//                 yesterday's regions): data: {subtype:'region', name,
//                 description, reading, tags['region_entered']} —
//                 crossing a border is a lived moment, not context: it
//                 is what the Episode can turn on and what gets
//                 remembered
//   meal      — one per meal slot: data: {slot, eaten, food, drink,
//               reading}
//   rest      — overnight: data: {entity, entity_name, entity_type,
//               reading, shadow_effect, tags[]} — the night's place climbs
//               the identity ladder like any other entity; 'rest:*' tags
//               declare the night's kind (open_sky, indoor, good, poor)
//               and 'lodging:*' how it was secured (paid, charity,
//               turned_away, shelter). shadow_effect stays numeric — the
//               affect.field hook that says how much the place pressed
//               on the shadow.
//   encounter — one per encounter: data: {entity, entity_type, family,
//               danger, reading,
//               form, outcome, prose_hint, intensity, check,
//               topic, substance} — form is how contact happened
//               (sign_only/sound_only/confronts...), outcome only exists
//               when a resistance roll ran. When the interaction resolved
//               dialogue, topic tags the theme and substance carries the
//               lived content (what passed between them, what the
//               traveller did) — the mind's memory of contact is a
//               happening, not a noun.
//               where: {region} from the encounter's own region, plus
//               {place} when the meeting is anchored to a named spot —
//               what was lived AT a place marks the place too
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
//
// Perception contract (#53 — the Universal Tagger's contract): every
// event that should read as something carries `data.reading`, a one-line
// host-authored perception, and `data.tags` — the declared 'weather:*'
// tiers and markers the mind's wiring keys against. The mind consumes
// both verbatim; deriving tags or prose from raw numbers is the host's
// job, never the mind's.
// ============================================================================

import { innerClimate, meanOf, sumOf } from '../../adapters/mapClient.js';
import {
  summariseWeather,
  weatherReading,
  weatherTags,
} from '../naturalLanguage/climateNotes.js';
import { describeMeal, mealLabel } from '../naturalLanguage/mealNotes.js';
import { collectTerrainNotes } from '../naturalLanguage/terrainNotes.js';
import { collectLocationNotes, isDeadPlace, isDistantSighting, sightedShape } from '../naturalLanguage/placeNotes.js';
import { describeWaterCrossings } from '../naturalLanguage/waterNotes.js';
import {
  REST_OPEN_SKY,
  collectNighttimeConditions,
  restReading,
} from '../naturalLanguage/nightNotes.js';
import { groupByPhase } from '../naturalLanguage/dayPhases.js';
import { humanize, slugify } from '../naturalLanguage/text.js';

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

function when(extra = {}) {
  return Object.fromEntries(
    Object.entries(extra).filter(([, v]) => v != null)
  );
}

function rngOf(day) {
  return typeof day?.rng === 'function' ? day.rng : Math.random;
}

// where.region is the land the day happened in; where.place is the
// named spot the event happened AT — the mind reads both as subjects,
// the place hearing only a splash of what was lived there.
function where(region, place = null) {
  const w = {};
  if (region) w.region = region;
  if (place) w.place = place;
  return Object.keys(w).length ? w : undefined;
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
    const data = {
      temperature_2m: meanOf(records.map((w) => w.temperature_2m)),
      cloud_cover: meanOf(records.map((w) => w.cloud_cover)),
      wind_speed_10m: meanOf(records.map((w) => w.wind_speed_10m)),
      precipitation: sumOf(records.map((w) => w.precipitation)),
    };
    const tags = weatherTags(data);
    events.push({
      type: 'climate',
      when: when({ phase }),
      where: where(regionOf(day, phase)),
      data: {
        // The chapter's weather prose IS the memory's reading (ADR-0016):
        // one verbalization, narrated and remembered alike. The raw
        // metrics stay on the host — the mind knows the day through its
        // reading and its declared tags ('weather:wet' feeds exposure).
        reading: summariseWeather(records, rngOf(day))
          ?? weatherReading(data),
        ...(tags.length ? { tags } : {}),
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
      when: when({ phase: e.phase || phaseOfHour(e.hour_float), hour: e.hour_float }),
      // An encounter anchored to a named spot (a mover leg at a gate,
      // an ambush at the ford) marks the place too.
      where: where(e.region || regionOf(day, e.phase),
        slugify(e.location?.name || e.location)),
      data: (() => {
        const slug = e.entity.slug || e.entity.name || e.entity.id;
        const outcome = e.interaction?.outcome ?? null;
        const npc = e.interaction?.npc ?? null;
        const data = {
          entity: slug,
          entity_name: e.entity.name || null,
          entity_type: e.entity.type || e.entity.entity_type || null,
          // Who spoke, when words passed — the slug tags the person as
          // its own subject ('npc:hal'), the name is how the mind says
          // them, the gloss what kind of being it saw ('a hobbit').
          npc: npc ? slugify(npc.name) : null,
          npc_name: npc?.name ?? null,
          npc_people: npc?.people ?? null,
          npc_gloss: npc?.gloss ?? null,
          npc_gender: npc?.gender ?? null,
          // Kind-of-being between type and entity (foxes within
          // carnivores) — attitudes match entity > family > type.
          family: e.entity.family ?? null,
          danger: e.entity.danger_level ?? e.entity.danger ?? null,
          // How contact happened matters more than its mechanical result:
          // 'sign_only' is a different experience than 'confronts'.
          form: e.interaction?.form ?? null,
          // prose_hint only rides when no dialogue resolved — where a
          // substance.content exists it would say the same prose twice.
          prose_hint: e.interaction?.dialogue_content
            ? undefined
            : e.interaction?.prose_hint ?? null,
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
          // The one-line perception the mind keeps: resolved substance
          // leads, the form's prose hint carries contact without words.
          reading: (() => {
            // A named being leads with its name — 'Bungo, a hobbit —
            // shared news' remembers better than 'humans — shared news'.
            const subject = npc
              ? `${npc.name}, ${npc.gloss}`
              : e.entity.name || humanize(slug);
            const detail = e.interaction?.dialogue_content?.concrete_content
              ?? e.interaction?.prose_hint ?? null;
            if (subject && detail) {
              const stance = e.interaction?.dialogue_content?.traveller_stance;
              return `${subject} — ${detail}${stance ? ` ${stance}` : ''}`;
            }
            return subject || detail;
          })(),
          outcome,
          check: encounterCheck(e.entity, e.interaction),
          // Wave C: a fork on this encounter was chosen pre-episode by
          // the interaction engine — the resolved pick rides for the
          // narrator (the outcome event carries the felt side).
          resolved_choice: e.interaction?.resolved_choice ?? null,
        };
        // C28: what touched the mechanics is weight-space. 'given' — an
        // authored gift the host applies unconditionally (the contact
        // pool's sole/shared effects); 'changed' — the encounter left a
        // mark on the body, or a fork stood and was taken (the engine's
        // resolved_choice). The mind's 'salience_min.tag:*' wiring lifts
        // these out of background.
        const tags = [];
        if (e.interaction?.dialogue_content?.commands?.length
            && !e.interaction?.decision) {
          tags.push('given');
        }
        if (e.interaction?.resolved_choice?.changed
            || outcome === 'wounded' || outcome === 'badly wounded') {
          tags.push('changed');
        }
        if (tags.length) data.tags = tags;
        // Living-map rail: the meeting was authored (a leg of the
        // mover's agenda), not drawn from the phase pool. The mind
        // weighs a scheduled crossing differently than a stray spawn.
        const moverLeg = e._mover?.leg ?? null;
        if (moverLeg) {
          data.mover = {
            leg_kind: moverLeg.leg_kind ?? null,
            kind: e._mover.kind ?? null,
            hostile: !!moverLeg.hostile,
          };
        }
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
  const overnight = day.overnight_location?.name || null;
  return (day.meals || []).map((m) => {
    const food = m.food?.name || m.food || null;
    // The evening table is the night's table: a meal eaten where you
    // lodge lands on the lodging's Relation too — the inn that fed you
    // is not just where dinner happened.
    const atLodging = (m.slot === 'evening' || m.slug === 'tavern_meal')
      ? slugify(overnight) : null;
    return {
      type: 'meal',
      when: when({
        phase: SLOT_PHASE[m.slot] || m.phase || phaseOfHour(m.hour_float),
      }),
      where: where(regionOf(day), atLodging),
      data: {
        slot: m.slot || null,
        // A skipped meal is an absence the mind should feel, not a gap.
        eaten: food != null || m.itemId != null || m.slug === 'tavern_meal',
        // Subject slugs, not display names — 'Fruit Bread' and
        // 'fruit bread' must land on the same Relation.
        food: slugify(food),
        drink: slugify(m.drink?.name || m.drink) || null,
        // The narrator's meal prose is the memory's reading — including
        // the hungry variants when the table was empty.
        reading: describeMeal(m, rngOf(day))
          || [mealLabel(food), mealLabel(m.drink?.name || m.drink)]
            .filter(Boolean).join(', ') || null,
        // C28: food the world provided — an encounter gift or a shelter
        // table — weighs more than another ration from the pack.
        tags: m.provided ? ['given'] : undefined,
      },
    };
  });
}

const SETTLEMENT_KINDS = new Set([
  'town', 'city', 'village', 'inn', 'tavern',
  'fortified city', 'fortified town', 'citadel', 'manor', 'camp',
]);

// The record's thematic tags that carry felt meaning at a distance —
// a curated pass-through of the closed registry (ADR-0015), so a dead
// keep and a sheltered one do not sediment alike.
const FELT_PLACE_TAGS = ['danger', 'uncanny', 'melancholy', 'shelter', 'sacred'];

function placeEvents(day) {
  return (day.locations || []).map((loc) => {
    const tags = [];
    if (SETTLEMENT_KINDS.has(loc.type)) tags.push('settlement');
    if (loc.entered) tags.push('entered');
    if (loc.hostile) tags.push('hostile');
    if (loc.sighted) tags.push('sighted');
    if (loc.visited) tags.push('visited');
    // A dead place is a fact the eye reads from afar — the burned inn
    // shows no smoke. Its felt tags come too: a ruin's melancholy and
    // a refuge's promise mean different things to the mind.
    if (isDeadPlace(loc)) tags.push('dead_place');
    for (const t of FELT_PLACE_TAGS) {
      if ((loc.record_tags || []).includes(t)) tags.push(t);
    }
    return {
      type: 'land',
      // A distant place enters awareness when it is first sighted on the
      // horizon, not at the leg's closest approach.
      when: when({ phase: loc.phase || phaseOfHour(loc.sighted ? loc.sighted_hour_float : loc.hour_float) }),
      where: where(loc.region || regionOf(day)),
      data: {
        subtype: 'place',
        name: loc.name || loc.id,
        // The subject slug — 'name' is prose, 'place' is what the
        // Relation accretes on (tag:place:esgaroth). Every sighting,
        // visit and stay feeds the same identity.
        place: slugify(loc.name || loc.id),
        kind: slugify(loc.type) || null,
        distance_km: loc.distance_km ?? null,
        // Beyond its reach a place is only a silhouette: the sighted_far
        // line is all it says — census and ficha prose belong to a
        // traveller who got close or went in.
        ...(isDistantSighting(loc)
          ? { sighted_far: loc.sighted_far ?? sightedShape(loc) }
          : {
              population: loc.population ?? null,
              inhabitants: loc.inhabitants ?? null,
              aspect: loc.aspect ?? null,
              aspect_es: loc.aspect_es ?? null,
              presence: loc.presence ?? undefined,
              presence_es: loc.presence_es ?? undefined,
              // Within reach, whoever keeps the place is met: the resident
              // entity rides as her own subject ('npc:npc_sh_37') — you
              // can't see Hallas from afar, but in his lighthouse he opens
              // the door. The Relation accretes on the person, not the walls.
              ...(loc.host ? {
                npc: loc.host.slug ?? slugify(loc.host.name),
                npc_name: loc.host.name ?? null,
                npc_people: loc.host.people ?? null,
                npc_gloss: loc.host.gloss ?? null,
                npc_gender: loc.host.gender ?? null,
              } : {}),
            }),
        sighted: loc.sighted
          ? { hour_float: loc.sighted_hour_float ?? null, direction: loc.sighted_direction ?? null }
          : undefined,
        // The narrator's place line (proximity, far silhouette or ficha
        // prose) is also the memory's reading — and a keeper met at her
        // own door is part of the scene, named by her entity.
        reading: (() => {
          const line = (collectLocationNotes([loc])[0] || '')
            .replace(/^- /, '') || loc.name || loc.id || null;
          const keeper = !isDistantSighting(loc) && loc.host
            ? `${loc.host.name}${loc.host.gloss ? `, ${loc.host.gloss}` : ''}`
            : null;
          return keeper && line ? `${line} — kept by ${keeper}` : line;
        })(),
        tags: tags.length ? tags : undefined,
      },
    };
  });
}

// Entering a new land is an event, not just `where` metadata: yesterday's
// region names decide which of today's are crossings. The hour the leg
// first read as the new land anchors the moment; a land present from the
// leg's start was crossed at first light (walking never reaches night).
function regionEvents(day, previousDay) {
  const prevNames = new Set(
    (previousDay?.regions || [])
      .map((r) => r?.name || r)
      .filter(Boolean)
  );
  return (day.regions || [])
    .filter((r) => {
      const name = r?.name || r;
      return name && !prevNames.has(name);
    })
    .map((r) => {
      const name = r?.name || r;
      const hourFloat = typeof r === 'object' ? r.first_seen_hour_float : null;
      return {
        type: 'land',
        when: when({
          phase: hourFloat == null || hourFloat < 13 ? 'morning' : 'afternoon',
          hour: hourFloat ?? undefined,
        }),
        where: where(name),
        data: {
          subtype: 'region',
          name,
          description:
            (r && typeof r === 'object' ? r.description_summary : null) ?? null,
          reading: `crossed into ${name}`,
          tags: ['region_entered'],
        },
      };
    });
}

// One terrain event per phase the road crossed — the narrator's terrain
// prose for that phase is also the memory's reading.
function terrainEvents(day) {
  const biomesByPhase = groupByPhase(day.biomes);
  const events = [];
  for (const phase of ['morning', 'afternoon', 'night']) {
    const biomes = biomesByPhase[phase] || [];
    if (!biomes.length) continue;
    const notes = collectTerrainNotes(
      biomes, [], day.regions, day.terrain_phrases, rngOf(day)
    );
    events.push({
      type: 'land',
      when: when({ phase }),
      where: where(regionOf(day, phase)),
      data: {
        subtype: 'terrain',
        biomes: biomes
          .map((b) => ({ type: b?.type || b?.name || null, hour_float: b?.hour_float ?? null }))
          .slice(0, 6),
        reading: notes.join(' ') || biomes[0]?.type || null,
      },
    });
  }
  if (!events.length && day.terrain_phrases) {
    const phrases = Object.values(day.terrain_phrases || {})
      .flatMap((r) => Object.values(r)).flat().slice(0, 6);
    if (!phrases.length) return events;
    events.push({
      type: 'land',
      when: when(),
      where: where(regionOf(day)),
      data: { subtype: 'terrain', terrain_phrases: phrases, reading: phrases[0] ?? null },
    });
  }
  return events;
}

function waterEvents(day) {
  return (day.water_crossings || []).map((w) => ({
    type: 'land',
    when: when({ phase: w.phase || phaseOfHour(w.hour_float) }),
    where: where(w.region || regionOf(day)),
    data: { subtype: 'water', name: w.name || null,
            // A crossing is contact with a place-subject — the Bruinen
            // is a ford you come to know, not just where it happened.
            place: slugify(w.name), kind: slugify(w.type) || null,
            reading: describeWaterCrossings([w], rngOf(day)) || w.name || null },
  }));
}

// Ambient voices (ADR-0015): the tag-gated situations the world resolved
// for this day — the wind of a region, the silence of a valley. One event
// carries every voice that fired; the mind hears the outcome text the
// resolver already chose, never the candidate list.
// ADR-0016: a resolved ambient situation is a 'moment' — the world's
// voice making itself felt ("the wall that makes noise, night 1"), one
// event per situation. The mechanical `effects` were already applied
// host-side; they never cross the wire. `record`/`situation` ride as
// provenance anchors: the same authored voice speaking again connects
// as memory.
function momentEvents(day) {
  const text = (v) => (typeof v === 'string' ? v : v?.en ?? v?.es ?? null);
  return (day.ambient || [])
    .filter((a) => a?.text)
    .map((a) => ({
      type: 'moment',
      // The resolver stamps the phase; payloads that lack it (older days,
      // foreign callers) still get a walking phase — a phase-less moment
      // would never reach a phase block.
      when: when({
        phase: a.phase ?? (rngOf(day)() < 0.5 ? 'morning' : 'afternoon'),
      }),
      where: where(regionOf(day)),
      data: {
        record: a.record_id ?? null,
        situation: a.situation_id ?? null,
        name: text(a.name) ?? null,
        reading: text(a.text),
      },
    }));
}

// rest_quality (0..3, 'poor'/'good' in older data) says how the night
// actually rested — only the extremes tag: >=3 is a good night, <=1 is
// one the mechanics themselves don't count as rest (REST_TRACK_MIN).
function restQualityTag(quality) {
  if (quality == null) return null;
  if (typeof quality === 'string') {
    if (quality === 'good' || quality === 'great') return 'rest:good';
    if (quality === 'poor' || quality === 'bad') return 'rest:poor';
    return null;
  }
  if (quality >= 3) return 'rest:good';
  if (quality <= 1) return 'rest:poor';
  return null;
}

function restEvent(day) {
  const overnight = day.overnight_interaction || day.overnight_location;
  if (!overnight) return null;
  // How the night was secured is part of the night's meaning: a paid bed,
  // a stranger's mercy after a persuasion plea, or a door shut in the face.
  // day.lodging is attached by the host after dayState resolution.
  const lodging = day.lodging || {};
  const indoor = !!day.overnight_location?.indoor && !lodging.turnedAway;
  const tags = [];
  if (lodging.paid) tags.push('lodging:paid');
  if (lodging.charity) tags.push('lodging:charity');
  if (lodging.turnedAway) tags.push('lodging:turned_away');
  // A door shut in the face means the night's real quality was rough —
  // the offered bed's tier was never lived.
  const quality = lodging.turnedAway
    ? 'rest:poor'
    : restQualityTag(overnight.rest_quality);
  if (quality) tags.push(quality);
  if (indoor) tags.push('rest:indoor');
  if (!indoor) tags.push('rest:open_sky');
  // Under open sky the sleeper lives the night's weather; an indoor bed
  // muffles it — conditions only join the reading of a rough night.
  const conditions = indoor
    ? []
    : collectNighttimeConditions(day.nighttime_climate, rngOf(day));
  // Who keeps the place, when somebody does — the host is the mind's
  // person ('npc:mimosa'), so the widow of the deep smial is remembered
  // by name and her door stays familiar.
  const host = day.overnight_location?.host ?? null;
  const nightReading = restReading({
    overnight, lodging, conditions, rng: rngOf(day),
  });
  return {
    type: 'rest',
    when: when({ phase: 'night' }),
    where: where(regionOf(day)),
    data: {
      // The night anchors to its PLACE like any other entity — the inn
      // that sheltered you is as relatable as the one that shut its door.
      // The location is the entity; the interaction record ('ovn:*') is
      // only the night's voice, never the anchor.
      entity: day.overnight_location?.slug
        ?? day.overnight_location?.name ?? day.overnight_location?.id
        ?? null,
      entity_name: day.overnight_location?.name
        ?? overnight.title ?? overnight.name ?? null,
      entity_type: day.overnight_location?.type
        ?? overnight.location_type ?? overnight.type ?? null,
      // The person who keeps the place — her own npc subject keyed by
      // her entity slug, so the mind's Relation is with the person the
      // DB says lives here, stable across every trip.
      npc: host?.slug ?? (host ? slugify(host.name) : null),
      npc_name: host?.name ?? null,
      npc_people: host?.people ?? null,
      npc_gloss: host?.gloss ?? null,
      npc_gender: host?.gender ?? null,
      reading: host
        ? `${host.name}, ${host.gloss} — ${nightReading}`
        : nightReading,
      shadow_effect: overnight.shadow_effect ?? null,
      tags: tags.length ? tags : undefined,
    },
  };
}

/**
 * Translate a resolved game day into the events[] the mind perceives.
 * Vitals and mileage are NOT events — the body's state rides the wire's
 * `condition` channel (toOpenPayload), which is what detectors read.
 * @param {Object} params
 * @param {Object} params.day - resolved day (same object narrateDay receives)
 * @param {Object} params.trip
 * @param {Object} params.character - narrator character snapshot
 * @param {Object} [params.previousDay] - yesterday's names (region entries)
 * @returns {Array} events[] contract
 */
// The day's resolved Interactions (Wave C): minted by the engine during
// sequential choosing and already sedimented by the interim /perceive —
// they ride the wire so the episode annotates them for narration and
// memory, while open's dedup keeps them from re-feeding the Relations.
function interactionEvents(day) {
  return Array.isArray(day.interaction_events) ? day.interaction_events : [];
}

export function toEvents({ day, trip, character, previousDay }) {
  const events = [
    ...climateEvents(day),
    ...terrainEvents(day),
    ...encounterEvents(day),
    ...mealEvents(day),
    ...placeEvents(day),
    ...regionEvents(day, previousDay),
    ...waterEvents(day),
    ...momentEvents(day),
    ...interactionEvents(day),
    ...(restEvent(day) ? [restEvent(day)] : []),
  ];
  return events;
}
