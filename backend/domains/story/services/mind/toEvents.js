// ============================================================================
// Day -> events[] translator
// ----------------------------------------------------------------------------
// Node is the host: it owns the mechanical world and must translate a
// resolved day into the Mind Engine's strict events[] contract before
// calling the mind. Event types are free strings; the fields each type
// carries are aligned with mind.facets (A3) so banding/readings resolve:
//
//   ENVELOPE — every event may carry the universal vocabulary flat:
//               act (what the traveller was doing — walk/watch/talk/
//               eat/rest), intensity (the host's declared force on the
//               shared 0-4 dial), reading (the one-line host-authored
//               perception), tags[] (declared markers: 'weather:*'
//               tiers, 'given', 'entered', 'felt:*'…), check {skill,
//               difficulty?} (the perception gate — universal, not an
//               encounter privilege). `data` holds only what a kind
//               owns.
//
//   climate   — one per phase; the raw metrics stay on the host (they
//               derive the declared tiers and the prose, then stop):
//               {reading, intensity?, tags[]}, no data — the mind
//               never derives tags or prose from raw numbers
//   land      — the umbrella for every kind of land-contact; data.subtype
//               discriminates the shape:
//               · terrain — data: {subtype:'terrain', biomes[] or
//                 terrain_phrases}; {act, reading}
//               · place — one per visited/sighted location:
//                 data: {subtype:'place', name, kind, npc?/npc_name?};
//                 {act, intensity?, reading, tags[]} — 'settlement'
//                 for inhabited places, 'entered' for the one the
//                 traveller actually stopped at, 'hostile' for
//                 enemy-kingdom places skirted from outside. The
//                 subject slug rides where.place — 'name' is prose,
//                 the slug is what the Relation accretes on
//                 (place:esgaroth). Beyond its reach a place is
//                 only a silhouette — the reading says so
//               · water — one per crossing: data: {subtype:'water',
//                 name, kind}; where.place is the crossing's slug
//               · region — one per land ENTERED today (not in
//                 yesterday's regions): data: {subtype:'region', name,
//                 description}; tags:['region_entered'] — crossing a
//                 border is a lived moment, not context: it is what
//                 the Episode can turn on and what gets remembered
//   meal      — one per meal slot: data: {food?, drink?};
//               {act:'eat', reading, tags[]?} — a skipped meal is an
//               absence the reading already words
//   rest      — overnight: data: {entity, entity_name, kind, npc?,
//               npc_name?, shadow_delta?}; {act:'rest', reading,
//               tags[]} — the night's place climbs the identity
//               ladder like any other entity; 'rest:*' tags declare
//               the night's kind (open_sky, indoor, good, poor) and
//               'lodging:*' how it was secured (paid, charity,
//               turned_away). shadow_delta stays numeric — the
//               affect.field hook saying how much the place pressed
//               on the shadow.
//   encounter — one per encounter: data: {entity, entity_name,
//               entity_type, npc?, npc_name?, family, danger, form,
//               outcome?, prose_hint?, topic, substance, thread?,
//               resolves?}; {act?, intensity?, reading, tags[]?,
//               check} — form is how contact happened (sign_only/
//               sound_only/confronts...), outcome only exists when a
//               resistance roll ran. When the interaction resolved
//               dialogue, topic tags the theme and substance carries
//               the lived content (what passed between them, what the
//               traveller did) — the mind's memory of contact is a
//               happening, not a noun.
//               where: {region} from the encounter's own region, plus
//               {place} when the meeting is anchored to a named spot —
//               what was lived AT a place marks the place too
//   ambience  — the land's resolved voices: data: {name, subtype?,
//               provenance?{record, situation}}; {act, intensity?,
//               reading, tags[]?} — provenance anchors are host ids,
//               inspectable but never vocabulary
//   interaction — minted by the interaction engine (Wave C) with a
//               stable id: data: {entity, entity_name, outcome,
//               danger?, after?, shadow_delta?, provenance?};
//               {act, intensity?, reading, tags[]?}
//
// Mind hooks (B1/B2): encounter events carry check = {skill,
// difficulty} for the gates & rolls pass, and thread/resolves markers
// in data for the needs engine — a harmful outcome opens
// `thread:unfinished_encounter:<slug>`, an unscathed re-encounter
// resolves it.
//
// Phase-scoped events add when.phase (+hour and +light where the sun
// is known); the Episode itself owns index/date — events only carry
// the moment within it. `when.light` is the host's solar reading
// (dawn|day|dusk|night via solarKey): the narrator knows what was
// visible, never reads a clock.
//
// Perception contract (#53 — the Universal Tagger's contract): every
// event that should read as something carries `reading`, a one-line
// host-authored perception, and `tags` — the declared 'weather:*'
// tiers and markers the mind's wiring keys against. The mind consumes
// both verbatim; deriving tags or prose from raw numbers is the host's
// job, never the mind's. Null fields are simply omitted.
// ============================================================================

