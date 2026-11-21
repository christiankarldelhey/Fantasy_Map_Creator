// ============================================================================
// Season + daylight — the deterministic face a day wears
// ----------------------------------------------------------------------------
// One selector for season (four, always), weather keys on top, and the
// day's solar anchors (sunrise/sunset from date and latitude) moving the
// clock phrases and the dawn|day|dusk|night variant keys.
// ============================================================================
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { seasonOfDate, variantOrderForDay } from '../seasonalVariants.js';
import { daylightFor, solarKey, DEFAULT_DAYLIGHT } from '../daylight.js';
import { timeOfDayPhrase } from '../dayPhases.js';

test('seasonOfDate maps every month to exactly one of four seasons', () => {
  assert.equal(seasonOfDate('1950-03-10'), 'spring');
  assert.equal(seasonOfDate('1950-05-31'), 'spring');
  assert.equal(seasonOfDate('1950-07-01'), 'summer');
  assert.equal(seasonOfDate('1950-10-15'), 'autumn');
  assert.equal(seasonOfDate('1950-11-30'), 'autumn');
  assert.equal(seasonOfDate('1950-01-21'), 'winter');
  assert.equal(seasonOfDate('1950-12-01'), 'winter');
  assert.equal(seasonOfDate('1950-02-28'), 'winter');
  assert.equal(seasonOfDate(''), null);
  assert.equal(seasonOfDate(null), null);
});

test('variantOrderForDay always carries a season and ends on base', () => {
  // No climate samples at all: the day still has a face.
  const bare = variantOrderForDay('1950-10-15', []);
  assert.deepEqual(bare, ['autumn', 'base']);
  // A wet autumn day orders the weather ahead of the season.
  const wet = variantOrderForDay('1950-10-15', [
    { climate: { temperature_2m: 8, precipitation: 3 } },
    { climate: { temperature_2m: 9, precipitation: 2 } },
  ]);
  assert.deepEqual(wet, ['rain', 'autumn', 'base']);
});

test('variantOrderForDay raises wind on a windy day', () => {
  const order = variantOrderForDay('1950-03-10', [
    { climate: { temperature_2m: 10, precipitation: 0, wind_speed_10m: 30 } },
    { climate: { temperature_2m: 11, precipitation: 0, wind_speed_10m: 26 } },
  ]);
  assert.deepEqual(order, ['wind', 'spring', 'base']);
});

test('daylightFor moves the anchors with the season', () => {
  const winter = daylightFor('1950-11-15', 54);
  const summer = daylightFor('1950-06-15', 54);
  assert.ok(winter.sunset < 17, `winter sunset ${winter.sunset} should be early`);
  assert.ok(winter.sunrise > 6.5, `winter sunrise ${winter.sunrise} should be late`);
  assert.ok(summer.sunset > 19, `summer sunset ${summer.sunset} should be late`);
  assert.equal(summer.sunset - summer.sunrise > winter.sunset - winter.sunrise, true);
});

test('daylightFor falls back to the defaults on missing input', () => {
  assert.deepEqual(daylightFor('', 54), DEFAULT_DAYLIGHT);
  assert.deepEqual(daylightFor('1950-11-15', null), DEFAULT_DAYLIGHT);
  assert.deepEqual(daylightFor('1950-11-15', undefined), DEFAULT_DAYLIGHT);
});

test('solarKey sorts the day into dawn, day, dusk and night', () => {
  const dl = { sunrise: 8, sunset: 16.5 }; // a northern winter day
  assert.equal(solarKey(5, dl), 'night');
  assert.equal(solarKey(8, dl), 'dawn');
  assert.equal(solarKey(12, dl), 'day');
  // The generous two-hour window before sunset reads as dusk.
  assert.equal(solarKey(14.6, dl), 'dusk');
  assert.equal(solarKey(16.4, dl), 'dusk');
  assert.equal(solarKey(14.4, dl), 'day');
  assert.equal(solarKey(17.5, dl), 'night');
  assert.equal(solarKey(null, dl), null);
});

test('timeOfDayPhrase seasons its edges with the daylight anchors', () => {
  const dl = { sunrise: 8, sunset: 16.5 };
  assert.equal(timeOfDayPhrase(8.2, dl), 'at first light');
  assert.equal(timeOfDayPhrase(15, dl), 'as the light failed');
  assert.equal(timeOfDayPhrase(17.5, dl), 'after dark');
  assert.equal(timeOfDayPhrase(14, dl), 'in the early afternoon');
  // Without anchors the fixed bands apply, as before.
  assert.equal(timeOfDayPhrase(17.5), 'as evening drew near');
  assert.equal(timeOfDayPhrase(14), 'in the early afternoon');
  assert.equal(timeOfDayPhrase(20), 'after dark');
});
