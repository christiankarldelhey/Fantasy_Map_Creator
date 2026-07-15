// ============================================================================
// Character state engine — energy (the body) + shadow (the spirit)
// ----------------------------------------------------------------------------
// Gives the journey persistence: each day starts from the state the previous
// day left behind. Two variables, both driven by data that already exists:
//   - energy (0–100): recovery from rest_quality, depleted by distance/combat/
//     tension/harsh weather.
//   - shadow (0–100): driven by the night's shadow_effect and each encounter's
//     shadow_weight, plus region family. Feeds back into encounter spawning.
//
// Computation here is pure and testable. DB reads/writes live in the small
// helpers at the bottom (loadCharacterState, applyDayState, recentNotes).
// ============================================================================

import pool from '../db.js';

// ---------------------------------------------------------------------------
// TUNING — all first-pass numbers live in this one block.
// ---------------------------------------------------------------------------
export const TUNING = {
  // Energy costs (subtract)
  WALK_KM_UNIT: 15,        // ~15 km ...
  WALK_COST_PER_UNIT: 2,   // ... costs 2 energy
  COMBAT_COST: 15,         // per combat encounter
  TENSION_COST: 5,         // per tension encounter
  HARSH_WEATHER_COST: 5,   // harsh weather all day

  // Energy recovery (add), indexed by rest_quality (0..3)
  REST_RECOVERY: [0, 15, 30, 45],
  QUIET_NIGHT_BONUS: 10,   // no nocturnal encounter AND calm weather
  REST_TRACK_MIN: 2,       // rest_quality >= this updates last_rest_at

  // Shadow
  SHADOW_EFFECT_MULTIPLIER: 10, // shadow_effect (-2..+2) × 10
  ENEMY_REGION_RISE: 3,         // per day passing through an enemy-family region
  QUIET_FRIENDLY_FALL: 2,       // quiet day in friendly (non-enemy) land

  // Weather thresholds ("harsh" = rain + wind sustained)
  HARSH_PRECIP_MIN: 0.1,   // precipitation > this (mm)
  HARSH_WIND_MIN: 18,      // wind_speed_10m > this

  // Temperature energy cost bands (Celsius)
  TEMPERATURE_COST: {
    cold: [
      { min: -15, max: -10, cost: 11 },
      { min: -10, max: -5, cost: 8 },
      { min: -5, max: 0, cost: 5 },
      { min: 0, max: 5, cost: 3 },
    ],
    coldExtraPer5C: 3,       // each additional 5°C below -15
    heat: [
      { min: 28, max: 32, cost: 3 },
      { min: 32, max: 36, cost: 6 },
      { min: 36, max: 40, cost: 9 },
    ],
    heatExtraPer5C: 3,       // each additional 5°C above 40
  },

  // Multiplier applied to recovery and quiet-night bonus when resting
  // outdoors in extreme temperatures. Sheltered (indoor) stays at 1.
  REST_RECOVERY_MULTIPLIER: {
    cold: [
      { min: -15, max: -10, multiplier: 0 },
      { min: -10, max: -5, multiplier: 0.1 },
      { min: -5, max: 0, multiplier: 0.25 },
      { min: 0, max: 5, multiplier: 0.5 },
    ],
    coldExtraMultiplier: 0,  // below -15
    heat: [
      { min: 28, max: 32, multiplier: 0.5 },
      { min: 32, max: 36, multiplier: 0.25 },
      { min: 36, max: 40, multiplier: 0.1 },
    ],
    heatExtraMultiplier: 0,  // above 40
  },
};

// Encounter form classification (from the interactions table)
export const COMBAT_FORMS = ['attacks'];
export const TENSION_FORMS = ['stalks', 'watches', 'drifts_closer'];

