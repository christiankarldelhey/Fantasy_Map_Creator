import pool from '../db.js';

// ============================================================================
// Character Thoughts Service
// ----------------------------------------------------------------------------
// Manages character thoughts/phrases for narrative depth
// ============================================================================

/**
 * Roll whether a thought should be included this day (50% chance).
 * @param {() => number} rng - random number generator
 * @returns {boolean}
 */
export function rollThoughtChance(rng = Math.random) {
  return rng() < 0.5;
}

/**
 * Determine the thought type based on encounters in a phase.
 * @param {Array} encounters - array of encounter objects for a phase
 * @returns {string} - 'solitude', 'positive_encounter', 'hostile_encounter', or 'animal_encounter'
 */
export function determineThoughtTypeFromEncounters(encounters) {
  if (!encounters || encounters.length === 0) {
    return 'solitude';
  }

  // Check for hostile encounters (danger >= 2)
  const hostileEncounter = encounters.find(e => {
    const danger = e.entity?.danger;
    return danger != null && danger >= 2;
  });

  if (hostileEncounter) {
    return 'hostile_encounter';
  }

  // Check for positive encounters (danger 0-1 AND type in [elves, hobbits, humans, dwarfs])
  const positiveTypes = ['elves', 'hobbits', 'humans', 'dwarfs'];
  const positiveEncounter = encounters.find(e => {
    const danger = e.entity?.danger;
    const type = e.entity?.type;
    const dangerInRange = danger != null && danger >= 0 && danger <= 1;
    const isPositiveType = positiveTypes.includes(type);
    return dangerInRange && isPositiveType;
  });

  if (positiveEncounter) {
    return 'positive_encounter';
  }

  // Check for animal encounters (danger 0-2 AND type NOT in [elves, hobbits, humans, dwarfs])
  const animalEncounter = encounters.find(e => {
    const danger = e.entity?.danger;
    const type = e.entity?.type;
    const dangerInRange = danger != null && danger >= 0 && danger <= 2;
    const isNotPositiveType = !positiveTypes.includes(type);
    return dangerInRange && isNotPositiveType;
  });

  if (animalEncounter) {
    return 'animal_encounter';
  }

  // Default to solitude if no encounters match the criteria
  return 'solitude';
}

/**
 * Get 3 random thoughts for a character of a specific type, excluding used ones.
 * @param {number} characterId - the character's ID
 * @param {string} type - the thought type
 * @param {Array<number>} excludedIds - thought IDs to exclude
 * @returns {Promise<Array<{id: number, thought: string, thought_id: number}>>}
 */
export async function getThoughtsForCharacter(characterId, type, excludedIds = []) {
  const { rows } = await pool.query(
    `SELECT id, thought, thought_id
     FROM character_thoughts
     WHERE character_id = $1
       AND type = $2
       AND thought_id != ALL($3)
     ORDER BY RANDOM()
     LIMIT 3`,
    [characterId, type, excludedIds]
  );

  return rows;
}

/**
 * Select a random phase (morning, afternoon, or night) using 1d3.
 * @param {() => number} rng - random number generator
 * @returns {string} - 'morning', 'afternoon', or 'night'
 */
export function selectRandomPhase(rng = Math.random) {
  const roll = Math.floor(rng() * 3) + 1; // 1d3
  if (roll === 1) return 'morning';
  if (roll === 2) return 'afternoon';
  return 'night';
}
