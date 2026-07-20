// ============================================================================
// Interaction Resolver
// ----------------------------------------------------------------------------
// Given an entity chosen for an encounter slot, resolves:
//   - a FORM from the encounter_forms table
//   - optional DIALOGUE content for speaking forms
//   - optional OUTCOME from a resistance roll
// before the LLM prompt is built.
//
// Exports:
//   resolveEncounter(entity, character, recentForms, rng, chapterForms, options) -> ResolvedEncounter
//   rollResistance(entity, character, rng) -> outcome string | null
//
// ResolvedEncounter {
//   form:           string,
//   prose_hint:     string,
//   intensity:      number,
//   outcome:        string | null,
//   dialogue_content: { topic, topic_prose_hint, npc_attitude, concrete_content,
//                       tension, traveller_stance } | null,
// }
// ============================================================================

import pool from '../db.js';

// Weight multiplier applied to recently-used forms (anti-repetition)
const RECENT_PENALTY = 0.3;

// Intensity threshold above which stacking is suppressed in a chapter
const HIGH_INTENSITY = 3;

// Forms that should trigger dialogue selection
const DIALOGUE_FORMS = ['brief_exchange', 'aid_or_trade', 'confronts'];

// Resistance roll is gated until the formula is tuned.
const ENABLE_RESISTANCE_ROLL = process.env.ENABLE_RESISTANCE_ROLL === 'true';

// Fallback when no candidates exist for the entity type / danger range
const FALLBACK_INTERACTION = {
  form: 'passed_by',
  prose_hint: 'seen briefly and passed by',
  intensity: 0,
  outcome: null,
};

// ---------------------------------------------------------------------------
// Caches (tables are static between restarts)
// ---------------------------------------------------------------------------

const interactionCache = new Map();
const npcInteractionCache = new Map();

export function clearInteractionCache() {
  interactionCache.clear();
}

export function clearAllEncounterCaches() {
  interactionCache.clear();
  npcInteractionCache.clear();
}

// ---------------------------------------------------------------------------
// Fetchers
// ---------------------------------------------------------------------------

async function fetchInteractions(entityType) {
  if (interactionCache.has(entityType)) return interactionCache.get(entityType);
  const { rows } = await pool.query(
    `SELECT interaction_form AS form, intensity, weight, min_danger, max_danger, triggers_roll, prose_hint
     FROM encounter_forms
     WHERE entity_type = $1`,
    [entityType]
  );
  interactionCache.set(entityType, rows);
  return rows;
}

// ---------------------------------------------------------------------------
// NPC interaction helpers (shadow band mapping + clone slug stripping)
// ---------------------------------------------------------------------------

export function shadowBandToDbBand(band) {
  if (band === 'clear') return 'low';
  if (band === 'unease') return 'mid';
  // 'shadowed' and 'burdened' both map to 'high'
  return 'high';
}

function stripCloneSlug(slug) {
  if (!slug) return null;
  // Clone slugs look like 'aranath-user-1' — strip the -user-\d+ suffix
  return slug.replace(/-user-\d+$/, '');
}

// Relax a shadow band one step: high -> mid -> low (low has no relaxation)
function relaxBand(band) {
  if (band === 'high') return 'mid';
  if (band === 'mid') return 'low';
  return null;
}

// Score how specific a row is (more non-NULL optional columns = more specific)
function specificityScore(row) {
  let score = 0;
  if (row.character_id) score++;
  if (row.cultural_family) score++;
  if (row.region_id) score++;
  return score;
}

/**
 * Fetch the best rich npc_interactions row for an encounter, using a fallback chain:
 *   1. entity_id + interaction_form + shadow_band (with optional character/cultural/region preference)
 *   2. Relax shadow_band (high -> mid -> low)
 *   3. entity_type + interaction_form + shadow_band (with same preference)
 *   4. Relax shadow_band on entity_type match
 *   5. Return null (caller falls back to a generic topic row from npc_interactions)
 */
