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
  // through its reading and declared tags, never through raw metrics.
  const morningClimate = climates.find((c) => c.when.phase === 'morning');
  for (const metric of
    ['temperature_2m', 'cloud_cover', 'wind_speed_10m', 'precipitation']) {
    assert.equal(morningClimate.data[metric], undefined);
  }

  // Encounters carry how contact happened, not only its outcome.
  const encounter = events.find((e) => e.type === 'encounter');
  assert.equal(encounter.data.entity, 'corpse-candles');
  assert.equal(encounter.data.entity_type, 'undead');
  // Kind-of-being between type and entity — attitudes match
  // entity > family > type on the mind side.
  assert.equal(encounter.data.family, 'undead');
  assert.equal(encounter.data.danger, 0.7);
  assert.equal(encounter.data.form, 'confronts');
  assert.equal(encounter.data.outcome, 'wounded');
  assert.equal(encounter.data.prose_hint, 'blocks the path outright');
  assert.equal(encounter.data.thread, 'unfinished_encounter:corpse-candles');
  assert.equal(encounter.where.region, 'lone-lands');
  // B1/C8: encounters carry a tracking check whose difficulty is
  // detectability — 'confronts' is imposed contact, almost free to
  // notice; danger only fills in when the form is unknown.
  assert.equal(encounter.data.check.skill, 'tracking');
  assert.equal(encounter.data.check.difficulty, 3);

  // Meals keep their slot and report skipped meals as uneaten absences.
  const meals = events.filter((e) => e.type === 'meal');
  assert.deepEqual(meals.map((m) => m.data.slot), ['midday', 'evening']);
  assert.equal(meals[0].when.phase, 'afternoon');
  assert.equal(meals[0].data.eaten, true);
  assert.equal(meals[1].when.phase, 'night');
  assert.equal(meals[1].data.eaten, false);

  // The night's own prose rides with the rest event's reading.
  const rest = events.find((e) => e.type === 'rest');
  assert.equal(rest.data.reading, 'The night is spent under open sky.');
  assert.deepEqual(rest.data.tags, ['rest:poor', 'rest:open_sky']);

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
      .map((e) => [e.when.phase, e.data]),
  );
  assert.deepEqual(byPhase.morning.tags, ['weather:windy', 'weather:overcast']);
  assert.deepEqual(byPhase.afternoon.tags, ['weather:wet']);
  assert.deepEqual(byPhase.night.tags, ['weather:freezing']);
  assert.equal(typeof byPhase.morning.reading, 'string');

  // Every narrative event carries a one-line reading the mind keeps
  // verbatim — subject and detail, never raw numbers.
  const encounter = events.find((e) => e.type === 'encounter');
  assert.equal(
    encounter.data.reading,
    'Corpse Candles — blocks the path outright',
  );
  // Meal readings are the narrator's prose itself — food and drink
  // appear in the day's own words, hunger in the evening's.
  const meals = events.filter((e) => e.type === 'meal');
  assert.match(meals[0].data.reading, /bread.*water/);
  assert.match(meals[1].data.reading, /water|hungry|fast/i);
  const landOf = (s) => events.find(
    (e) => e.type === 'land' && e.data.subtype === s,
  );
  assert.match(landOf('place').data.reading, /Amon Sul/);
  assert.equal(
    events.find((e) => e.type === 'rest').data.reading,
    'The night is spent under open sky.',
  );
  assert.match(landOf('terrain').data.reading, /hills|rocky slopes/);
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
  assert.match(rest.data.reading, /under open sky/);
});

