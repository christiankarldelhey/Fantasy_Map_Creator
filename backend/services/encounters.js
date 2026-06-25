// ============================================================================
// Encounter engine
// ----------------------------------------------------------------------------
// Pure, testable functions that turn entity probabilities into concrete
// encounters for each phase of the day (morning, afternoon, night).
//
// Entity probabilities (from `entities.probability_by_region`):
//   - level 1-8 per region (1 = least likely, 8 = most likely)
//   - `active`: 'day' | 'nocturnal' | 'all-day'
//
// Weights use an exponential curve: weight = BASE ^ adjustedLevel.
// Levels are adjusted +/-1 depending on phase vs activity, then the pool is
// normalized to sum 100%.
//
// Each phase (morning, afternoon, night) gets a single 55% chance roll.
// If it hits, exactly one entity is selected from the region's pool.
// ============================================================================

export const WEIGHT_BASE = 1.6;
export const PHASE_MORNING = 'morning';
export const PHASE_AFTERNOON = 'afternoon';
export const PHASE_NIGHT = 'night';
export const ENCOUNTER_CHANCE = 55; // 55% chance per phase

/**
 * Exponential weight for a probability level.
 * @param {number} level - probability level (1-8)
 * @param {number} base - exponential base
 * @returns {number}
 */
export function levelToWeight(level, base = WEIGHT_BASE) {
  return Math.pow(base, level);
}

/**
 * Adjust an entity's probability level by +/-1 depending on the phase of day
 * and the entity's activity pattern. Result is clamped to [1, 8].
 *
 * Night: nocturnal +1, day -1, all-day unchanged.
 * Morning/Afternoon: day +1, nocturnal -1, all-day unchanged.
 *
 * @param {number} level
 * @param {string} active - 'day' | 'nocturnal' | 'all-day'
 * @param {string} phase - PHASE_MORNING | PHASE_AFTERNOON | PHASE_NIGHT
 * @returns {number} adjusted level clamped to 1-8
 */
export function adjustLevelForPhase(level, active, phase) {
  let delta = 0;
  if (phase === PHASE_NIGHT) {
    if (active === 'nocturnal') delta = 1;
    else if (active === 'day') delta = -1;
  } else {
    // Morning and Afternoon: day entities are more likely, nocturnal less likely
    if (active === 'day') delta = 1;
    else if (active === 'nocturnal') delta = -1;
  }
  return Math.max(1, Math.min(8, level + delta));
}

/**
 * Build the normalized encounter pool for a region and phase.
 *
 * @param {string} regionName
 * @param {string} phase - PHASE_MORNING | PHASE_AFTERNOON | PHASE_NIGHT
 * @param {Array<Object>} entities - entity rows with `probability_by_region`
 * @param {number} base - exponential base
 * @param {Array<string>} excludedEntityIds - entity IDs to exclude from the pool
 * @returns {Array<{entity: Object, level: number, weight: number, probability: number}>}
 *          sorted by descending probability; `probability` is a percent (0-100)
 *          summing to ~100 across the pool.
 */
export function buildRegionPool(regionName, phase, entities, base = WEIGHT_BASE, excludedEntityIds = []) {
  const pool = [];

  for (const entity of entities || []) {
    // Skip if entity is in the excluded list
    if (excludedEntityIds && excludedEntityIds.includes(entity.id)) continue;

    const pbr = entity.probability_by_region || [];
    const match = pbr.find((p) => p.region === regionName);
    if (!match) continue;

    const rawLevel = Number(match.probability);
    if (!Number.isFinite(rawLevel)) continue;

    const level = adjustLevelForPhase(rawLevel, entity.active, phase);
    const weight = levelToWeight(level, base);
    pool.push({ entity, level, weight, probability: 0 });
  }

  const totalWeight = pool.reduce((sum, item) => sum + item.weight, 0);
  if (totalWeight > 0) {
    for (const item of pool) {
      item.probability = (item.weight / totalWeight) * 100;
    }
  }

  pool.sort((a, b) => b.probability - a.probability);
  return pool;
}

