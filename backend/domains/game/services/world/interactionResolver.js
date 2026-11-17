// ============================================================================
// Interaction Resolver
// ----------------------------------------------------------------------------
// Given an entity chosen for an encounter slot, resolves:
//   - a FORM from entities_narration (kind='form')
//   - optional DIALOGUE content from entities_narration (kind='contact')
//   - optional OUTCOME from a resistance roll
// before the LLM prompt is built.
//
// entities_narration is the single voice table for beings (ADR: the facts
// live in `entities`/`mover_legs`, the voice lives here). The scope ladder —
// entity+leg > entity+region > entity > type+region > type — replaces the old
// shadow_band chain: the band axis was dropped from the source data, the mind
// carries the shadow; the world does not anticipate it.
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
//   dialogue_content: { id, topic, npc_attitude, concrete_content,
//                       tension, traveller_stance, options, commands,
//                       narration } | null,
//   decision:         { id, prompt, options } | null,  // B5: only for
//                     // before_sleep encounters on rows that author options —
//                     // the mind weighs, the host applies.
//   npc:              { name, people, gloss } | null,  // only when words
//                     // passed — nobody learns a name from tracks.
// }
// ============================================================================

import pool from '../../../../db.js';

// Weight multiplier applied to recently-used forms (anti-repetition)
const RECENT_PENALTY = 0.3;

// Intensity threshold above which stacking is suppressed in a chapter
const HIGH_INTENSITY = 3;

// Forms that should trigger dialogue selection
const DIALOGUE_FORMS = [
  'brief_exchange', 'aid_or_trade', 'confronts',
  'sign_only', 'sound_only', 'glimpsed_far',
  'observed_activity', 'watches', 'presence_felt',
  'reacts_withdraws', 'stalks', 'scenery',
  'hinders_passage', 'sudden_peril', 'harvest_shelter',
  'mistaken_for_object', 'attacks', 'drifts_closer',
];

// Resistance roll is gated until the formula is tuned.
const ENABLE_RESISTANCE_ROLL = process.env.ENABLE_RESISTANCE_ROLL === 'true';

// Fallback when no candidates exist for the entity type / danger range
const FALLBACK_INTERACTION = {
  form: 'passed_by',
  prose_hint: 'seen briefly and passed by',
  intensity: 0,
  outcome: null,
};

// The traveller's race — content written for a people carries a `race:*` tag
// (the old character_id axis, re-expressed). Clone slugs strip to the base.
const CHARACTER_RACE = { aranath: 'dunedain', celebrian: 'elf' };

// A row tagged `race:X` only speaks to a traveller of race X. Rows with no
// race tag speak to everyone. $n is the traveller's tag ('race:dunedain') or
// NULL — in which case any race tag excludes the row.
const RACE_GATE = `AND NOT EXISTS (
  SELECT 1 FROM unnest(n.tags) AS t
  WHERE t LIKE 'race:%' AND t IS DISTINCT FROM $3::text
)`;

// ---------------------------------------------------------------------------
// Caches (tables are static between restarts)
// ---------------------------------------------------------------------------

const formCache = new Map();
const contactCache = new Map();

export function clearInteractionCache() {
  formCache.clear();
}

export function clearAllEncounterCaches() {
  formCache.clear();
  contactCache.clear();
}

// ---------------------------------------------------------------------------
// Fetchers — kind='form' (the contact-shape draw)
// ---------------------------------------------------------------------------

// The entity ficha's fixed person — assigned at seed into payload.npc,
// so the same band answers with the same name on every trip. An entity
// without a ficha stays anonymous, as unwritten things should.
const npcCache = new Map();
async function fetchEntityNpc(entityId) {
  if (!entityId) return null;
  if (npcCache.has(entityId)) return npcCache.get(entityId);
  const { rows } = await pool.query(
    `SELECT payload->'npc' AS npc FROM entities_narration
       WHERE kind = 'entity' AND entity_id = $1 LIMIT 1`,
    [entityId]
  );
  const npc = rows[0]?.npc ?? null;
  npcCache.set(entityId, npc);
  return npc;
}

