#!/usr/bin/env node

/**
 * Middle Earth Database Seed Loader
 *
 * Loads all seed data into the database entirely from Node.js.
 * Does NOT use PostgreSQL COPY FROM, \i, or pg_read_file — those require
 * the files to live on the DB server filesystem, which is not the case in
 * Railway or any managed Postgres environment.
 *
 * Strategy by data type:
 *   CSV  → parse in Node, INSERT via parameterized queries
 *   SQL  → read in Node, execute via pool.query (locations, roads are pure INSERTs)
 *   GeoJSON → parse in Node, INSERT with ST_GeomFromGeoJSON()
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import pg from 'pg';
import dotenv from 'dotenv';
import yaml from 'js-yaml';
import { canonicalType, typeFromName } from './physical-types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../../backend/.env') });

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const DATA_DIR = path.join(__dirname, '../data');

// ---------------------------------------------------------------------------
// CSV parser (handles quoted fields with commas and newlines)
// ---------------------------------------------------------------------------
function parseCsv(text) {
  const lines = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
      current += ch;
    } else if (ch === '\n' && !inQuotes) {
      lines.push(current.replace(/\r$/, ''));
      current = '';
    } else {
      current += ch;
    }
  }
  if (current.trim()) lines.push(current);

  const headers = splitCsvLine(lines[0]);
  return lines.slice(1).filter(l => l.trim()).map(line => {
    const values = splitCsvLine(line);
    const obj = {};
    headers.forEach((h, i) => { obj[h] = values[i] ?? null; });
    return obj;
  });
}

function splitCsvLine(line) {
  const fields = [];
  let field = '';
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQ && line[i + 1] === '"') { field += '"'; i++; }
      else inQ = !inQ;
    } else if (ch === ',' && !inQ) {
      fields.push(field);
      field = '';
    } else {
      field += ch;
    }
  }
  fields.push(field);
  return fields.map(f => {
    f = f.trim();
    if (f.startsWith('"') && f.endsWith('"')) f = f.slice(1, -1).replace(/""/g, '"');
    return f === '' ? null : f;
  });
}

function nullIfEmpty(v) {
  return (v === null || v === undefined || v === '' || v === '""') ? null : v;
}

// uuid[] whitelist — CSV holds a Postgres array literal "{a,b,c}" or
// semicolon-separated ids; empty stays NULL (= type-generic row).
function parseUuidList(v) {
  const s = nullIfEmpty(v);
  if (!s) return null;
  const inner = s.startsWith('{') && s.endsWith('}') ? s.slice(1, -1) : s;
  const ids = inner.split(/[;,]/).map((x) => x.trim()).filter(Boolean);
  return ids.length ? `{${ids.join(',')}}` : null;
}

// ---------------------------------------------------------------------------
// Seed: kingdoms
// ---------------------------------------------------------------------------
async function seedKingdoms() {
  console.log('👑 Seeding kingdoms...');
  const text = await fs.readFile(path.join(DATA_DIR, 'csv/kingdoms.csv'), 'utf8');
  const rows = parseCsv(text);
  for (const r of rows) {
    await pool.query(
      `INSERT INTO kingdoms (id, name, description, created_at)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name,
         description = EXCLUDED.description`,
      [parseInt(r.id), r.name, nullIfEmpty(r.description), nullIfEmpty(r.created_at) ?? new Date()]
    );
  }
  const { rows: [{ count }] } = await pool.query('SELECT COUNT(*) AS count FROM kingdoms');
  console.log(`✅ kingdoms: ${count} rows`);
}

// ---------------------------------------------------------------------------
// Seed: climate_zones
// ---------------------------------------------------------------------------
async function seedClimateZones() {
  console.log('🌡️  Seeding climate_zones...');
  const text = await fs.readFile(path.join(DATA_DIR, 'csv/climate_zones.csv'), 'utf8');
  const rows = parseCsv(text);
  for (const r of rows) {
    await pool.query(
      `INSERT INTO climate_zones (id, "desc", temperature, precipitation, koppen, analog_location, analog_lat, analog_lon, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (id) DO UPDATE SET
         "desc" = EXCLUDED."desc",
         temperature = EXCLUDED.temperature,
         precipitation = EXCLUDED.precipitation,
         koppen = EXCLUDED.koppen,
         analog_location = EXCLUDED.analog_location,
         analog_lat = EXCLUDED.analog_lat,
         analog_lon = EXCLUDED.analog_lon`,
      [
        parseInt(r.id),
        nullIfEmpty(r.desc),
        nullIfEmpty(r.temperature),
        nullIfEmpty(r.precipitation),
        nullIfEmpty(r.koppen),
        nullIfEmpty(r.analog_location),
        nullIfEmpty(r.analog_lat) !== null ? parseFloat(r.analog_lat) : null,
        nullIfEmpty(r.analog_lon) !== null ? parseFloat(r.analog_lon) : null,
        nullIfEmpty(r.created_at) ?? new Date(),
      ]
    );
  }
  const { rows: [{ count }] } = await pool.query('SELECT COUNT(*) AS count FROM climate_zones');
  console.log(`✅ climate_zones: ${count} rows`);
}

// ---------------------------------------------------------------------------
// Seed: npc_interactions
// ---------------------------------------------------------------------------
async function seedNpcInteractions() {
  console.log('🎭 Seeding npc_interactions...');
  const text = await fs.readFile(path.join(DATA_DIR, 'csv/npc_interactions.csv'), 'utf8');
  const rows = parseCsv(text);
  for (const r of rows) {
    await pool.query(
      `INSERT INTO npc_interactions (id, entity_id, entity_type, interaction_form, shadow_band,
         character_id, cultural_family, region_id, npc_attitude, concrete_content,
         tension, traveller_stance, topic, topic_prose_hint, options, entity_ids, commands)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15::jsonb, $16::uuid[], $17::jsonb)
       ON CONFLICT (id) DO UPDATE SET
         entity_id        = EXCLUDED.entity_id,
         entity_type      = EXCLUDED.entity_type,
         interaction_form = EXCLUDED.interaction_form,
         shadow_band      = EXCLUDED.shadow_band,
         character_id     = EXCLUDED.character_id,
         cultural_family  = EXCLUDED.cultural_family,
         region_id        = EXCLUDED.region_id,
         npc_attitude     = EXCLUDED.npc_attitude,
         concrete_content = EXCLUDED.concrete_content,
         tension          = EXCLUDED.tension,
         traveller_stance = EXCLUDED.traveller_stance,
         topic            = EXCLUDED.topic,
         topic_prose_hint = EXCLUDED.topic_prose_hint,
         options          = EXCLUDED.options,
         entity_ids       = EXCLUDED.entity_ids,
         commands         = EXCLUDED.commands`,
      [
        nullIfEmpty(r.id),
        nullIfEmpty(r.entity_id),
        r.entity_type,
        r.interaction_form,
        r.shadow_band,
        nullIfEmpty(r.character_id),
        nullIfEmpty(r.cultural_family),
        nullIfEmpty(r.region_id),
        nullIfEmpty(r.npc_attitude),
        nullIfEmpty(r.concrete_content),
        nullIfEmpty(r.tension),
        nullIfEmpty(r.traveller_stance),
        nullIfEmpty(r.topic),
        nullIfEmpty(r.topic_prose_hint),
        nullIfEmpty(r.options),
        parseUuidList(r.entity_ids),
        nullIfEmpty(r.commands),
      ]
    );
  }
  const { rows: [{ count }] } = await pool.query('SELECT COUNT(*) AS count FROM npc_interactions');
  console.log(`✅ npc_interactions: ${count} rows`);
}

// ---------------------------------------------------------------------------
// Seed: encounter_forms
// ---------------------------------------------------------------------------
async function seedEncounterForms() {
  console.log('🎲 Seeding encounter_forms...');
  const text = await fs.readFile(path.join(DATA_DIR, 'csv/encounter_forms.csv'), 'utf8');
  const rows = parseCsv(text);
  for (const r of rows) {
    await pool.query(
      `INSERT INTO encounter_forms (
         id, entity_type, interaction_form, intensity, weight,
         min_danger, max_danger, triggers_roll, prose_hint
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (id) DO UPDATE SET
         entity_type = EXCLUDED.entity_type,
         interaction_form = EXCLUDED.interaction_form,
         intensity = EXCLUDED.intensity,
         weight = EXCLUDED.weight,
         min_danger = EXCLUDED.min_danger,
         max_danger = EXCLUDED.max_danger,
         triggers_roll = EXCLUDED.triggers_roll,
         prose_hint = EXCLUDED.prose_hint`,
      [
        r.id,
        r.entity_type,
        r.interaction_form,
        parseInt(r.intensity, 10),
        parseInt(r.weight, 10),
        parseInt(r.min_danger, 10),
        parseInt(r.max_danger, 10),
        r.triggers_roll.toLowerCase() === 'true',
        r.prose_hint,
      ]
    );
  }
  const { rows: [{ count }] } = await pool.query('SELECT COUNT(*) AS count FROM encounter_forms');
  console.log(`✅ encounter_forms: ${count} rows`);
}

// ---------------------------------------------------------------------------
// Seed: entities
// ---------------------------------------------------------------------------
async function seedEntities() {
  console.log('🐉 Seeding entities...');
  const text = await fs.readFile(path.join(DATA_DIR, 'csv/entities.csv'), 'utf8');
  const rows = parseCsv(text);
  let inserted = 0;
  let skipped = 0;
  for (const r of rows) {
    const id = nullIfEmpty(r.id);
    if (!id) { skipped++; continue; }
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) { skipped++; continue; }

    const parentId = nullIfEmpty(r.parent_id);
    const validParent = parentId && uuidRegex.test(parentId) ? parentId : null;

    let biomesArray = null;
    const rawBiomes = nullIfEmpty(r.biomes);
    if (rawBiomes) {
      try {
        const cleaned = rawBiomes.replace(/^{|}$/g, '').split(',').map(b => b.trim().replace(/^"|"$/g, '')).filter(Boolean);
        biomesArray = cleaned.length > 0 ? cleaned : null;
      } catch { biomesArray = null; }
    }

    const shadowWeight = nullIfEmpty(r.shadow_weight) !== null ? parseInt(r.shadow_weight, 10) : 0;

    const NPC_TYPES = ['humans', 'elves', 'dwarves', 'hobbits', 'orcs', 'maiar', 'living_trees', 'undead', 'drakes'];
    const isNpc = r.is_npc !== undefined && r.is_npc !== null && r.is_npc !== ''
      ? r.is_npc === 'true' || r.is_npc === 't'
      : NPC_TYPES.includes(r.type);

    // Optional columns: region_ids ({1,2,3}), probability_by_region (JSON), danger (int).
    // On conflict, COALESCE keeps existing values when the CSV leaves them empty.
    let regionIds = null;
    const rawRegionIds = nullIfEmpty(r.region_ids);
    if (rawRegionIds) {
      const cleaned = rawRegionIds.replace(/^{|}$/g, '').split(',').map(v => parseInt(v.trim(), 10)).filter(Number.isFinite);
      regionIds = cleaned.length > 0 ? cleaned : null;
    }
    let probByRegion = null;
    const rawProb = nullIfEmpty(r.probability_by_region);
    if (rawProb) {
      try { probByRegion = JSON.parse(rawProb); } catch { probByRegion = null; }
    }
    const danger = nullIfEmpty(r.danger) !== null ? parseInt(r.danger, 10) : null;

    try {
      await pool.query(
        `INSERT INTO entities (id, name, slug, type, active, tier, parent_id, description, description_summary, url_path, biomes, shadow_weight, is_npc, created_at, region_ids, probability_by_region, danger)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
         ON CONFLICT (id) DO UPDATE SET
           name = EXCLUDED.name,
           slug = EXCLUDED.slug,
           type = EXCLUDED.type,
           active = EXCLUDED.active,
           tier = EXCLUDED.tier,
           parent_id = EXCLUDED.parent_id,
           description = EXCLUDED.description,
           description_summary = EXCLUDED.description_summary,
           url_path = EXCLUDED.url_path,
           biomes = EXCLUDED.biomes,
           shadow_weight = EXCLUDED.shadow_weight,
           is_npc = EXCLUDED.is_npc,
           region_ids = COALESCE(EXCLUDED.region_ids, entities.region_ids),
           probability_by_region = COALESCE(EXCLUDED.probability_by_region, entities.probability_by_region),
           danger = COALESCE(EXCLUDED.danger, entities.danger)`,
        [
          id,
          r.name,
          r.slug,
          r.type,
          nullIfEmpty(r.active) ?? 'all-day',
          nullIfEmpty(r.tier),
          validParent,
          nullIfEmpty(r.description),
          nullIfEmpty(r.description_summary),
          nullIfEmpty(r.url_path),
          biomesArray,
          Number.isFinite(shadowWeight) ? shadowWeight : 0,
          isNpc,
          nullIfEmpty(r.created_at) ?? new Date(),
          regionIds,
          probByRegion ? JSON.stringify(probByRegion) : null,
          Number.isFinite(danger) ? danger : null,
        ]
      );
      inserted++;
    } catch (err) {
      skipped++;
    }
  }
  const { rows: [{ count }] } = await pool.query('SELECT COUNT(*) AS count FROM entities');
  console.log(`✅ entities: ${count} rows (inserted/updated: ${inserted}, skipped: ${skipped})`);
}

// ---------------------------------------------------------------------------
// Backfill: entities.family (migration: add_family_to_entities.sql)
// Runs after seedEntities so every deploy (and a fresh DB) ends classified:
//   1. races inherit their parent's slug as family (noldor, common_orcs...);
//   2. flat groups — animals, monsters, no parent — get a declared family
//      (foxes inside carnivores, wargs kept apart from plain wolves).
// The declared map is the source of truth for those slugs and re-asserts;
// the parent fill only touches family IS NULL so hand-tuned rows keep theirs.
// ---------------------------------------------------------------------------
const DECLARED_FAMILIES = [
  ['foxes', 'foxes'], ['red_foxes_of_calenardhon', 'foxes'], ['white_foxes', 'foxes'],
  ['wolves', 'wolves'], ['grey_wolves', 'wolves'], ['red_wolves', 'wolves'],
  ['white_wolves', 'wolves'], ['dire_wolves', 'wolves'],
  ['warg_pack', 'wargs'], ['war_wolves', 'wargs'], ['werewolves', 'wargs'],
  ['hounds', 'dogs'], ['sheep_hounds', 'dogs'], ['wild_dogs', 'dogs'],
  ['dunmen_s_dogs', 'dogs'],
  ['eagle', 'eagles'], ['great_eagles', 'eagles'], ['golden_eagle', 'eagles'],
  ['sea_eagles', 'eagles'], ['red_eagles', 'eagles'], ['vereut_eagles', 'eagles'],
  ['crows', 'crows'], ['crebain', 'crows'], ['gorcrows', 'crows'],
  ['green_winged_crows', 'crows'],
  ['owls', 'owls'], ['barrow_owls', 'owls'], ['short_eared_owls', 'owls'],
  ['bats', 'bats'], ['great_bats', 'bats'], ['giant_vampire_bat', 'bats'],
  ['hunting_bats', 'bats'], ['pond_bats', 'bats'], ['flying_foxes', 'bats'],
  ['black_swans', 'swans'], ['pied_swans', 'swans'],
  ['birds', 'birds'], ['chamber_birds', 'birds'], ['waterfowl', 'birds'],
  ['woodland_birds_of_rhosgobel', 'birds'],
  ['deer', 'deer'], ['dappled_deer', 'deer'], ['elk', 'deer'], ['great_elk', 'deer'],
  ['elven_horses', 'horses'], ['horses_of_mordor', 'horses'],
  ['horses_of_rohan', 'horses'], ['wild_horses', 'horses'], ['horse_herds', 'horses'],
  ['goats', 'goats'], ['wild_goats', 'goats'], ['mountain_goat', 'goats'],
  ['sheep', 'sheep'], ['sheep_pastures', 'sheep'],
  ['cattle_herds', 'cattle'], ['mordor_cattle', 'cattle'],
  ['boars', 'boars'], ['fen_boars', 'boars'],
  ['bears', 'bears'], ['black_bears', 'bears'], ['blue_bears', 'bears'],
  ['cave_bears', 'bears'], ['north_bears', 'bears'], ['sloth_bear', 'bears'],
  ['cats', 'cats'], ['fishing_cats', 'cats'], ['grass_cats', 'cats'], ['cathfiar', 'cats'],
  ['mammals_otters_minks_rodents', 'small_mammals'],
  ['spiders', 'spiders'], ['giant_spiders', 'spiders'], ['king_spiders', 'spiders'],
  ['trolls', 'trolls'], ['cave-trolls', 'trolls'], ['forest_trolls', 'trolls'],
  ['half-trolls', 'trolls'], ['hill_troll', 'trolls'], ['snow_troll', 'trolls'],
  ['stone-trolls', 'trolls'], ['tereg_trolls_of_dol_guldur', 'trolls'],
  ['young_trolls', 'trolls'],
  ['dragons', 'dragons'], ['greater_dragon', 'dragons'], ['lesser_dragon', 'dragons'],
  ['balrogs', 'demons'],
  ['undead', 'undead'], ['barrow_wights', 'undead'], ['ghosts', 'undead'],
  ['great_serpent', 'serpents'],
  ['ancient_mountain_pines_of_rhudaur', 'trees'],
];

async function backfillEntityFamilies() {
  // Children inherit the parent's kind: elves_of_rivendell -> noldor,
  // huorn -> ents, orc_patrol -> common_orcs.
  const parents = await pool.query(`
    UPDATE entities child
    SET family = parent.slug
    FROM entities parent
    WHERE child.parent_id = parent.id
      AND child.family IS NULL
  `);
  const declared = await pool.query(
    `UPDATE entities e SET family = m.family
     FROM (SELECT * FROM unnest($1::text[], $2::text[])) AS m(slug, family)
     WHERE e.slug = m.slug`,
    [
      DECLARED_FAMILIES.map(([slug]) => slug),
      DECLARED_FAMILIES.map(([, family]) => family),
    ]
  );
  console.log(`✅ entities family: ${parents.rowCount} inherited from parent, ${declared.rowCount} declared`);
}

// ---------------------------------------------------------------------------
// Seed: locations & roads (pure SQL INSERT files — safe to run via pool.query)
// Uses ON CONFLICT (id) DO UPDATE to avoid TRUNCATE CASCADE, which would wipe
// dependent tables like places_interactions and trip_days on every deploy.
// For tables with no dependent data (e.g. roads), a plain TRUNCATE + INSERT is
// still used for efficiency.
// ---------------------------------------------------------------------------
async function seedFromSqlFile(label, filePath) {
  console.log(`🗺️  Seeding ${label}...`);
  const table = label.split(' ')[0];
  let sql = await fs.readFile(filePath, 'utf8');

  // Tables that are safe to TRUNCATE (no dependent data via FK CASCADE)
  const safeToTruncate = new Set(['roads']);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    if (safeToTruncate.has(table)) {
      await client.query(`TRUNCATE TABLE ${table} RESTART IDENTITY CASCADE`);
      await client.query(sql);
    } else {
      // Transform INSERT INTO ... VALUES (...) into upserts.
      // Each INSERT line gets ON CONFLICT (id) DO UPDATE SET <cols> = EXCLUDED.<cols>
      sql = transformToUpsert(sql, table);
      await client.query(sql);
      // Explicit-id upserts never advance the serial sequence: re-sync it or
      // runtime INSERTs (e.g. georef POST /locations) hit duplicate pkeys.
      await client.query(
        `SELECT setval(pg_get_serial_sequence($1, 'id'), COALESCE(MAX(id), 1))
         FROM ${table}
         WHERE pg_get_serial_sequence($1, 'id') IS NOT NULL`,
        [`public.${table}`]
      );
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
  const { rows: [{ count }] } = await pool.query(`SELECT COUNT(*) AS count FROM ${table}`);
  console.log(`✅ ${label}: ${count} rows`);
}

/**
 * Transforms a file of `INSERT INTO <table> (...) VALUES (...);` statements
 * into `INSERT INTO <table> (...) VALUES (...) ON CONFLICT (id) DO UPDATE SET
 * col1 = EXCLUDED.col1, col2 = EXCLUDED.col2, ...;` statements.
 *
 * Only operates on lines that start with `INSERT INTO` (case-insensitive).
 * Other lines (comments, blanks) are passed through unchanged.
 */
