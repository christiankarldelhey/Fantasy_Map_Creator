import { test } from 'node:test';
import assert from 'node:assert/strict';

import { findShortestPath, TRANSPORT_CONFIGS } from '../world/routing.js';

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