import { innerClimate, meanOf, sumOf } from '../../adapters/mapClient.js';
import {
  resolveClimateState,
  summariseWeather,
  weatherReading,
  weatherTags,
} from '../naturalLanguage/climateNotes.js';
import { collectRoadNotes } from '../naturalLanguage/roadNotes.js';
import { describeElevation } from '../naturalLanguage/elevationNotes.js';
import { describeMeal, mealLabel } from '../naturalLanguage/mealNotes.js';
import { collectTerrainNotes } from '../naturalLanguage/terrainNotes.js';
import { collectLocationNotes, isDeadPlace, isDistantSighting } from '../naturalLanguage/placeNotes.js';
import { describeWaterCrossings } from '../naturalLanguage/waterNotes.js';
import {
  REST_OPEN_SKY,
  collectNighttimeConditions,
  restReading,
} from '../naturalLanguage/nightNotes.js';
import { groupByPhase } from '../naturalLanguage/dayPhases.js';
import { seasonOfDate } from '../naturalLanguage/seasonalVariants.js';
import { solarLine } from '../naturalLanguage/solarMoments.js';
import { solarKey } from '../naturalLanguage/daylight.js';
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

// when.light — the host's solar reading (dawn|day|dusk|night): the
// narrator knows a 17:42 event in autumn happened in the dark without
// reading digits. Hour-scoped events resolve through solarKey; a
// phase-only 'night' event still declares 'night'.
function when(extra = {}, day = null) {
  const w = Object.fromEntries(
    Object.entries(extra).filter(([, v]) => v != null)
  );
  const light = solarKey(w.hour, day?.daylight)
    ?? (w.phase === 'night' ? 'night' : null);
  if (light) w.light = light;
  return w;
}