async function fetchForms(entityType) {
  if (formCache.has(entityType)) return formCache.get(entityType);
  const { rows } = await pool.query(
    `SELECT form, intensity, weight, min_danger, max_danger, triggers_roll,
            aspect->>'en' AS prose_hint
     FROM entities_narration
     WHERE kind = 'form' AND entity_type = $1`,
    [entityType]
  );
  formCache.set(entityType, rows);
  return rows;
}

// ---------------------------------------------------------------------------
// Contact helpers (kind='contact' — the substance of the encounter)
// ---------------------------------------------------------------------------

function stripCloneSlug(slug) {
  if (!slug) return null;
  // Clone slugs look like 'aranath-user-1' — strip the -user-\d+ suffix
  return slug.replace(/-user-\d+$/, '');
}

function raceTagFor(characterSlug) {
  const race = CHARACTER_RACE[stripCloneSlug(characterSlug)] ?? null;
  return race ? `race:${race}` : null;
}

// Score how specific a row is, preferring rows whose optional scope columns
// MATCH the encounter context (cultural family, region).  A row with a
// non-matching cultural_family scores the same as one with none at all, so
// region-specific dialogue written for one culture is never preferred when
// the encounter is in a different culture.
function specificityScore(row, culturalFamily, regionId) {
  let score = 0;
  if (row.cultural_family && row.cultural_family === culturalFamily) score++;
  if (row.region_id && Number(row.region_id) === Number(regionId)) score++;
  return score;
}

/**
 * Fetch the best contact row for an encounter, down the scope ladder:
 *   1. entity-scoped rows (entity_id, or entity_ids whitelist) — context
 *      columns score but never filter
 *   2. entity_type generic rows + context filters (truly agnostic: no
 *      entity_id/entity_ids, so prose written for one being never bleeds
 *      onto another)
 *   3. entity_type generic rows, no context filters
 * Leg-scoped contacts (mover_leg_id) stay out of the procedural ladder —
 * they belong to the living-map rail. Every step applies the race gate and
 * picks at random among equally-specific rows.
 */
async function fetchContact({
  entityId,
  entityType,
  interactionForm,
  raceTag,
  culturalFamily,
  regionId,
  rng = Math.random,
}) {
  const cacheKey = `${entityId}|${entityType}|${interactionForm}|${raceTag}|${culturalFamily}|${regionId}`;
  if (contactCache.has(cacheKey)) {
    return randomPick(contactCache.get(cacheKey), rng);
  }

  let candidates = [];

  const queryScope = async (whereEntity, useContextFilters, params) => {
    const contextFilter = useContextFilters
      ? `AND (n.cultural_family IS NULL OR n.cultural_family = $4)
         AND (n.region_id IS NULL OR n.region_id = $5)`
      : '';
    const { rows } = await pool.query(
      `SELECT n.* FROM entities_narration n
       WHERE n.kind = 'contact' AND ${whereEntity}
         AND n.form = $2
         AND n.mover_leg_id IS NULL
         ${RACE_GATE}
         ${contextFilter}`,
      params
    );
    if (rows.length === 0) return [];
    const best = Math.max(...rows.map((r) => specificityScore(r, culturalFamily, regionId)));
    return rows.filter((r) => specificityScore(r, culturalFamily, regionId) === best);
  };

  // Step 1: entity-specific (id or whitelist membership)
  if (entityId) {
    candidates = await queryScope(
      '(n.entity_id = $1 OR n.entity_ids @> ARRAY[$1]::uuid[])',
      false,
      [entityId, interactionForm, raceTag]
    );
  }

  // Step 2: entity_type generic, with context filters
  if (candidates.length === 0 && entityType) {
    candidates = await queryScope(
      `n.entity_type = $1 AND n.entity_id IS NULL AND n.entity_ids IS NULL`,
      true,
      [entityType, interactionForm, raceTag, culturalFamily, regionId]
    );
  }

  // Step 3: entity_type generic, no context filters
  if (candidates.length === 0 && entityType) {
    candidates = await queryScope(
      `n.entity_type = $1 AND n.entity_id IS NULL AND n.entity_ids IS NULL`,
      false,
      [entityType, interactionForm, raceTag]
    );
  }

  contactCache.set(cacheKey, candidates);
  return randomPick(candidates, rng);
}