// Region cultural families that dampen the shadow→spawn loop (friendly land).
export const FRIENDLY_FAMILIES = [
  'hobbit', 'sindar', 'noldor', 'high_elven', 'gondorian',
  'rohirrim', 'arnorian', 'dunedain', 'woses',
];
// Region cultural families considered hostile (raise shadow per day).
export const ENEMY_FAMILIES = ['enemy', 'mordor', 'angmar', 'orc', 'harad', 'rhun'];

// ---------------------------------------------------------------------------
// Clamp helpers (energy: cannot exceed 100; shadow: floor at 0)
// ---------------------------------------------------------------------------
export function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Math.round(value)));
}

// ---------------------------------------------------------------------------
// Weather: pull inner climate record (handles nesting like naturalLanguage.js)
// ---------------------------------------------------------------------------
export function innerClimate(sample) {
  if (!sample) return null;
  const c = sample.climate || sample;
  return c.climate || c;
}

/**
 * Energy cost from extreme daily temperatures (negative, subtracted from energy).
 * @param {number|null} meanTemp - average temperature in Celsius
 * @returns {number}
 */
export function computeTemperatureEnergyCost(meanTemp) {
  if (!Number.isFinite(meanTemp)) return 0;

  const t = TUNING.TEMPERATURE_COST;
  if (meanTemp < 28) {
    for (const band of t.cold) {
      if (meanTemp >= band.min && meanTemp < band.max) return -band.cost;
    }
    const deepest = t.cold[0];
    const below = deepest.min - meanTemp;
    if (below > 0) {
      const extra = Math.floor(below / 5) * t.coldExtraPer5C;
      return -(deepest.cost + extra);
    }
  } else {
    for (const band of t.heat) {
      if (meanTemp >= band.min && meanTemp < band.max) return -band.cost;
    }
    const hottest = t.heat[t.heat.length - 1];
    const above = meanTemp - hottest.max;
    if (above > 0) {
      const extra = Math.floor(above / 5) * t.heatExtraPer5C;
      return -(hottest.cost + extra);
    }
  }
  return 0;
}

/**
 * Multiplier for recovery/quiet-night bonus when resting in extreme temperatures.
 * @param {number|null} meanTemp
 * @param {boolean} sheltered
 * @returns {number}
 */
export function computeRestRecoveryMultiplier(meanTemp, sheltered = false) {
  if (sheltered || !Number.isFinite(meanTemp)) return 1;

  const t = TUNING.REST_RECOVERY_MULTIPLIER;
  if (meanTemp < 28) {
    for (const band of t.cold) {
      if (meanTemp >= band.min && meanTemp < band.max) return band.multiplier;
    }
    if (meanTemp < t.cold[0].min) return t.coldExtraMultiplier;
  } else {
    for (const band of t.heat) {
      if (meanTemp >= band.min && meanTemp < band.max) return band.multiplier;
    }
    const hottest = t.heat[t.heat.length - 1];
    if (meanTemp >= hottest.max) return t.heatExtraMultiplier;
  }
  return 1;
}

/**
 * Harsh weather all day: rain AND wind sustained across every phase that has
 * a climate reading. Returns false if there is no usable climate data.
 * @param {Array<{phase:string, climate:Object}>} climateArray
 */
export function isHarshWeatherAllDay(climateArray) {
  if (!Array.isArray(climateArray) || climateArray.length === 0) return false;
  const phases = ['morning', 'afternoon', 'night'];
  for (const phase of phases) {
    const samples = climateArray
      .filter((s) => s.phase === phase)
      .map((s) => innerClimate(s))
      .filter(Boolean);
    if (samples.length === 0) return false; // no data for a phase → not "all day"
    const harsh = samples.some(
      (w) => (w.precipitation || 0) > TUNING.HARSH_PRECIP_MIN
          && (w.wind_speed_10m || 0) > TUNING.HARSH_WIND_MIN
    );
    if (!harsh) return false;
  }
  return true;
}

/**
 * Quiet night: no nocturnal encounter AND calm weather at camp overnight.
 * @param {Array} nightEncounters - encounters with phase === 'night'
 * @param {Array} nighttimeClimate - overnight climate samples
 */
