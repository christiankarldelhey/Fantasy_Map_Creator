// ============================================================================
// Traveller state for the narrator prompt
// ----------------------------------------------------------------------------
// Collects the mechanical state of the character (energy, shadow, gear, food,
// coins, fate) and ships it RAW. Single-owner rule (C10): no data→language
// translation lives in the host — the story-engine's NL pack renders the
// condition, equipage and end-state sections. What remains here is pure
// data gathering: the recent log notes and which gear is worth naming.
// ============================================================================

import { recentNotes } from '../../adapters/gameClient.js';

export const DEFAULT_TRAVELLER_NAME = 'The traveller';

// How many recent log notes feed the causal phrasing of the condition block.
const CONDITION_NOTES_COUNT = 3;

// Gear worth naming in the prose even when it changes nothing mechanically.
const ALWAYS_NOTABLE_SLUGS = new Set(['lorien_elven_cloak']);

/**
 * The inventory rows the narrator should be allowed to mention by name.
 * @param {Array<{rarity?:string, slug?:string, prose_singular?:string}>} inventoryRows
 * @returns {string[]} prose mentions
 */
export function notableItemsOf(inventoryRows = []) {
  return inventoryRows
    .filter((row) => row.rarity === 'rare' || ALWAYS_NOTABLE_SLUGS.has(row.slug))
    .map((row) => row.prose_singular);
}

/**
 * Collect the traveller's raw state for the narrator prompt.
 * @param {Object} params
 * @param {number} params.characterId
 * @param {number} params.tripId
 * @param {number} params.energy - energy at the END of the day (0-100)
 * @param {number} params.shadow - shadow at the END of the day (0-100)
 * @param {string} [params.wounded='none'] - persistent wound condition
 * @param {string} [params.fate] - resolved fate; anything but 'living' is terminal
 * @param {number|null} [params.meanTemperature]
 * @param {number} [params.coldShift] - aggregated cold protection from gear
 * @param {number} [params.rations]
 * @param {number} [params.daysWithoutFood]
 * @param {number} [params.daysWithoutWater]
 * @param {number} [params.waterHeld]
 * @param {number} [params.waterCapacity]
 * @param {boolean} [params.flaskFrozen]
 * @param {number} [params.coins]
 * @param {boolean} [params.turnedAway] - refused shelter at the day's end
 * @param {string[]} [params.notableItems]
 * @returns {Promise<{characterState: Object, equipmentState: Object, fate: string}>}
 */
export async function collectTravellerState({
  characterId,
  tripId,
  energy,
  shadow,
  wounded = 'none',
  fate = 'living',
  meanTemperature = null,
  coldShift = 0,
  rations = 0,
  daysWithoutFood = 0,
  daysWithoutWater = 0,
  waterHeld = 0,
  waterCapacity = 0,
  flaskFrozen = false,
  coins = 0,
  turnedAway = false,
  notableItems = [],
}) {
  const priorNotes = await recentNotes(characterId, tripId, CONDITION_NOTES_COUNT);

  return {
    characterState: { energy, shadow, wounded, recentNotes: priorNotes },
    equipmentState: {
      coldShift,
      meanTemperature,
      rations,
      daysWithoutFood,
      daysWithoutWater,
      waterHeld,
      waterCapacity,
      flaskFrozen,
      coins,
      turnedAway,
      notableItems,
    },
    fate,
  };
}
