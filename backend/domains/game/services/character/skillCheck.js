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

// Shadow only clouds the mind-based skills (persuasion, lore, endurance and
// the social skills insight, deception, intimidation); it doesn't affect
// physical skills (tracking, ranged, melee, stealth).
const SHADOW_AFFECTED_SKILLS = new Set([
  'persuasion', 'lore', 'endurance',
  'insight', 'deception', 'intimidation',
]);
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
 * @param {string} [p.skillName] - one of tracking|persuasion|ranged|melee|lore|stealth|endurance|insight|deception|intimidation,
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
