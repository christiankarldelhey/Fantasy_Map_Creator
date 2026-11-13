// ============================================================================
// Ambient voice: tag-set emission + situation resolution (ADR-0015)
// ----------------------------------------------------------------------------
// The world emits a tag set for the day; ambient records carry tag-gated
// situations. A situation is a candidate when every entry in `tags` is
// present and no entry in `not_tags` is. Options inside the chosen
// situation are picked automatically by the character's state — an option
// whose driver `tag` is present outweighs one that is not — until the
// higher self exposes the same options to the player.
//
// Tag families emitted here (registry: database/seeds/data/json/tags.json):
//   world   season:*, weather:*, ground:*, phase:morning|afternoon
//   stay    region_day:N (cumulative), entry:first, entry_count:N,
//           days_since_exit:N (gap before the current stay)
//   mind    mind:fatigue, mind:hunger, mind:thirst, mind:melancholy
// Beliefs and the richer mind tags (curiosity, wander, fear bands) are the
// mind-engine's to emit; situations gated only on those stay silent until
// that rail exists.
// ============================================================================

import pool from '../../../../db.js';
import { shadowBand } from '../character/characterState.js';

/** Most ambient situations a single day may narrate. */
const MAX_AMBIENT_SITUATIONS = 2;

/** Energy below which the body is 'fatigue' for driver purposes. */
const FATIGUE_ENERGY_MAX = 30;

// Ground is derived from the biome/altitude categories actually crossed.
// The authored 'hard' cases are mountain country (Moria); 'soft' is kind
// walking — meadow, marsh, forest floor. Unknown categories emit nothing.
const GROUND_HARD_TYPES = new Set([
  'mountain', 'mountains', 'rock', 'rocky', 'barren', 'scree', 'desert',
  'highland', 'highlands', 'tundra', 'cliff', 'cliffs',
]);
const GROUND_SOFT_TYPES = new Set([
  'forest', 'woodland', 'marsh', 'wetland', 'plain', 'plains', 'meadow',
  'grassland', 'steppe', 'heath', 'field',
]);

/** Middle-earth season tag for a date — all four, unlike seasonOfDate. */
function seasonTagOf(dateISO) {
  const month = Number(String(dateISO || '').slice(5, 7));
  if (!month) return null;
  if (month >= 3 && month <= 5) return 'season:spring';
  if (month >= 6 && month <= 8) return 'season:summer';
  if (month >= 9 && month <= 11) return 'season:autumn';
  return 'season:winter';
}

/**
 * Stay arithmetic for one region against the trip's prior days.
 * @param {Array<Array<number|string>>} history prior days' region ids,
 *   chronological (day 1 first)
 * @param {number|string} regionId region being evaluated
 * @param {Function} matches (dayRegions) => region present that day
 * @returns {{stayDays:number, entryCount:number, gapDays:number}}
 *   stayDays — consecutive days inside ending today (today included)
 *   entryCount — which contiguous stay this is (1 = first visit)
 *   gapDays — days between the previous stay's end and today (0 = first visit)
 */
export function regionStay(history, isPresent) {
  const days = (history || []).map((dayRegions) => !!isPresent(dayRegions));
  // Today's stay = the trailing run of presences plus today itself.
  let stayDays = 1;
  for (let i = days.length - 1; i >= 0 && days[i]; i--) stayDays++;
  // Everything before that run: completed earlier stays and the gap since.
  const before = days.slice(0, days.length - (stayDays - 1));
  let priorStays = 0;
  let inRun = false;
  let lastRunEnd = -1;
  for (let i = 0; i < before.length; i++) {
    if (before[i] && !inRun) { priorStays++; inRun = true; }
    if (!before[i] && inRun) { inRun = false; lastRunEnd = i - 1; }
  }
  if (inRun) lastRunEnd = before.length - 1;
  const entryCount = priorStays + 1;
  const gapDays = priorStays > 0 ? before.length - 1 - lastRunEnd : 0;
  return { stayDays, entryCount, gapDays };
}