function transformToUpsert(sql, table) {
  const lines = sql.split('\n');
  const out = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!/^INSERT INTO /i.test(trimmed)) {
      out.push(line);
      continue;
    }
    // Extract column list between the first ( and the first ) VALUES
    const openParen = line.indexOf('(');
    const closeParen = line.indexOf(')', openParen);
    if (openParen === -1 || closeParen === -1) {
      out.push(line);
      continue;
    }
    const colList = line.slice(openParen + 1, closeParen);
    const cols = colList.split(',').map(c => c.trim().replace(/`/g, ''));
    const setClause = cols
      .map(c => `${c} = EXCLUDED.${c}`)
      .join(', ');
    // Insert ON CONFLICT clause before the final semicolon
    const stmt = line.replace(/;$/, ` ON CONFLICT (id) DO UPDATE SET ${setClause};`);
    out.push(stmt);
  }
  return out.join('\n');
}

// ---------------------------------------------------------------------------
// Seed: GeoJSON tables (regions, biomes, water)
// ---------------------------------------------------------------------------
async function seedGeoJson({ label, file, table, getParams }) {
  console.log(`🌍 Seeding ${label}...`);
  const text = await fs.readFile(file, 'utf8');
  const geojson = JSON.parse(text);
  let inserted = 0;
  let skipped = 0;
  for (const feature of geojson.features) {
    try {
      const { sql, params } = getParams(feature);
      await pool.query(sql, params);
      inserted++;
    } catch (err) {
      skipped++;
    }
  }
  const { rows: [{ count }] } = await pool.query(`SELECT COUNT(*) AS count FROM ${table} WHERE geom IS NOT NULL`);
  console.log(`✅ ${label}: ${count} rows (processed: ${inserted}, skipped: ${skipped})`);
}

// ---------------------------------------------------------------------------
// Seed: region_biome_descriptions
// ---------------------------------------------------------------------------
async function seedRegionBiomeDescriptions() {
  console.log('🏔️  Seeding region_biome_descriptions...');
  
  const COLUMN_TO_CATEGORY = {
    forest: 'forest',
    hill: 'hills',
    marshes: 'marsh',
    plains: 'plain',
    mountains_low: 'mountains_low',
    mountains_med: 'mountains_med',
    mountains_high: 'mountains_high',
    road: 'road',
    trail: 'trail',
  };

  function splitPhrases(text) {
    if (!text || !text.trim()) return [];
    return text
      .split(/(?<=[.!?])\s+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  }

  const text = await fs.readFile(path.join(DATA_DIR, 'csv/region_biome_descriptions.csv'), 'utf8');
  const rows = parseCsv(text);

  const { rows: [col] } = await pool.query(
    `SELECT COUNT(*) AS n FROM information_schema.columns
     WHERE table_name = 'region_biome_descriptions' AND column_name = 'variant'`
  );
  const variantColumnExists = Number(col.n) > 0;

  let inserted = 0;
  let skipped = 0;

  for (const row of rows) {
    const regionName = row.region_name || row.region || '';
    if (!regionName) {
      skipped++;
      continue;
    }

    for (const [csvColumn, category] of Object.entries(COLUMN_TO_CATEGORY)) {
      const rawText = row[csvColumn];
      const phrases = splitPhrases(rawText);
      if (phrases.length === 0) continue;

      try {
        // Probe once per call: pre-migration DBs have a 2-col unique key,
        // post-migration have (region_name, category, variant).
        await pool.query(
          variantColumnExists
            ? `INSERT INTO region_biome_descriptions (region_name, category, variant, phrases)
               VALUES ($1, $2, 'base', $3)
               ON CONFLICT (region_name, category, variant) DO UPDATE
                 SET phrases = EXCLUDED.phrases, updated_at = NOW()`
            : `INSERT INTO region_biome_descriptions (region_name, category, phrases)
               VALUES ($1, $2, $3)
               ON CONFLICT (region_name, category) DO UPDATE
                 SET phrases = EXCLUDED.phrases, updated_at = NOW()`,
          [regionName, category, phrases]
        );
        inserted++;
      } catch (err) {
        skipped++;
      }
    }
  }

  const { rows: [{ count }] } = await pool.query('SELECT COUNT(*) AS count FROM region_biome_descriptions');
  console.log(`✅ region_biome_descriptions: ${count} rows (inserted/updated: ${inserted}, skipped: ${skipped})`);
}

// ---------------------------------------------------------------------------
// Seed: region_biome_descriptions variants (season/weather-conditioned phrases)
// Long-format CSV: region_name, category, variant, text
// Degrades silently when the `variant` column does not exist yet (prod DB
// before the migration runs).
// ---------------------------------------------------------------------------
async function seedRegionBiomeVariants() {
  const file = path.join(DATA_DIR, 'csv/region_biome_variants.csv');
  let text;
  try {
    text = await fs.readFile(file, 'utf8');
  } catch {
    return; // no variants file — nothing to do
  }

  const { rows: [col] } = await pool.query(
    `SELECT COUNT(*) AS n FROM information_schema.columns
     WHERE table_name = 'region_biome_descriptions' AND column_name = 'variant'`
  );
  if (Number(col.n) === 0) {
    console.warn('⚠️ region_biome_descriptions.variant missing; skipping biome variants (run the migration first).');
    return;
  }

  console.log('🏔️  Seeding region_biome_descriptions variants...');
  const rows = parseCsv(text);
  let inserted = 0;
  let skipped = 0;

  for (const row of rows) {
    const regionName = (row.region_name || '').trim();
    const category = (row.category || '').trim();
    const variant = (row.variant || '').trim();
    const phrases = splitVariantPhrases(row.text);
    if (!regionName || !category || !variant || phrases.length === 0) {
      skipped++;
      continue;
    }
    try {
      await pool.query(
        `INSERT INTO region_biome_descriptions (region_name, category, variant, phrases)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (region_name, category, variant) DO UPDATE
           SET phrases = EXCLUDED.phrases, updated_at = NOW()`,
        [regionName, category, variant, phrases]
      );
      inserted++;
    } catch {
      skipped++;
    }
  }
  console.log(`✅ region_biome_descriptions variants: ${inserted} rows (skipped: ${skipped})`);
}

function splitVariantPhrases(text) {
  if (!text || !text.trim()) return [];
  return text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

// ---------------------------------------------------------------------------
// Seed: region_seasonal_descriptions (variants of regions.description_summary)
// Long-format CSV: region_name, variant, text
// ---------------------------------------------------------------------------
async function seedRegionSeasonalDescriptions() {
  const file = path.join(DATA_DIR, 'csv/region_seasonal_descriptions.csv');
  let text;
  try {
    text = await fs.readFile(file, 'utf8');
  } catch {
    return;
  }

  const { rows: [t] } = await pool.query(`SELECT to_regclass('region_seasonal_descriptions') AS t`);
  if (!t.t) {
    console.warn('⚠️ region_seasonal_descriptions table missing; skipping (run the migration first).');
    return;
  }

  console.log('🍂 Seeding region_seasonal_descriptions...');
  const rows = parseCsv(text);
  let inserted = 0;
  let skipped = 0;

  for (const row of rows) {
    const regionName = (row.region_name || '').trim();
    const variant = (row.variant || '').trim();
    const phrases = splitVariantPhrases(row.text);
    if (!regionName || !variant || phrases.length === 0) {
      skipped++;
      continue;
    }
    try {
      await pool.query(
        `INSERT INTO region_seasonal_descriptions (region_name, variant, phrases)
         VALUES ($1, $2, $3)
         ON CONFLICT (region_name, variant) DO UPDATE
           SET phrases = EXCLUDED.phrases, updated_at = NOW()`,
        [regionName, variant, phrases]
      );
      inserted++;
    } catch {
      skipped++;
    }
  }
  console.log(`✅ region_seasonal_descriptions: ${inserted} rows (skipped: ${skipped})`);
}

// ---------------------------------------------------------------------------
// Seed: places_interactions
// ---------------------------------------------------------------------------
async function seedPlacesInteractions() {
  console.log('🏘️ Seeding places_interactions...');
  const text = await fs.readFile(path.join(DATA_DIR, 'csv/places_interactions.csv'), 'utf8');
  const rows = parseCsv(text);

  let inserted = 0;
  let updated = 0;
  let skipped = 0;

  for (const r of rows) {
    if (!r.interaction_type) { skipped++; continue; }

    const locationId = nullIfEmpty(r.location_id) !== null ? parseInt(r.location_id, 10) : null;
    const regionId = nullIfEmpty(r.region_id) !== null ? parseInt(r.region_id, 10) : null;
    const restQuality = nullIfEmpty(r.rest_quality) !== null ? parseInt(r.rest_quality, 10) : null;
    const shadowEffect = nullIfEmpty(r.shadow_effect) !== null ? parseInt(r.shadow_effect, 10) : null;
    const priority = nullIfEmpty(r.priority) !== null ? parseInt(r.priority, 10) : 0;

    const fields = {
      interaction_type: r.interaction_type,
      location_id: locationId,
      location_type: nullIfEmpty(r.location_type),
      region_id: regionId,
      cultural_family: nullIfEmpty(r.cultural_family),
      title: nullIfEmpty(r.title),
      description: r.description || '',
      rest_quality: restQuality,
      shadow_effect: shadowEffect,
      priority,
    };

    try {
      const existing = await pool.query(
        `SELECT id FROM places_interactions
         WHERE interaction_type = $1
           AND COALESCE(location_id, 0) = COALESCE($2::int, 0)
           AND COALESCE(location_type, '') = COALESCE($3, '')
           AND COALESCE(region_id, 0) = COALESCE($4::int, 0)
           AND COALESCE(cultural_family, '') = COALESCE($5, '')`,
        [fields.interaction_type, fields.location_id, fields.location_type, fields.region_id, fields.cultural_family]
      );

      if (existing.rows.length > 0) {
        await pool.query(
          `UPDATE places_interactions
           SET title = $2, description = $3, rest_quality = $4, shadow_effect = $5, priority = $6
           WHERE id = $1`,
          [existing.rows[0].id, fields.title, fields.description, fields.rest_quality, fields.shadow_effect, fields.priority]
        );
        updated++;
      } else {
        await pool.query(
          `INSERT INTO places_interactions
             (interaction_type, location_id, location_type, region_id, cultural_family, title, description, rest_quality, shadow_effect, priority)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [fields.interaction_type, fields.location_id, fields.location_type, fields.region_id, fields.cultural_family,
           fields.title, fields.description, fields.rest_quality, fields.shadow_effect, fields.priority]
        );
        inserted++;
      }
    } catch (err) {
      console.error(`   ⚠️ Could not seed places_interactions row: ${err.message}`);
      skipped++;
    }
  }

  const { rows: [{ count }] } = await pool.query('SELECT COUNT(*) AS count FROM places_interactions');
  console.log(`✅ places_interactions: ${count} rows (inserted: ${inserted}, updated: ${updated}, skipped: ${skipped})`);
}

