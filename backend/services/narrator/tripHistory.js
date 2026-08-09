// ============================================================================
// Trip history reads for the narrator
// ----------------------------------------------------------------------------
// Everything the next chapter needs to know about the chapters already written:
// what happened yesterday (continuity), which phrases the model has worn out
// (anti-repetition), and which encounter forms it has recently used (variety).
// ============================================================================

import pool from '../../db.js';
import { extractRepeatedPhrases } from '../phraseVices.js';
import { previousDaySummary } from '../prompt/sections/journeySection.js';

// How many recent chapters are scanned for already-used encounter forms.
const RECENT_FORMS_CHAPTERS = 3;

/**
 * Plain summary of the previous chapter, or null on day 1 / when it is missing.
 * @param {number} tripId
 * @param {number} dayNumber - the day being narrated
 * @returns {Promise<string|null>}
 */
export async function loadPreviousDaySummary(tripId, dayNumber) {
  if (dayNumber <= 1) return null;

  const { rows } = await pool.query(
    `SELECT day_number, regions, locations, encounters
     FROM trip_days WHERE trip_id = $1 AND day_number = $2`,
    [tripId, dayNumber - 1]
  );
  if (rows.length === 0) return null;

  return previousDaySummary(rows[0]);
}

/**
 * Phrases the model over-used in the earlier chapters of this trip.
 * @param {number} tripId
 * @param {number} dayNumber - the day being narrated
 * @returns {Promise<string[]>}
 */
export async function loadBannedPhrases(tripId, dayNumber) {
  if (dayNumber <= 1) return [];

  const { rows } = await pool.query(
    `SELECT narrative FROM trip_days
     WHERE trip_id = $1 AND day_number < $2 AND narrative IS NOT NULL
     ORDER BY day_number`,
    [tripId, dayNumber]
  );

  return extractRepeatedPhrases(rows.map((r) => r.narrative));
}

// How many earlier chapter openings are shown as counter-examples.
const RECENT_OPENINGS_CHAPTERS = 4;

/**
 * First sentence of each recent earlier chapter, so today's opening can be
 * required to differ from them in structure, not just in wording.
 * @param {number} tripId
 * @param {number} dayNumber - the day being narrated
 * @returns {Promise<string[]>}
 */
export async function loadPreviousOpenings(tripId, dayNumber) {
  if (dayNumber <= 1) return [];

  const { rows } = await pool.query(
    `SELECT narrative FROM trip_days
     WHERE trip_id = $1 AND day_number < $2 AND narrative IS NOT NULL
     ORDER BY day_number DESC
     LIMIT $3`,
    [tripId, dayNumber, RECENT_OPENINGS_CHAPTERS]
  );

  return rows
    .map((r) => firstSentence(r.narrative))
    .filter(Boolean);
}

/** The first sentence of a narrative, trimmed to a sane length. */
function firstSentence(text) {
  if (typeof text !== 'string') return null;
  const trimmed = text.trim();
  if (!trimmed) return null;
  const match = trimmed.match(/^[^.!?\n]+[.!?]?/);
  const sentence = (match ? match[0] : trimmed).trim();
  return sentence.length > 160 ? `${sentence.slice(0, 160)}…` : sentence;
}

/**
 * Encounter forms used in the last few chapters, so today's can differ.
 * @param {number} tripId
 * @param {number} dayNumber - the day being narrated
 * @returns {Promise<string[]>}
 */
export async function loadRecentEncounterForms(tripId, dayNumber) {
  const { rows } = await pool.query(
    `SELECT encounters FROM trip_days
     WHERE trip_id = $1 AND day_number < $2
     ORDER BY day_number DESC
     LIMIT $3`,
    [tripId, dayNumber, RECENT_FORMS_CHAPTERS]
  );

  return rows.flatMap((row) => (Array.isArray(row.encounters) ? row.encounters : []))
    .map((e) => e.interaction?.form)
    .filter(Boolean);
}

// How many previous days are scanned for multi-day climate states.
const CLIMATE_STATE_DAYS = 4;

/**
 * Climate snapshots for the current and previous few days, oldest first.
 * Used to detect multi-day weather states (snowbound, storm-lashed, etc.).
 * @param {number} tripId
 * @param {number} dayNumber - the day being narrated
 * @returns {Promise<Array<{date:string, climate:Array}>>}
 */
export async function loadRecentDayClimates(tripId, dayNumber) {
  const { rows } = await pool.query(
    `SELECT date, climate, day_number
     FROM trip_days
     WHERE trip_id = $1 AND day_number <= $2
     ORDER BY day_number
     LIMIT $3`,
    [tripId, dayNumber, CLIMATE_STATE_DAYS]
  );
  return rows.map((r) => ({ date: r.date, climate: r.climate, dayNumber: r.day_number }));
}