/**
 * Roll whether an encounter happens for a given percent chance.
 * @param {number} chance - 0-100
 * @param {() => number} rng - returns float in [0, 1)
 * @returns {boolean}
 */
export function rollEncounter(chance, rng = Math.random) {
  if (!chance || chance <= 0) return false;
  return rng() * 100 < chance;
}

/**
 * Pick a single entity from a normalized pool using a weighted roll.
 * @param {Array} pool - output of buildRegionPool
 * @param {() => number} rng
 * @returns {Object|null} the chosen entity, or null if the pool is empty
 */
export function pickFromPool(pool, rng = Math.random) {
  if (!pool || pool.length === 0) return null;

  const totalWeight = pool.reduce((sum, item) => sum + item.weight, 0);
  if (totalWeight <= 0) return null;

  let roll = rng() * totalWeight;
  for (const item of pool) {
    roll -= item.weight;
    if (roll < 0) return item.entity;
  }
  return pool[pool.length - 1].entity;
}

/**
 * Format an hour-of-day float into a HH:MM string.
 * @param {number} hourFloat
 * @returns {string}
 */
export function formatHour(hourFloat) {
  const normalized = ((hourFloat % 24) + 24) % 24;
  const h = Math.floor(normalized);
  const m = Math.round((normalized - h) * 60);
  const hh = String(h).padStart(2, '0');
  const mm = String(m).padStart(2, '0');
  return `${hh}:${mm}`;
}

/**
 * Simulate encounters for a single phase (morning, afternoon, or night).
 *
 * Each phase gets a single 55% chance roll. If it hits, exactly one entity
 * is selected from the region's pool at the midpoint of the phase.
 *
 * @param {Object} params
 * @param {number} params.startHour - clock hour the phase starts at (e.g. 7, 13, or 19)
 * @param {number} params.phaseHours - total hours of the phase (e.g. 6 or 12)
 * @param {string} params.phase - PHASE_MORNING | PHASE_AFTERNOON | PHASE_NIGHT
 * @param {(elapsedHours: number) => (Object|null)} params.getRegionInfo -
 *        returns { name, entities } for the position at `elapsedHours` into the phase, or null.
 * @param {() => number} [params.rng]
 * @param {number} [params.base]
 * @param {Array<string>} [params.excludedEntityIds] - entity IDs to exclude from encounters
 * @returns {{encounters: Array<{hour: string, hour_float: number, phase: string, region: string, entity: Object}>, usedEntityIds: Array<string>}}
 */
export function simulatePhaseEncounters({
  startHour,
  phaseHours,
  phase,
  getRegionInfo,
  rng = Math.random,
  base = WEIGHT_BASE,
  excludedEntityIds = [],
}) {
  const encounters = [];
  const usedEntityIds = [];

  // Query region at the midpoint of the phase
  const midpoint = phaseHours / 2;
  const region = getRegionInfo(midpoint);

  if (!region) {
    return { encounters, usedEntityIds };
  }

  // Always call rng() for determinism, even if we don't use the result
  if (rollEncounter(ENCOUNTER_CHANCE, rng)) {
    const pool = buildRegionPool(region.name, phase, region.entities, base, excludedEntityIds);
    const entity = pickFromPool(pool, rng);
    if (entity) {
      const hourFloat = startHour + midpoint;
      encounters.push({
        hour: formatHour(hourFloat),
        hour_float: ((hourFloat % 24) + 24) % 24,
        phase,
        region: region.name,
        entity,
      });
      // Track this entity ID for deduplication within the same day
      if (entity.id) {
        usedEntityIds.push(entity.id);
      }
    }
  }

  return { encounters, usedEntityIds };
}

/**
 * Create a small seedable PRNG (mulberry32) for deterministic simulations.
 * @param {number} seed
 * @returns {() => number}
 */
export function createSeededRng(seed = 1) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