// ---------------------------------------------------------------------------
// Backfill locations.region_id from point-in-polygon after regions are loaded
// ---------------------------------------------------------------------------
async function backfillLocationRegions() {
  console.log('🗺️  Backfilling location region_ids...');
  const result = await pool.query(
    `UPDATE locations l
     SET region_id = r.id
     FROM regions r
     WHERE ST_Contains(r.geom, l.geom)`
  );
  const { rows: [{ total }] } = await pool.query('SELECT COUNT(*) AS total FROM locations');
  const { rows: [{ filled }] } = await pool.query('SELECT COUNT(*) AS filled FROM locations WHERE region_id IS NOT NULL');
  console.log(`✅ locations region_id backfill: ${filled}/${total} matched (${result.rowCount} updated)`);
}

// ---------------------------------------------------------------------------
// Places: authored narrative records (fichas) layered over locations — ADR-0013/0014.
// Loads data/json/places.json into `places_narration`; anchors records whose name exactly
// matches a location (location_id + inherited geom); infers the two radii from
// type tables; then replaces the anchored location's description with the
// ficha `base` (canonical TA 3018 text). Writes an anchor-candidates report for
// the manual georeferencing pass.
// ---------------------------------------------------------------------------

// Radii midpoints, in km. [size_radius, influence_radius] — editable later.
const LOCATION_TYPE_RADII = {
  'city':              [3.0, 70],
  'fortified city':    [2.5, 60],
  'fortified town':    [0.8, 40],
  'town':              [0.7, 35],
  'village':           [0.4, 20],
  'hamlet':            [0.3, 18],
  'inn':               [0.1, 12],
  'crossroads':        [0.3, 15],
  'manor':             [0.3, 20],
  'fortified manor':   [0.3, 25],
  'castle':            [0.3, 20],
  'keep':              [0.3, 20],
  'citadel':           [0.4, 50],
  'fortress':          [0.4, 50],
  'palace':            [0.4, 50],
  'tower':             [0.2, 25],
  'watchtower':        [0.2, 25],
  'camp':              [0.2, 12],
  'dwarven mine':      [0.4, 30],
  'mine':              [0.3, 20],
  'cavern':            [0.3, 10],
  'dungeon':           [0.2, 8],
  'cemetery':          [0.2, 8],
  'burial':            [0.2, 8],
  'cultivated glade':  [0.4, 10],
  'bridge':            [0.3, 20],
  'ruins':             [0.2, 10],
  'point of interest': [1.0, 15],
};

