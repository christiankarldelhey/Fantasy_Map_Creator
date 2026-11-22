// ============================================================================
// Mind Engine smoke tests (A12)
// ----------------------------------------------------------------------------
// Covers the Node half of the degradation contract: toEvents translates a
// resolved day into the generic events[] contract, and mindClient throws
// when the Mind Engine is unreachable — which is what trips narrateDay's
// catch and routes it back to the stateless /narrate-day. (The fallback
// endpoint itself is covered in mind-engine/tests/test_mind_smoke.py.)
// ============================================================================
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toEvents } from '../toEvents.js';
import { toNarrateDayBody, toOpenPayload } from '../toOpenPayload.js';

// Point the client at a dead port BEFORE importing it — the URL is captured
// at module load. Port 9 (discard) refuses connections: the mind is down.
process.env.MIND_ENGINE_URL = 'http://127.0.0.1:9';
const { openEpisode, closeEpisode, resetMind } = await import('../mindClient.js');

// Real shapes as resolved days carry them (see toEvents.js header):
// climate samples stamp `phase` explicitly and `time` uses a space
// separator; meals carry a slot, not a phase; encounters resolve a full
// interaction object; the overnight carries authored description prose.
const DAY = {
  day_number: 3,
  date: '1950-01-21',
  // Deterministic verbalization: every pick lands its first option.
  rng: () => 0,
  regions: [{ name: 'lone-lands' }],
  climate: [
    { time: '1950-01-21 07:00:00', phase: 'morning', climate: { temperature_2m: 4.2, cloud_cover: 90, wind_speed_10m: 22, precipitation: 0 } },
    { time: '1950-01-21 10:00:00', phase: 'morning', climate: { temperature_2m: 6.0, cloud_cover: 85, wind_speed_10m: 20, precipitation: 0 } },
    { time: '1950-01-21 13:00:00', phase: 'afternoon', climate: { temperature_2m: 8.1, cloud_cover: 60, wind_speed_10m: 15, precipitation: 0.4 } },
    { time: '1950-01-21 19:00:00', phase: 'night', climate: { temperature_2m: -1.0, cloud_cover: 20, wind_speed_10m: 8, precipitation: 0 } },
    { time: '1950-01-22 04:00:00', phase: 'night', climate: { temperature_2m: -3.0, cloud_cover: 10, wind_speed_10m: 5, precipitation: 0 } },
  ],
  distance_km: 14.5,
  walking_hours: 5.5,
  terrain_phrases: { morning: ['rocky slopes'], afternoon: ['bare hills'] },
  biomes: [{ type: 'hills', hour_float: 9 }],
  locations: [{ name: 'Amon Sul', type: 'ruin' }],
  meals: [
    { slot: 'midday', food: 'bread', drink: 'water', itemId: 7 },
    { slot: 'evening', food: null, drink: 'water', itemId: null },
  ],
  overnight_interaction: {
    rest_quality: 'poor',
    shadow_effect: 0.1,
    description: 'The night is spent under open sky.',
  },
  encounters: [{
    entity: { slug: 'corpse-candles', id: 'e1', name: 'Corpse Candles', type: 'undead', family: 'undead', danger_level: 0.7 },
    hour_float: 15.0,
    interaction: {
      form: 'confronts', outcome: 'wounded',
      prose_hint: 'blocks the path outright', intensity: 3,
    },
  }],
};

test('toEvents emits the generic contract from a resolved day', () => {
  const events = toEvents({
    day: DAY,
    trip: { id: 't1' },
    character: { name: 'Tester' },
  });
  const types = events.map((e) => e.type);
  for (const t of ['land', 'meal', 'rest', 'encounter']) {
    assert.ok(types.includes(t), `missing event type ${t}`);
  }
  // The land umbrella discriminates by subtype — terrain and places
  // are land-contact shapes, not types of their own.
  const subtypes = events.map((e) => e.data?.subtype);
  for (const s of ['terrain', 'place']) {
    assert.ok(subtypes.includes(s), `missing land subtype ${s}`);
  }
  for (const e of events) {
    assert.equal(typeof e.type, 'string');
    // `when` is the moment within the episode only — index/date live
    // once, in the episode frame.
    assert.ok(e.when && !('episode' in e.when) && !('date' in e.when),
      'when carries only phase/hour');
  }

  // Climate buckets by the sample's own phase — the walking day must not
  // collapse into a single night aggregate.
  const climates = events.filter((e) => e.type === 'climate');
  assert.deepEqual(
    climates.map((c) => c.when.phase).sort(),
    ['afternoon', 'morning', 'night']
  );
  // Climate events are pure semantics: the mind knows the weather
  // through its reading and declared tags, never through raw metrics —
  // a climate event carries no data at all.
  const morningClimate = climates.find((c) => c.when.phase === 'morning');
  assert.equal(morningClimate.data, undefined);

  // Encounters carry how contact happened, not only its outcome.
  const encounter = events.find((e) => e.type === 'encounter');
  // One slugifier, one spelling: 'corpse-candles' canonicalizes to the
  // underscore identity every subject shares.
  assert.equal(encounter.data.entity, 'corpse_candles');
  assert.equal(encounter.data.entity_type, 'undead');
  // Kind-of-being between type and entity — attitudes match
  // entity > family > type on the mind side.
  assert.equal(encounter.data.family, 'undead');
  assert.equal(encounter.data.danger, 0.7);
  assert.equal(encounter.data.form, 'confronts');
  assert.equal(encounter.data.outcome, 'wounded');
  assert.equal(encounter.data.prose_hint, 'blocks the path outright');
  assert.equal(encounter.data.thread, 'unfinished_encounter:corpse_candles');
  assert.equal(encounter.where.region, 'lone-lands');
  // B1/C8: encounters carry a tracking check whose difficulty is
  // detectability — 'confronts' is imposed contact, almost free to
  // notice; danger only fills in when the form is unknown. The gate is
  // envelope vocabulary — universal, not an encounter privilege.
  assert.equal(encounter.check.skill, 'tracking');
  assert.equal(encounter.check.difficulty, 3);

  // Meals phrase their slot through when.phase; a skipped meal is an
  // absence the reading words, not a flag.
  const meals = events.filter((e) => e.type === 'meal');
  assert.equal(meals.length, 2);
  assert.equal(meals[0].when.phase, 'afternoon');
  assert.equal(meals[0].data.food, 'bread');
  assert.equal(meals[1].when.phase, 'night');
  assert.equal(meals[1].data.food, undefined);

  // The night's own prose rides with the rest event's reading.
  const rest = events.find((e) => e.type === 'rest');
  assert.equal(rest.reading, 'The night is spent under open sky.');
  assert.deepEqual(rest.tags, ['rest:poor', 'rest:open_sky']);

  // Vitals are condition, not events — the wire's `condition` channel
  // carries them (toOpenPayload); nothing named 'body' or 'travel'
  // may appear in events[].
  for (const dead of ['body', 'travel']) {
    assert.ok(!types.includes(dead), `'${dead}' is not an event`);
  }
});

