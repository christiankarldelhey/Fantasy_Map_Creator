// ============================================================================
// Trip history reads for the narrator
// ----------------------------------------------------------------------------
// Everything the next chapter needs to know about the chapters already
// written: what happened yesterday (continuity) and which encounter forms
// it has recently used (variety — for day generation, not the prompt).
//
// trip_days is a GAME table — the SQL lives in
// game/services/world/tripHistoryReads.js and reaches here through
// story/adapters/gameClient.js. This file owns only the shaping.
// ============================================================================

import {
  loadPreviousDayRow,
  loadRecentEncounterRows,
  loadRecentDayClimates as loadRecentDayClimateRows,
} from '../../adapters/gameClient.js';

// How many recent chapters are scanned for already-used encounter forms.
const RECENT_FORMS_CHAPTERS = 3;

/**
 * Yesterday's facts for continuity, RAW (C13): names only, no sentence.
 * The story-engine renders the 'In Chapter N…' line through its NL pack —
 * only on the stateless /narrate-day path; mind-driven episodes recap
 * yesterday inside the lens from retained memories instead (C22).
 * @param {number} tripId
 * @param {number} dayNumber - the day being narrated
 * @returns {Promise<{day_number:number, regions:string[], locations:string[], encounters:string[]}|null>}
 */
export async function loadPreviousDay(tripId, dayNumber) {
  const row = await loadPreviousDayRow(tripId, dayNumber);
  if (!row) return null;

  const names = (list) =>
    (list || []).map((item) => item?.name || item).filter(Boolean);
  return {
    day_number: row.day_number,
    regions: names(row.regions),
    locations: names(row.locations),
    encounters: names((row.encounters || []).map((e) => e?.entity)),
  };
}

/**
 * Encounter forms used in the last few chapters, so today's can differ.
 * @param {number} tripId
 * @param {number} dayNumber - the day being narrated
 * @returns {Promise<string[]>}
 */
export async function loadRecentEncounterForms(tripId, dayNumber) {
  return (await loadRecentEncounterRows(tripId, dayNumber, RECENT_FORMS_CHAPTERS))
    .flatMap((encounters) => (Array.isArray(encounters) ? encounters : []))
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
 * @returns {Promise<Array<{date:string, climate:Array, dayNumber:number}>>}
 */
export async function loadRecentDayClimates(tripId, dayNumber) {
  return (await loadRecentDayClimateRows(tripId, dayNumber, CLIMATE_STATE_DAYS))
    .map((r) => ({ date: r.date, climate: r.climate, dayNumber: r.day_number }));
}
