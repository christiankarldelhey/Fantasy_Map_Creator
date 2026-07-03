import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  describeLandscape,
  describeRoads,
} from '../naturalLanguage.js';

// ---------------------------------------------------------------------------
// describeLandscape
// ---------------------------------------------------------------------------

test('describeLandscape uses regional phrases when available', () => {
  const terrainPhrases = {
    Ithilien: {
      forest: ['The woods of Ithilien are thick and watchful.'],
    },
  };
  const rng = () => 0;
  const text = describeLandscape(['forest'], [], [{ name: 'Ithilien' }], terrainPhrases, rng);
  assert.ok(text.includes('The woods of Ithilien are thick and watchful.'));
});

test('describeLandscape falls back to generic phrases when regional phrases are missing', () => {
  const terrainPhrases = {};
  const rng = () => 0;
  const text = describeLandscape(['forest'], [], [{ name: 'Dagorlad' }], terrainPhrases, rng);
  assert.ok(text.includes('woodland'));
});

test('describeLandscape describes plain when no biome or altitude is present', () => {
  const terrainPhrases = {
    Rohan: {
      plain: ['The grasslands of Rohan roll green and endless.'],
    },
  };
  const rng = () => 0;
  const text = describeLandscape([], [], [{ name: 'Rohan' }], terrainPhrases, rng);
  assert.ok(text.includes('The grasslands of Rohan roll green and endless.'));
});

test('describeLandscape falls back to default plain description when no data', () => {
  const text = describeLandscape([], [], [{ name: 'Unknown' }], {}, () => 0);
  assert.equal(text, 'Open, even country, with no great rise or wood to speak of.');
});

// ---------------------------------------------------------------------------
// describeRoads
// ---------------------------------------------------------------------------

test('describeRoads uses regional road phrases when available', () => {
  const terrainPhrases = {
    Gondor: {
      road: ['A well-kept Gondorian road of fitted stone.'],
    },
  };
  const rng = () => 0;
  const text = describeRoads({ road: 10 }, [{ name: 'Gondor' }], terrainPhrases, rng);
  assert.ok(text.includes('A well-kept Gondorian road of fitted stone.'));
});

test('describeRoads falls back to generic road phrases when regional phrases are missing', () => {
  const terrainPhrases = {};
  const rng = () => 0;
  const text = describeRoads({ road: 10 }, [{ name: 'Unknown' }], terrainPhrases, rng);
  assert.ok(text.includes('made roads'));
});