test('events declare readings and weather tiers (the tagger contract)', () => {
  const events = toEvents({
    day: DAY,
    trip: { id: 't1' },
    character: { name: 'Tester' },
  });

  // Climate: the host declares the tiers the mind's wiring keys
  // against — a mild windy morning, a wet afternoon, a freezing night.
  const byPhase = Object.fromEntries(
    events.filter((e) => e.type === 'climate')
      .map((e) => [e.when.phase, e]),
  );
  assert.deepEqual(byPhase.morning.tags, ['weather:windy', 'weather:overcast']);
  assert.deepEqual(byPhase.afternoon.tags, ['weather:wet']);
  assert.deepEqual(byPhase.night.tags, ['weather:freezing']);
  assert.equal(typeof byPhase.morning.reading, 'string');

  // Every narrative event carries a one-line reading the mind keeps
  // verbatim — subject and detail, never raw numbers.
  const encounter = events.find((e) => e.type === 'encounter');
  assert.equal(
    encounter.reading,
    'Corpse Candles — blocks the path outright',
  );
  // Meal readings are the narrator's prose itself — food and drink
  // appear in the day's own words, hunger in the evening's.
  const meals = events.filter((e) => e.type === 'meal');
  assert.match(meals[0].reading, /bread.*water/);
  assert.match(meals[1].reading, /water|hungry|fast/i);
  const landOf = (s) => events.find(
    (e) => e.type === 'land' && e.data.subtype === s,
  );
  assert.match(landOf('place').reading, /Amon Sul/);
  assert.equal(
    events.find((e) => e.type === 'rest').reading,
    'The night is spent under open sky.',
  );
  assert.match(landOf('terrain').reading, /hills|rocky slopes/);
  // Vitals and mileage never narrate — they ride the `condition`
  // channel and speak through needs/mood, not events.
  assert.ok(!events.some((e) => e.type === 'travel'));
  assert.ok(!events.some((e) => e.type === 'body'));
});

test('a shelterless night declares the open-sky reading itself', () => {
  const events = toEvents({
    day: {
      ...DAY,
      overnight_interaction: {
        rest_quality: 'poor',
        scope: 'hardcoded_fallback',
      },
    },
    trip: { id: 't1' },
    character: { name: 'Tester' },
  });
  const rest = events.find((e) => e.type === 'rest');
  assert.match(rest.reading, /under open sky/);
});

test('encounters carry the resolved substance of contact (C16)', () => {
  const events = toEvents({
    day: {
      ...DAY,
      encounters: [{
        entity: { slug: 'dunedain', id: 'e9', name: 'Dúnedain', type: 'humans', danger_level: 0 },
        hour_float: 20.5,
        interaction: {
          form: 'brief_exchange',
          prose_hint: 'a wary exchange at the roadside',
          dialogue_content: {
            topic: 'news_and_rumor',
            npc_attitude: 'Formal. Respect remembered.',
            concrete_content: 'He asks whether she has seen movement north.',
            tension: 'Duty, not warmth.',
            traveller_stance: 'Answers what she knows. Does not say so.',
          },
        },
      }],
    },
    trip: { id: 't1' },
    character: { name: 'Tester' },
  });
  const encounter = events.find((e) => e.type === 'encounter');
  // The theme tags; the lived content rides as prose material.
  assert.equal(encounter.data.topic, 'news_and_rumor');
  assert.equal(
    encounter.data.substance.content,
    'He asks whether she has seen movement north.'
  );
  assert.equal(
    encounter.data.substance.stance,
    'Answers what she knows. Does not say so.'
  );
  assert.equal(encounter.data.substance.attitude, 'Formal. Respect remembered.');

  // No dialogue resolved: substance stays absent rather than fabricating.
  const plain = toEvents({
    day: { ...DAY, encounters: DAY.encounters },
    trip: { id: 't1' },
    character: { name: 'Tester' },
  }).find((e) => e.type === 'encounter');
  assert.equal(plain.data.substance, undefined);
  assert.equal(plain.data.topic, undefined);
});

