import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  pickPhrase,
  pickPhraseForRegions,
} from '../terrainPhrases.js';

// ---------------------------------------------------------------------------
// pickPhrase
// ---------------------------------------------------------------------------

test('pickPhrase returns a random phrase for the region/category', () => {
  const map = {
    Ithilien: {
      forest: [
        'The woods of Ithilien are thick and watchful.',
        'Under Ithilien branches the air is heavy with herbs.',
      ],
    },
  };
  const rng = () => 0;
  const phrase = pickPhrase(map, 'Ithilien', 'forest', rng);
  assert.equal(phrase, 'The woods of Ithilien are thick and watchful.');
});

test('pickPhrase returns null when no phrases exist', () => {
  const map = { Ithilien: { forest: [] } };
  const phrase = pickPhrase(map, 'Ithilien', 'forest');
  assert.equal(phrase, null);
});

test('pickPhrase returns null when region is missing', () => {
  const map = {};
  const phrase = pickPhrase(map, 'Dagorlad', 'forest');
  assert.equal(phrase, null);
});

// ---------------------------------------------------------------------------
// pickPhraseForRegions
// ---------------------------------------------------------------------------

test('pickPhraseForRegions picks from the first region with a phrase', () => {
  const map = {
    Ithilien: { forest: ['Ithilien forest phrase.'] },
    Gondor: { forest: ['Gondor forest phrase.'] },
  };
  const rng = () => 0;
  const phrase = pickPhraseForRegions(map, ['Gondor', 'Ithilien'], 'forest', rng);
  assert.equal(phrase, 'Gondor forest phrase.');
});

test('pickPhraseForRegions falls back to later regions', () => {
  const map = {
    Ithilien: { forest: ['Ithilien forest phrase.'] },
  };
  const rng = () => 0;
  const phrase = pickPhraseForRegions(map, ['Dagorlad', 'Ithilien'], 'forest', rng);
  assert.equal(phrase, 'Ithilien forest phrase.');
});

test('pickPhraseForRegions returns null when no region has a phrase', () => {
  const map = {};
  const phrase = pickPhraseForRegions(map, ['Dagorlad', 'Mordor'], 'forest');
  assert.equal(phrase, null);
});
