// ============================================================================
// Personality preset backfill (C18)
// ----------------------------------------------------------------------------
// Existing minds were provisioned before the 'celebrian'/'aranath' presets
// existed — they sit on 'default' and carry no seed beliefs. This script:
//
//   1. Reassigns each mind to the preset its character declares
//      (template slug for clones, own slug for templates).
//   2. Inserts that preset's starter beliefs and musings as origin='seed'
//      rows the character doesn't already have (matched by statement).
//
// Idempotent — safe to re-run after adding starter rows to a preset.
//
//   node scripts/mind_personality_backfill.js
// ============================================================================
import pool from '../db.js';

const GAME_ID = process.env.GAME_ID || 'middle_earth';

async function run() {
  // Every character and the preset its mind should think through.
  const { rows: characters } = await pool.query(`
    SELECT c.id, COALESCE(t.slug, c.slug) AS preset
    FROM character_state c
    LEFT JOIN character_state t ON t.id = c.template_id
  `);

  let reassigned = 0;
  let seeded = 0;

  for (const c of characters) {
    if (!c.preset) continue;

    const preset = (
      await pool.query(
        'SELECT id, slug FROM mind.mind_presets WHERE game_id = $1 AND slug = $2',
        [GAME_ID, c.preset]
      )
    ).rows[0];
    if (!preset) continue; // characters without a named preset keep 'default'

    const characterId = String(c.id);
    const mind = (
      await pool.query(
        'SELECT id, preset_slug FROM mind.minds WHERE game_id = $1 AND character_id = $2',
        [GAME_ID, characterId]
      )
    ).rows[0];
    if (!mind) continue; // no mind yet — it will seed itself on first open

    if (mind.preset_slug !== preset.slug) {
      await pool.query(
        'UPDATE mind.minds SET preset_id = $1, preset_slug = $2 WHERE id = $3',
        [preset.id, preset.slug, mind.id]
      );
      reassigned += 1;
    }

    const { rows: starters } = await pool.query(
      'SELECT kind, statement, strength, tags, boosts FROM mind.preset_starter_beliefs WHERE preset_id = $1',
      [preset.id]
    );
    for (const sb of starters) {
      const res = await pool.query(
        `INSERT INTO mind.beliefs
           (id, game_id, character_id, kind, statement, strength, tags,
            boosts, evidence, origin, status)
         SELECT 'bl_' || md5(random()::text || clock_timestamp()::text),
                $1::varchar, $2::varchar, $3::varchar, $4, $5, $6::jsonb, $7::jsonb,
                '[]', 'seed', 'active'
         WHERE NOT EXISTS (
           SELECT 1 FROM mind.beliefs
           WHERE game_id = $1::varchar AND character_id = $2::varchar AND statement = $4
         )`,
        [
          GAME_ID, characterId, sb.kind, sb.statement, sb.strength,
          JSON.stringify(sb.tags || []), sb.boosts ? JSON.stringify(sb.boosts) : null,
        ]
      );
      seeded += res.rowCount;
    }

    const { rows: moldMusings } = await pool.query(
      'SELECT statement, tags FROM mind.preset_musings WHERE preset_id = $1',
      [preset.id]
    );
    for (const mm of moldMusings) {
      const res = await pool.query(
        `INSERT INTO mind.musings
           (id, game_id, character_id, statement, tags, origin)
         SELECT 'mu_' || md5(random()::text || clock_timestamp()::text),
                $1::varchar, $2::varchar, $3, $4::jsonb, 'seed'
         WHERE NOT EXISTS (
           SELECT 1 FROM mind.musings
           WHERE game_id = $1::varchar AND character_id = $2::varchar AND statement = $3
         )`,
        [
          GAME_ID, characterId, mm.statement,
          JSON.stringify(mm.tags || []),
        ]
      );
      seeded += res.rowCount;
    }
  }

  console.log(`[backfill] minds reassigned: ${reassigned}, seeds inserted: ${seeded}`);
}

run()
  .catch((e) => { console.error('[backfill] failed:', e); process.exitCode = 1; })
  .finally(() => pool.end());
