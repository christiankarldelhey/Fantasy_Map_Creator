// ============================================================================
// Inventory engine — cold protection, hunger, lodging
// ----------------------------------------------------------------------------
// Pure functions (testable, no DB) for aggregating item effects, computing
// felt temperature, fasting costs, daily food resolution, the equipment
// prompt block, and paid lodging resolution.
//
// DB helpers (loadInventory, applyInventoryChanges, grantStartingKit,
// provisionForTrip) live at the bottom, same pattern as characterState.js.
// ============================================================================

import pool from '../db.js';
import {
  TUNING,
  FRIENDLY_FAMILIES,
} from './characterState.js';

// ---------------------------------------------------------------------------
// aggregateEffects — sum all mechanical effects from inventory rows
// ---------------------------------------------------------------------------
/**
 * @param {Array<Object>} rows - character_inventory rows joined with items.
 *   Each row: { category, qty, condition (0-3), equipped, effects: {...} }
 * @returns {{ coldShift:number, restBonus:number, rations:number, arrows:number, meleeTier:number, rangedTier:number }}
 */
export function aggregateEffects(rows = []) {
  let coldShift = 0;
  let restBonus = 0;
  let rations = 0;
  let arrows = 0;
  let meleeTier = 0;
  let rangedTier = 0;

  for (const row of rows) {
    const effects = row.effects || {};
    const conditionMult = ((row.condition ?? 3) / 3); // 0..1
    const qty = row.qty ?? 1;

    // Garments: cold_shift applies regardless of equipped (you wear your
    // cloak when it's cold). Scaled by condition.
    if (effects.cold_shift) {
      coldShift += effects.cold_shift * conditionMult;
    }

    // Tools: rest_bonus applies regardless of equipped (you use your blanket
    // when sleeping). Scaled by condition.
    if (effects.rest_bonus) {
      restBonus += effects.rest_bonus * conditionMult;
    }

    // Provisions: rations count by quantity.
    if (effects.rations) {
      rations += effects.rations * qty;
    }

    // Ammunition: count arrows.
    if (effects.ammunition === 'arrow') {
      arrows += qty;
    }

    // Weapons: only equipped weapons contribute their tier.
    if (effects.melee_tier && row.equipped) {
      meleeTier = Math.max(meleeTier, effects.melee_tier);
    }
    if (effects.ranged_tier && row.equipped) {
      rangedTier = Math.max(rangedTier, effects.ranged_tier);
    }
  }

  coldShift = Math.min(coldShift, TUNING.MAX_COLD_SHIFT);
  return { coldShift, restBonus, rations, arrows, meleeTier, rangedTier };
}

// ---------------------------------------------------------------------------
// feltTemperature — displace mean temperature by cold protection
// ---------------------------------------------------------------------------
/**
 * Below COLD_SHIFT_THRESHOLD, garments add their cold_shift to the felt
 * temperature. Above the threshold, the cloak does nothing (no penalty).
 * @param {number|null} meanTemperature
 * @param {number} coldShift - total cold shift from aggregateEffects
 * @returns {number|null}
 */
export function feltTemperature(meanTemperature, coldShift = 0) {
  if (!Number.isFinite(meanTemperature)) return meanTemperature;
  if (meanTemperature >= TUNING.COLD_SHIFT_THRESHOLD) return meanTemperature;
  return meanTemperature + coldShift;
}

// ---------------------------------------------------------------------------
// computeFastingCost — escalating energy penalty for consecutive days without food
// ---------------------------------------------------------------------------
/**
 * @param {number} daysWithoutFood - consecutive days without a ration consumed
 * @returns {number} negative energy cost (0 when not fasting)
 */
export function computeFastingCost(daysWithoutFood = 0) {
  if (!TUNING.HUNGER_ENABLED || daysWithoutFood <= 0) return 0;
  const idx = Math.min(daysWithoutFood, TUNING.FASTING_COST.length - 1);
  return TUNING.FASTING_COST[idx];
}

// ---------------------------------------------------------------------------
// resolveDailyFood — consume a ration or increment the fasting streak
// ---------------------------------------------------------------------------
/**
 * @param {Object} p
 * @param {number} p.rations - total rations available
 * @param {number} p.daysWithoutFood - current fasting streak
 * @returns {{ consumed:boolean, newDaysWithoutFood:number, rationsAfter:number }}
 */
export function resolveDailyFood({ rations = 0, daysWithoutFood = 0 }) {
  if (rations > 0) {
    return { consumed: true, newDaysWithoutFood: 0, rationsAfter: rations - 1 };
  }
  return { consumed: false, newDaysWithoutFood: daysWithoutFood + 1, rationsAfter: 0 };
}

