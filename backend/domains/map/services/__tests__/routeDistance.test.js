import { test } from 'node:test';
import assert from 'node:assert/strict';

import { distanceAtPlanarFraction } from '../world/routing.js';

// A route at lat 45 that goes east 0.5 deg, then north 0.5 deg. In degrees
// both legs are equal (planar fraction 0.5 at the corner), but one degree of
// longitude at lat 45 is ~78.6 km while one degree of latitude is ~111.2 km.
// Real metres (literal reference values): east leg 39_300 m, north leg 55_600 m.
const COORDS = [[0, 45], [0.5, 45], [0.5, 45.5]];
const DISTS = [0, 39300, 94900];

test('planar fraction maps to real metres: corner of the route', () => {
  assert.equal(distanceAtPlanarFraction(0.5, COORDS, DISTS), 39300);
});

test('planar fraction maps to real metres: halfway along the east leg', () => {
  assert.equal(distanceAtPlanarFraction(0.25, COORDS, DISTS), 19650);
});

test('planar fraction maps to real metres: halfway along the north leg', () => {
  assert.equal(distanceAtPlanarFraction(0.75, COORDS, DISTS), 67100);
});

test('planar fraction clamps to the route ends', () => {
  assert.equal(distanceAtPlanarFraction(0, COORDS, DISTS), 0);
  assert.equal(distanceAtPlanarFraction(1, COORDS, DISTS), 94900);
});

test('the naive fraction * totalDist the code used before is off by ~8 km here', () => {
  const naive = 0.5 * DISTS.at(-1);
  assert.ok(Math.abs(naive - 39300) > 8000);
});
