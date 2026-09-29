// ============================================================================
// Trip history reads (owner: game)
// ----------------------------------------------------------------------------
// trip_days is a game table — every SELECT on it lives here, behind the
// adapter seam. The story domain consumes these rows through
// story/adapters/gameClient.js and owns only the shaping (name lists,
// phrase-vice extraction, first-sentence cuts). No language is composed
// here: rows in, rows out.
// ============================================================================

import pool from '../../../../db.js';

/** The day row immediately before `dayNumber`, or null. */
export async function loadPreviousDayRow(tripId, dayNumber) {
  if (dayNumber <= 1) return null;
  const { rows } = await pool.query(
    `SELECT day_number, regions, locations, encounters
     FROM trip_days WHERE trip_id = $1 AND day_number = $2`,
    [tripId, dayNumber - 1]
  );
  return rows[0] || null;
}

/** Narratives of every chapter before `dayNumber`, oldest first. */
export async function loadNarrativesBefore(tripId, dayNumber) {
  const { rows } = await pool.query(
    `SELECT narrative FROM trip_days
     WHERE trip_id = $1 AND day_number < $2 AND narrative IS NOT NULL
     ORDER BY day_number`,
    [tripId, dayNumber]
  );
  return rows.map((r) => r.narrative);
}

/** The most recent narratives before `dayNumber`, newest first. */
export async function loadRecentNarratives(tripId, dayNumber, limit) {
  const { rows } = await pool.query(
    `SELECT narrative FROM trip_days
     WHERE trip_id = $1 AND day_number < $2 AND narrative IS NOT NULL
     ORDER BY day_number DESC
     LIMIT $3`,
    [tripId, dayNumber, limit]
  );
  return rows.map((r) => r.narrative);
}

/** Encounter arrays of the last `limit` chapters, newest first. */
export async function loadRecentEncounterRows(tripId, dayNumber, limit) {
  const { rows } = await pool.query(
    `SELECT encounters FROM trip_days
     WHERE trip_id = $1 AND day_number < $2
     ORDER BY day_number DESC
     LIMIT $3`,
    [tripId, dayNumber, limit]
  );
  return rows.map((r) => r.encounters);
}

/** Climate snapshots for the last `limit` days, oldest first. */
export async function loadRecentDayClimates(tripId, dayNumber, limit) {
  const { rows } = await pool.query(
    `SELECT date, climate, day_number
     FROM trip_days
     WHERE trip_id = $1 AND day_number <= $2
     ORDER BY day_number
     LIMIT $3`,
    [tripId, dayNumber, limit]
  );
  return rows;
}