// ---------------------------------------------------------------------------
// buildEquipmentBlock — prompt block for the narrator (NEVER emits digits)
// ---------------------------------------------------------------------------
/**
 * @param {Object} p
 * @param {number} p.coldShift
 * @param {number|null} p.meanTemperature
 * @param {number} p.rations
 * @param {number} p.daysWithoutFood
 * @param {number} p.coins
 * @param {boolean} p.turnedAway
 * @param {Array<string>} [p.notableItems] - prose mentions of remarkable gear
 * @returns {string} '' when nothing crosses a threshold
 */
export function buildEquipmentBlock({
  coldShift = 0,
  meanTemperature = null,
  rations = 0,
  daysWithoutFood = 0,
  coins = 100,
  turnedAway = false,
  notableItems = [],
}) {
  const lines = [];

  // Turned away for lack of coin — always mentioned, best narrative material.
  if (turnedAway) {
    lines.push('turned away from the door for want of coin, the traveller slept against the wall of the very town that would not have him');
  }

  // Poorly dressed in cold weather.
  if (Number.isFinite(meanTemperature) && meanTemperature < TUNING.COLD_SHIFT_THRESHOLD && coldShift < 3) {
    lines.push('poorly clad for this cold; the cloak is thin and the wind finds every gap');
  }

  // Notable items (elven cloak, named blade) — a passing mention, not a list.
  for (const item of notableItems) {
    if (item) lines.push(item);
  }

  // Low provisions.
  if (rations > 0 && rations <= 2) {
    lines.push('the satchel is nearly empty');
  }

  // Days without food — scales with severity.
  if (daysWithoutFood >= 3) {
    lines.push('no decent meal in days; hunger gnaws and weakens the arm');
  } else if (daysWithoutFood >= 1) {
    lines.push('no decent meal since yesterday; the belly is hollow');
  }

  // Low coins.
  if (coins > 0 && coins <= TUNING.LODGING_COST) {
    lines.push('few coins left in the purse, counted twice before asking for a bed');
  } else if (coins === 0) {
    lines.push('the purse is empty');
  }

  if (lines.length === 0) return '';

  return `=== EQUIPAJE ===\n${lines.join('. ')}.\nNever list objects or quantities; the equipage appears only when it hinders, is lacking, or brings comfort.\n\n`;
}

// ---------------------------------------------------------------------------
// resolveLodging — paid rest, charity shelter, or turned away
// ---------------------------------------------------------------------------
/**
 * @param {Object} p
 * @param {Object|null} p.overnightLocation - { indoor: boolean, ... }
 * @param {Object|null} p.overnightInteraction - { rest_quality, region: { cultural_family }, ... }
 * @param {number} p.coins - current coins
 * @param {number|null} p.currentEnergy - energy at start of day
 * @param {boolean} p.sanctuary - elven sanctuary (free, full rest)
 * @returns {{ paid:boolean, cost:number, coinsAfter:number, restQuality:number|null, recoveryOverride:number|null, sheltered:boolean, turnedAway:boolean }}
 */
export function resolveLodging({ overnightLocation, overnightInteraction, coins, currentEnergy, sanctuary = false }) {
  // No overnight location or not indoor → camp as today, nothing changes.
  if (!overnightLocation || !overnightLocation.indoor) {
    return { paid: false, cost: 0, coinsAfter: coins, restQuality: null, recoveryOverride: null, sheltered: false, turnedAway: false };
  }

  // Sanctuary → free, full rest (existing behaviour preserved).
  if (sanctuary) {
    return { paid: false, cost: 0, coinsAfter: coins, restQuality: null, recoveryOverride: null, sheltered: true, turnedAway: false };
  }

  // Can pay for lodging.
  if (Number.isFinite(coins) && coins >= TUNING.LODGING_COST) {
    const missing = 100 - (Number.isFinite(currentEnergy) ? currentEnergy : 0);
    const recoveryOverride = Math.round(missing * TUNING.LODGING_RECOVERY_FRACTION);
    return {
      paid: true,
      cost: TUNING.LODGING_COST,
      coinsAfter: coins - TUNING.LODGING_COST,
      restQuality: null,
      recoveryOverride,
      sheltered: true,
      turnedAway: false,
    };
  }

  // Cannot pay — check cultural family for charity.
  const family = overnightInteraction?.region?.cultural_family;
  const isFriendly = family && FRIENDLY_FAMILIES.includes(family);

  if (isFriendly) {
    return {
      paid: false,
      cost: 0,
      coinsAfter: coins,
      restQuality: TUNING.UNPAID_FRIENDLY_REST_QUALITY,
      recoveryOverride: null,
      sheltered: true,
      turnedAway: false,
    };
  }

  // Not friendly → turned away, sleep in the wild.
  return {
    paid: false,
    cost: 0,
    coinsAfter: coins,
    restQuality: null,
    recoveryOverride: null,
    sheltered: false,
    turnedAway: true,
  };
}