/**
 * Emit the cumulative stay tags for one region today.
 * region_day:1..N — 'N present' means "day N or later of this stay".
 * entry:first — emitted through the whole first stay (authored arrivals use
 *   it on days 1-3), entry_count:1..N for re-entries.
 * days_since_exit:1..D — the gap that preceded this stay.
 */
export function stayTags({ stayDays, entryCount, gapDays }) {
  const tags = [];
  for (let n = 1; n <= stayDays; n++) tags.push(`region_day:${n}`);
  if (entryCount === 1) tags.push('entry:first');
  for (let n = 1; n <= entryCount; n++) tags.push(`entry_count:${n}`);
  for (let n = 1; n <= gapDays; n++) tags.push(`days_since_exit:${n}`);
  return tags;
}

/**
 * Tags that hold for the whole day regardless of region: climate, ground,
 * walking phases, body/mind state.
 */
export function dayWideTags({ dateISO, variantOrder, crossedTypes, startState }) {
  const tags = new Set();

  const season = seasonTagOf(dateISO);
  if (season) tags.add(season);
  const order = variantOrder || [];
  if (order.includes('snow')) tags.add('weather:snow');
  else if (order.includes('rain')) tags.add('weather:rain');
  else tags.add('weather:clear');

  let hard = false;
  let soft = false;
  for (const t of crossedTypes || []) {
    if (GROUND_HARD_TYPES.has(t)) hard = true;
    if (GROUND_SOFT_TYPES.has(t)) soft = true;
  }
  if (hard) tags.add('ground:hard');
  if (soft) tags.add('ground:soft');

  // The day was walked: morning and afternoon both happened.
  tags.add('phase:morning');
  tags.add('phase:afternoon');

  if (startState) {
    if ((startState.energy ?? 100) < FATIGUE_ENERGY_MAX) tags.add('mind:fatigue');
    if ((startState.days_without_food ?? 0) > 0) tags.add('mind:hunger');
    if ((startState.days_without_water ?? 0) > 0) tags.add('mind:thirst');
    const band = shadowBand(startState.shadow ?? 0);
    if (band === 'shadowed' || band === 'burdened') tags.add('mind:melancholy');
  }
  return tags;
}

/** A situation is a candidate when all its tags are present, no not_tags are. */
function eligible(situation, tagSet) {
  const tags = situation.tags || [];
  const notTags = situation.not_tags || [];
  return tags.every((t) => tagSet.has(t)) && !notTags.some((t) => tagSet.has(t));
}

/**
 * How specific a gate is: the largest numeric value among its matched
 * stay-family tags. Higher means "meant for later in the stay" — on day 3
 * the day-3 beat beats the still-eligible day-1 beat.
 */
function specificity(situation) {
  let max = 0;
  for (const t of situation.tags || []) {
    const n = Number(String(t).split(':').pop());
    if (Number.isFinite(n) && n > max) max = n;
  }
  return max;
}

/** Pick the option the character's state favours; ties break on rng. */
function pickOption(options, tagSet, rng) {
  if (!Array.isArray(options) || options.length === 0) return null;
  const favoured = options.filter((o) => o.tag && tagSet.has(o.tag));
  const untagged = options.filter((o) => !o.tag);
  const candidates = favoured.length ? favoured : (untagged.length ? untagged : options);
  return candidates[Math.floor(rng() * candidates.length)];
}

/**
 * Load the trip's prior days' region lists (chronological, today excluded).
 */
async function loadRegionHistory(tripId, dayNumber) {
  const { rows } = await pool.query(
    `SELECT regions FROM trip_days
      WHERE trip_id = $1 AND day_number < $2
      ORDER BY day_number`,
    [tripId, dayNumber]
  );
  return rows.map((r) =>
    (r.regions || []).map((x) => (x && typeof x === 'object' ? x.id ?? x.name : x))
  );
}