/**
 * Fallback to a generic topic contact when no form-matched row exists.
 * Topic rows carry form = 'topic' and no concrete content.
 */
async function fetchGenericTopic({
  entityType,
  raceTag,
  culturalFamily,
  regionId,
  rng,
}) {
  if (!entityType) return null;

  const queryTopic = async (useContextFilters) => {
    const contextFilter = useContextFilters
      ? `AND (n.cultural_family IS NULL OR n.cultural_family = $4)
         AND (n.region_id IS NULL OR n.region_id = $5)`
      : '';
    const params = useContextFilters
      ? [entityType, 'topic', raceTag, culturalFamily, regionId]
      : [entityType, 'topic', raceTag];
    const { rows } = await pool.query(
      `SELECT n.* FROM entities_narration n
       WHERE n.kind = 'contact' AND n.entity_type = $1 AND n.form = $2
         AND n.entity_id IS NULL AND n.entity_ids IS NULL
         AND n.mover_leg_id IS NULL
         ${RACE_GATE}
         ${contextFilter}`,
      params
    );
    return rows;
  };

  let candidates = await queryTopic(true);
  if (candidates.length === 0) candidates = await queryTopic(false);

  return randomPick(candidates, rng);
}

// ---------------------------------------------------------------------------
// Contact row → dialogue_content (the shape downstream consumers already read)
// ---------------------------------------------------------------------------

// Pick one interactive situation. Situations may carry gating tags; until the
// encounter tag-set lands, only ungated situations are eligible — and if a row
// authors none, its gated situations still serve (nothing else to pick).
function pickSituation(row, rng) {
  const sits = Array.isArray(row.interactive) ? row.interactive : [];
  if (!sits.length) return null;
  const ungated = sits.filter((s) => !(s.tags || []).length);
  const pool_ = ungated.length ? ungated : sits;
  return pool_[Math.floor(rng() * pool_.length)];
}

function toDialogueContent(row, rng) {
  const sit = pickSituation(row, rng);
  return {
    id: row.id,
    topic: row.facts?.topic ?? null,
    npc_attitude: row.disposition?.en ?? null,
    concrete_content: row.presence?.en ?? null,
    tension: sit?.situation?.en ?? null,
    traveller_stance: sit?.stance?.en ?? null,
    options: sit?.options ?? null,
    commands: sit?.commands ?? null,
    // The full record rides along — variants, disposition, interactive —
    // for the shared option-selector chapter.
    narration: row,
  };
}