test('a fork\'s resolved pick marks the encounter, never re-ships the pick (Wave C)', () => {
  // The choice itself rides its own 'interaction' event (minted by the
  // engine at resolve time); on the parent encounter it leaves only the
  // weight-space marker — 'changed' says the body felt the pick.
  const events = toEvents({
    day: {
      ...DAY,
      encounters: [{
        entity: { slug: 'wayhouse', id: 'e-shelter', name: 'Wayhouse', type: 'sites' },
        hour_float: 20.5,
        phase: 'night',
        region: 'lone-lands',
        interaction: {
          form: 'harvest_shelter', prose_hint: 'a lit lamp at the roadside',
          resolved_choice: { interaction_id: 'cnt:e-shelter:stay', act: 'accept', changed: true },
        },
      }],
    },
    trip: { id: 't1' },
    character: { name: 'Tester' },
  });
  const encounter = events.find((e) => e.type === 'encounter');
  assert.ok(encounter.tags.includes('changed'));
  assert.equal(encounter.data.resolved_choice, undefined);
});

test('mechanically consequential events carry weight markers (C28)', () => {
  const events = toEvents({
    day: {
      ...DAY,
      meals: [{ slot: 'midday', food: "the farm wife's soup", provided: true }],
      encounters: [
        {
          entity: { slug: 'northman', id: 'e-gift', name: 'Northman', type: 'humans', danger_level: 0 },
          hour_float: 13.0,
          interaction: {
            form: 'aid_or_trade',
            given: true, // the engine applied the stance's shared meal
            dialogue_content: {},
          },
        },
        {
          entity: { slug: 'wayhouse', id: 'e-shelter', name: 'Wayhouse', type: 'sites' },
          hour_float: 20.5, phase: 'night',
          interaction: {
            form: 'harvest_shelter',
            resolved_choice: { interaction_id: 'cnt:e-shelter:stay', act: 'accept', changed: true },
          },
        },
        {
          entity: { slug: 'wolves', id: 'e-wolves', name: 'Wolves', type: 'beast', danger_level: 4 },
          hour_float: 10.0,
          interaction: { form: 'attacks', outcome: 'wounded' },
        },
      ],
    },
    trip: { id: 't1' },
    character: { name: 'Tester' },
  });
  const byEntity = (slug) =>
    events.find((e) => e.type === 'encounter' && e.data.entity === slug);
  assert.ok(byEntity('northman').tags.includes('given'));
  assert.ok(byEntity('wayhouse').tags.includes('changed'));
  assert.ok(byEntity('wolves').tags.includes('changed'));
  const meal = events.find((e) => e.type === 'meal');
  assert.deepEqual(meal.tags, ['given']);
  // A plain exchange invents no marker.
  const plain = toEvents({
    day: { ...DAY, meals: [], encounters: DAY.encounters },
    trip: { id: 't1' }, character: {},
  }).find((e) => e.type === 'encounter');
  assert.deepEqual(plain.tags, ['changed']); // wounded outcome only
});

test('toEvents: a paid meal carries no given marker (C28 gifts only)', () => {
  const events = toEvents({
    day: {
      ...DAY,
      meals: [{ slot: 'midday', food: 'tavern fare', paid: true }],
      encounters: [],
    },
    trip: { id: 't1' },
    character: { name: 'Tester' },
  });
  const meal = events.find((e) => e.type === 'meal');
  assert.ok(!(meal.tags || []).includes('given'));
});

test('the condition channel carries vitals and mileage as detector fields', () => {
  const body = toOpenPayload({
    gameId: 'middle_earth',
    day: DAY,
    trip: { id: 't1' },
    character: { name: 'Tester' },
    characterState: { energy: 40, shadow: 55, wounded: 'wounded' },
    equipmentState: { daysWithoutFood: 2, daysWithoutWater: 0 },
  });
  // Detectors declare snake_case fields — the host's camelCase reports
  // are aliased so the Condition names what the detectors read.
  assert.equal(body.condition.days_without_food, 2);
  assert.equal(body.condition.days_without_water, 0);
  assert.equal(body.condition.distance_km, 14.5);
  assert.equal(body.condition.walking_hours, 5.5);
  // The raw reports travel untouched alongside the aliases.
  assert.equal(body.condition.energy, 40);
  assert.equal(body.condition.wounded, 'wounded');
  // None of it is an event — events[] holds only lived moments.
  assert.ok(!body.events.some((e) => e.type === 'body'));
});