export function isQuietNight(nightEncounters, nighttimeClimate) {
  if (Array.isArray(nightEncounters) && nightEncounters.length > 0) return false;
  if (!Array.isArray(nighttimeClimate) || nighttimeClimate.length === 0) return true;
  const samples = nighttimeClimate.map((s) => innerClimate(s)).filter(Boolean);
  const stormy = samples.some(
    (w) => (w.precipitation || 0) > TUNING.HARSH_PRECIP_MIN
        || (w.wind_speed_10m || 0) > TUNING.HARSH_WIND_MIN
  );
  return !stormy;
}

// ---------------------------------------------------------------------------
// Encounter helpers
// ---------------------------------------------------------------------------
function formOf(e) {
  return e?.interaction?.form || null;
}

export function countCombat(encounters) {
  return (encounters || []).filter((e) => COMBAT_FORMS.includes(formOf(e))).length;
}

export function countTension(encounters) {
  return (encounters || []).filter((e) => TENSION_FORMS.includes(formOf(e))).length;
}

/** Sum of shadow_weight across encountered entities (signed). */
export function sumShadowWeight(encounters) {
  return (encounters || []).reduce((sum, e) => {
    const w = e?.entity?.shadow_weight;
    return sum + (Number.isFinite(w) ? w : 0);
  }, 0);
}

// ---------------------------------------------------------------------------
// ENERGY delta
// ---------------------------------------------------------------------------
/**
 * @param {Object} p
 * @param {number} p.distanceKm
 * @param {Array}  p.encounters       - all encounters of the day
 * @param {number} p.restQuality      - resolved overnight rest_quality (0..3)
 * @param {boolean} p.harshWeatherAllDay
 * @param {boolean} p.quietNight
 * @returns {{ delta:number, parts:Object }}
 */
export function computeEnergyDelta({ distanceKm = 0, encounters = [], restQuality = null, harshWeatherAllDay = false, quietNight = false, meanTemperature = null, overnightLocation = null }) {
  const walk = -TUNING.WALK_COST_PER_UNIT * Math.round((distanceKm || 0) / TUNING.WALK_KM_UNIT);
  const combat = -TUNING.COMBAT_COST * countCombat(encounters);
  const tension = -TUNING.TENSION_COST * countTension(encounters);
  const weather = harshWeatherAllDay ? -TUNING.HARSH_WEATHER_COST : 0;
  const temperature = computeTemperatureEnergyCost(meanTemperature);
  const sheltered = !!overnightLocation?.indoor;
  const restMultiplier = computeRestRecoveryMultiplier(meanTemperature, sheltered);

  let recovery = 0;
  if (restQuality != null && TUNING.REST_RECOVERY[restQuality] != null) {
    recovery = TUNING.REST_RECOVERY[restQuality] * restMultiplier;
  }
  const quietBonus = quietNight ? TUNING.QUIET_NIGHT_BONUS * restMultiplier : 0;

  const delta = walk + combat + tension + weather + temperature + recovery + quietBonus;
  return { delta, parts: { walk, combat, tension, weather, temperature, recovery, quietBonus } };
}

// ---------------------------------------------------------------------------
// SHADOW delta
// ---------------------------------------------------------------------------
/**
 * @param {Object} p
 * @param {number} p.shadowEffect       - resolved overnight shadow_effect (-2..+2)
 * @param {Array}  p.encounters
 * @param {boolean} p.throughEnemyRegion
 * @param {boolean} p.quietFriendlyDay  - quiet day in friendly (non-enemy) land
 * @returns {{ delta:number, parts:Object }}
 */
