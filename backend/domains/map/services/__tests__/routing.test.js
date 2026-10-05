import { test } from 'node:test';
import assert from 'node:assert/strict';

import { findShortestPath, TRANSPORT_CONFIGS, computeDailyCheckpoints } from '../world/routing.js';

const detourRoad = {
  id: 1,
  name: 'Regular Road',
  biome_type: 'plain',
  altitude_type: 'plain',
  geometry: {
    type: 'LineString',
    coordinates: [
      [0, 0],
      [0, 0.1],
      [0.1, 0.1],
      [0.1, 0],
    ],
  },
};

test('walking goes directly when the road detour is too long', () => {
  const route = findShortestPath([detourRoad], [0, 0], [0.1, 0], TRANSPORT_CONFIGS.walk);

  assert.ok(route);
  assert.equal(route.path.length, 1);
  assert.equal(route.path[0].is_off_road, true);
  assert.equal(route.path[0].name, 'Cross-country');
});

test('horse routes retain the road-only path', () => {
  const route = findShortestPath([detourRoad], [0, 0], [0.1, 0], TRANSPORT_CONFIGS.horse);

  assert.ok(route);
  assert.equal(route.path.length, 3);
  assert.ok(route.path.every((segment) => !segment.is_off_road));
});

const marshRoad = {
  id: 2,
  name: 'Regular Road',
  biome_type: 'marsh',
  altitude_type: 'plain',
  geometry: {
    type: 'LineString',
    coordinates: [
      [0, 0],
      [0.1, 0],
    ],
  },
};

const plainDetourRoad = {
  id: 3,
  name: 'Regular Road',
  biome_type: 'plain',
  altitude_type: 'plain',
  geometry: {
    type: 'LineString',
    coordinates: [
      [0, 0],
      [0, 0.05],
      [0.1, 0.05],
      [0.1, 0],
    ],
  },
};

const hugeDetourRoad = {
  id: 4,
  name: 'Regular Road',
  biome_type: 'plain',
  altitude_type: 'plain',
  geometry: {
    type: 'LineString',
    coordinates: [
      [0, 0],
      [0, 1],
      [1, 1],
      [1, 0],
    ],
  },
};

test('walking goes directly across huge roadless detours', () => {
  const route = findShortestPath(
    [hugeDetourRoad],
    [0, 0],
    [1, 0],
    TRANSPORT_CONFIGS.walk,
    { endBiome: 'marsh' }
  );

  assert.ok(route);
  assert.ok(route.path.every((segment) => segment.is_off_road));
  const totalLength = route.path.reduce((sum, s) => sum + s.segment_length, 0);
  assert.ok(totalLength < 120000, `expected direct route (~111km), got ${totalLength}m`);
});

test('routing prefers the direct marsh route over a longer plain detour', () => {
  const route = findShortestPath(
    [marshRoad, plainDetourRoad],
    [0, 0],
    [0.1, 0],
    TRANSPORT_CONFIGS.horse
  );

  assert.ok(route);
  assert.equal(route.path.length, 1);
  assert.equal(route.path[0].biome_type, 'marsh');
});

test('travel time through a marsh still reflects the terrain penalty', () => {
  const route = findShortestPath(
    [marshRoad, plainDetourRoad],
    [0, 0],
    [0.1, 0],
    TRANSPORT_CONFIGS.horse
  );

  assert.ok(route);
  const segment = route.path[0];
  const config = TRANSPORT_CONFIGS.horse;
  const expectedSpeed =
    config.baseSpeed *
    config.roadMultipliers['Regular Road'] *
    config.biomeMultipliers.marsh *
    config.elevationMultipliers.plain;
  assert.ok(Math.abs(segment.effective_speed - expectedSpeed) < 1e-9);
  assert.ok(
    Math.abs(segment.travel_time_seconds - segment.segment_length / expectedSpeed) < 1e-6
  );
});

// ---------------------------------------------------------------------------
// computeDailyCheckpoints — settlement attraction + hostile exclusion
// ---------------------------------------------------------------------------
// A straight 100 km leg walked at a flat pace: interpolateMonotonic maps
// linearly, so 12 h of walking lands at 60 km (the daily target).
const FLAT_COORDS = [[0, 0], [0.9, 0]];
const FLAT_DISTS = [0, 100000];
const FLAT_TIMES = [0, 72000]; // 20 h of walking for 100 km