test('check difficulty follows detectability, not danger', () => {
  const subtle = toEvents({
    day: {
      ...DAY,
      encounters: [{
        entity: { slug: 'wolves', id: 'e2', name: 'Wolves', type: 'beast', danger_level: 4.5 },
        hour_float: 9.0,
        interaction: { form: 'sign_only' },
      }],
    },
    trip: { id: 't1' },
    character: { name: 'Tester' },
  }).find((e) => e.type === 'encounter');
  // A deadly thing whose only trace is a boot-print: hard to read,
  // whatever its danger — the mind may well miss it.
  assert.equal(subtle.check.difficulty, 9);
  assert.equal(subtle.data.danger, 4.5); // danger still travels for affect

  const formless = toEvents({
    day: {
      ...DAY,
      encounters: [{
        entity: { slug: 'wolves', id: 'e2', name: 'Wolves', type: 'beast', danger_level: 0.4 },
        hour_float: 9.0,
      }],
    },
    trip: { id: 't1' },
    character: { name: 'Tester' },
  }).find((e) => e.type === 'encounter');
  assert.equal(formless.check.difficulty, 6); // 4 + 0.4*5 fallback
});

test('place events carry the settlement a traveller actually entered', () => {
  const events = toEvents({
    day: {
      ...DAY,
      locations: [
        {
          name: 'Dale', type: 'city', region: 'rhovanion',
          aspect: 'A city of toy-makers and river trade.',
          aspect_es: 'Una ciudad de jugueteros y comercio fluvial.',
          population: 5800, inhabitants: 'northmen', indoor: true,
          hour_float: 17.5, distance_km: 0.3, entered: true,
        },
        { name: 'Amon Sul', type: 'ruin', distance_km: 4.2 },
        {
          name: 'Dol Guldur', type: 'fortified city', region: 'dor_guldur',
          hostile: true, distance_km: 6.1,
        },
      ],
    },
    trip: { id: 't1' },
    character: { name: 'Tester' },
  });
  const places = events.filter(
    (e) => e.type === 'land' && e.data.subtype === 'place');
  const dale = places.find((p) => p.data.name === 'Dale');
  // The entered city speaks through its reading — the ficha prose was
  // verbalized into it host-side; census and second-language prose
  // never ride the wire.
  assert.match(dale.reading, /toy-makers|comercio|city/i);
  assert.equal(dale.data.population, undefined);
  assert.deepEqual(dale.tags, ['settlement', 'entered']);
  // The subject slug rides where.place — 'name' is prose, the slug is
  // what the Relation accretes on.
  assert.equal(dale.where.place, 'dale');
  // A ruin is dead ground the eye reads from afar — not a settlement,
  // but not silent either: 'dead_place' tells the mind its shape.
  const amonSul = places.find((p) => p.data.name === 'Amon Sul');
  assert.deepEqual(amonSul.tags, ['dead_place', 'felt:melancholy']);
  // An enemy town passed from outside is flagged, never entered.
  const dolGuldur = places.find((p) => p.data.name === 'Dol Guldur');
  assert.deepEqual(dolGuldur.tags, ['settlement', 'hostile']);
});

test('a land entered today becomes a region event anchored to the crossing', () => {
  const events = toEvents({
    day: {
      ...DAY,
      regions: [
        { name: 'Rohan', first_seen_hour_float: 7.5 },
        { name: 'Fangorn', description_summary: 'The forest drinking.', first_seen_hour_float: 15.0 },
      ],
    },
    trip: { id: 't1' },
    character: { name: 'Tester' },
    previousDay: { day_number: 2, regions: ['Rohan'] },
  });
  const regions = events.filter(
    (e) => e.type === 'land' && e.data.subtype === 'region');
  // Rohan carries over from yesterday — only the new land speaks.
  assert.equal(regions.length, 1);
  const fangorn = regions[0];
  assert.equal(fangorn.data.name, 'Fangorn');
  assert.equal(fangorn.reading, 'crossed into Fangorn');
  assert.deepEqual(fangorn.tags, ['region_entered']);
  assert.equal(fangorn.where.region, 'Fangorn');
  assert.equal(fangorn.when.phase, 'afternoon');
  assert.equal(fangorn.when.hour, 15.0);
  assert.equal(fangorn.data.description, 'The forest drinking.');
});

test('region events mark a first day, never a held border', () => {
  const first = toEvents({
    day: { ...DAY, regions: [{ name: 'Rohan', first_seen_hour_float: 7.5 }] },
    trip: { id: 't1' },
    character: {},
    previousDay: null,
  });
  const entered = first.find(
    (e) => e.type === 'land' && e.data.subtype === 'region');
  assert.equal(entered.when.phase, 'morning');
  assert.equal(entered.reading, 'crossed into Rohan');

  const held = toEvents({
    day: DAY,
    trip: { id: 't1' },
    character: {},
    previousDay: { day_number: 2, regions: ['lone-lands'] },
  });
  assert.ok(!held.some(
    (e) => e.type === 'land' && e.data.subtype === 'region'));
});