// Ficha `type` → radii via ordered keyword rules (first match wins).
// The ficha type vocabulary is freeform narrative ("apparent refuge",
// "poisoned resource", "recycled fortress"), so we classify by the most
// meaningful keyword present, not by exact string.
const PLACE_TYPE_RULES = [
  [/\b(danger|trap|hostile|accident|conflict|warning|obstacle)\b/, [0.2, 5]],
  [/\b(fortified village|garrison-village)\b/,                 [0.5, 30]],
  [/\b(village|hamlet|settlements?|homestead|port village)\b/, [0.4, 20]],
  [/\b(town|shrinking town)\b/,                                [0.7, 35]],
  [/\bcity\b/,                                                 [3.0, 70]],
  [/\bruin|barrow|battlefield\b/,                              [0.2, 10]],
  [/\b(fortress|fortified|garrison|castle|citadel|defended)\b/,[0.4, 45]],
  [/\b(harbour|haven|port)\b/,                                 [0.4, 50]],
  [/\b(manor|seat|noble)\b/,                                   [0.3, 25]],
  [/\btower\b/,                                                [0.2, 25]],
  [/\b(inn|lodging|shelter|refuge|relief|camp|hidden place)\b/,[0.15, 10]],
  [/\b(crossing|passage|pass|exit|bridge|road|transport|border|boundary|territory|limit|threshold|transition|navigation)\b/, [0.4, 15]],
  [/\b(landmark|monument|marker|sign|destination|memorial|oracle|lookout)\b/, [0.3, 18]],
  [/\b(sacred|taboo|cult|legend)\b/,                           [0.3, 15]],
  [/\b(landscape|terrain|valley|coast|desert|forest|clearing|flora|natural|ground|mountain|water)\b/, [1.2, 12]],
  [/\b(resource|work|industry|economy|trade)\b/,               [0.3, 10]],
  [/\b(encounter|event|meeting|presence|ambient|fauna|social|cultural|curiosity|find|finding|knowledge|phenomenon|deception|decision)\b/, [0.2, 8]],
];
const DEFAULT_PLACE_RADII = [0.5, 15];

// refs key → gazetteer table (ADR-0014): singular and plural spellings both
// accepted; keep in sync with the copy in validate-seeds.js.
const REF_TABLES = {
  water: 'water',
  biome: 'biomes', biomes: 'biomes',
  road: 'roads', roads: 'roads',
  location: 'locations', locations: 'locations',
  region: 'regions', regions: 'regions',
  kingdom: 'kingdoms', kingdoms: 'kingdoms',
};
const DEPICTION_TABLES = [...new Set(Object.values(REF_TABLES))];

function placeTypeRadii(typeText) {
  const head = (typeText || '').toLowerCase();
  for (const [re, radii] of PLACE_TYPE_RULES) {
    if (re.test(head)) return radii;
  }
  return DEFAULT_PLACE_RADII;
}

// ---------------------------------------------------------------------------
// Depiction backfill (ADR-0014, #98): per-feature gazetteer prose becomes
// kind='depiction' records in places_narration, linked through payload.refs
// (materialized to depiction_id right after). Idempotent — regenerates the
// dep:<table>:<id> records from the source columns on every run and drops
// generated records whose source prose disappeared. The source columns stay
// as reader fallback until the final drop (#104).
// ---------------------------------------------------------------------------
async function backfillDepictions() {
  const locRes = await pool.query(
    `INSERT INTO places_narration (id, kind, name, type, region_id, tags, payload)
     SELECT 'dep:loc:' || l.id, 'depiction', l.name, l.location_type, l.region_id, '{}',
       jsonb_build_object(
         'description', jsonb_build_object('en', l.description, 'es', l.description_es),
         'refs',        jsonb_build_object('location', jsonb_build_array(l.id)),
         'origin',      'backfill:locations.description')
     FROM locations l
     WHERE NULLIF(BTRIM(l.description), '') IS NOT NULL
     ON CONFLICT (id) DO UPDATE SET
       name = EXCLUDED.name, type = EXCLUDED.type,
       region_id = EXCLUDED.region_id, payload = EXCLUDED.payload`
  );
  const watRes = await pool.query(
    `INSERT INTO places_narration (id, kind, name, type, tags, payload)
     SELECT 'dep:wat:' || w.id, 'depiction', w.name, w.water_type, '{}',
       jsonb_build_object(
         'description', jsonb_build_object('en', w.description),
         'refs',        jsonb_build_object('water', jsonb_build_array(w.id)),
         'origin',      'backfill:water.description')
     FROM water w
     WHERE NULLIF(BTRIM(w.description), '') IS NOT NULL
     ON CONFLICT (id) DO UPDATE SET
       name = EXCLUDED.name, type = EXCLUDED.type, payload = EXCLUDED.payload`
  );
  const stale = await pool.query(
    `DELETE FROM places_narration p
     WHERE (p.id LIKE 'dep:loc:%' AND NOT EXISTS (
              SELECT 1 FROM locations l
              WHERE 'dep:loc:' || l.id = p.id
                AND NULLIF(BTRIM(l.description), '') IS NOT NULL))
        OR (p.id LIKE 'dep:wat:%' AND NOT EXISTS (
              SELECT 1 FROM water w
              WHERE 'dep:wat:' || w.id = p.id
                AND NULLIF(BTRIM(w.description), '') IS NOT NULL))
     RETURNING p.id`
  );
  console.log(
    `   🖼️  depictions: ${locRes.rowCount} locations + ${watRes.rowCount} water` +
    (stale.rowCount ? `, ${stale.rowCount} stale dropped` : '')
  );
}

// ---------------------------------------------------------------------------
// Region + kingdom records (ADR-0014, #99): regional prose, facts and
// seasonal variants become kind='region'/'kingdom' records. Rotation stays a
// per-day index over payload.rotation; weather/season rows fold into
// payload.variants keyed by variant name. Source columns stay as reader
// fallback until #104.
// ---------------------------------------------------------------------------
async function backfillRegionRecords() {
  const regRes = await pool.query(
    `INSERT INTO places_narration (id, kind, name, region_id, tags, payload)
     SELECT 'dep:reg:' || r.id, 'region', r.name, r.id, '{}',
       jsonb_build_object(
         'description', jsonb_build_object('en', r.description_text),
         'rotation',    COALESCE(to_jsonb(r.description_summary), '[]'::jsonb),
         'variants',    COALESCE((
           SELECT jsonb_object_agg(s.variant, to_jsonb(s.phrases))
           FROM region_seasonal_descriptions s
           WHERE s.region_name = r.name
         ), '{}'::jsonb),
         'facts', jsonb_build_object(
           'land', r.land, 'people', r.people, 'products', r.products,
           'notes', r.notes, 'source', r.source),
         'refs',   jsonb_build_object('region', jsonb_build_array(r.id)),
         'origin', 'backfill:regions')
     FROM regions r
     WHERE r.description_text IS NOT NULL
        OR r.description_summary IS NOT NULL
        OR r.land IS NOT NULL OR r.people IS NOT NULL
        OR r.products IS NOT NULL OR r.notes IS NOT NULL OR r.source IS NOT NULL
        OR EXISTS (SELECT 1 FROM region_seasonal_descriptions s
                   WHERE s.region_name = r.name)
     ON CONFLICT (id) DO UPDATE SET
       name = EXCLUDED.name, region_id = EXCLUDED.region_id, payload = EXCLUDED.payload`
  );
  const kingRes = await pool.query(
    `INSERT INTO places_narration (id, kind, name, tags, payload)
     SELECT 'dep:king:' || k.id, 'kingdom', k.name, '{}',
       jsonb_build_object(
         'description', jsonb_build_object('en', k.description),
         'refs',   jsonb_build_object('kingdom', jsonb_build_array(k.id)),
         'origin', 'backfill:kingdoms')
     FROM kingdoms k
     ON CONFLICT (id) DO UPDATE SET
       name = EXCLUDED.name, payload = EXCLUDED.payload`
  );
  const stale = await pool.query(
    `DELETE FROM places_narration p
     WHERE (p.id LIKE 'dep:reg:%' AND NOT EXISTS (
              SELECT 1 FROM regions r
              WHERE 'dep:reg:' || r.id = p.id
                AND (r.description_text IS NOT NULL
                     OR r.description_summary IS NOT NULL
                     OR r.land IS NOT NULL OR r.people IS NOT NULL
                     OR r.products IS NOT NULL OR r.notes IS NOT NULL
                     OR r.source IS NOT NULL
                     OR EXISTS (SELECT 1 FROM region_seasonal_descriptions s
                                WHERE s.region_name = r.name))))
        OR (p.id LIKE 'dep:king:%' AND NOT EXISTS (
              SELECT 1 FROM kingdoms k WHERE 'dep:king:' || k.id = p.id))
     RETURNING p.id`
  );
  console.log(
    `   🏞️  region records: ${regRes.rowCount} + ${kingRes.rowCount} kingdoms` +
    (stale.rowCount ? `, ${stale.rowCount} stale dropped` : '')
  );
}