export function computeShadowDelta({ shadowEffect = 0, encounters = [], throughEnemyRegion = false, quietFriendlyDay = false }) {
  const overnight = (shadowEffect || 0) * TUNING.SHADOW_EFFECT_MULTIPLIER; // signed
  const encounterSum = sumShadowWeight(encounters);                        // signed
  const enemyRegion = throughEnemyRegion ? TUNING.ENEMY_REGION_RISE : 0;
  const friendlyFall = quietFriendlyDay ? -TUNING.QUIET_FRIENDLY_FALL : 0;

  const delta = overnight + encounterSum + enemyRegion + friendlyFall;
  return { delta, parts: { overnight, encounterSum, enemyRegion, friendlyFall } };
}

// ---------------------------------------------------------------------------
// Region family classification for a day's regions
// ---------------------------------------------------------------------------
export function classifyRegionFamilies(families = []) {
  const list = (families || []).map((f) => (f || '').toLowerCase());
  const throughEnemy = list.some((f) => ENEMY_FAMILIES.includes(f));
  const anyFriendly = list.some((f) => FRIENDLY_FAMILIES.includes(f));
  return { throughEnemy, anyFriendly };
}

// ---------------------------------------------------------------------------
// Shadow → spawn factor (the loop)
// ---------------------------------------------------------------------------
export function shadowSpawnFactor(shadow) {
  if (shadow >= 75) return 1.6;
  if (shadow >= 50) return 1.4;
  if (shadow >= 25) return 1.2;
  return 1.0;
}

// Max evil encounters per day (guardrail for the loop)
export const MAX_EVIL_ENCOUNTERS_PER_DAY = 2;

// ---------------------------------------------------------------------------
// Threshold bands + condition sentences (numbers NEVER emitted)
// ---------------------------------------------------------------------------
export function energyBand(energy) {
  if (energy >= 80) return 'fresh';
  if (energy >= 50) return 'normal';
  if (energy >= 25) return 'worn';
  return 'spent';
}

export function shadowBand(shadow) {
  if (shadow >= 70) return 'burdened';
  if (shadow >= 45) return 'shadowed';
  if (shadow >= 20) return 'unease';
  return 'clear';
}

const ENERGY_SENTENCE = {
  worn: (name) => `${name} is worn down; let a heavier step, a shorter temper and a longing for shelter show in how ${name} moves.`,
  spent: (name) => `${name} is at the very limit of ${name}'s strength — stumbling, the body failing, choices driven by exhaustion.`,
};

const SHADOW_SENTENCE = {
  unease: (name) => `A faint unease has settled on ${name}: grimmer now, more watchful than before.`,
  shadowed: (name) => `A shadow has gathered on ${name}, mile by mile: quick to suspect, seeing threat where once ${name} saw beauty, slow to trust the quiet.`,
  burdened: (name) => `${name} is heavily burdened in spirit: the land itself feels malevolent, bleak, and what trust ${name} had is all but gone.`,
};

/**
 * Build a short causal note describing the day's most salient state driver.
 * Stored in character_state_log and later reused as a cross-day callback.
 * @param {Object} day - the generated day object
 * @param {Object} overnightInteraction - resolved overnight interaction
 * @returns {string|null}
 */
export function buildDayNote(day, overnightInteraction) {
  const encounters = day?.encounters || [];
  // 1. A combat encounter is the strongest driver.
  const combat = encounters.find((e) => COMBAT_FORMS.includes(formOf(e)));
  if (combat?.entity?.name) return `a fight with ${combat.entity.name}`;
  // 2. A tension encounter.
  const tension = encounters.find((e) => TENSION_FORMS.includes(formOf(e)));
  if (tension?.entity?.name) return `${tension.entity.name} shadowing the road`;
  // 3. A lightening encounter (strongest negative shadow_weight).
  const lightening = [...encounters]
    .filter((e) => Number.isFinite(e?.entity?.shadow_weight) && e.entity.shadow_weight < 0)
    .sort((a, b) => a.entity.shadow_weight - b.entity.shadow_weight)[0];
  if (lightening?.entity?.name) return `an hour in the company of ${lightening.entity.name}`;
  // 4. The resting place.
  const place = day?.overnight_location?.name;
  if (place && (overnightInteraction?.rest_quality ?? 0) >= TUNING.REST_TRACK_MIN) {
    return `a night's rest at ${place}`;
  }
  if (place) return `a night at ${place}`;
  return null;
}