test('rest event tells how the night was secured', () => {
  const nightAt = (lodging) => toEvents({
    day: {
      ...DAY,
      lodging,
      overnight_interaction: {
        rest_quality: 'good', description: 'A warm common room.',
        name: 'Dale', type: 'city',
      },
      overnight_location: { name: 'Dale', indoor: true },
    },
    trip: { id: 't1' },
    character: { name: 'Tester' },
  }).find((e) => e.type === 'rest');

  const paid = nightAt({ paid: true, cost: 5, coinsAfter: 12, place: 'Dale' });
  assert.deepEqual(paid.tags, ['lodging:paid', 'rest:good', 'rest:indoor']);
  // The night's place is its own 'place:' subject — the inn you slept
  // in and the Dale you passed feed the same Relation.
  assert.equal(paid.where.place, 'dale');
  assert.equal(paid.data.name, 'Dale');
  assert.match(paid.reading, /coin|bed/i);
  assert.match(paid.reading, /warm common room/);

  const charity = nightAt({ charity: true, place: 'Dale' });
  assert.deepEqual(charity.tags, ['lodging:charity', 'rest:good', 'rest:indoor']);
  assert.match(charity.reading, /strangers|kindness|given/i);

  const turnedAway = nightAt({ turnedAway: true, place: 'Dale' });
  assert.deepEqual(
    turnedAway.tags,
    ['lodging:turned_away', 'rest:poor', 'rest:open_sky'],
  );
  // The door's shut is the whole night — the inn's cozy prose is denied.
  assert.match(turnedAway.reading, /shut|no welcome/i);
  assert.ok(!/warm common room/.test(turnedAway.reading));
  // Yet the inn still anchors the slight — attitudes can form toward it.
  assert.equal(turnedAway.data.name, 'Dale');
});

test('the open payload keeps settlement detail and the lodging outcome', () => {
  const body = toOpenPayload({
    gameId: 'middle_earth',
    day: {
      ...DAY,
      locations: [{
        name: 'Dale', type: 'city', region: 'rhovanion',
        aspect_es: 'Una ciudad de jugueteros.', population: 5800,
        inhabitants: 'northmen', cultural_family: 'northman',
        indoor: true, entered: true, distance_km: 0.3,
        // Noisy internals must not leak into the narrator's day.
        geometry: 'SRID=4326;POINT(0 0)', slug: 'dale', century_id: 99,
      }],
      lodging: { paid: true, cost: 5, coinsAfter: 12, place: 'Dale' },
    },
    trip: { id: 't1' },
    character: { name: 'Tester' },
    characterState: { energy: 40, shadow: 55 },
    equipmentState: {},
    fate: 'living',
  });
  const dale = body.events.find(
    (e) => e.type === 'land' && e.data.subtype === 'place');
  // The event wire carries prose and meaning — census figures stay in
  // the narrator's day detail (slimDay), never on the episode wire.
  assert.equal(dale.data.population, undefined);
  assert.equal(dale.data.geometry, undefined);
  assert.ok(dale.tags.includes('entered'));
  const rest = body.events.find((e) => e.type === 'rest');
  assert.ok(rest.tags.includes('lodging:paid'));
});

test('the open payload verbalizes the sighting and the presence prose', () => {
  const body = toOpenPayload({
    gameId: 'middle_earth',
    day: {
      ...DAY,
      locations: [{
        name: 'The garden', type: 'point_of_interest', region: 'Fangorn',
        distance_km: 50.98, size_radius_km: 70, influence_radius_km: 70,
        visited: true, hour_float: 19,
        presence: 'More kinds of tree than any other forest.',
      }, {
        name: 'Hornburg', type: 'fortress', distance_km: 24.5,
        sighted: true, sighted_hour_float: 9.5, sighted_direction: 'east',
        // Beyond reach none of this may cross the wire — a silhouette
        // earns no census and no ficha prose.
        aspect: 'The great fortress of Helm\'s Deep.',
        presence: 'A hall of stone.', population: 300, inhabitants: 'rohirrim',
      }],
    },
    trip: { id: 't1' },
    character: { name: 'Tester' },
  });
  const places = body.events.filter(
    (e) => e.type === 'land' && e.data.subtype === 'place');
  const garden = places[0];
  // Inside the authored radius the traveller is IN the place — the
  // 'visited' flag says so and the ficha's presence prose is verbalized
  // into the reading, the only prose channel.
  assert.ok(garden.tags.includes('visited'));
  assert.match(garden.reading, /tree|forest/i);
  const hornburg = places[1];
  // The sighting's when/direction ride the envelope — when.hour is the
  // hour the silhouette first showed, there is no second clock.
  assert.equal(hornburg.when.hour, 9.5);
  // A place met only from afar carries its silhouette in the reading
  // and nothing else: no aspect, no presence, no population — what
  // nobody got close to know stays off the wire entirely.
  assert.equal(hornburg.data.sighted, undefined);
  assert.equal(hornburg.data.aspect, undefined);
  assert.equal(hornburg.data.presence, undefined);
  assert.equal(hornburg.data.population, undefined);
  assert.match(hornburg.reading, /a fortress: sighted far off to the east/);
  assert.doesNotMatch(hornburg.reading, /Hornburg|Helm/);
});

