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

// Point the client at a dead port BEFORE importing it — the URL is captured
// at module load. Port 9 (discard) refuses connections: the mind is down.
process.env.STORY_ENGINE_URL = 'http://127.0.0.1:9';
const { openEpisode, closeEpisode } = await import('../mindClient.js');

// Real shapes as resolved days carry them (see toEvents.js header).
const DAY = {
  day_number: 3,
  date: '1950-01-21',
  regions: [{ name: 'lone-lands' }],
  climate: [
    { time: '1950-01-21T08:00', climate: { temperature_2m: 4.2, cloud_cover: 80, wind_speed_10m: 22, precipitation: 0 } },
    { time: '1950-01-21T14:00', climate: { temperature_2m: 8.1, cloud_cover: 60, wind_speed_10m: 15, precipitation: 0.4 } },
    { time: '1950-01-21T21:00', climate: { temperature_2m: -1.0, cloud_cover: 20, wind_speed_10m: 8, precipitation: 0 } },
  ],
  distance_km: 14.5,
  walking_hours: 5.5,
  terrain_phrases: { morning: ['rocky slopes'], afternoon: ['bare hills'] },
  biomes: [{ name: 'hills' }],
  locations: [{ name: 'Amon Sul', type: 'ruin' }],
  meals: [{ phase: 'night', food: 'bread', drink: 'water' }],
  overnight_interaction: { rest_quality: 'poor', shadow_effect: 0.1 },
  encounters: [{ entity: { slug: 'orcs', id: 'e1', danger_level: 0.7 }, hour_float: 15.0 }],
};

test('toEvents emits the generic contract from a resolved day', () => {
  const events = toEvents({
    day: DAY,
    trip: { id: 't1' },
    character: { name: 'Tester' },
    stateContext: { startState: { energy: 90, shadow: 10 }, endState: { energy: 50, shadow: 30 } },
  });
  const types = events.map((e) => e.type);
  // climate per phase + travel/terrain/place/meal/rest/encounter/body
  assert.ok(types.filter((t) => t === 'climate').length >= 1);
  for (const t of ['travel', 'terrain', 'place', 'meal', 'rest', 'encounter', 'body']) {
    assert.ok(types.includes(t), `missing event type ${t}`);
  }
  for (const e of events) {
    assert.equal(typeof e.type, 'string');
    assert.ok(e.when && e.when.episode === 3, 'when.episode = day_number');
  }
  const encounter = events.find((e) => e.type === 'encounter');
  assert.equal(encounter.data.entity, 'orcs');
  assert.equal(encounter.data.danger, 0.7);
  assert.equal(encounter.where.region, 'lone-lands');
  // B1: encounters carry a tracking check for the mind's gates & rolls;
  // danger 0.7 normalizes to ~3.5 on the 0-5 scale -> difficulty 8.
  assert.equal(encounter.data.check.skill, 'tracking');
  assert.equal(encounter.data.check.difficulty, 8);
  const body = events.find((e) => e.type === 'body');
  assert.equal(body.data.energy, 0.5); // game scale 0-100 -> facets scale 0-1
});

test('mindClient throws when the mind is unreachable', async () => {
  // The rejection is what trips narrateDay's catch -> /narrate-day.
  await assert.rejects(
    openEpisode({ gameId: 'g', character: { id: 'c' }, episodeRef: 'r', events: [] }),
    (err) => err instanceof Error
  );
});

test('closeEpisode rejects on failure — the caller swallows it', async () => {
  // Fire-and-forget lives at the call site (trips.js catches); the client
  // itself still rejects so nothing is silently lost.
  await assert.rejects(closeEpisode('ep_missing', { outcome: null }));
});
