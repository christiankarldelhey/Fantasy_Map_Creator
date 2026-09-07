// ============================================================================
// Daily generation quota
// ----------------------------------------------------------------------------
// Every generated day ends in an LLM call, so a single enthusiastic user can
// burn the whole API quota in an afternoon. This caps how many days a non-admin
// user can generate per calendar day.
//
// The cap is read from DAILY_DAY_LIMIT: unset (or not a positive integer) means
// no cap, so local development is unaffected and production sets it explicitly.
//
// Usage is counted straight from trip_days instead of a dedicated counter
// table. Two consequences worth knowing: a user who deletes a trip gets those
// slots back (trip_days cascades away with it), and days on a trip whose
// character was deleted (character_id SET NULL) belong to nobody and don't
// count. Both fail open, which is the right direction for a wrong guess.
// ============================================================================

import pool from '../../../db.js';

// ---------------------------------------------------------------------------
// dailyDayLimit — the configured cap, or null when unlimited
// ---------------------------------------------------------------------------
export function dailyDayLimit() {
  const limit = parseInt(process.env.DAILY_DAY_LIMIT, 10);
  return Number.isInteger(limit) && limit > 0 ? limit : null;
}

// ---------------------------------------------------------------------------
// checkDailyDayQuota — how many days this user has generated since midnight
// ---------------------------------------------------------------------------
/**
 * @param {{ userId:number, isAdmin:boolean }} params
 * @returns {Promise<{ allowed:boolean, used:number, limit:number|null }>}
 *   limit is null when no cap applies (unconfigured, or an admin caller).
 */
export async function checkDailyDayQuota({ userId, isAdmin = false }) {
  const limit = dailyDayLimit();
  if (limit === null || isAdmin || !userId) {
    return { allowed: true, used: 0, limit: null };
  }

  // Ownership runs trip_days -> trips.character_id -> character_state.owner_user_id.
  // Midnight is the database's own (NOW() is the trip_days.created_at clock).
  const { rows } = await pool.query(
    `SELECT COUNT(*)::int AS used
       FROM trip_days td
       JOIN trips t           ON t.id = td.trip_id
       JOIN character_state c ON c.id = t.character_id
      WHERE c.owner_user_id = $1
        AND td.created_at >= date_trunc('day', NOW())`,
    [userId]
  );

  const used = rows[0]?.used ?? 0;
  return { allowed: used < limit, used, limit };
}