test('a place met before is passed again, not arrived at twice', () => {
  const events = toEvents({
    day: {
      ...DAY,
      locations: [{
        // Yesterday's camp told its scene already: the road crossing its
        // ground again is a recognition — the pass names the place so the
        // memory can stir, but no arrival prose re-ships.
        id: 99, name: "The herders' camp", type: 'camp', region: 'Talath Muil',
        distance_km: 2.89, size_radius_km: 12, visited: true, told: true,
        hour_float: 9.28, intensity: 2,
        presence: 'They feed him. Meat, sour milk, and pine nuts.',
        host: { name: 'Dervorin', slug: 'npc_tm_01', people: 'dunedain' },
      }],
    },
    trip: { id: 't1' },
    character: { name: 'Tester' },
  });
  const camp = events.find(
    (e) => e.type === 'land' && e.where?.place === 'the_herders_camp');
  // The subject still accretes and the pass is told — but as a return:
  // 'again', the whisper of familiarity for intensity, none of the
  // first telling's prose or keeper scene.
  assert.match(camp.reading, /passes through again/);
  assert.doesNotMatch(camp.reading, /They feed him/);
  assert.equal(camp.intensity, 0);
  assert.equal(camp.data.presence, undefined);
  assert.equal(camp.data.npc, undefined);
  assert.ok(camp.tags.includes('visited'));
});

test('a dead place sighted far shows its absence, not a living shape', () => {
  const events = toEvents({
    day: {
      ...DAY,
      locations: [{
        name: 'The burned inn', type: 'inn', distance_km: 8.8,
        sighted: true, sighted_hour_float: 7.92, sighted_direction: 'southwest',
      }, {
        // The record's own words carry the case: kind 'major ruin' and
        // registry tags make the silhouette true, never default.
        name: 'Ost-in-Edhil', type: 'ruin', distance_km: 6.1,
        narration_type: 'major ruin',
        record_tags: ['ruins', 'felt:melancholy', 'landmark'],
        sighted: true, sighted_hour_float: 11, sighted_direction: 'east',
      }],
    },
    trip: { id: 't1' },
    character: { name: 'Tester' },
  });
  const places = events.filter(
    (e) => e.type === 'land' && e.data.subtype === 'place');
  const burned = places.find((p) => p.where?.place === 'the_burned_inn');
  // A burned inn shows no smoke — the absence IS the sighting, and the
  // event marks the place as dead so the mind reads it for what it is.
  // The silhouette travels inside the reading, the only prose channel.
  assert.ok(burned.tags.includes('dead_place'));
  assert.ok(burned.tags.includes('felt:melancholy'));
  assert.match(burned.reading, /blackened roofline/);
  const ost = places.find((p) => p.where?.place === 'ost_in_edhil');
  assert.match(
    ost.reading,
    /a field of mounds where a city stood — one wall still upright/);
  assert.ok(ost.tags.includes('dead_place'));
  assert.ok(ost.tags.includes('felt:melancholy'));
});

test('a being who spoke is remembered by name; a kept place keeps its keeper', () => {
  const events = toEvents({
    day: {
      ...DAY,
      encounters: [{
        entity: { slug: 'hobbits', id: 'e2', name: 'hobbits', type: 'hobbits', danger_level: 0 },
        hour_float: 15.0,
        interaction: {
          form: 'brief_exchange', intensity: 1,
          npc: { name: 'Bungo', people: 'hobbits', gloss: 'a hobbit' },
          dialogue_content: { concrete_content: 'shared news of the northern circuit' },
        },
      }],
      overnight_location: {
        name: 'La aldea de los smials', type: 'village',
        // The resident entity, as the overnight SQL joins it: her own
        // slug keys the mind's Relation — 'Pearl' is only how she's said.
        host: {
          name: 'Pearl', slug: 'npc_sh_37',
          people: 'hobbits', gloss: 'a hobbit', gender: 'f',
        },
      },
      overnight_interaction: null,
      locations: [
        {
          // Being at the lighthouse means meeting its keeper — Hallas
          // rides as his own subject and the reading names him.
          name: 'The lighthouse', type: 'lighthouse', entered: true,
          region: 'Andrast',
          aspect: 'a stubby tower above the white strand',
          host: {
            name: 'Hallas', slug: 'npc_e_04',
            people: 'gondor', gloss: 'a man of Gondor',
          },
        },
        {
          // The same tower seen from the downs is only a silhouette —
          // no keeper can be told apart at that distance.
          name: 'The other lighthouse', type: 'lighthouse', sighted: true,
          sighted_hour_float: 9.5, region: 'Andrast', distance_km: 6.2,
          host: {
            name: 'Ingold', slug: 'npc_x_01',
            people: 'gondor', gloss: 'a man of Gondor',
          },
        },
      ],
    },
    trip: { id: 't1' },
    character: { name: 'Tester' },
  });
  const enc = events.find((e) => e.type === 'encounter');
  // The person is its own subject — the mind may hold 'Bungo' apart
  // from 'hobbits' in general. People/gloss are how the reading says
  // him, not wire fields of their own.
  assert.equal(enc.data.npc, 'bungo');
  assert.equal(enc.data.npc_name, 'Bungo');
  assert.equal(
    enc.reading, 'Bungo, a hobbit — shared news of the northern circuit');
  const rest = events.find((e) => e.type === 'rest');
  // A widow keeps the smial — her entity slug is the subject, her name
  // rides for the display and the reading opens with who she is.
  assert.equal(rest.data.npc, 'npc_sh_37');
  assert.equal(rest.data.npc_name, 'Pearl');
  assert.match(rest.reading, /^Pearl, a hobbit — /);
  const tower = events.find(
    (e) => e.type === 'land' && e.data.name === 'The lighthouse');
  // Standing before it, the keeper is met — his slug is the subject.
  assert.equal(tower.data.npc, 'npc_e_04');
  assert.equal(tower.data.npc_name, 'Hallas');
  assert.match(tower.reading, /kept by Hallas, a man of Gondor$/);
  const far = events.find(
    (e) => e.type === 'land' && e.data.name === 'The other lighthouse');
  // From afar the place is a silhouette — the keeper cannot be told apart.
  assert.equal(far.data.npc ?? null, null);
});