// ---------------------------------------------------------------------------
// Overnight records (ADR-0014, #101): places_interactions folds into
// places_narration as kind='overnight'. Scope columns map 1:1
// (location_id, location_type → type, region_id, cultural_family, priority);
// mechanics and prose go to payload; legacy_id keeps trip_days' integer FK
// valid until the source table drops in #104.
// ---------------------------------------------------------------------------
async function backfillOvernightRecords() {
  const res = await pool.query(
    `INSERT INTO places_narration
       (id, kind, location_id, region_id, name, type, cultural_family, priority, tags, payload)
     SELECT 'ovn:' || pi.id, 'overnight', pi.location_id, pi.region_id, pi.title,
            pi.location_type, pi.cultural_family, pi.priority, '{}',
            jsonb_build_object(
              'title', pi.title,
              'description', jsonb_build_object('en', pi.description),
              'mechanics', jsonb_build_object(
                'rest_quality', pi.rest_quality,
                'shadow_effect', pi.shadow_effect),
              'legacy_id', pi.id,
              'origin', 'backfill:places_interactions')
     FROM places_interactions pi
     WHERE pi.interaction_type = 'overnight'
     ON CONFLICT (id) DO UPDATE SET
       location_id = EXCLUDED.location_id, region_id = EXCLUDED.region_id,
       name = EXCLUDED.name, type = EXCLUDED.type,
       cultural_family = EXCLUDED.cultural_family, priority = EXCLUDED.priority,
       payload = EXCLUDED.payload`
  );
  const stale = await pool.query(
    `DELETE FROM places_narration p
     WHERE p.id LIKE 'ovn:%' AND NOT EXISTS (
       SELECT 1 FROM places_interactions pi
       WHERE 'ovn:' || pi.id = p.id AND pi.interaction_type = 'overnight')
     RETURNING p.id`
  );
  console.log(
    `   🌙 overnight records: ${res.rowCount}` +
    (stale.rowCount ? `, ${stale.rowCount} stale dropped` : '')
  );
}

// ---------------------------------------------------------------------------
// Depiction backfill (ADR-0014, #102): region×category terrain phrase cells
// become scope-bound kind='depiction' records — type=category × region_id,
// season/weather phrase banks in payload.variants keyed by variant name.
// Homonymous region names fan out to one record per matching region_id.
// region_biome_descriptions stays as the seeded source (and reader fallback)
// until it drops in #104.
// ---------------------------------------------------------------------------
async function backfillBiomeRecords() {
  const res = await pool.query(
    `INSERT INTO places_narration (id, kind, region_id, name, type, priority, tags, payload)
     SELECT 'dep:biome:' || r.id || ':' || c.category, 'depiction', r.id,
            c.category || ' of ' || r.name, c.category, 50, '{}',
            jsonb_build_object(
              'origin',      'backfill:region_biome_descriptions',
              'region_name', r.name,
              'category',    c.category,
              'variants',    c.variants)
     FROM (
       SELECT region_name, category, jsonb_object_agg(variant, phrases) AS variants
       FROM region_biome_descriptions
       GROUP BY region_name, category
     ) c
     JOIN regions r ON r.name = c.region_name
     ON CONFLICT (id) DO UPDATE SET
       region_id = EXCLUDED.region_id, name = EXCLUDED.name,
       type = EXCLUDED.type, priority = EXCLUDED.priority,
       payload = EXCLUDED.payload`
  );
  const stale = await pool.query(
    `DELETE FROM places_narration p
     WHERE p.id LIKE 'dep:biome:%' AND NOT EXISTS (
       SELECT 1 FROM region_biome_descriptions b
       JOIN regions r ON r.name = b.region_name
       WHERE 'dep:biome:' || r.id || ':' || b.category = p.id)
     RETURNING p.id`
  );
  console.log(
    `   🏔️  biome depictions: ${res.rowCount}` +
    (stale.rowCount ? `, ${stale.rowCount} stale dropped` : '')
  );
}

// ---------------------------------------------------------------------------
// Location normalization (ADR-0014, #103)
// - provenance: georef-created anchors (name matches a ficha, no gazetteer
//   type) get source='georef'; everything else source='gazetteer'. Set once
//   and never overwritten — anchors stay distinguishable after typing.
// - canonical types: legacy multiword values fold into the canonical set;
//   null types inherit the anchored ficha's type when physical, else match
//   name-obvious patterns, else point_of_interest.
// ---------------------------------------------------------------------------
async function normalizeLocations() {
  const { rows: marked } = await pool.query(
    `UPDATE locations l SET source = 'georef'
     WHERE l.source IS DISTINCT FROM 'georef'
       AND l.location_type IS NULL
       AND EXISTS (SELECT 1 FROM places_narration p WHERE p.name = l.name)
     RETURNING l.id`
  );
  await pool.query(`UPDATE locations SET source = 'gazetteer' WHERE source IS NULL`);

  const { rows: nonCanonical } = await pool.query(
    `SELECT id, name, location_type FROM locations
     WHERE location_type IS NOT NULL`
  );
  let normalized = 0;
  for (const l of nonCanonical) {
    const canon = canonicalType(l.location_type);
    if (canon && canon !== l.location_type) {
      await pool.query('UPDATE locations SET location_type = $1 WHERE id = $2', [canon, l.id]);
      normalized++;
    }
  }

  const { rows: untyped } = await pool.query(
    `SELECT l.id, l.name, l.region_id,
            (SELECT p.type FROM places_narration p
              WHERE p.location_id = l.id AND p.type IS NOT NULL
              ORDER BY p.kind = 'place' DESC, p.id LIMIT 1) AS ficha_type
       FROM locations l WHERE l.location_type IS NULL`
  );
  const byRule = {};
  for (const l of untyped) {
    const type = canonicalType(l.ficha_type) || typeFromName(l.name) || 'point_of_interest';
    await pool.query('UPDATE locations SET location_type = $1 WHERE id = $2', [type, l.id]);
    byRule[type] = (byRule[type] || 0) + 1;
  }

  console.log(
    `   🧭 locations normalized: ${marked.length} georef anchors, ` +
    `${normalized} types canonicalized, ${untyped.length} nulls typed` +
    (untyped.length ? ` (${Object.entries(byRule).sort((a, b) => b[1] - a[1]).map(([t, n]) => `${t}:${n}`).join(', ')})` : '')
  );
}

async function seedPlaces() {
  console.log('🗺️  Seeding places (authored fichas)...');
  const file = path.join(DATA_DIR, 'json/places.json');
  const { records } = JSON.parse(await fs.readFile(file, 'utf8'));

  // locations name → row, for the exact-name anchor pass
  const { rows: locs } = await pool.query(
    'SELECT id, name, location_type FROM locations ORDER BY id'
  );
  const locByName = new Map(locs.map((l) => [l.name.toLowerCase(), l]));
  const locById = new Map(locs.map((l) => [l.id, l]));

  let anchored = 0;
  const candidates = [];

  for (const r of records) {
    const name = typeof r.name === 'string'
      ? r.name
      : (r.name?.en || r.name?.es || r.id);
    const typeText = typeof r.type === 'string'
      ? r.type
      : (r.type?.en || r.type?.es || null);
    const regionId = (r.region_ids || [])[0] || null;

    let locationId = null;
    let radii = [null, null];
    if (r.kind === 'place') {
      // explicit location_ref ({id, name}) wins over the exact-name match
      const ref = r.location_ref;
      const loc = (ref && (locById.get(ref.id) || locByName.get(ref.name?.toLowerCase())))
        || locByName.get(name.toLowerCase());
      if (loc) {
        locationId = loc.id;
        radii = LOCATION_TYPE_RADII[loc.location_type] || DEFAULT_PLACE_RADII;
        anchored += 1;
      } else {
        radii = placeTypeRadii(typeText);
        // fuzzy candidates for the manual pass: location names mentioned in the record
        const blob = JSON.stringify(r).toLowerCase();
        const hits = locs
          .filter((l) => l.name.length > 4 && blob.includes(l.name.toLowerCase()))
          .map((l) => `${l.id}:${l.name}`);
        if (hits.length) candidates.push({ id: r.id, name, candidates: hits });
      }
    }

    // Once a place is positioned, the georef tool owns its geometry fields
    // (geom, location_id, region_id, type, radii): a reseed must not wipe them.
    await pool.query(
      `INSERT INTO places_narration
         (id, kind, location_id, place_ref, region_id, name, type, tags,
          geom, size_radius_km, influence_radius_km, payload)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::jsonb)
       ON CONFLICT (id) DO UPDATE SET
         kind=EXCLUDED.kind, place_ref=EXCLUDED.place_ref,
         name=EXCLUDED.name, tags=EXCLUDED.tags, payload=EXCLUDED.payload,
         location_id = CASE WHEN places_narration.geom IS NULL THEN EXCLUDED.location_id ELSE places_narration.location_id END,
         region_id   = CASE WHEN places_narration.geom IS NULL THEN EXCLUDED.region_id   ELSE places_narration.region_id   END,
         type        = CASE WHEN places_narration.geom IS NULL THEN EXCLUDED.type        ELSE places_narration.type        END,
         size_radius_km      = CASE WHEN places_narration.geom IS NULL THEN EXCLUDED.size_radius_km      ELSE places_narration.size_radius_km      END,
         influence_radius_km = CASE WHEN places_narration.geom IS NULL THEN EXCLUDED.influence_radius_km ELSE places_narration.influence_radius_km END,
         geom = COALESCE(places_narration.geom, EXCLUDED.geom)`,
      [
        r.id, r.kind, locationId, r.place_ref || null, regionId,
        name, typeText, r.tags || [],
        null, // geom: copied from the anchored location below, or hand-placed later
        radii[0], radii[1],
        JSON.stringify(r),
      ]
    );
  }

  // Records removed from the JSON (merged, moved to encounter-candidates.json)
  // are pruned only while unpositioned; positioned orphans are reported, not deleted.
  const ids = records.map((r) => r.id);
  const pruned = await pool.query(
    `DELETE FROM places_narration WHERE id <> ALL($1) AND geom IS NULL
       AND kind IN ('place','ambient','arrival','offer','lore') RETURNING id`, [ids]
  );
  const { rows: orphans } = await pool.query(
    `SELECT id FROM places_narration WHERE id <> ALL($1)
       AND kind IN ('place','ambient','arrival','offer','lore')`, [ids]
  );
  if (pruned.rowCount) console.log(`   🧹 pruned ${pruned.rowCount} unpositioned places no longer in JSON`);
  if (orphans.length) console.warn(`   ⚠️ positioned places no longer in JSON (kept): ${orphans.map((o) => o.id).join(', ')}`);

  // Anchored places inherit the location's geometry (hand-edited afterwards)
  const geomRes = await pool.query(
    `UPDATE places_narration p SET geom = l.geom
     FROM locations l
     WHERE p.location_id = l.id AND p.geom IS NULL`
  );

  // Canonical physical types + anchor provenance (#103) — runs here, after
  // the anchor-by-name pass, so anchors can inherit their ficha's type and
  // depiction records copy the normalized type below.
  await normalizeLocations();

  // Gazetteer prose → depiction/region/kingdom records, then links.
  // (overnight records come later in main(), after their source table seeds)
  await backfillDepictions();
  await backfillRegionRecords();

  // Materialize depiction_id from payload.refs (ADR-0014). refs is the
  // authored truth — read from the table so generated records (depictive
  // backfill) and runtime-created ones participate, not only the JSON just
  // upserted. The FK column is a derived link rebuilt on every seed:
  // clearing first makes reseeds and gazetteer re-imports converge to the
  // refs, never to drift.
  const { rows: refRows } = await pool.query(
    `SELECT id, payload->'refs' AS refs FROM places_narration WHERE payload ? 'refs'`
  );
  const claims = [];
  for (const r of refRows) {
    for (const [key, ids] of Object.entries(r.refs || {})) {
      const table = REF_TABLES[key];
      if (!table) {
        console.warn(`   ⚠️ ${r.id}: unknown refs key '${key}' (skipped)`);
        continue;
      }
      for (const fid of ids || []) claims.push({ table, fid, rid: r.id });
    }
  }
  for (const table of DEPICTION_TABLES) {
    await pool.query(`UPDATE ${table} SET depiction_id = NULL WHERE depiction_id IS NOT NULL`);
  }
  let linked = 0, missing = 0;
  const conflicts = [];
  for (const { table, fid, rid } of claims) {
    const res = await pool.query(
      `UPDATE ${table} SET depiction_id = $1 WHERE id = $2 AND depiction_id IS NULL`,
      [rid, fid]
    );
    if (res.rowCount === 1) { linked += 1; continue; }
    const { rows } = await pool.query(
      `SELECT depiction_id FROM ${table} WHERE id = $1`, [fid]
    );
    if (!rows.length) missing += 1;
    else conflicts.push({ record: rid, table, feature: fid, claimedBy: rows[0].depiction_id });
  }
  if (conflicts.length || missing) {
    console.warn(`   ⚠️ depiction links: ${conflicts.length} conflicts, ${missing} refs to missing feature ids`);
    for (const c of conflicts) console.warn(`      ${c.record} → ${c.table}#${c.feature} already claimed by ${c.claimedBy}`);
  }

  const reportPath = path.join(DATA_DIR, 'json/place-anchor-candidates.json');
  await fs.writeFile(reportPath, JSON.stringify(candidates, null, 2));
  console.log(
    `✅ places: ${records.length} records, ${anchored} anchored by name, ` +
    `${geomRes.rowCount} geom inherited, ${linked} depiction links, ` +
    `${candidates.length} anchor candidates → data/json/place-anchor-candidates.json`
  );
}