async function fetchNpcInteraction({
  entityId,
  entityType,
  interactionForm,
  shadowBand: dbBand,
  characterSlug,
  culturalFamily,
  regionId,
}) {
  const baseSlug = stripCloneSlug(characterSlug);
  const cacheKey = `${entityId}|${entityType}|${interactionForm}|${dbBand}|${baseSlug}|${culturalFamily}|${regionId}`;
  if (npcInteractionCache.has(cacheKey)) return npcInteractionCache.get(cacheKey);

  let result = null;

  // Helper: query by entity_id or entity_type, with band, preferring specific optional matches
  const queryByDimension = async (dimensionCol, dimensionVal, band) => {
    const { rows } = await pool.query(
      `SELECT * FROM npc_interactions
       WHERE ${dimensionCol} = $1 AND interaction_form = $2 AND shadow_band = $3
         AND (character_id IS NULL OR character_id = $4)
         AND (cultural_family IS NULL OR cultural_family = $5)
         AND (region_id IS NULL OR region_id = $6)
       ORDER BY
         (character_id IS NOT NULL) DESC,
         (cultural_family IS NOT NULL) DESC,
         (region_id IS NOT NULL) DESC
       LIMIT 1`,
      [dimensionVal, interactionForm, band, baseSlug, culturalFamily, regionId]
    );
    return rows[0] || null;
  };

  // Attempt 1: entity_id match with exact band
  if (entityId) {
    result = await queryByDimension('entity_id', entityId, dbBand);
  }

  // Attempt 2: entity_id match with relaxed band
  if (!result && entityId) {
    let band = relaxBand(dbBand);
    while (band && !result) {
      result = await queryByDimension('entity_id', entityId, band);
      band = relaxBand(band);
    }
  }

  // Attempt 3: entity_type match with exact band
  if (!result && entityType) {
    result = await queryByDimension('entity_type', entityType, dbBand);
  }

  // Attempt 4: entity_type match with relaxed band
  if (!result && entityType) {
    let band = relaxBand(dbBand);
    while (band && !result) {
      result = await queryByDimension('entity_type', entityType, band);
      band = relaxBand(band);
    }
  }

  npcInteractionCache.set(cacheKey, result);
  return result;
}

/**
 * Fallback to a generic topic row when no rich npc_interactions row exists.
 * Generic rows have interaction_form = 'topic' and no concrete content.
 */
async function fetchGenericTopic({
  entityType,
  shadowBand: dbBand,
  characterSlug,
  culturalFamily,
  regionId,
  rng,
}) {
  if (!entityType) return null;
  const baseSlug = stripCloneSlug(characterSlug);
  const candidates = [];

  const queryByBand = async (band) => {
    const { rows } = await pool.query(
      `SELECT * FROM npc_interactions
       WHERE entity_type = $1 AND interaction_form = 'topic' AND shadow_band = $2
         AND (character_id IS NULL OR character_id = $3)
         AND (cultural_family IS NULL OR cultural_family = $4)
         AND (region_id IS NULL OR region_id = $5)
       ORDER BY
         (character_id IS NOT NULL) DESC,
         (cultural_family IS NOT NULL) DESC,
         (region_id IS NOT NULL) DESC`,
      [entityType, band, baseSlug, culturalFamily, regionId]
    );
    return rows;
  };

  let band = dbBand;
  while (band && candidates.length === 0) {
    candidates.push(...(await queryByBand(band)));
    band = relaxBand(band);
  }

  return randomPick(candidates, rng);
}

// ---------------------------------------------------------------------------
// Random helpers
// ---------------------------------------------------------------------------

function weightedPick(candidates, rng) {
  const total = candidates.reduce((s, c) => s + c.effectiveWeight, 0);
  if (total <= 0) return null;
  let roll = rng() * total;
  for (const c of candidates) {
    roll -= c.effectiveWeight;
    if (roll < 0) return c;
  }
  return candidates[candidates.length - 1];
}

function randomPick(array, rng) {
  if (!array || array.length === 0) return null;
  return array[Math.floor(rng() * array.length)];
}

// ---------------------------------------------------------------------------
// Resistance roll
// ---------------------------------------------------------------------------

export function rollResistance(entity, character, rng) {
  const resistance = typeof character?.resistance === 'number' ? character.resistance : 0;
  const die = Math.floor(rng() * 20) + 1;
  const roll = die + resistance / 10;
  const threshold = 8 + (entity?.danger ?? 0) * 2;
  const margin = roll - threshold;

  if (margin >= 6) return 'unscathed';
  if (margin >= 0) return 'wounded';
  if (margin >= -5) return 'badly wounded';
  return 'slain';
}