// The wire omits what it does not say: null/undefined values are
// stripped so the strict model never sees a declared absence.
function omitNil(obj) {
  return Object.fromEntries(
    Object.entries(obj || {}).filter(([, v]) => v != null)
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

// The weather tiers' force on the shared 0-4 dial (#184): a storm day
// is an event, a wet road is background noise.
const WEATHER_INTENSITY = {
  'weather:storm': 3, 'weather:deep_cold': 3,
  'weather:scorching': 2, 'weather:snow': 2,
  'weather:freezing': 1,
};

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
    // The raw metrics are the host's arithmetic — they derive the
    // declared tiers and the prose line, then stay here: the mind
    // knows the day through its reading and its tags, never numbers.
    const metrics = {
      temperature_2m: meanOf(records.map((w) => w.temperature_2m)),
      cloud_cover: meanOf(records.map((w) => w.cloud_cover)),
      wind_speed_10m: meanOf(records.map((w) => w.wind_speed_10m)),
      precipitation: sumOf(records.map((w) => w.precipitation)),
    };
    const tags = weatherTags(metrics);
    const intensity = Math.max(0, ...tags.map((t) => WEATHER_INTENSITY[t] ?? 0));
    events.push({
      type: 'climate',
      when: when({ phase }, day),
      where: where(regionOf(day, phase)),
      // The chapter's weather prose IS the memory's reading (ADR-0016):
      // one verbalization, narrated and remembered alike.
      reading: summariseWeather(records, rngOf(day))
        ?? weatherReading(metrics),
      ...(intensity ? { intensity } : {}),
      ...(tags.length ? { tags } : {}),
    });
  }
  // The sun's moments weave into the weather: the morning sky carries the
  // dawn, the sunset's phase carries the dusk, and polar analogs the day's
  // real light news — the narrator blends them, never reads digits.
  attachSolarClauses(events, day);
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
    .map((e) => {
      const slug = slugify(e.entity.slug || e.entity.name || e.entity.id);
      const outcome = e.interaction?.outcome ?? null;
      const npc = e.interaction?.npc ?? null;
      const dc = e.interaction?.dialogue_content;
      // C28: what touched the mechanics is weight-space. 'given' — an
      // authored gift the host applied unconditionally (stamped by the
      // engine when sole/shared effects landed); 'changed' — the
      // encounter left a mark on the body, or a fork stood and was
      // taken (the engine's resolved_choice). The mind's semantic
      // pack ('salience_min' on the row) lifts these out of background.
      const tags = [];
      if (e.interaction?.given) tags.push('given');
      if (e.interaction?.resolved_choice?.changed
          || outcome === 'wounded' || outcome === 'badly wounded') {
        tags.push('changed');
      }
      // The one-line perception the mind keeps: resolved substance
      // leads, the form's prose hint carries contact without words.
      // A named being leads with its name — 'Bungo, a hobbit —
      // shared news' remembers better than 'humans — shared news'.
      const reading = (() => {
        const subject = npc
          ? `${npc.name}, ${npc.gloss}`
          : e.entity.name || humanize(slug);
        const detail = dc?.concrete_content
          ?? e.interaction?.prose_hint ?? null;
        if (subject && detail) {
          const stance = dc?.traveller_stance;
          return `${subject} — ${detail}${stance ? ` ${stance}` : ''}`;
        }
        return subject || detail;
      })();
      return {
        type: 'encounter',
        when: when({
          phase: e.phase || phaseOfHour(e.hour_float),
          hour: e.hour_float,
        }, day),
        // An encounter anchored to a named spot (a mover leg at a
        // gate, an ambush at the ford) marks the place too.
        where: where(e.region || regionOf(day, e.phase),
          slugify(e.location?.name || e.location)),
        // What the traveller was doing (the interactions' activity
        // vocabulary): a sign or a far shape is watched before any
        // dialogue content is weighed — 'sign_only' tracks read as
        // 'watch', never 'talk'.
        ...(WATCH_FORMS.has(e.interaction?.form)
          ? { act: 'watch' }
          : dc ? { act: 'talk' } : {}),
        intensity: e.interaction?.intensity ?? undefined,
        reading,
        ...(tags.length ? { tags } : {}),
        check: encounterCheck(e.entity, e.interaction),
        data: omitNil({
          entity: slug,
          entity_name: e.entity.name || null,
          entity_type: e.entity.type || e.entity.entity_type || null,
          // Who spoke, when words passed — the slug tags the person as
          // its own subject ('npc:hal'), the name is how the mind says
          // them.
          npc: npc ? slugify(npc.name) : null,
          npc_name: npc?.name ?? null,
          // Kind-of-being between type and entity (foxes within
          // carnivores) — attitudes match entity > family > type.
          family: e.entity.family ?? null,
          danger: e.entity.danger_level ?? e.entity.danger ?? null,
          // How contact happened matters more than its mechanical
          // result: 'sign_only' is a different experience than
          // 'confronts'.
          form: e.interaction?.form ?? null,
          // prose_hint only rides when no dialogue resolved — where a
          // substance.content exists it would say the same prose twice.
          prose_hint: dc ? undefined : e.interaction?.prose_hint ?? null,
          // C16: the substance of contact. 'topic' is tag material
          // ('news_and_rumor' recurring is a theme); 'substance' is
          // prose material — what was said/offered/done, resolved
          // host-side — the pack composes how the memory reads.
          topic: dc?.topic ?? null,
          substance: dc ? omitNil({
            attitude: dc.npc_attitude ?? null,
            content: dc.concrete_content ?? null,
            tension: dc.tension ?? null,
            stance: dc.traveller_stance ?? null,
          }) : null,
          outcome,
          // Needs (B2): surviving a hostile contact leaves an open
          // thread the mind keeps alive until the same entity is faced
          // unscathed or the host resolves it in the close outcome.
          thread: (outcome === 'wounded' || outcome === 'badly wounded')
            ? `unfinished_encounter:${slug}` : null,
          resolves: outcome === 'unscathed'
            ? `unfinished_encounter:${slug}` : null,
        }),
      };
    });
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
      }, day),
      where: where(regionOf(day), atLodging),
      act: 'eat',
      // The narrator's meal prose is the memory's reading — including
      // the hungry variants when the table was empty (a skipped meal is
      // an absence the reading words; no flag needed).
      reading: describeMeal(m, rngOf(day))
        || [mealLabel(food), mealLabel(m.drink?.name || m.drink)]
          .filter(Boolean).join(', ') || undefined,
      // C28: food the world provided — an encounter gift or a shelter
      // table — weighs more than another ration from the pack.
      ...(m.provided ? { tags: ['given'] } : {}),
      data: omitNil({
        // Subject slugs, not display names — 'Fruit Bread' and
        // 'fruit bread' must land on the same Relation.
        food: slugify(food),
        drink: slugify(m.drink?.name || m.drink) || null,
      }),
    };
  });
}

