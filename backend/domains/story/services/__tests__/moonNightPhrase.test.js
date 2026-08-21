import { test } from 'node:test';
import assert from 'node:assert/strict';

import { formatMoonNightPhrase } from '../naturalLanguage/index.js';

// -----------------------------------------------------------------------------
// formatMoonNightPhrase
// -----------------------------------------------------------------------------

test('formatMoonNightPhrase always returns new moon phrase', () => {
  const phrase = formatMoonNightPhrase({ phase: 'new_moon', illumination: 0 }, 90);
  assert.equal(phrase, 'no moon rises; the dark is absolute away from the fire');
});

test('formatMoonNightPhrase returns full moon phrase when skies are clear enough', () => {
  const phrase = formatMoonNightPhrase({ phase: 'full_moon', illumination: 1 }, 30);
  assert.equal(phrase, 'the full moon is bright; the land lies pale and open');
});

test('formatMoonNightPhrase hides full moon behind heavy cloud', () => {
  const phrase = formatMoonNightPhrase({ phase: 'full_moon', illumination: 1 }, 75);
  assert.equal(phrase, null);
});

test('formatMoonNightPhrase returns null without moon data', () => {
  assert.equal(formatMoonNightPhrase(null, 30), null);
  assert.equal(formatMoonNightPhrase(undefined, 30), null);
});