test('the open payload carries raw state, never rendered blocks (C10)', () => {
  const body = toOpenPayload({
    gameId: 'middle_earth',
    day: DAY,
    trip: { id: 't1', name: 'Test trip' },
    character: { name: 'Tester' },
    characterState: { energy: 40, shadow: 55, wounded: 'wounded', recentNotes: ['a fight with wolves'] },
    equipmentState: { rations: 1, waterHeld: 0, waterCapacity: 1, coins: 3 },
    fate: 'living',
  });
  // The live Condition is one flat map — the only channel where
  // numbers are legal.
  assert.deepEqual(body.condition.energy, 40);
  assert.deepEqual(body.condition.recentNotes, ['a fight with wolves']);
  assert.equal(body.condition.rations, 1);
  assert.equal(body.fate, 'living');
  // No half-rendered blocks may travel: the narrator's material rides
  // the events' readings, not stray top-level fields.
  assert.equal(body.condition_block, undefined);
  assert.equal(body.equipment_block, undefined);
  assert.equal(body.end_state_block, undefined);

  const narrate = toNarrateDayBody({
    day: DAY,
    trip: { id: 't1', name: 'Test trip' },
    character: { name: 'Tester' },
    characterState: { energy: 40, shadow: 55 },
    equipmentState: { rations: 1, waterHeld: 0, waterCapacity: 1 },
    fate: 'living',
  });
  assert.equal(narrate.characterState.shadow, 55);
  assert.equal(narrate.equipmentState.waterCapacity, 1);
  assert.equal(narrate.fate, 'living');
});

test('the open payload only emits keys the wire model declares', () => {
  // The mind-engine models are extra='forbid': a host field that isn't
  // whitelisted there turns POST /episodes into a 422 and the day silently
  // narrates stateless. Keep these sets in sync with
  // mind-engine/app/mind/models.py — a new wire field means editing both.
  const body = toOpenPayload({
    gameId: 'middle_earth',
    day: {
      ...DAY,
      encounters: [{
        hour: '10:00', phase: 'morning', region: 'lone-lands',
        entity: {
          name: 'Wolves', type: 'beast', family: 'canines', active: 'all-day',
          description: 'd', description_summary: 's',
        },
        interaction: {
          form: 'attacks', outcome: 'wounded', prose_hint: 'p',
          dialogue_content: { topic: 'threat' }, hintKey: 'k', night_timing: 'mid_night',
        },
      }],
    },
    trip: { id: 't1' },
    character: { id: 4, name: 'Tester' },
  });

  assert.deepEqual(Object.keys(body).sort(), [
    'arc', 'character', 'condition', 'episode', 'episode_ref', 'events',
    'fate', 'game_id', 'language',
  ]);
  // The stateless contract keeps its own day shape — the slim whitelist
  // still applies to it, built separately by toNarrateDayBody.
  const narrate = toNarrateDayBody({
    day: {
      ...DAY,
      encounters: [{
        hour: '10:00', phase: 'morning', region: 'lone-lands',
        entity: {
          name: 'Wolves', type: 'beast', family: 'canines', active: 'all-day',
          description: 'd', description_summary: 's',
        },
        interaction: {
          form: 'attacks', outcome: 'wounded', prose_hint: 'p',
          dialogue_content: { topic: 'threat' }, hintKey: 'k', night_timing: 'mid_night',
        },
      }],
    },
    trip: { id: 't1' },
    character: { name: 'Tester' },
  });
  const encounter = narrate.day.encounters[0];
  assert.deepEqual(
    Object.keys(encounter).sort(),
    ['entity', 'hour', 'interaction', 'phase', 'region']
  );
  assert.deepEqual(
    Object.keys(encounter.entity).sort(),
    ['active', 'description', 'description_summary', 'family', 'name', 'type']
  );
  assert.deepEqual(
    Object.keys(encounter.interaction).sort(),
    ['dialogue_content', 'form', 'hintKey', 'night_timing', 'outcome', 'prose_hint']
  );
});

test('the open payload forwards all ten character skills', () => {
  const body = toOpenPayload({
    gameId: 'middle_earth',
    day: DAY,
    trip: { id: 't1' },
    character: {
      id: 4, name: 'Tester',
      skill_tracking: 7, skill_persuasion: 3, skill_ranged: 5, skill_melee: 6,
      skill_lore: 3, skill_stealth: 7, skill_endurance: 6,
      skill_insight: 5, skill_deception: 3, skill_intimidation: 5,
    },
  });
  assert.deepEqual(body.character.skills, {
    tracking: 7, persuasion: 3, ranged: 5, melee: 6, lore: 3,
    stealth: 7, endurance: 6, insight: 5, deception: 3, intimidation: 5,
  });
});

test('mindClient throws when the mind is unreachable', async () => {
  // The rejection is what trips narrateDay's catch -> /narrate-day.
  await assert.rejects(
    openEpisode({ game_id: 'g', character: { id: 'c' }, episode_ref: 'r', events: [] }),
    (err) => err instanceof Error
  );
});