const SETTLEMENT_KINDS = new Set([
  'town', 'city', 'village', 'inn', 'tavern',
  'fortified city', 'fortified town', 'citadel', 'manor', 'camp',
]);

// The record's felt tags carry the place's tone (#184): 'felt:*' names
// a mood-wheel word the event pulls toward. Data authors the word —
// the code only passes the namespace through.
const FELT_PREFIX = 'felt:';

// Contact without touch — the thing was registered at a distance, so the
// traveller's activity on the wire is watching, not meeting.
const WATCH_FORMS = new Set([
  'sign_only', 'glimpsed_far', 'sound_only', 'observed_activity',
  'presence_felt', 'watches', 'scenery', 'drifts_closer',
  'mistaken_for_object', 'passed_by',
]);

function placeEvents(day) {
  return (day.locations || []).map((loc) => {
    // A second pass through a place already met this trip: the event
    // still happens — the mind evokes the memory it left — but the
    // arrival scene is told once. No prose re-ships and its pull is a
    // whisper, same as a shape sighted from afar.
    const revisit = loc.told && loc.visited && !loc.entered;
    const tags = [];
    if (SETTLEMENT_KINDS.has(loc.type)) tags.push('settlement');
    if (loc.entered) tags.push('entered');
    if (loc.hostile) tags.push('hostile');
    if (loc.sighted) tags.push('sighted');
    if (loc.visited) tags.push('visited');
    // A dead place is a fact the eye reads from afar — the burned inn
    // shows no smoke — and its tone is melancholy: the marker stays
    // mechanical, the felt word is what the mood reads.
    if (isDeadPlace(loc)) tags.push('dead_place', 'felt:melancholy');
    for (const t of loc.record_tags || []) {
      if (t.startsWith(FELT_PREFIX)) tags.push(t);
    }
    return {
      type: 'land',
      // A distant place enters awareness when it is first sighted on the
      // horizon, not at the leg's closest approach.
      when: when({
        phase: loc.phase || phaseOfHour(loc.sighted ? loc.sighted_hour_float : loc.hour_float),
        hour: (loc.sighted ? loc.sighted_hour_float : loc.hour_float) ?? undefined,
      }, day),
      // The subject slug rides where.place — 'name' is prose, the slug
      // is what the Relation accretes on (entity:esgaroth). Every
      // sighting, visit and stay feeds the same identity.
      where: where(loc.region || regionOf(day),
        slugify(loc.name || loc.id)),
      // A far shape is watched, a reached one walked through — the
      // same activity vocabulary interactions use.
      act: isDistantSighting(loc) ? 'watch' : 'walk',
      // The place's declared force (0-4, #184): being inside a ruin
      // imprints; the same ruin sighted from afar — or passed a
      // second time — declares zero: the floor keeps only the
      // whisper of familiarity a silhouette or a return can teach.
      intensity: isDistantSighting(loc) || revisit ? 0 : loc.intensity ?? undefined,
      // The narrator's place line (proximity, far silhouette or ficha
      // prose) is also the memory's reading — and a keeper met at her
      // own door is part of the scene, named by her entity.
      reading: (() => {
        const line = (collectLocationNotes([loc], day.daylight)[0] || '')
          .replace(/^- /, '') || loc.name || loc.id || null;
        const keeper = !isDistantSighting(loc) && loc.host
          ? `${loc.host.name}${loc.host.gloss ? `, ${loc.host.gloss}` : ''}`
          : null;
        return keeper && line ? `${line} — kept by ${keeper}` : line;
      })(),
      ...(tags.length ? { tags } : {}),
      data: omitNil({
        subtype: 'place',
        name: loc.name || loc.id,
        kind: slugify(loc.type) || null,
        // Within reach, whoever keeps the place is met: the resident
        // entity rides as her own subject ('entity:npc_sh_37') — you
        // can't see Hallas from afar, but in his lighthouse he opens
        // the door. The Relation accretes on the person, not the walls.
        ...(isDistantSighting(loc) || revisit || !loc.host ? {} : {
          npc: loc.host.slug ?? slugify(loc.host.name),
          npc_name: loc.host.name ?? null,
        }),
      }),
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
        }, day),
        where: where(name),
        // What the traveller was doing when the land changed — the
        // shared activity vocabulary, like interactions' acts (#184).
        act: 'walk',
        // The land's own force (#184): crossing into Mordor is not the
        // same event as crossing into the Shire.
        intensity:
          (r && typeof r === 'object' ? r.intensity : null) ?? undefined,
        reading: `crossed into ${name}`,
        tags: ['region_entered'],
        data: omitNil({
          subtype: 'region',
          name,
          description:
            (r && typeof r === 'object' ? r.description_summary : null) ?? null,
        }),
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
      biomes, [], day.regions, day.terrain_phrases, rngOf(day), day.daylight
    );
    events.push({
      type: 'land',
      when: when({ phase }, day),
      where: where(regionOf(day, phase)),
      act: 'walk',
      reading: notes.join(' ') || biomes[0]?.type || undefined,
      data: {
        subtype: 'terrain',
        // The ground crossed as kind-slugs — the event's own when
        // already says when the phase happened.
        biomes: biomes
          .map((b) => b?.type || b?.name || null)
          .filter(Boolean)
          .slice(0, 6),
      },
    });
  }
  if (!events.length && day.terrain_phrases) {
    const phrases = Object.values(day.terrain_phrases || {})
      .flatMap((r) => Object.values(r)).flat().slice(0, 6);
    if (!phrases.length) return events;
    events.push({
      type: 'land',
      when: when({}, day),
      where: where(regionOf(day)),
      act: 'walk',
      reading: phrases[0] ?? undefined,
      data: { subtype: 'terrain', terrain_phrases: phrases },
    });
  }
  return events;
}