// ---------------------------------------------------------------------------
// Ensure schema that lives in migrations (not in the base schema applied to
// prod). Idempotent: runs on every deploy so local and prod pick up recent
// migration DDL automatically. Must run BEFORE the seeds that depend on it
// (seedEntities → shadow_weight, backfillLocationRegions → locations.region_id,
// seedPlacesInteractions → places_interactions table).
// ---------------------------------------------------------------------------
async function ensureSchema() {
  console.log('🔧 Ensuring schema (migrations: region_id, places_interactions, energy/shadow, regions cols)...');

  // --- regions columns (migrations: add_cultural_family_to_regions.sql, add_population_ratio_to_regions.sql) ---
  await pool.query(`
    ALTER TABLE regions
      ADD COLUMN IF NOT EXISTS cultural_family   TEXT,
      ADD COLUMN IF NOT EXISTS population_ratio  NUMERIC(3,2) DEFAULT 0.5 CHECK (population_ratio BETWEEN 0 AND 1)
  `);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_regions_cultural_family ON regions(cultural_family)
  `);

  // regions.description_summary: ensure it is TEXT[] and cast legacy TEXT literals.
  await pool.query(`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1 FROM pg_attribute
        WHERE attrelid = 'regions'::regclass
          AND attname = 'description_summary'
          AND atttypid = 'text'::regtype
      ) THEN
        ALTER TABLE regions
          ALTER COLUMN description_summary TYPE TEXT[]
          USING CASE
            WHEN description_summary LIKE '{%}' THEN description_summary::TEXT[]
            ELSE NULL
          END;
      END IF;
    END $$;
  `);

  // --- locations.region_id (migration: add_region_id_to_locations.sql) ---
  await pool.query(`
    ALTER TABLE locations
      ADD COLUMN IF NOT EXISTS region_id INTEGER REFERENCES regions(id)
  `);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_locations_region_id ON locations(region_id)
  `);

  // --- places_interactions (migration: create_places_interactions_table.sql) ---
  await pool.query(`
    CREATE TABLE IF NOT EXISTS places_interactions (
      id                SERIAL PRIMARY KEY,
      interaction_type  TEXT    NOT NULL,
      location_id       INTEGER REFERENCES locations(id),
      location_type     TEXT,
      region_id         INTEGER REFERENCES regions(id),
      cultural_family   TEXT,
      title             TEXT,
      description       TEXT    NOT NULL,
      rest_quality      SMALLINT,
      shadow_effect     SMALLINT,
      priority          SMALLINT NOT NULL DEFAULT 0
    )
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_pi_location ON places_interactions(interaction_type, location_id)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_pi_type_reg ON places_interactions(interaction_type, location_type, region_id)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_pi_type_fam ON places_interactions(interaction_type, location_type, cultural_family)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_pi_region ON places_interactions(interaction_type, region_id)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_pi_family ON places_interactions(interaction_type, cultural_family)`);
  // chk_scope: ADD CONSTRAINT has no IF NOT EXISTS, so guard it.
  await pool.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_scope') THEN
        ALTER TABLE places_interactions
          ADD CONSTRAINT chk_scope CHECK (
             (location_id IS NOT NULL)
          OR (location_type IS NOT NULL AND region_id IS NOT NULL)
          OR (location_type IS NOT NULL AND cultural_family IS NOT NULL)
          OR (location_type IS NOT NULL AND region_id IS NULL AND cultural_family IS NULL)
          OR (location_type IS NULL AND region_id IS NOT NULL)
          OR (location_type IS NULL AND cultural_family IS NOT NULL)
          );
      END IF;
    END $$;
  `);

  // --- trip_days extra columns (migration: add_places_interaction_columns_to_trip_days.sql) ---
  await pool.query(`
    ALTER TABLE trip_days
      ADD COLUMN IF NOT EXISTS places_interaction_id INTEGER REFERENCES places_interactions(id),
      ADD COLUMN IF NOT EXISTS rest_quality  SMALLINT,
      ADD COLUMN IF NOT EXISTS shadow_effect SMALLINT
  `);

  // --- trip_days energy/shadow tracking columns ---
  await pool.query(`
    ALTER TABLE trip_days
      ADD COLUMN IF NOT EXISTS energy_start INT,
      ADD COLUMN IF NOT EXISTS energy_end   INT,
      ADD COLUMN IF NOT EXISTS shadow_start INT,
      ADD COLUMN IF NOT EXISTS shadow_end   INT
  `);

  // --- trip_days.meals (migration: add_meals_to_trip_days.sql) ---
  // The day's two meals: midday halt and supper at camp, with what was eaten
  // and drunk, so a chapter can be re-narrated with the same food.
  await pool.query(`
    ALTER TABLE trip_days
      ADD COLUMN IF NOT EXISTS meals JSONB DEFAULT '[]'::jsonb
  `);

  // character_state: energy + shadow live values, per-character initial values.
  await pool.query(`
    ALTER TABLE character_state
      ADD COLUMN IF NOT EXISTS energy         INT NOT NULL DEFAULT 100,
      ADD COLUMN IF NOT EXISTS shadow         INT NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS energy_initial INT NOT NULL DEFAULT 100,
      ADD COLUMN IF NOT EXISTS shadow_initial INT NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS last_rest_at   TIMESTAMP,
      ADD COLUMN IF NOT EXISTS resistance     INT NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS permadeath     BOOLEAN NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS status         TEXT NOT NULL DEFAULT 'alive'
  `);
  await pool.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_character_state_status') THEN
        ALTER TABLE character_state
          ADD CONSTRAINT chk_character_state_status CHECK (status IN ('alive', 'dead'));
      END IF;
    END $$;
  `);

  // entities: signed shadow_weight.
  await pool.query(`
    ALTER TABLE entities
      ADD COLUMN IF NOT EXISTS shadow_weight INT NOT NULL DEFAULT 0
  `);

  // entities: is_npc flag (humans, elves, dwarves, hobbits, orcs, maiar).
  await pool.query(`
    ALTER TABLE entities
      ADD COLUMN IF NOT EXISTS is_npc BOOLEAN NOT NULL DEFAULT false
  `);

  // entities: family — kind-of-being between type and entity
  // (migration: add_family_to_entities.sql). The mind reads it as
  // tag:family:* for attitude specificity (entity > family > type).
  await pool.query(`
    ALTER TABLE entities
      ADD COLUMN IF NOT EXISTS family TEXT
  `);

  // entities: encounter-engine columns (migrations:
  // add_active_column_and_import_entities.sql, add_danger_column_and_import_entities.sql).
  // Needed by the encounter pool: probability_by_region feeds buildRegionPool.
  await pool.query(`
    ALTER TABLE entities
      ADD COLUMN IF NOT EXISTS active                VARCHAR,
      ADD COLUMN IF NOT EXISTS danger                INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS region_ids            INTEGER[],
      ADD COLUMN IF NOT EXISTS probability_by_region JSONB
  `);
  await pool.query(`
    UPDATE entities
      SET is_npc = true
      WHERE type IN ('humans', 'elves', 'dwarves', 'hobbits', 'orcs', 'maiar', 'living_trees', 'undead', 'drakes')
        AND is_npc = false
  `);

  // character_state_log: per-day trail.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS character_state_log (
      id           SERIAL PRIMARY KEY,
      character_id INT  NOT NULL REFERENCES character_state(id),
      trip_id      UUID NOT NULL,
      day_number   INT  NOT NULL,
      energy       INT  NOT NULL,
      shadow       INT  NOT NULL,
      note         TEXT,
      created_at   TIMESTAMP DEFAULT NOW(),
      UNIQUE (character_id, trip_id, day_number)
    )
  `);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_character_state_log_char
      ON character_state_log(character_id, trip_id, day_number)
  `);

  await pool.query(`
    ALTER TABLE character_state_log
      ADD COLUMN IF NOT EXISTS fate TEXT
  `);

  // Base-template starting values (Aranath 100/0, Celebrian 100/20).
  await pool.query(`
    UPDATE character_state SET energy_initial = 100, shadow_initial = 0, energy = 100, shadow = 0
    WHERE id = 1 AND template_id IS NULL AND owner_user_id IS NULL
  `);
  await pool.query(`
    UPDATE character_state SET energy_initial = 100, shadow_initial = 20, energy = 100, shadow = 20
    WHERE id = 2 AND template_id IS NULL AND owner_user_id IS NULL
  `);

  await pool.query(`
    ALTER TABLE npc_interactions
      ADD COLUMN IF NOT EXISTS topic_prose_hint TEXT
  `);

  await pool.query(`
    DO $$
    BEGIN
      IF to_regclass('public.interactions') IS NOT NULL
         AND to_regclass('public.encounter_forms') IS NULL THEN
        ALTER TABLE interactions DROP CONSTRAINT IF EXISTS interactions_pkey;
        ALTER TABLE interactions RENAME COLUMN id TO legacy_id;
        ALTER TABLE interactions RENAME COLUMN form TO interaction_form;
        ALTER TABLE interactions RENAME TO encounter_forms;
        ALTER TABLE encounter_forms ADD COLUMN id UUID;
        UPDATE encounter_forms
        SET id = (
          SUBSTRING(md5(entity_type || '|' || interaction_form), 1, 8) || '-' ||
          SUBSTRING(md5(entity_type || '|' || interaction_form), 9, 4) || '-5' ||
          SUBSTRING(md5(entity_type || '|' || interaction_form), 14, 3) || '-a' ||
          SUBSTRING(md5(entity_type || '|' || interaction_form), 18, 3) || '-' ||
          SUBSTRING(md5(entity_type || '|' || interaction_form), 21, 12)
        )::UUID;
        ALTER TABLE encounter_forms ALTER COLUMN id SET NOT NULL;
        ALTER TABLE encounter_forms ADD PRIMARY KEY (id);
        ALTER TABLE encounter_forms DROP COLUMN legacy_id;
        ALTER INDEX IF EXISTS idx_interactions_entity_type RENAME TO idx_encounter_forms_entity_type;
      END IF;
    END $$;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS encounter_forms (
      id UUID PRIMARY KEY,
      entity_type TEXT NOT NULL,
      interaction_form TEXT NOT NULL,
      intensity INT NOT NULL CHECK (intensity BETWEEN 0 AND 4),
      weight INT NOT NULL CHECK (weight > 0),
      min_danger INT NOT NULL DEFAULT 0,
      max_danger INT NOT NULL DEFAULT 5,
      triggers_roll BOOLEAN NOT NULL DEFAULT false,
      prose_hint TEXT NOT NULL,
      UNIQUE (entity_type, interaction_form)
    )
  `);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_encounter_forms_entity_type
      ON encounter_forms (entity_type)
  `);

  await pool.query(`
    ALTER TABLE trips
      ADD COLUMN IF NOT EXISTS used_region_descriptions JSONB DEFAULT '{}',
      ADD COLUMN IF NOT EXISTS used_terrain_phrases    JSONB DEFAULT '{}',
      ADD COLUMN IF NOT EXISTS status    TEXT NOT NULL DEFAULT 'active',
      ADD COLUMN IF NOT EXISTS end_cause TEXT,
      ADD COLUMN IF NOT EXISTS ended_at  TIMESTAMP
  `);
  await pool.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_trips_status') THEN
        ALTER TABLE trips
          ADD CONSTRAINT chk_trips_status CHECK (status IN ('active', 'dead', 'completed'));
      END IF;
    END $$;
  `);

  await pool.query(`
    DROP TABLE IF EXISTS conversation_topics, character_voice
  `);

  // --- Inventory, food and water ---
  // These migrations are long and already idempotent, so they are executed
  // from their .sql files rather than duplicated here. Order matters: the
  // food/water migration extends the tables the first one creates.
  await runMigrationFile('create_items_and_inventory.sql');
  await runMigrationFile('add_food_water_and_item_effects.sql');
  await runMigrationFile('add_skills_and_conditions.sql');
  await runMigrationFile('add_stealth_endurance_skills.sql');
  await runMigrationFile('add_social_skills.sql');
  await runMigrationFile('add_description_es_to_character_state.sql');
  await runMigrationFile('fix_harvest_shelter_stance_c25.sql');
  await runMigrationFile('npc_interactions_entity_ids_c26.sql');
  await runMigrationFile('npc_interactions_commands_c27.sql');
  await runMigrationFile('add_trip_days_mind_calls.sql');
  await runMigrationFile('add_world_date_to_users.sql');
  await runMigrationFile('add_portrait_url_to_character_state.sql');
  await runMigrationFile('add_variant_to_region_biome_descriptions.sql');
  await runMigrationFile('create_region_seasonal_descriptions.sql');
  await runMigrationFile('create_movers_tables.sql');
  await runMigrationFile('create_places_narration_table.sql');
  await runMigrationFile('add_depiction_id_to_geometry_tables.sql');
  await runMigrationFile('add_depiction_id_to_kingdoms.sql');
  await runMigrationFile('add_visible_in_map_to_locations.sql');
  await runMigrationFile('add_source_to_locations.sql');

  console.log('✅ Schema ready\n');
}