/**
 * Resolve the day's ambient situations: region-scoped ambient records whose
 * tag gates the day's tag set satisfies. Returns narrator-facing events:
 * the chosen option's outcome text plus its mechanical effects.
 *
 * @param {Object} params
 * @param {string|number} params.tripId - trip id (region history lookup)
 * @param {number} params.dayNumber - 1-based day index
 * @param {Array<{id:number,name:string}>} params.todayRegions - regions crossed
 * @param {string} params.dateISO - day date
 * @param {string[]} params.variantOrder - output of variantOrderForDay
 * @param {string[]} params.crossedTypes - biome/altitude categories crossed
 * @param {Object} [params.startState] - character state at day start
 * @param {() => number} [params.rng]
 * @returns {Promise<Array<{record_id,situation_id,option_id,name,when,text,effects}>>}
 */
export async function resolveAmbientVoice({
  tripId,
  dayNumber,
  todayRegions,
  dateISO,
  variantOrder,
  crossedTypes,
  startState,
  rng = Math.random,
}) {
  const regionIds = (todayRegions || []).map((r) => r.id).filter((id) => id != null);
  if (regionIds.length === 0) return [];

  const history = tripId ? await loadRegionHistory(tripId, dayNumber) : [];
  const wide = dayWideTags({ dateISO, variantOrder, crossedTypes, startState });

  // Per-region tag set: day-wide tags plus that region's stay tags.
  const tagSetByRegion = new Map();
  for (const region of todayRegions || []) {
    if (region.id == null) continue;
    const stay = regionStay(history, (dayRegions) =>
      dayRegions.includes(region.id) || dayRegions.includes(region.name)
    );
    tagSetByRegion.set(region.id, new Set([...wide, ...stayTags(stay)]));
  }

  const { rows } = await pool.query(
    `SELECT id, name, region_ids, priority, interactive
       FROM places_narration
      WHERE kind = 'ambient'
        AND interactive IS NOT NULL
        AND region_ids && $1::int[]`,
    [regionIds]
  );

  // A record evaluates against the union of the tag sets of the regions it
  // is scoped to that the day actually crossed.
  const candidates = [];
  for (const record of rows) {
    const scoped = (record.region_ids || []).filter((id) => tagSetByRegion.has(id));
    if (scoped.length === 0) continue;
    const tagSet = new Set();
    for (const id of scoped) for (const t of tagSetByRegion.get(id)) tagSet.add(t);

    for (const situation of record.interactive || []) {
      if (!eligible(situation, tagSet)) continue;
      // Overnight situations belong to the rest rail, not the walking day.
      if ((situation.tags || []).includes('context:overnight')) continue;
      candidates.push({ record, situation, tagSet });
    }
  }

  // Most-specific gates win; equals rotate by rng so co-scoped voices take
  // turns across days instead of the same record always speaking first.
  const ranked = candidates
    .map((c) => ({ ...c, rank: [specificity(c.situation), c.record.priority || 0] }))
    .sort((a, b) => b.rank[0] - a.rank[0] || b.rank[1] - a.rank[1]);

  const chosen = [];
  let i = 0;
  while (chosen.length < MAX_AMBIENT_SITUATIONS && i < ranked.length) {
    let j = i;
    while (j < ranked.length && ranked[j].rank[0] === ranked[i].rank[0] && ranked[j].rank[1] === ranked[i].rank[1]) j++;
    const bucket = ranked.slice(i, j);
    while (bucket.length && chosen.length < MAX_AMBIENT_SITUATIONS) {
      chosen.push(bucket.splice(Math.floor(rng() * bucket.length), 1)[0]);
    }
    i = j;
  }

  const events = [];
  for (const { record, situation, tagSet } of chosen) {
    const option = pickOption(situation.options, tagSet, rng);
    if (!option) continue;
    const outcome = option.outcomes?.success || {};
    events.push({
      record_id: record.id,
      situation_id: situation.id ?? null,
      option_id: option.id ?? null,
      name: record.name || null,
      when: situation.when || null,
      text: outcome.text || null,
      effects: outcome.effects || null,
    });
  }
  return events;
}