function waterEvents(day) {
  return (day.water_crossings || []).map((w) => ({
    type: 'land',
    when: when({
      phase: w.phase || phaseOfHour(w.hour_float),
      hour: w.hour_float ?? undefined,
    }, day),
    // A crossing is contact with a place-subject — the Bruinen
    // is a ford you come to know, not just where it happened.
    where: where(w.region || regionOf(day), slugify(w.name)),
    act: 'walk',
    reading: describeWaterCrossings([w], rngOf(day), day.daylight) || w.name || undefined,
    data: omitNil({
      subtype: 'water', name: w.name || null,
      kind: slugify(w.type) || null,
    }),
  }));
}

// The sun rides inside the weather events: dawn joins the morning sky,
// dusk joins whichever phase holds the sunset, and the polar kinds join
// the phase that feels them — the morning for a sun that never rises,
// the night for one that never sets. One reading, woven, so the narrator
// can blend the two moments ('a cold dawn', 'dusk into rain'). Dawn only
// speaks when it is extreme (before 6 or after 8); dusk always closes
// the light. The clause leads the reading — it anchors the moment.
function attachSolarClauses(events, day) {
  const dl = day?.daylight;
  if (!dl || !events.length) return;
  const season = seasonOfDate(day.date);
  const rng = rngOf(day);
  const attach = (phases, kind) => {
    const target = phases
      .map((p) => events.find((e) => e.when?.phase === p))
      .find(Boolean);
    const clause = target && solarLine(kind, season, rng);
    if (clause) target.reading = `${clause}, ${target.reading}`;
  };
  if (dl.polar === 'night') {
    attach(['morning', 'afternoon', 'night'], 'polar_night');
    return;
  }
  if (dl.polar === 'day') {
    attach(['night', 'afternoon', 'morning'], 'midnight_sun');
    return;
  }
  const sunrise = typeof dl.sunrise === 'number' ? dl.sunrise : null;
  const sunset = typeof dl.sunset === 'number' ? dl.sunset : null;
  if (sunrise != null && (sunrise < 6 || sunrise > 8)) {
    attach(['morning'], 'dawn');
  }
  if (sunset != null) {
    attach([phaseOfHour(sunset) || 'afternoon', 'afternoon', 'night', 'morning'], 'dusk');
  }
}