test('encounters carry the resolved substance of contact (C16)', () => {
  const events = toEvents({
    day: {
      ...DAY,
      encounters: [{
        entity: { slug: 'dnedain', id: 'e9', name: 'Dúnedain', type: 'humans', danger_level: 0 },
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
  assert.equal(plain.data.substance, null);
  assert.equal(plain.data.topic, null);
});

test('encounters carry a dusk decision when the host resolved one (C25)', () => {
  const decision = {
    id: 'shelter-wayhouse-1',
    prompt: 'A night spent here costs a small coin.',
    options: [
      {
        id: 'stay',
        label: 'Take the bed — a small coin',
        tags: ['need:exhaustion', 'need:hunger'],
        commands: [{ type: 'overnight_shelter', name: 'the wayhouse', indoor: true }],
        stance: 'Takes the bed. Eats what the pot offers.',
      },
      { id: 'move_on', label: 'Mark the lamp and keep to the road', tags: ['risk:bold'], commands: [] },
    ],
  };
  const events = toEvents({
    day: {
      ...DAY,
      encounters: [{
        entity: { slug: 'wayhouse', id: 'e-shelter', name: 'Wayhouse', type: 'sites' },
        hour_float: 20.5,
        phase: 'night',
        region: 'lone-lands',
        interaction: { form: 'harvest_shelter', prose_hint: 'a lit lamp at the roadside', decision },
      }],
    },
    trip: { id: 't1' },
    character: { name: 'Tester' },
  });
  const encounter = events.find((e) => e.type === 'encounter');
  assert.deepEqual(encounter.data.decision, decision);
  // Mid-march sightings without a decision emit none.
  const plain = toEvents({ day: { ...DAY, encounters: [] }, trip: { id: 't1' }, character: {} });
  assert.ok(!plain.some((e) => e.data?.decision));
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
            dialogue_content: {
              commands: [{ type: 'meal', slot: 'midday', food: "the farm wife's soup" }],
            },
          },
        },
        {
          entity: { slug: 'wayhouse', id: 'e-shelter', name: 'Wayhouse', type: 'sites' },
          hour_float: 20.5, phase: 'night',
          interaction: {
            form: 'harvest_shelter',
            decision: { id: 'shelter-1', options: [{ id: 'stay' }, { id: 'move_on' }] },
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
  assert.ok(byEntity('northman').data.tags.includes('given'));
  assert.ok(byEntity('wayhouse').data.tags.includes('decision'));
  assert.ok(byEntity('wolves').data.tags.includes('changed'));
  const meal = events.find((e) => e.type === 'meal');
  assert.deepEqual(meal.data.tags, ['given']);
  // A plain exchange invents no marker.
  const plain = toEvents({
    day: { ...DAY, meals: [], encounters: DAY.encounters },
    trip: { id: 't1' }, character: {},
  }).find((e) => e.type === 'encounter');
  assert.deepEqual(plain.data.tags, ['changed']); // wounded outcome only
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
  assert.ok(!(meal.data.tags || []).includes('given'));
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
  assert.equal(subtle.data.check.difficulty, 9);
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
  assert.equal(formless.data.check.difficulty, 6); // 4 + 0.4*5 fallback
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
  // The entered city rides with its authored prose and census so the
  // lens can feel its scale — not just a bare name.
  assert.equal(dale.data.aspect_es, 'Una ciudad de jugueteros y comercio fluvial.');
  assert.equal(dale.data.population, 5800);
  assert.deepEqual(dale.data.tags, ['settlement', 'entered']);
  // A ruin is dead ground the eye reads from afar — not a settlement,
  // but not silent either: 'dead_place' tells the mind its shape.
  const amonSul = places.find((p) => p.data.name === 'Amon Sul');
  assert.deepEqual(amonSul.data.tags, ['dead_place']);
  // An enemy town passed from outside is flagged, never entered.
  const dolGuldur = places.find((p) => p.data.name === 'Dol Guldur');
  assert.deepEqual(dolGuldur.data.tags, ['settlement', 'hostile']);
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
  assert.equal(fangorn.data.reading, 'crossed into Fangorn');
  assert.deepEqual(fangorn.data.tags, ['region_entered']);
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
  assert.equal(entered.data.reading, 'crossed into Rohan');

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
  assert.deepEqual(paid.data.tags, ['lodging:paid', 'rest:good', 'rest:indoor']);
  // The night's place climbs the identity ladder — the inn is an entity.
  assert.equal(paid.data.entity_name, 'Dale');
  assert.match(paid.data.reading, /coin|bed/i);
  assert.match(paid.data.reading, /warm common room/);

  const charity = nightAt({ charity: true, place: 'Dale' });
  assert.deepEqual(charity.data.tags, ['lodging:charity', 'rest:good', 'rest:indoor']);
  assert.match(charity.data.reading, /strangers|kindness|given/i);

  const turnedAway = nightAt({ turnedAway: true, place: 'Dale' });
  assert.deepEqual(
    turnedAway.data.tags,
    ['lodging:turned_away', 'rest:poor', 'rest:open_sky'],
  );
  // The door's shut is the whole night — the inn's cozy prose is denied.
  assert.match(turnedAway.data.reading, /shut|no welcome/i);
  assert.ok(!/warm common room/.test(turnedAway.data.reading));
  // Yet the inn still anchors the slight — attitudes can form toward it.
  assert.equal(turnedAway.data.entity_name, 'Dale');
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
    (e) => e.type === 'land' && e.data.subtype === 'place').data;
  assert.equal(dale.population, 5800);
  assert.equal(dale.aspect_es, 'Una ciudad de jugueteros.');
  assert.equal(dale.geometry, undefined);
  assert.ok(dale.tags.includes('entered'));
  const rest = body.events.find((e) => e.type === 'rest').data;
  assert.ok(rest.tags.includes('lodging:paid'));
});

test('the open payload keeps the sighting and presence fields notes read', () => {
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
        sighted_far: 'a dark wall beneath the cliffs',
      }],
    },
    trip: { id: 't1' },
    character: { name: 'Tester' },
  });
  const places = body.events.filter(
    (e) => e.type === 'land' && e.data.subtype === 'place');
  const garden = places[0].data;
  // Inside the authored radius the traveller is IN the place — the notes
  // need the 'visited' flag and the ficha's presence prose to say so.
  assert.ok(garden.tags.includes('visited'));
  assert.equal(garden.presence, 'More kinds of tree than any other forest.');
  const hornburg = places[1].data;
  assert.equal(hornburg.sighted.hour_float, 9.5);
  assert.equal(hornburg.sighted.direction, 'east');
  // A place met only from afar carries its silhouette and nothing else:
  // no aspect, no presence, no population — what nobody got close to know.
  assert.equal(hornburg.sighted_far, 'a dark wall beneath the cliffs');
  assert.equal(hornburg.aspect, undefined);
  assert.equal(hornburg.presence, undefined);
  assert.equal(hornburg.population, undefined);
  assert.match(hornburg.reading, /a fortress: sighted far off to the east/);
  assert.doesNotMatch(hornburg.reading, /Hornburg|Helm/);
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
        record_tags: ['ruins', 'melancholy', 'landmark'],
        sighted: true, sighted_hour_float: 11, sighted_direction: 'east',
      }],
    },
    trip: { id: 't1' },
    character: { name: 'Tester' },
  });
  const places = events.filter(
    (e) => e.type === 'land' && e.data.subtype === 'place');
  const burned = places.find((p) => p.data.place === 'the_burned_inn').data;
  // A burned inn shows no smoke — the absence IS the sighting, and the
  // event marks the place as dead so the mind reads it for what it is.
  assert.equal(burned.sighted_far, 'a blackened roofline — no smoke, no lamps');
  assert.ok(burned.tags.includes('dead_place'));
  assert.match(burned.reading, /blackened roofline/);
  const ost = places.find((p) => p.data.place === 'ost_in_edhil').data;
  assert.equal(
    ost.sighted_far,
    'a field of mounds where a city stood — one wall still upright');
  assert.ok(ost.tags.includes('dead_place'));
  assert.ok(ost.tags.includes('melancholy'));
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
  const enc = events.find((e) => e.type === 'encounter').data;
  // The person is its own subject — the mind may hold 'Bungo' apart
  // from 'hobbits' in general.
  assert.equal(enc.npc, 'bungo');
  assert.equal(enc.npc_name, 'Bungo');
  assert.equal(enc.npc_people, 'hobbits');
  assert.equal(enc.npc_gloss, 'a hobbit');
  assert.equal(
    enc.reading, 'Bungo, a hobbit — shared news of the northern circuit');
  const rest = events.find((e) => e.type === 'rest').data;
  // A widow keeps the smial — her entity slug is the subject, a woman's
  // name and people ride for the telling.
  assert.equal(rest.npc, 'npc_sh_37');
  assert.equal(rest.npc_name, 'Pearl');
  assert.equal(rest.npc_gender, 'f');
  assert.match(rest.reading, /^Pearl, a hobbit — /);
  const tower = events.find(
    (e) => e.type === 'land' && e.data.name === 'The lighthouse').data;
  // Standing before it, the keeper is met — his slug is the subject.
  assert.equal(tower.npc, 'npc_e_04');
  assert.equal(tower.npc_name, 'Hallas');
  assert.equal(tower.npc_people, 'gondor');
  assert.match(tower.reading, /kept by Hallas, a man of Gondor$/);
  const far = events.find(
    (e) => e.type === 'land' && e.data.name === 'The other lighthouse').data;
  // From afar the place is a silhouette — the keeper cannot be told apart.
  assert.equal(far.npc ?? null, null);
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
  // narration_notes + the events' readings, not stray top-level fields.
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
    'fate', 'game_id', 'language', 'narration_notes',
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
  const moments = body.events.filter((e) => e.type === 'moment');
  assert.equal(moments.length, 1);
  // The voice arrives verbalized and phased — a moment without a phase
  // would never reach a narrator's phase block.
  assert.equal(moments[0].data.reading, 'the fire lights three paces; beyond it a wall, and the wall makes noise');
  assert.ok(['morning', 'afternoon', 'night'].includes(moments[0].when.phase));
  assert.equal(moments[0].data.record, 'M-A4');
  assert.equal(moments[0].data.effects, undefined);
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
  assert.deepEqual(body.episode, { index: 3, at: '3018-03-15', terminal: false });
  assert.equal(body.arc, 'The Long Road North');
  assert.deepEqual(body.condition, {
    energy: 35, rations: 2, distance_km: 14.5, walking_hours: 5.5,
  });
  assert.ok(body.narration_notes && typeof body.narration_notes === 'object');
  // Only the briefing that is no lived event rides here — the per-phase
  // world prose lives in the events' readings.
  assert.equal(body.narration_notes.weather, undefined);
  assert.equal(body.narration_notes.meals, undefined);
  // The night's lead-in IS a lived event: the rest event carries it now.
  assert.equal(body.narration_notes.night_lead, undefined);
});
