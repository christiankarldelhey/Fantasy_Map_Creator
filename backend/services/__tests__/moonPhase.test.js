import { test } from 'node:test';
import assert from 'node:assert/strict';

import { getMoonPhase } from '../moonPhase.js';
import { formatMoonNightPhrase } from '../naturalLanguage.js';

// -----------------------------------------------------------------------------
// getMoonPhase
// -----------------------------------------------------------------------------

test('getMoonPhase returns new moon near 1950-01-18', () => {
  const moon = getMoonPhase('1950-01-18');
  assert.equal(moon.phase, 'new_moon');
  assert.ok(moon.illumination < 0.05, `illumination should be near 0, got ${moon.illumination}`);
});

test('getMoonPhase returns full moon near 1950-01-04', () => {
  const moon = getMoonPhase('1950-01-04');
  assert.equal(moon.phase, 'full_moon');
  assert.ok(moon.illumination > 0.9, `illumination should be near 1, got ${moon.illumination}`);
});

test('getMoonPhase returns first quarter near 1950-01-26', () => {
  const moon = getMoonPhase('1950-01-26');
  assert.equal(moon.phase, 'first_quarter');
  assert.ok(moon.illumination > 0.45 && moon.illumination < 0.65, `illumination should be ~0.5, got ${moon.illumination}`);
});

test('getMoonPhase returns full moon near 1950-08-27', () => {
  const moon = getMoonPhase('1950-08-27');
  assert.equal(moon.phase, 'full_moon');
  assert.ok(moon.illumination > 0.85, `illumination should be near 1, got ${moon.illumination}`);
});

test('getMoonPhase returns full moon near 1950-12-24', () => {
  const moon = getMoonPhase('1950-12-24');
  assert.equal(moon.phase, 'full_moon');
  assert.ok(moon.illumination > 0.85, `illumination should be near 1, got ${moon.illumination}`);
});

test('getMoonPhase normalizes date strings and timestamps to the same day', () => {
  const fromDateString = getMoonPhase('1950-01-18');
  const fromTimestamp = getMoonPhase('1950-01-18 12:00:00');
  const fromDate = getMoonPhase(new Date('1950-01-18T00:00:00Z'));
  assert.equal(fromDateString.phase, fromDate.phase);
  assert.equal(fromDateString.illumination, fromDate.illumination);
  assert.equal(fromTimestamp.phase, fromDate.phase);
  assert.equal(fromTimestamp.illumination, fromDate.illumination);
});

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