test('closeEpisode rejects on failure — the caller swallows it', async () => {
  // Fire-and-forget lives at the call site (trips.js catches); the client
  // itself still rejects so nothing is silently lost.
  await assert.rejects(closeEpisode('ep_missing', { outcome: null }));
});

test('resetMind rejects when the mind is down — the game resets anyway (C19)', async () => {
  // Character regeneration swallows this rejection: a dead Mind Engine
  // must never block the mechanical reset, it only skips the mind wipe.
  await assert.rejects(resetMind('char_1'));
});

test('ambient situations ride the wire as moment events, never a day field (ADR-0016)', () => {
  const body = toOpenPayload({
    gameId: 'middle_earth',
    day: {
      ...DAY,
      ambient: [
        {
          record_id: 'M-A4', situation_id: 's1', option_id: 'o1',
          name: { en: 'The night', es: 'La noche' },
          when: 'first night',
          text: { en: 'the fire lights three paces; beyond it a wall, and the wall makes noise', es: 'x' },
          effects: { shadow_effect: -1 },
        },
      ],
    },
    trip: { id: 't1' },
    character: { id: 4, name: 'Tester' },
  });
  const ambience = body.events.filter((e) => e.type === 'ambience');
  assert.equal(ambience.length, 1);
  // The voice arrives verbalized and phased — an ambience without a phase
  // would never reach a narrator's phase block.
  assert.equal(ambience[0].reading, 'the fire lights three paces; beyond it a wall, and the wall makes noise');
  assert.ok(['morning', 'afternoon', 'night'].includes(ambience[0].when.phase));
  // The record id is provenance — which authored voice spoke — never
  // tag vocabulary and never a subject.
  assert.equal(ambience[0].data.provenance.record, 'M-A4');
  assert.equal(ambience[0].data.effects, undefined);
  // The episode wire carries no `day` at all — ambient lived as events.
  assert.equal(body.day, undefined);
});

test('the open payload carries the canonical v2 channels (ADR-0016)', () => {
  const body = toOpenPayload({
    gameId: 'middle_earth',
    day: { ...DAY, day_number: 3, date: '3018-03-15', is_last_day: false },
    trip: { id: 't1', name: 'The Long Road North' },
    character: { id: 4, name: 'Tester' },
    characterState: { energy: 35 },
    equipmentState: { rations: 2 },
  });
  assert.deepEqual(body.episode, { index: 3, at: '3018-03-15' });
  assert.equal(body.arc, 'The Long Road North');
  assert.deepEqual(body.condition, {
    energy: 35, rations: 2, distance_km: 14.5, walking_hours: 5.5,
  });
  // Everything the day was is an event now: no narrator briefing rides
  // beside them — climate streaks, the ground and the end all speak as
  // events or through `condition`/`fate`.
  assert.equal(body.narration_notes, undefined);
  assert.equal(body.day, undefined);
});

test('solar clauses weave into the weather events — dawn when extreme, dusk always', () => {
  const climateOf = (events) => events.filter((e) => e.type === 'climate');
  const phase = (events, p) => climateOf(events).find((e) => e.when?.phase === p);

  // A winter day at high latitude: the late dawn joins the morning sky,
  // the early dusk joins the afternoon it falls in. No separate events.
  const winter = toEvents({
    day: { ...DAY, daylight: { sunrise: 8.6, sunset: 15.4, polar: null }, date: '1950-01-21' },
    trip: { id: 't1' }, character: {},
  });
  assert.equal(winter.filter((e) => e.data?.subtype === 'light').length, 0);
  assert.match(phase(winter, 'morning').reading, /^the sun comes up late|^first light drags/);
  assert.match(phase(winter, 'afternoon').reading, /^the light fails early|^the sun gives/);

  // A solar-normal day (sunrise ~7): no dawn clause — but the dusk is
  // still woven into whichever phase holds the sunset (18.2 → night).
  const normal = toEvents({
    day: { ...DAY, daylight: { sunrise: 7.3, sunset: 18.2, polar: null }, date: '1950-04-15' },
    trip: { id: 't1' }, character: {},
  });
  assert.doesNotMatch(phase(normal, 'morning').reading, /sun|light|dawn/);
  assert.match(phase(normal, 'night').reading, /^the light lingers|^the sun is slow/);

  // Polar analogs: the day's real light news rides the felt phase —
  // the morning for a sun that never rises, the night for one that
  // never sets.
  const polar = toEvents({
    day: { ...DAY, daylight: { sunrise: null, sunset: null, polar: 'night' }, date: '1950-12-21' },
    trip: { id: 't1' }, character: {},
  });
  assert.match(phase(polar, 'morning').reading, /does not rise|no dawn/);

  const midnight = toEvents({
    day: { ...DAY, daylight: { sunrise: null, sunset: null, polar: 'day' }, date: '1950-06-21' },
    trip: { id: 't1' }, character: {},
  });
  assert.match(phase(midnight, 'night').reading, /no dark|does not go/);

  // A day with no daylight data: weather readings stand untouched.
  const none = toEvents({ day: { ...DAY, daylight: undefined }, trip: { id: 't1' }, character: {} });
  assert.doesNotMatch(phase(none, 'morning').reading, /sun|light|dawn/);
});
