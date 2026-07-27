import { test } from 'node:test';
import assert from 'node:assert/strict';

import { findShortestPath, TRANSPORT_CONFIGS } from '../routing.js';

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

test('walking routes use a bounded cross-country shortcut to avoid a road detour', () => {
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