// ---------------------------------------------------------------------------
// DB helpers
// ---------------------------------------------------------------------------

/** Load a character's inventory rows joined with item details. */
export async function loadInventory(characterId) {
  if (!characterId) return [];
  const { rows } = await pool.query(
    `SELECT ci.id, ci.character_id, ci.item_id, ci.qty, ci.condition, ci.equipped,
            i.slug, i.name, i.category, i.prose_singular, i.prose_plural,
            i.effects, i.base_price, i.rarity
     FROM character_inventory ci
     JOIN items i ON i.id = ci.item_id
     WHERE ci.character_id = $1
     ORDER BY i.category, i.name`,
    [characterId]
  );
  return rows;
}

/**
 * Persist a day's inventory and resource changes:
 * - consume one ration (decrement or delete the first provision row)
 * - update coins and days_without_food on character_state
 * @param {Object} p
 * @param {number} p.characterId
 * @param {boolean} p.consumedRation
 * @param {number|null} p.coinsAfter
 * @param {number|null} p.daysWithoutFood
 */
export async function applyInventoryChanges({ characterId, consumedRation = false, coinsAfter = null, daysWithoutFood = null }) {
  if (!characterId) return;

  if (consumedRation) {
    const { rows } = await pool.query(
      `SELECT ci.id, ci.qty FROM character_inventory ci
       JOIN items i ON i.id = ci.item_id
       WHERE ci.character_id = $1 AND i.category = 'provision' AND ci.qty > 0
       ORDER BY ci.id
       LIMIT 1`,
      [characterId]
    );
    if (rows[0]) {
      const newQty = rows[0].qty - 1;
      if (newQty <= 0) {
        await pool.query('DELETE FROM character_inventory WHERE id = $1', [rows[0].id]);
      } else {
        await pool.query('UPDATE character_inventory SET qty = $1 WHERE id = $2', [newQty, rows[0].id]);
      }
    }
  }

  const sets = [];
  const vals = [];
  let idx = 1;

  if (Number.isFinite(coinsAfter)) {
    sets.push(`coins = $${idx++}`);
    vals.push(coinsAfter);
  }
  if (Number.isFinite(daysWithoutFood)) {
    sets.push(`days_without_food = $${idx++}`);
    vals.push(daysWithoutFood);
  }

  if (sets.length > 0) {
    vals.push(characterId);
    await pool.query(`UPDATE character_state SET ${sets.join(', ')} WHERE id = $${idx}`, vals);
  }
}

/**
 * Grant a template's starting kit to a clone.
 * @param {number} characterId - the clone's character_state.id
 * @param {number} templateId - the template character's id
 */
export async function grantStartingKit(characterId, templateId) {
  if (!characterId || !templateId) return;
  const { rows } = await pool.query(
    'SELECT item_id, qty FROM starting_kits WHERE template_id = $1',
    [templateId]
  );
  for (const row of rows) {
    await pool.query(
      `INSERT INTO character_inventory (character_id, item_id, qty, condition, equipped)
       VALUES ($1, $2, $3, 3, false)
       ON CONFLICT (character_id, item_id)
       DO UPDATE SET qty = character_inventory.qty + $3`,
      [characterId, row.item_id, row.qty]
    );
  }
}

/**
 * Refill provisions to PROVISION_TARGET_DAYS when starting a trip from a
 * settlement. Adds trail_rations to make up the difference.
 * @param {number} characterId
 * @returns {{ rationsBefore:number, rationsAdded:number }}
 */
export async function provisionForTrip(characterId) {
  if (!characterId) return { rationsBefore: 0, rationsAdded: 0 };

  const { rows: countRows } = await pool.query(
    `SELECT COALESCE(SUM(ci.qty * (i.effects->>'rations')::int), 0) AS total
     FROM character_inventory ci
     JOIN items i ON i.id = ci.item_id
     WHERE ci.character_id = $1 AND i.category = 'provision'`,
    [characterId]
  );
  const current = parseInt(countRows[0]?.total || 0, 10);
  const needed = Math.max(0, TUNING.PROVISION_TARGET_DAYS - current);
  if (needed === 0) return { rationsBefore: current, rationsAdded: 0 };

  const { rows: itemRows } = await pool.query(
    "SELECT id FROM items WHERE slug = 'trail_rations'"
  );
  const itemId = itemRows[0]?.id;
  if (!itemId) return { rationsBefore: current, rationsAdded: 0 };

  await pool.query(
    `INSERT INTO character_inventory (character_id, item_id, qty, condition, equipped)
     VALUES ($1, $2, $3, 3, false)
     ON CONFLICT (character_id, item_id)
     DO UPDATE SET qty = character_inventory.qty + $3`,
    [characterId, itemId, needed]
  );
  return { rationsBefore: current, rationsAdded: needed };
}