// ---------------------------------------------------------------------------
// Mover contacts — the living-map rail
// ---------------------------------------------------------------------------
//
// A leg contact is pre-scoped by mover_leg_id (detectMoverCrossings already
// decided the leg applies today). Here we only translate the authored record
// into the interaction shape the encounter pipeline expects:
//   crossing → the meeting text (a picked variant), form 'confronts'
//   trace    → the distance-sign (aspect),            form 'sign_only'
// The race gate applies like any contact: a race:* tag speaks only to that
// traveller; untagged speaks to everyone.
function resolveMoverContact(leg, contact, moverKind, characterSlug, rng = Math.random) {
  const raceTag = raceTagFor(characterSlug);
  const tags = contact?.contact_tags ?? contact?.tags ?? [];
  if (tags.some((t) => t.startsWith('race:') && t !== raceTag)) return null;

  const isTrace = moverKind === 'trace';
  const variants = Array.isArray(contact?.variants) ? contact.variants : [];
  const variant = isTrace ? null : randomPick(variants, rng);
  const concrete = isTrace
    ? (contact?.aspect?.en ?? null)
    : (variant?.text?.en ?? contact?.aspect?.en ?? null);

  const sit = pickSituation(contact ?? {}, rng);
  const dialogueContent = contact ? {
    id: contact.contact_id ?? contact.id,
    topic: contact.facts?.topic ?? null,
    npc_attitude: contact.disposition?.en ?? null,
    concrete_content: concrete,
    tension: sit?.situation?.en ?? null,
    traveller_stance: sit?.stance?.en ?? null,
    options: sit?.options ?? null,
    commands: sit?.commands ?? null,
    narration: contact,
  } : (concrete ? { concrete_content: concrete } : null);

  return {
    form: isTrace ? 'sign_only' : 'confronts',
    prose_hint: contact?.aspect?.en ?? null,
    intensity: leg?.hostile ? 3 : 1,
    outcome: null,
    dialogue_content: dialogueContent,
    decision: null,
  };
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
  const { characterSlug, culturalFamily, regionId, nightTiming } = options;
  const raceTag = raceTagFor(characterSlug);

  // Load all form rows for this entity type
  const rows = entityType ? await fetchForms(entityType) : [];

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

  // Dialogue selection: one unified contact from entities_narration
  let contactRow = null;
  if (DIALOGUE_FORMS.includes(chosen.form)) {
    contactRow = await fetchContact({
      entityId: entity?.id || null,
      entityType,
      interactionForm: chosen.form,
      raceTag,
      culturalFamily,
      regionId,
      rng,
    });

    if (!contactRow) {
      contactRow = await fetchGenericTopic({
        entityType,
        raceTag,
        culturalFamily,
        regionId,
        rng,
      });
    }
  }
  const dialogueContent = contactRow ? toDialogueContent(contactRow, rng) : null;

  // Words passed: the being earns its name — the one stored on its
  // ficha, not a draw. Sign-read or stayed-silent contact keeps its
  // anonymity — nobody learns a name from tracks.
  const npc = dialogueContent
    ? await fetchEntityNpc(entity?.id ?? null)
    : null;

  // Resistance roll (only when enabled, triggers_roll AND danger >= 3)
  let outcome = null;
  if (ENABLE_RESISTANCE_ROLL && chosen.triggers_roll && danger >= 3) {
    outcome = rollResistance(entity, character, rng);
  }

  // B5: an offer found at dusk is a real choice — stay or walk on —
  // when the row authors options. Mid-march sightings of the same place
  // keep the plain pass-by stance: there is nothing to decide at 10am.
  let decision = null;
  if (
    nightTiming === 'before_sleep' &&
    Array.isArray(dialogueContent?.options) &&
    dialogueContent.options.length > 0
  ) {
    decision = {
      id: `shelter-${dialogueContent.id}`,
      prompt: dialogueContent.tension ?? null,
      options: dialogueContent.options,
    };
  }

  console.log(
    `[ENCOUNTER] entity=${entity?.name} type=${entityType} danger=${danger} ` +
    `pool_size=${candidates.length} form=${chosen.form} weight=${chosen.effectiveWeight} ` +
    `topic=${dialogueContent?.topic ?? 'none'} contact=${dialogueContent ? dialogueContent.id : 'no'} ` +
    `decision=${decision ? decision.id : 'none'} outcome=${outcome ?? 'none'}`
  );

  return {
    form: chosen.form,
    prose_hint: chosen.prose_hint,
    intensity: chosen.intensity,
    outcome,
    dialogue_content: dialogueContent,
    decision,
    npc,
  };
}

export { resolveMoverContact };
