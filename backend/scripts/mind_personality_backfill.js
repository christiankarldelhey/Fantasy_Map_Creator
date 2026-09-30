// ============================================================================
// Personality mold backfill (C18)
// ----------------------------------------------------------------------------
// Existing brains were provisioned before the 'celebrian'/'aranath' molds
// existed — they sit on 'default' and carry no seed beliefs. This script:
//
//   1. Reassigns each brain to the mold its character declares
//      (template slug for clones, own slug for templates).
//   2. Inserts that mold's starter beliefs as origin='seed' rows the
//      character doesn't already have (matched by statement).
//
// Idempotent — safe to re-run after adding starter beliefs to a mold.
//
//   node scripts/mind_personality_backfill.js
// ============================================================================
import pool from '../db.js';

const GAME_ID = process.env.GAME_ID || 'middle_earth';

async function run() {
  // Every character and the mold its brain should think through.
  const { rows: characters } = await pool.query(`
    SELECT c.id, COALESCE(t.slug, c.slug) AS brain_profile
    FROM character_state c
    LEFT JOIN character_state t ON t.id = c.template_id
  `);

  let reassigned = 0;
  let seeded = 0;

  for (const c of characters) {
    if (!c.brain_profile) continue;

    const mold = (
      await pool.query(
        'SELECT id, slug FROM mind.brain_molds WHERE game_id = $1 AND slug = $2',
        [GAME_ID, c.brain_profile]
      )
    ).rows[0];
    if (!mold) continue; // characters without a named mold keep 'default'

    const characterId = String(c.id);
    const brain = (
      await pool.query(
        'SELECT id, mold_slug FROM mind.brains WHERE game_id = $1 AND character_id = $2',
        [GAME_ID, characterId]
      )
    ).rows[0];
    if (!brain) continue; // no brain yet — it will seed itself on first open

    if (brain.mold_slug !== mold.slug) {
      await pool.query(
        'UPDATE mind.brains SET mold_id = $1, mold_slug = $2 WHERE id = $3',
        [mold.id, mold.slug, brain.id]
      );
      reassigned += 1;
    }

    const { rows: starters } = await pool.query(
      'SELECT kind, statement, confidence, tags, boosts FROM mind.mold_starter_beliefs WHERE mold_id = $1',
      [mold.id]
    );
    for (const sb of starters) {
      const res = await pool.query(
        `INSERT INTO mind.beliefs
           (id, game_id, character_id, kind, statement, confidence, tags,
            boosts, evidence, origin, status)
         SELECT 'bl_' || md5(random()::text || clock_timestamp()::text),
                $1::varchar, $2::varchar, $3::varchar, $4, $5, $6::jsonb, $7::jsonb,
                '[]', 'seed', 'active'
         WHERE NOT EXISTS (
           SELECT 1 FROM mind.beliefs
           WHERE game_id = $1::varchar AND character_id = $2::varchar AND statement = $4
         )`,
        [
          GAME_ID, characterId, sb.kind, sb.statement, sb.confidence,
          JSON.stringify(sb.tags || []), sb.boosts ? JSON.stringify(sb.boosts) : null,
        ]
      );
      seeded += res.rowCount;
    }
  }

  console.log(`[backfill] brains reassigned: ${reassigned}, seed beliefs inserted: ${seeded}`);
}

run()
  .catch((e) => { console.error('[backfill] failed:', e); process.exitCode = 1; })
  .finally(() => pool.end());