// ---------------------------------------------------------------------------
// Execute an idempotent migration file from database/migrations.
// ---------------------------------------------------------------------------
async function runMigrationFile(fileName) {
  const filePath = path.join(__dirname, '../../migrations', fileName);
  const sql = await fs.readFile(filePath, 'utf-8');
  await pool.query(sql);
  console.log(`   ↳ applied ${fileName}`);
}

// ---------------------------------------------------------------------------
// Ensure PKs and unique constraints exist before upserts
// ---------------------------------------------------------------------------
async function ensureConstraints() {
  console.log('🔧 Ensuring primary keys and constraints...');

  const checks = [
    {
      table: 'kingdoms',
      constraint: 'kingdoms_pkey',
      sql: 'ALTER TABLE kingdoms ADD PRIMARY KEY (id)',
    },
    {
      table: 'climate_zones',
      constraint: 'climate_zones_pkey',
      sql: 'ALTER TABLE climate_zones ADD PRIMARY KEY (id)',
    },
    {
      table: 'npc_interactions',
      constraint: 'npc_interactions_pkey',
      sql: 'ALTER TABLE npc_interactions ADD PRIMARY KEY (id)',
    },
    {
      table: 'entities',
      constraint: 'entities_pkey',
      sql: 'ALTER TABLE entities ADD PRIMARY KEY (id)',
    },
    {
      table: 'locations',
      constraint: 'locations_pkey',
      sql: 'ALTER TABLE locations ADD PRIMARY KEY (id)',
    },
    {
      table: 'roads',
      constraint: 'roads_pkey',
      sql: 'ALTER TABLE roads ADD PRIMARY KEY (id)',
    },
    {
      table: 'regions',
      constraint: 'regions_pkey',
      sql: 'ALTER TABLE regions ADD PRIMARY KEY (id)',
    },
    {
      table: 'biomes',
      constraint: 'biomes_pkey',
      sql: 'ALTER TABLE biomes ADD PRIMARY KEY (id)',
    },
    {
      table: 'water',
      constraint: 'water_pkey',
      sql: 'ALTER TABLE water ADD PRIMARY KEY (id)',
    },
  ];

  for (const { table, constraint, sql } of checks) {
    const { rows } = await pool.query(
      `SELECT 1 FROM pg_constraint WHERE conname = $1 AND conrelid = $2::regclass`,
      [constraint, table]
    );
    if (rows.length === 0) {
      try {
        await pool.query(sql);
        console.log(`  ✅ Added constraint ${constraint}`);
      } catch (err) {
        console.log(`  ⚠️  Could not add ${constraint}: ${err.message}`);
      }
    }
  }

  console.log('✅ Constraints check complete\n');
}

// ---------------------------------------------------------------------------
// Seed: movers (Living Map)
// ----------------------------------------------------------------------------
// Authored YAML in data/movers/<slug>.yml + campaigns in campaigns.yml +
// hand-drawn GeoJSON LineStrings in data/movers/trails/.
// The bake happens here: each march LineString is resampled in PostGIS into
// one mover_trails row per day of the leg window. Deterministic by
// construction: same YAML + GeoJSON in, same rows out.
// ---------------------------------------------------------------------------
const MOVERS_DIR = path.join(DATA_DIR, 'movers');
const DAY_PHASES = ['morning', 'afternoon', 'before_sleep', 'mid_night'];