/**
 * Build the TRAVELLER'S CONDITION block for the narrator prompt.
 * Returns '' when both variables sit in their "no mention" band.
 * NEVER emits numbers.
 *
 * @param {Object} p
 * @param {string} p.characterName
 * @param {number} p.energy
 * @param {number} p.shadow
 * @param {Array<string>} [p.recentNotes] - last 1–3 log notes for causal phrasing
 * @returns {string}
 */
export function buildConditionBlock({ characterName = 'The traveller', energy = 100, shadow = 0, recentNotes = [] }) {
  const eBand = energyBand(energy);
  const sBand = shadowBand(shadow);

  const energyMention = eBand === 'worn' || eBand === 'spent';
  const shadowMention = sBand !== 'clear';

  // Build rule: omit entirely when nothing crosses a threshold.
  if (!energyMention && !shadowMention) return '';

  const lines = [];
  if (energyMention) lines.push(ENERGY_SENTENCE[eBand](characterName));
  if (shadowMention) lines.push(SHADOW_SENTENCE[sBand](characterName));

  // Causal phrase from recent notes (cross-day memory for free).
  const notes = (recentNotes || []).filter(Boolean).slice(0, 3);
  let causal = '';
  if (notes.length > 0) {
    causal = ` This owes to ${notes.join('; and to ')}.`;
  }

  return `=== TRAVELLER'S CONDITION ===
${lines.join(' ')}${causal}
Let this colour the telling — how ${characterName} moves, what ${characterName} notices and longs for — but never name it as a fact or a number.

`;
}

// ---------------------------------------------------------------------------
// DB helpers
// ---------------------------------------------------------------------------

/** Read a clone's current live state. Returns null if not found. */
export async function loadCharacterState(characterId) {
  if (!characterId) return null;
  const { rows } = await pool.query(
    'SELECT id, name, energy, shadow, energy_initial, shadow_initial, last_rest_at FROM character_state WHERE id = $1',
    [characterId]
  );
  return rows[0] || null;
}

/**
 * Persist a day's new state: update the clone row and upsert a log entry.
 * @param {Object} p
 * @param {number} p.characterId
 * @param {string} p.tripId
 * @param {number} p.dayNumber
 * @param {number} p.energy      - new clamped energy
 * @param {number} p.shadow      - new clamped shadow
 * @param {string|null} p.note
 * @param {boolean} p.restedWell - update last_rest_at when true
 */
export async function applyDayState({ characterId, tripId, dayNumber, energy, shadow, note = null, restedWell = false }) {
  if (!characterId) return;
  await pool.query(
    `UPDATE character_state
       SET energy = $1, shadow = $2, updated_at = NOW()${restedWell ? ', last_rest_at = NOW()' : ''}
     WHERE id = $3`,
    [energy, shadow, characterId]
  );
  await pool.query(
    `INSERT INTO character_state_log (character_id, trip_id, day_number, energy, shadow, note)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (character_id, trip_id, day_number)
     DO UPDATE SET energy = EXCLUDED.energy, shadow = EXCLUDED.shadow, note = EXCLUDED.note, created_at = NOW()`,
    [characterId, tripId, dayNumber, energy, shadow, note]
  );
}

/** Fetch the most recent log notes for a clone/trip (newest first). */
export async function recentNotes(characterId, tripId, limit = 3) {
  if (!characterId || !tripId) return [];
  const { rows } = await pool.query(
    `SELECT note FROM character_state_log
     WHERE character_id = $1 AND trip_id = $2 AND note IS NOT NULL
     ORDER BY day_number DESC
     LIMIT $3`,
    [characterId, tripId, limit]
  );
  return rows.map((r) => r.note).filter(Boolean);
}
