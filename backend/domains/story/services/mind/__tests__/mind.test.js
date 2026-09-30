// ============================================================================
// Mind Engine smoke tests (A12)
// ----------------------------------------------------------------------------
// Covers the Node half of the degradation contract: toEvents translates a
// resolved day into the generic events[] contract, and mindClient throws
// when Story Engine is unreachable — which is what trips narrateDay's catch
// and routes it back to the stateless /narrate-day. (The fallback endpoint
// itself is covered in story-engine/tests/test_mind_smoke.py.)
// ============================================================================
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toEvents } from '../toEvents.js';
import { toNarrateDayBody, toOpenPayload } from '../toOpenPayload.js';

// Point the client at a dead port BEFORE importing it — the URL is captured
// at module load. Port 9 (discard) refuses connections: the mind is down.
process.env.STORY_ENGINE_URL = 'http://127.0.0.1:9';
const { openEpisode, closeEpisode, resetBrain } = await import('../mindClient.js');

// Real shapes as resolved days carry them (see toEvents.js header):
// climate samples stamp `phase` explicitly and `time` uses a space
// separator; meals carry a slot, not a phase; encounters resolve a full
// interaction object; the overnight carries authored description prose.
const DAY = {
  day_number: 3,
  date: '1950-01-21',
  regions: [{ name: 'lone-lands' }],
  climate: [
    { time: '1950-01-21 07:00:00', phase: 'morning', climate: { temperature_2m: 4.2, cloud_cover: 80, wind_speed_10m: 22, precipitation: 0 } },
    { time: '1950-01-21 10:00:00', phase: 'morning', climate: { temperature_2m: 6.0, cloud_cover: 70, wind_speed_10m: 20, precipitation: 0 } },
    { time: '1950-01-21 13:00:00', phase: 'afternoon', climate: { temperature_2m: 8.1, cloud_cover: 60, wind_speed_10m: 15, precipitation: 0.4 } },
    { time: '1950-01-21 19:00:00', phase: 'night', climate: { temperature_2m: -1.0, cloud_cover: 20, wind_speed_10m: 8, precipitation: 0 } },
    { time: '1950-01-22 04:00:00', phase: 'night', climate: { temperature_2m: -3.0, cloud_cover: 10, wind_speed_10m: 5, precipitation: 0 } },
  ],
  distance_km: 14.5,
  walking_hours: 5.5,
  terrain_phrases: { morning: ['rocky slopes'], afternoon: ['bare hills'] },
  biomes: [{ name: 'hills' }],
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
    entity: { slug: 'corpse-candles', id: 'e1', name: 'Corpse Candles', type: 'undead', danger_level: 0.7 },
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
    stateContext: {
      startState: { energy: 90, shadow: 10, wounded: 'none', days_without_food: 0 },
      endState: { energy: 50, shadow: 30, wounded: 'light', days_without_food: 3 },
    },
  });
  const types = events.map((e) => e.type);
  for (const t of ['travel', 'terrain', 'place', 'meal', 'rest', 'encounter', 'body']) {
    assert.ok(types.includes(t), `missing event type ${t}`);
  }
  for (const e of events) {
    assert.equal(typeof e.type, 'string');
    assert.ok(e.when && e.when.episode === 3, 'when.episode = day_number');
  }

  // Climate buckets by the sample's own phase — the walking day must not
  // collapse into a single night aggregate.
  const climates = events.filter((e) => e.type === 'climate');
  assert.deepEqual(
    climates.map((c) => c.when.phase).sort(),
    ['afternoon', 'morning', 'night']
  );
  assert.equal(climates.find((c) => c.when.phase === 'morning').data.hours, 2);

  // Encounters carry how contact happened, not only its outcome.
  const encounter = events.find((e) => e.type === 'encounter');
  assert.equal(encounter.data.entity, 'corpse-candles');
  assert.equal(encounter.data.entity_type, 'undead');
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

  // The night's own prose rides with the rest event.
  const rest = events.find((e) => e.type === 'rest');
  assert.equal(rest.data.description, 'The night is spent under open sky.');

  // The body snapshot reports end-of-day truth, not the morning's.
  const body = events.find((e) => e.type === 'body');
  assert.equal(body.data.energy, 0.5); // game scale 0-100 -> facets scale 0-1
  assert.equal(body.data.wounded, 'light');
  assert.equal(body.data.days_without_food, 3);
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
    stateContext: {},
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
    stateContext: {},
  }).find((e) => e.type === 'encounter');
  assert.equal(plain.data.substance, null);
  assert.equal(plain.data.topic, null);
});

test('toEvents falls back to start-of-day vitals and clock-hour phases', () => {
  const events = toEvents({
    day: {
      ...DAY,
      meals: [{ slot: 'midday', food: 'bread', drink: 'water' }],
      encounters: [],
    },
    trip: { id: 't1' },
    character: { name: 'Tester' },
    stateContext: { startState: { wounded: 'none', days_without_food: 2 } },
  });
  const body = events.find((e) => e.type === 'body');
  assert.equal(body.data.wounded, 'none');
  assert.equal(body.data.days_without_food, 2);
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
    stateContext: {},
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
    stateContext: {},
  }).find((e) => e.type === 'encounter');
  assert.equal(formless.data.check.difficulty, 6); // 4 + 0.4*5 fallback
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
    stateContext: null,
  });
  assert.deepEqual(body.character_state.energy, 40);
  assert.deepEqual(body.character_state.recentNotes, ['a fight with wolves']);
  assert.equal(body.equipment_state.rations, 1);
  assert.equal(body.fate, 'living');
  // No rendered text may travel: the story-engine owns data→language.
  assert.equal(body.condition_block, undefined);
  assert.equal(body.equipment_block, undefined);
  assert.equal(body.end_state_block, undefined);

  const narrate = toNarrateDayBody(body);
  assert.equal(narrate.characterState.shadow, 55);
  assert.equal(narrate.equipmentState.waterCapacity, 1);
  assert.equal(narrate.fate, 'living');
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

test('resetBrain rejects when the mind is down — the game resets anyway (C19)', async () => {
  // Character regeneration swallows this rejection: a dead Story Engine
  // must never block the mechanical reset, it only skips the mind wipe.
  await assert.rejects(resetBrain('char_1'));
});
