// ============================================================================
// Skill checks + interactivity gating
// ----------------------------------------------------------------------------
// A generic d10 skill roll modified by energy/shadow bands, plus a simple
// gate that decides which interactivity actions a character's skills allow
// (e.g. tracking a spoor, hunting, persuading, identifying lore). This is the
// mechanism only — wiring it into actual encounters/dialogue (replacing
// rollResistance, gating track/hunt options in interactionResolver.js) is a
// later integration step, not part of this file.
//
// Pure and testable: no DB access happens here.
// ============================================================================

import { energyBand, shadowBand } from './characterState.js';

// ---------------------------------------------------------------------------
// Roll modifiers
// ---------------------------------------------------------------------------
const ENERGY_MODIFIER = {
  fresh: 0,
  normal: 0,
  worn: -1,
  spent: -2,
};

// Shadow only clouds the mind-based skills (persuasion, lore); it doesn't
// affect physical skills (tracking, ranged, melee).
const SHADOW_AFFECTED_SKILLS = new Set(['persuasion', 'lore']);
const SHADOW_MODIFIER = {
  clear: 0,
  unease: 0,
  shadowed: -1,
  burdened: -2,
};

const DIE_SIDES = 10;

/**
 * Roll a d10 + skill vs a difficulty, modified by the character's current
 * energy/shadow bands.
 *
 * @param {Object} p
 * @param {number} p.skill - the relevant skill value (0-10)
 * @param {number} p.difficulty - target number to beat/meet
 * @param {string} [p.skillName] - one of tracking|persuasion|ranged|melee|lore,
 *   used to decide whether the shadow modifier applies (mind-based skills only)
 * @param {number} [p.energy=100] - current energy (0-100), converted to a band
 * @param {number} [p.shadow=0] - current shadow (0-100), converted to a band
 * @param {() => number} [p.rng=Math.random]
 * @returns {{ roll:number, total:number, success:boolean, margin:number }}
 */
export function rollSkillCheck({ skill = 0, difficulty = 0, skillName = null, energy = 100, shadow = 0, rng = Math.random }) {
  const roll = Math.floor(rng() * DIE_SIDES) + 1;
  const eMod = ENERGY_MODIFIER[energyBand(energy)] ?? 0;
  const sMod = skillName && SHADOW_AFFECTED_SKILLS.has(skillName)
    ? (SHADOW_MODIFIER[shadowBand(shadow)] ?? 0)
    : 0;

  const total = roll + skill + eMod + sMod;
  const margin = total - difficulty;
  return { roll, total, success: margin >= 0, margin };
}

// ---------------------------------------------------------------------------
// Interactivity gating
// ---------------------------------------------------------------------------
// Minimum skill thresholds for each gated action. Kept simple and centralised
// so thresholds are easy to tune as more actions are added.
export const ACTION_THRESHOLDS = {
  track: { skill_tracking: 3 },
  hunt: { skill_ranged: 2, skill_tracking: 4 }, // either is enough (OR)
  persuade: { skill_persuasion: 2 },
  identify_lore: { skill_lore: 3 },
};

/**
 * Determine which interactivity actions are available given a character's
 * skills and current condition. An action with multiple thresholds is
 * enabled if ANY of them is met (e.g. hunt via ranged OR tracking).
 *
 * @param {Object} p
 * @param {Object} [p.skills={}] - { skill_tracking, skill_persuasion, skill_ranged, skill_melee, skill_lore }
 * @param {Object} [p.conditions={}] - { fatigue, wounded } (reserved for future gating)
 * @param {number} [p.energy=100]
 * @param {number} [p.shadow=0]
 * @returns {Record<string, boolean>} map of action name -> available
 */
export function availableActions({ skills = {}, conditions = {}, energy = 100, shadow = 0 }) {
  const result = {};
  for (const [action, thresholds] of Object.entries(ACTION_THRESHOLDS)) {
    result[action] = Object.entries(thresholds).some(
      ([skillKey, minValue]) => (skills[skillKey] ?? 0) >= minValue
    );
  }
  return result;
}
