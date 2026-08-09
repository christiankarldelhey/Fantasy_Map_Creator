// ============================================================================
// Traveller blocks for the narrator prompt
// ----------------------------------------------------------------------------
// Turns the mechanical state of the character (energy, shadow, gear, food,
// coins, fate) into the three prompt blocks that describe their condition. Both
// the day-generation and the redo-narration endpoints build them here, so a
// re-narrated chapter always sees the same body as the original.
// ============================================================================

import {
  buildConditionBlock,
  buildEndStateBlock,
  recentNotes,
} from '../character/characterState.js';
import { buildEquipmentBlock } from '../character/inventory.js';

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
 * Build the traveller's condition, equipment and end-state blocks.
 * @param {Object} params
 * @param {number} params.characterId
 * @param {number} params.tripId
 * @param {string} [params.characterName]
 * @param {number} params.energy - energy at the END of the day
 * @param {number} params.shadow - shadow at the END of the day
 * @param {string} [params.fate] - resolved fate; anything but 'living' is terminal
 * @param {number|null} [params.meanTemperature] - mean temperature of the day
 * @param {number} [params.coldShift] - aggregated cold protection from gear
 * @param {number} [params.rations] - rations carried
 * @param {number} [params.daysWithoutFood]
 * @param {number} [params.daysWithoutWater]
 * @param {number} [params.waterHeld]
 * @param {number} [params.waterCapacity]
 * @param {boolean} [params.flaskFrozen]
 * @param {number} [params.coins]
 * @param {boolean} [params.turnedAway] - refused shelter at the day’s end
 * @param {string[]} [params.notableItems]
 * @returns {Promise<{conditionBlock: string, equipmentBlock: string, endStateBlock: string}>}
 */
export async function buildTravellerBlocks({
  characterId,
  tripId,
  characterName = DEFAULT_TRAVELLER_NAME,
  energy,
  shadow,
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
    conditionBlock: buildConditionBlock({
      characterName,
      energy,
      shadow,
      recentNotes: priorNotes,
    }),
    equipmentBlock: buildEquipmentBlock({
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
    }),
    endStateBlock: buildEndStateBlock(fate, characterName),
  };
}
