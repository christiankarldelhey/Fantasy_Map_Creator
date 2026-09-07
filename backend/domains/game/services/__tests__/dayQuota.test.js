import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';

import { dailyDayLimit, checkDailyDayQuota } from '../dayQuota.js';

const original = process.env.DAILY_DAY_LIMIT;

afterEach(() => {
  if (original === undefined) delete process.env.DAILY_DAY_LIMIT;
  else process.env.DAILY_DAY_LIMIT = original;
});

// ---------------------------------------------------------------------------
// dailyDayLimit
// ---------------------------------------------------------------------------
test('dailyDayLimit: unset, zero, negative or garbage means unlimited', () => {
  delete process.env.DAILY_DAY_LIMIT;
  assert.equal(dailyDayLimit(), null);

  for (const value of ['0', '-5', '', 'twenty']) {
    process.env.DAILY_DAY_LIMIT = value;
    assert.equal(dailyDayLimit(), null, `expected no limit for ${JSON.stringify(value)}`);
  }
});

test('dailyDayLimit: a positive integer is the cap', () => {
  process.env.DAILY_DAY_LIMIT = '20';
  assert.equal(dailyDayLimit(), 20);
});

// ---------------------------------------------------------------------------
// checkDailyDayQuota — the paths that must never touch the database
// ---------------------------------------------------------------------------
test('checkDailyDayQuota: no configured limit allows everyone', async () => {
  delete process.env.DAILY_DAY_LIMIT;
  assert.deepEqual(
    await checkDailyDayQuota({ userId: 42, isAdmin: false }),
    { allowed: true, used: 0, limit: null }
  );
});

test('checkDailyDayQuota: admins are exempt from a configured limit', async () => {
  process.env.DAILY_DAY_LIMIT = '20';
  assert.deepEqual(
    await checkDailyDayQuota({ userId: 1, isAdmin: true }),
    { allowed: true, used: 0, limit: null }
  );
});