// Ambient voices (ADR-0015): the tag-gated situations the world resolved
// for this day — the wind of a region, the silence of a valley. One event
// carries every voice that fired; the mind hears the outcome text the
// resolver already chose, never the candidate list.
// ADR-0016: a resolved ambient situation is an 'ambience' event — the
// world's own voice making itself felt ("the wall that makes noise,
// night 1"), one event per situation (named 'moment' until #158 — the
// name competed with the inner voice it is not). The mechanical
// `effects` were already applied host-side; they never cross the wire.
// `record`/`situation` ride as provenance anchors: the same authored
// voice speaking again connects as memory.
function ambienceEvents(day) {
  const text = (v) => (typeof v === 'string' ? v : v?.en ?? v?.es ?? null);
  return (day.ambient || [])
    .filter((a) => a?.text)
    .map((a) => ({
      type: 'ambience',
      // The resolver stamps the phase; payloads that lack it (older days,
      // foreign callers) still get a walking phase — a phase-less
      // ambience would never reach a phase block.
      when: when({
        phase: a.phase ?? (rngOf(day)() < 0.5 ? 'morning' : 'afternoon'),
      }, day),
      where: where(regionOf(day)),
      // The land speaks while the traveller walks — ambient voices
      // are road things.
      act: 'walk',
      reading: text(a.text),
      // The ambient record's declared force — most voices stay washed,
      // a heavy land can declare it presses in (#184).
      ...(a.intensity != null ? { intensity: a.intensity } : {}),
      // The ambient record's tone — one felt:* word the resolver
      // already picked (#184).
      ...(a.felt ? { tags: [a.felt] } : {}),
      data: omitNil({
        name: text(a.name) ?? null,
        // record/situation ride as provenance — host ids, inspectable
        // for the same-voice link, never tag vocabulary.
        ...((a.record_id || a.situation_id) ? {
          provenance: omitNil({
            record: a.record_id ?? null,
            situation: a.situation_id ?? null,
          }),
        } : {}),
      }),
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
  // A forced halt ended the day early — the night's rest was the body
  // calling it, not the clock.
  if (day.halt) tags.push('rest:halt');
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
  // The night anchors to its PLACE like any land event — the inn that
  // sheltered you and the Dale you passed feed the same 'place:' subject.
  // The interaction record ('ovn:*') is only the night's voice, never
  // the anchor. The place is always a slug — a display name must
  // slugify, never ride as identity.
  const placeSlug = day.overnight_location?.slug
    ?? slugify(day.overnight_location?.name)
    ?? day.overnight_location?.id ?? null;
  return {
    type: 'rest',
    when: when({ phase: 'night' }, day),
    where: where(regionOf(day), placeSlug),
    act: 'rest',
    reading: host
      ? `${host.name}, ${host.gloss} — ${nightReading}`
      : nightReading,
    ...(tags.length ? { tags } : {}),
    data: omitNil({
      // The place's display name pairs with where.place; what KIND of
      // place the night was rides 'kind' (the land/place vocabulary —
      // point_of_interest, inn…), not an entity record.
      name: day.overnight_location?.name
        ?? overnight.title ?? overnight.name ?? null,
      kind: day.overnight_location?.type
        ?? overnight.location_type ?? overnight.type ?? null,
      // The person who keeps the place — her own npc subject keyed by
      // her entity slug, so the mind's Relation is with the person the
      // DB says lives here, stable across every trip.
      npc: host?.slug ?? (host ? slugify(host.name) : null),
      npc_name: host?.name ?? null,
      shadow_delta: overnight.shadow_effect ?? null,
    }),
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

// The weather the day inherits (was narration_notes.climate_state): a
// multi-day streak — snowbound, drenched — is a thing lived, so it
// speaks at first light like the land's other voices. The streak is
// host memory (recent days' climate), never a number the mind derives.
function climateStateEvents(day, recentDayClimates) {
  const { narrative } = resolveClimateState(recentDayClimates, rngOf(day));
  if (!narrative) return [];
  return [{
    type: 'ambience',
    when: when({ phase: 'morning' }, day),
    where: where(regionOf(day)),
    act: 'walk',
    reading: narrative,
    data: { subtype: 'climate_state' },
  }];
}

// The day's ground as lived material (was narration_notes.lands): the
// road's character and the climb's effort ride one terrain event, timed
// to where they bite — the day's elevation peak anchors the moment
// (dawn crests speak in the morning, midday and dusk ones in the
// afternoon). Regions themselves already ride 'region' events; this is
// what their crossing used to summarise as context.
function groundEvents(day) {
  const rng = rngOf(day);
  const notes = collectRoadNotes(
    day.road_types, day.regions, day.terrain_phrases, rng
  ).map((n) => n.replace(/^- \w+: /, '').replace(/ \([\d.]+ km\)$/, ''));
  const elevation = describeElevation(day.elevation_profile, rng);
  if (!notes.length && !elevation) return [];
  const profile = day.elevation_profile || {};
  const peak = Math.max(
    profile.dawn_m || 0, profile.midday_m || 0, profile.dusk_m || 0
  );
  const phase = !elevation || peak === (profile.dawn_m || 0)
    ? 'morning'
    : 'afternoon';
  return [{
    type: 'land',
    when: when({ phase }, day),
    where: where(regionOf(day)),
    act: 'walk',
    reading: [notes.join(', '), elevation].filter(Boolean).join(' — '),
    data: { subtype: 'terrain' },
  }];
}

export function toEvents({ day, trip, character, previousDay, recentDayClimates }) {
  const events = [
    ...climateEvents(day),
    ...climateStateEvents(day, recentDayClimates),
    ...terrainEvents(day),
    ...groundEvents(day),
    ...encounterEvents(day),
    ...mealEvents(day),
    ...placeEvents(day),
    ...regionEvents(day, previousDay),
    ...waterEvents(day),
    ...ambienceEvents(day),
    ...interactionEvents(day),
    ...(restEvent(day) ? [restEvent(day)] : []),
  ];
  return events;
}