const TOWN_AT_45K = {
  id: 1, name: 'Bree', type: 'town', region: 'Bree-land', region_id: 1,
  population: 410, cultural_family: 'hobbit', off_route_m: 800,
  lng: 0.405, lat: 0, distance_m: 45000,
};
const CITY_AT_30K = {
  id: 2, name: 'Minas Tirith', type: 'fortified city', region: 'Anorien', region_id: 2,
  population: 25000, cultural_family: 'gondorian', off_route_m: 3200,
  lng: 0.27, lat: 0, distance_m: 30000,
};
const HOSTILE_TOWN_AT_50K = {
  id: 3, name: 'Umbar outpost', type: 'town', region: 'Dagorlad', region_id: 3,
  population: 800, cultural_family: 'enemy', off_route_m: 500,
  lng: 0.45, lat: 0, distance_m: 50000,
};
const RUIN_ON_ROUTE_AT_58K = {
  id: 4, name: 'Old watch ruin', type: 'ruins', region: 'Anorien', region_id: 2,
  population: 0, cultural_family: 'gondorian', off_route_m: 20,
  lng: 0.522, lat: 0, distance_m: 58000,
};

const alwaysStop = () => 0;      // rng() < attraction always true
const neverStop = () => 0.999;   // rng() < attraction always false

test('checkpoints: a city off the road pulls the traveller and ends the day early', () => {
  const cps = computeDailyCheckpoints(
    72000, 100000, [CITY_AT_30K], FLAT_COORDS, FLAT_DISTS, FLAT_TIMES, 0.9, 0,
    { rng: alwaysStop }
  );
  assert.equal(cps[0].location.name, 'Minas Tirith');
  assert.equal(cps[0].distance_m, 30000); // day ends at the city, not at 60 km
  assert.equal(cps.at(-1).is_destination, true);
});

test('checkpoints: a village that fails its pull does not stop the traveller', () => {
  const village = { ...TOWN_AT_45K, name: 'Hamlet', type: 'village', distance_m: 45000, off_route_m: 900 };
  const cps = computeDailyCheckpoints(
    72000, 100000, [village], FLAT_COORDS, FLAT_DISTS, FLAT_TIMES, 0.9, 0,
    { rng: neverStop }
  );
  assert.equal(cps[0].location, null); // wild camp at the 60 km mark
  assert.equal(cps[0].distance_m, 60000);
});

test('checkpoints: hostile settlements are never candidates', () => {
  const cps = computeDailyCheckpoints(
    72000, 100000, [HOSTILE_TOWN_AT_50K], FLAT_COORDS, FLAT_DISTS, FLAT_TIMES, 0.9, 0,
    { rng: alwaysStop, isHostileLocation: (l) => l.cultural_family === 'enemy' }
  );
  assert.equal(cps[0].location, null); // walked past, camped wild at 60 km
});

test('checkpoints: settlements in the first stretch of the day do not attract', () => {
  const earlyTown = { ...TOWN_AT_45K, distance_m: 8000 }; // ~13% of a 60 km day
  const cps = computeDailyCheckpoints(
    72000, 100000, [earlyTown], FLAT_COORDS, FLAT_DISTS, FLAT_TIMES, 0.9, 0,
    { rng: alwaysStop }
  );
  assert.equal(cps[0].location, null);
});

test('checkpoints: an on-route landmark still anchors the night when no settlement attracts', () => {
  const cps = computeDailyCheckpoints(
    72000, 100000, [RUIN_ON_ROUTE_AT_58K], FLAT_COORDS, FLAT_DISTS, FLAT_TIMES, 0.9, 0,
    { rng: neverStop }
  );
  assert.equal(cps[0].location.name, 'Old watch ruin');
  assert.equal(cps[0].distance_m, 58000);
});

test('checkpoints: a settlement beyond its attraction radius cannot pull', () => {
  const farTown = { ...TOWN_AT_45K, off_route_m: 4000 }; // town radius is 2000 m
  const cps = computeDailyCheckpoints(
    72000, 100000, [farTown], FLAT_COORDS, FLAT_DISTS, FLAT_TIMES, 0.9, 0,
    { rng: alwaysStop }
  );
  assert.equal(cps[0].location, null);
});