function failMover(file, legIdx, msg) {
  throw new Error(`movers/${file}${legIdx != null ? ` leg #${legIdx}` : ''}: ${msg}`);
}

function normDate(v, file, legIdx) {
  // YAML unquoted dates arrive as Date objects; quoted stay strings.
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  const s = String(v ?? '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) failMover(file, legIdx, `bad date '${v}' (want YYYY-MM-DD)`);
  return s;
}

async function seedMovers() {
  console.log('🚶 Seeding movers (Living Map)...');

  let entries;
  try {
    entries = await fs.readdir(MOVERS_DIR);
  } catch {
    console.log('   (no data/movers directory — skipping)');
    return;
  }

  // --- campaigns first: legs reference them by slug -------------------------
  const campaignIds = new Map();
  try {
    const doc = yaml.load(await fs.readFile(path.join(MOVERS_DIR, 'campaigns.yml'), 'utf8'));
    for (const c of doc?.campaigns ?? []) {
      const { rows: [row] } = await pool.query(
        `INSERT INTO campaigns (slug, name, description) VALUES ($1, $2, $3)
         ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description
         RETURNING id`,
        [c.slug, c.name, c.description ?? null]
      );
      campaignIds.set(c.slug, row.id);
    }
  } catch (e) {
    if (e.code !== 'ENOENT') throw e;
  }

  const campaignId = async (slug, file, legIdx) => {
    if (!slug) return null;
    if (!campaignIds.has(slug)) {
      const { rows } = await pool.query('SELECT id FROM campaigns WHERE slug = $1', [slug]);
      if (rows[0]) campaignIds.set(slug, rows[0].id);
      else failMover(file, legIdx, `unknown campaign '${slug}' (declare it in campaigns.yml)`);
    }
    return campaignIds.get(slug);
  };

  const resolveRegionId = async (leg, file, i) => {
    if (leg.region_id != null) return Number(leg.region_id);
    if (leg.region) {
      const { rows } = await pool.query('SELECT id, name FROM regions WHERE name ILIKE $1', [leg.region]);
      if (rows.length === 0) failMover(file, i, `unknown region '${leg.region}'`);
      if (rows.length > 1) failMover(file, i, `region '${leg.region}' is ambiguous (${rows.map(r => r.name).join(', ')}) — use region_id`);
      return rows[0].id;
    }
    return null;
  };

  const resolveLocationId = async (leg, file, i) => {
    if (leg.location_id != null) return Number(leg.location_id);
    if (leg.location) {
      const { rows } = await pool.query('SELECT id, name FROM locations WHERE name ILIKE $1', [leg.location]);
      if (rows.length === 0) failMover(file, i, `unknown location '${leg.location}'`);
      if (rows.length > 1) failMover(file, i, `location '${leg.location}' is ambiguous (${rows.map(r => r.name).join(', ')}) — use location_id`);
      return rows[0].id;
    }
    return null;
  };

  const moverFiles = entries.filter((f) => f.endsWith('.yml') && f !== 'campaigns.yml');
  for (const file of moverFiles) {
    const doc = yaml.load(await fs.readFile(path.join(MOVERS_DIR, file), 'utf8'));
    const m = doc?.mover;
    if (!m?.slug || !m.name || !m.kind) failMover(file, null, 'mover needs slug, name and kind');
    if (!['person', 'company', 'host'].includes(m.kind)) failMover(file, null, `bad kind '${m.kind}'`);

    // Legs are regenerated wholesale: seed data is rebuilt per deploy.
    const legs = Array.isArray(doc.legs) ? doc.legs : [];
    if (legs.length === 0) failMover(file, null, 'no legs declared');

    // Pass 1: validate + resolve everything BEFORE writing, so a bad file
    // never leaves a half-seeded mover.
    const spans = legs.map((l, i) => ({
      i: i + 1,
      from: normDate(l.from, file, i + 1),
      to: normDate(l.to, file, i + 1),
    }));
    for (const s of spans) if (s.to < s.from) failMover(file, s.i, `reversed window ${s.from} → ${s.to}`);
    spans.sort((a, b) => a.from.localeCompare(b.from));
    for (let k = 1; k < spans.length; k++) {
      if (spans[k].from <= spans[k - 1].to)
        failMover(file, spans[k].i, `overlaps leg #${spans[k - 1].i}`);
    }

    const resolved = [];
    for (let i = 0; i < legs.length; i++) {
      const leg = legs[i];
      const n = i + 1;
      const kind = leg.kind;
      if (!['march', 'presence', 'resident'].includes(kind)) failMover(file, n, `bad leg kind '${kind}'`);

      const phases = leg.active_phases ?? DAY_PHASES;
      if (!Array.isArray(phases) || phases.length === 0 || phases.some((p) => !DAY_PHASES.includes(p)))
        failMover(file, n, `active_phases must be a non-empty subset of ${DAY_PHASES.join('/')}`);

      const camp = await campaignId(leg.campaign ?? m.campaign, file, n);
      const regionId = await resolveRegionId(leg, file, n);
      const locationId = await resolveLocationId(leg, file, n);

      if (kind === 'presence' && (regionId == null || leg.level == null))
        failMover(file, n, "presence legs need 'region' (or region_id) and 'level'");
      if (kind === 'resident' && locationId == null && leg.location_type == null)
        failMover(file, n, "resident legs need 'location'/'location_id' or 'location_type'");
      if (kind === 'march' && (leg.notice_radius_km == null || leg.contact_radius_km == null))
        failMover(file, n, "march legs need 'notice_radius_km' and 'contact_radius_km'");

      const beats = leg.beats ?? (leg.beat ? [leg.beat] : []);
      for (const b of beats) if (!b?.text) failMover(file, n, 'a beat needs at least text');

      let trailGeom = null;
      let trailDays = 0;
      if (kind === 'march') {
        if (!leg.trail) failMover(file, n, "march legs need 'trail' (a file in trails/)");
        const gj = JSON.parse(await fs.readFile(path.join(MOVERS_DIR, 'trails', `${leg.trail}.geojson`), 'utf8'));
        trailGeom = (gj.type === 'LineString' ? gj : (gj.features ?? []).map((f) => f.geometry).find((g) => g?.type === 'LineString'));
        if (!trailGeom) failMover(file, n, `trail '${leg.trail}' has no LineString`);
        const s = spans.find((sp) => sp.i === n);
        trailDays = Math.round((new Date(s.to) - new Date(s.from)) / 86400000);
      }

      resolved.push({ leg, n, kind, phases, camp, regionId, locationId, beats, trailGeom, trailDays });
    }

    // Pass 2: write.
    const { rows: [mrow] } = await pool.query(
      `INSERT INTO movers (slug, name, kind, canon, motivation, description)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (slug) DO UPDATE SET
         name = EXCLUDED.name, kind = EXCLUDED.kind, canon = EXCLUDED.canon,
         motivation = EXCLUDED.motivation, description = EXCLUDED.description
       RETURNING id`,
      [m.slug, m.name, m.kind, Boolean(m.canon), m.motivation ?? null, m.description ?? null]
    );
    const moverId = mrow.id;
    await pool.query('DELETE FROM mover_legs WHERE mover_id = $1', [moverId]); // cascades beats + trails

    for (const r of resolved) {
      const s = spans.find((sp) => sp.i === r.n);
      const { rows: [lrow] } = await pool.query(
        `INSERT INTO mover_legs
           (mover_id, campaign_id, leg_index, kind, date_from, date_to,
            region_id, location_id, location_type, level, road_bias,
            notice_radius_km, contact_radius_km, visibility, greeting,
            active_phases, trace, hostile)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
         RETURNING id`,
        [
          moverId, r.camp, Number(r.leg.index ?? r.n), r.kind, s.from, s.to,
          r.regionId, r.locationId, r.leg.location_type ?? null,
          r.kind === 'presence' ? Number(r.leg.level) : null,
          JSON.stringify(r.leg.road_bias ?? {}),
          r.leg.notice_radius_km ?? null, r.leg.contact_radius_km ?? null,
          r.leg.visibility ?? 'signs', Boolean(r.leg.greeting),
          r.phases, r.leg.trace ?? null, Boolean(r.leg.hostile),
        ]
      );
      const legId = lrow.id;

      for (const b of r.beats) {
        await pool.query(
          `INSERT INTO mover_beats (leg_id, variant, title, text, effects)
           VALUES ($1, $2, $3, $4, $5)`,
          [legId, b.variant ?? 'base', b.title ?? null, b.text, JSON.stringify(b.effects ?? {})]
        );
      }

      if (r.kind === 'march') {
        await pool.query(
          `INSERT INTO mover_trails (leg_id, date, geom)
           SELECT $1, ($2::date + d)::date,
                  ST_LineInterpolatePoint(ST_GeomFromGeoJSON($3), d::float / $4::float)
           FROM generate_series(0, $4) d`,
          [legId, s.from, JSON.stringify(r.trailGeom), r.trailDays]
        );
      }
    }
    console.log(`   ↳ ${m.slug}: ${legs.length} leg(s)`);
  }

  const { rows: [{ count }] } = await pool.query('SELECT COUNT(*) AS count FROM movers');
  const { rows: [{ tcount }] } = await pool.query('SELECT COUNT(*) AS tcount FROM mover_trails');
  console.log(`✅ movers: ${count} movers, ${tcount} trail points`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log('🌱 Starting Middle Earth Database Seed Loading...\n');

  try {
    await pool.query('SELECT NOW()');
    console.log('✅ Database connection established\n');

    await ensureConstraints();
    await ensureSchema();
    await seedKingdoms();
    await seedClimateZones();
    await seedEncounterForms();
    await seedNpcInteractions();
    await seedEntities();
    await backfillEntityFamilies();
    await seedRegionBiomeDescriptions();
    await seedRegionBiomeVariants();
    await seedRegionSeasonalDescriptions();

    // Ensure description_es column exists before loading locations seed
    await runMigrationFile('add_description_es_to_locations.sql');

    await seedFromSqlFile(
      'locations',
      path.join(DATA_DIR, 'sql/locations.sql')
    );
    await seedFromSqlFile(
      'roads',
      path.join(DATA_DIR, 'sql/roads.sql')
    );

    await seedGeoJson({
      label: 'regions',
      file: path.join(DATA_DIR, 'geojson/regions.geojson'),
      table: 'regions',
      getParams: (f) => ({
        sql: `INSERT INTO regions (id, name, region_type, kingdom_id, climate_zone_id,
                description_text, description_summary, area_km2,
                distance_for_encounter, chance_of_encounter, hours_to_encounter, population_ratio, cultural_family, geom, created_at)
              VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,ST_GeomFromGeoJSON($14),NOW())
              ON CONFLICT (id) DO UPDATE SET
                name=EXCLUDED.name, region_type=EXCLUDED.region_type,
                kingdom_id=EXCLUDED.kingdom_id, climate_zone_id=EXCLUDED.climate_zone_id,
                description_text=EXCLUDED.description_text, description_summary=EXCLUDED.description_summary,
                area_km2=EXCLUDED.area_km2, distance_for_encounter=EXCLUDED.distance_for_encounter,
                chance_of_encounter=EXCLUDED.chance_of_encounter, hours_to_encounter=EXCLUDED.hours_to_encounter,
                population_ratio=EXCLUDED.population_ratio, cultural_family=EXCLUDED.cultural_family, geom=EXCLUDED.geom`,
        params: [
          f.properties.id,
          f.properties.name,
          nullIfEmpty(f.properties.region_type),
          nullIfEmpty(f.properties.kingdom_id) !== null ? parseInt(f.properties.kingdom_id) : null,
          nullIfEmpty(f.properties.climate_zone_id) !== null ? parseInt(f.properties.climate_zone_id) : null,
          nullIfEmpty(f.properties.description_text),
          (Array.isArray(f.properties.description_summary) && f.properties.description_summary.length > 0)
            ? f.properties.description_summary
            : null,
          nullIfEmpty(f.properties.area_km2) !== null ? parseFloat(f.properties.area_km2) : null,
          nullIfEmpty(f.properties.distance_for_encounter) !== null ? parseInt(f.properties.distance_for_encounter) : null,
          nullIfEmpty(f.properties.chance_of_encounter) !== null ? parseFloat(f.properties.chance_of_encounter) : null,
          nullIfEmpty(f.properties.hours_to_encounter) !== null ? parseFloat(f.properties.hours_to_encounter) : null,
          nullIfEmpty(f.properties.population_ratio) !== null ? parseFloat(f.properties.population_ratio) : 0.5,
          nullIfEmpty(f.properties.cultural_family),
          JSON.stringify(f.geometry),
        ],
      }),
    });

    await seedGeoJson({
      label: 'biomes',
      file: path.join(DATA_DIR, 'geojson/biomes.geojson'),
      table: 'biomes',
      getParams: (f) => ({
        sql: `INSERT INTO biomes (id, name, type, description, area_km2, geom, created_at)
              VALUES ($1,$2,$3,$4,$5,ST_GeomFromGeoJSON($6),NOW())
              ON CONFLICT (id) DO UPDATE SET
                name=EXCLUDED.name, type=EXCLUDED.type,
                description=EXCLUDED.description, area_km2=EXCLUDED.area_km2, geom=EXCLUDED.geom`,
        params: [
          f.properties.id,
          f.properties.name,
          nullIfEmpty(f.properties.type),
          nullIfEmpty(f.properties.description),
          nullIfEmpty(f.properties.area_km2) !== null ? parseFloat(f.properties.area_km2) : null,
          JSON.stringify(f.geometry),
        ],
      }),
    });

    await seedGeoJson({
      label: 'water',
      file: path.join(DATA_DIR, 'geojson/water.geojson'),
      table: 'water',
      getParams: (f) => ({
        sql: `INSERT INTO water (id, name, water_type, description, geom, created_at)
              VALUES ($1,$2,$3,$4,ST_GeomFromGeoJSON($5),NOW())
              ON CONFLICT (id) DO UPDATE SET
                name=EXCLUDED.name, water_type=EXCLUDED.water_type,
                description=EXCLUDED.description, geom=EXCLUDED.geom`,
        params: [
          f.properties.id,
          f.properties.name,
          f.properties.water_type,
          nullIfEmpty(f.properties.description),
          JSON.stringify(f.geometry),
        ],
      }),
    });

    await backfillLocationRegions();

    await seedPlaces();

    await seedPlacesInteractions();

    // Overnight records backfill needs places_interactions freshly seeded.
    await backfillOvernightRecords();

    // Biome depictions need region_biome_descriptions + variants seeded.
    await backfillBiomeRecords();

    await seedMovers();

    console.log('\n🎉 All seed data loaded successfully!');

  } catch (error) {
    console.error('💥 Fatal error during seed loading:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}

export { main as loadSeeds, seedMovers, pool };