// ---------------------------------------------------------------------------
// Main resolver
// ---------------------------------------------------------------------------

export async function resolveEncounter(
  entity,
  character,
  recentForms = [],
  rng = Math.random,
  chapterForms = [],
  options = {}
) {
  const entityType = entity?.type;
  const danger = typeof entity?.danger === 'number' ? entity.danger : 0;
  const { shadowBand: sBand, characterSlug, culturalFamily, regionId } = options;

  // Load all interaction rows for this entity type
  const rows = entityType ? await fetchInteractions(entityType) : [];

  // Filter by danger range
  const candidates = rows.filter(
    (r) => danger >= r.min_danger && danger <= r.max_danger
  );

  if (candidates.length === 0) {
    console.log(
      `[ENCOUNTER] entity=${entity?.name} type=${entityType} danger=${danger} ` +
      `pool_size=0 form=passed_by (no candidates) dialogue=none outcome=none`
    );
    return { ...FALLBACK_INTERACTION, dialogue_content: null };
  }

  const combinedRecentForms = [...recentForms, ...chapterForms];

  // Count how many high-intensity forms are already in this chapter
  const highIntensityUsed = chapterForms.filter((f) => {
    const row = rows.find((r) => r.form === f);
    return row && row.intensity >= HIGH_INTENSITY;
  }).length;

  // Apply anti-repetition and intensity-stacking weights
  const weighted = candidates.map((row) => {
    let w = row.weight;

    // Anti-repetition: penalise recently-used forms
    if (combinedRecentForms.includes(row.form)) {
      w *= RECENT_PENALTY;
    }

    // Suppress stacking of high-intensity encounters unless danger warrants it
    if (row.intensity >= HIGH_INTENSITY && highIntensityUsed >= 1 && danger < 4) {
      w = 0;
    }

    return { ...row, effectiveWeight: w };
  });

  // If suppression zeroed everything out, fall back to picking without suppression
  const validWeighted = weighted.some((c) => c.effectiveWeight > 0)
    ? weighted
    : candidates.map((row) => ({
        ...row,
        effectiveWeight: combinedRecentForms.includes(row.form) ? row.weight * RECENT_PENALTY : row.weight,
      }));

  const chosen = weightedPick(validWeighted, rng);
  if (!chosen) {
    console.log(
      `[ENCOUNTER] entity=${entity?.name} type=${entityType} danger=${danger} ` +
      `pool_size=${candidates.length} form=passed_by (pick failed) dialogue=none outcome=none`
    );
    return { ...FALLBACK_INTERACTION, dialogue_content: null };
  }

  // Dialogue selection: one unified block from npc_interactions
  let dialogueContent = null;
  if (DIALOGUE_FORMS.includes(chosen.form)) {
    const dbBand = sBand ? shadowBandToDbBand(sBand) : 'low';
    dialogueContent = await fetchNpcInteraction({
      entityId: entity?.id || null,
      entityType,
      interactionForm: chosen.form,
      shadowBand: dbBand,
      characterSlug,
      culturalFamily,
      regionId,
    });

    if (!dialogueContent) {
      dialogueContent = await fetchGenericTopic({
        entityType,
        shadowBand: dbBand,
        characterSlug,
        culturalFamily,
        regionId,
        rng,
      });
    }
  }

  // Resistance roll (only when enabled, triggers_roll AND danger >= 3)
  let outcome = null;
  if (ENABLE_RESISTANCE_ROLL && chosen.triggers_roll && danger >= 3) {
    outcome = rollResistance(entity, character, rng);
  }

  console.log(
    `[ENCOUNTER] entity=${entity?.name} type=${entityType} danger=${danger} ` +
    `pool_size=${candidates.length} form=${chosen.form} weight=${chosen.effectiveWeight} ` +
    `topic=${dialogueContent?.topic ?? 'none'} npc_interaction=${dialogueContent ? 'yes' : 'no'} outcome=${outcome ?? 'none'}`
  );

  return {
    form: chosen.form,
    prose_hint: chosen.prose_hint,
    intensity: chosen.intensity,
    outcome,
    dialogue_content: dialogueContent,
  };
}
