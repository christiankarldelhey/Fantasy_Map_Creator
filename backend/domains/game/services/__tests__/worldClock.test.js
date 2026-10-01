import { test } from 'node:test';
import assert from 'node:assert/strict';

import { stamp1950 } from '../world/tripDay.js';

// ---------------------------------------------------------------------------
// C30 — the world clock: the in-world calendar runs on its own dates, but the
// climate dataset only covers 1950. Any in-world date samples the same
// month/day of 1950; Feb 29 (a leap day with no 1950 twin) reads Feb 28's sky.
// ---------------------------------------------------------------------------

test('stamp1950 maps an arbitrary year onto the 1950 dataset', () => {
  assert.equal(stamp1950('1950-06-21'), '1950-06-21');
  assert.equal(stamp1950('1951-01-05'), '1950-01-05');
  assert.equal(stamp1950('1975-12-31'), '1950-12-31');
});

test('stamp1950 collapses Feb 29 onto Feb 28', () => {
  // 1952 is a leap year; the dataset has no 1950-02-29 row — an unmapped
  // stamp would be an invalid timestamp the query could never satisfy.
  assert.equal(stamp1950('1952-02-29'), '1950-02-28');
  assert.equal(stamp1950('1952-02-28'), '1950-02-28');
  assert.equal(stamp1950('1952-03-01'), '1950-03-01');
});
