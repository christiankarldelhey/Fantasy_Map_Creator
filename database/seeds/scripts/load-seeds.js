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
// Seed: conversation_topics
// ---------------------------------------------------------------------------
async function seedConversationTopics() {
  console.log('💬 Seeding conversation_topics...');
  const text = await fs.readFile(path.join(DATA_DIR, 'csv/conversation_topics.csv'), 'utf8');
  const rows = parseCsv(text);
  for (const r of rows) {
    await pool.query(
      `INSERT INTO conversation_topics (entity_type, topic, prose_hint)
       VALUES ($1, $2, $3)
       ON CONFLICT (entity_type, topic) DO UPDATE SET
         prose_hint = EXCLUDED.prose_hint`,
      [r.entity_type, r.topic, nullIfEmpty(r.prose_hint)]
    );
  }
  const { rows: [{ count }] } = await pool.query('SELECT COUNT(*) AS count FROM conversation_topics');
  console.log(`✅ conversation_topics: ${count} rows`);
}

// ---------------------------------------------------------------------------
// Seed: npc_interactions
// ---------------------------------------------------------------------------
async function seedNpcInteractions() {
  console.log('🎭 Seeding npc_interactions...');
  const text = await fs.readFile(path.join(DATA_DIR, 'csv/dialogue_master.csv'), 'utf8');
  const rows = parseCsv(text);
  for (const r of rows) {
    await pool.query(
      `INSERT INTO npc_interactions (id, entity_id, entity_type, interaction_form, shadow_band,
         character_id, cultural_family, region_id, npc_attitude, concrete_content,
         tension, traveller_stance, topic)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
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
         topic            = EXCLUDED.topic`,
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
      ]
    );
  }
  const { rows: [{ count }] } = await pool.query('SELECT COUNT(*) AS count FROM npc_interactions');
  console.log(`✅ npc_interactions: ${count} rows`);
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

    try {
      await pool.query(
        `INSERT INTO entities (id, name, slug, type, active, tier, parent_id, description, description_summary, url_path, biomes, shadow_weight, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
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
           shadow_weight = EXCLUDED.shadow_weight`,
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
          nullIfEmpty(r.created_at) ?? new Date(),
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
// Seed: locations & roads (pure SQL INSERT files — safe to run via pool.query)
// Truncates the table first to handle idempotent re-runs (no ON CONFLICT in these files)
// ---------------------------------------------------------------------------
async function seedFromSqlFile(label, filePath) {
  console.log(`🗺️  Seeding ${label}...`);
  const table = label.split(' ')[0];
  const sql = await fs.readFile(filePath, 'utf8');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`TRUNCATE TABLE ${table} RESTART IDENTITY CASCADE`);
    await client.query(sql);
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
        await pool.query(
          `INSERT INTO region_biome_descriptions (region_name, category, phrases)
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

  // character_state: energy + shadow live values, per-character initial values.
  await pool.query(`
    ALTER TABLE character_state
      ADD COLUMN IF NOT EXISTS energy         INT NOT NULL DEFAULT 100,
      ADD COLUMN IF NOT EXISTS shadow         INT NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS energy_initial INT NOT NULL DEFAULT 100,
      ADD COLUMN IF NOT EXISTS shadow_initial INT NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS last_rest_at   TIMESTAMP
  `);

  // entities: signed shadow_weight.
  await pool.query(`
    ALTER TABLE entities
      ADD COLUMN IF NOT EXISTS shadow_weight INT NOT NULL DEFAULT 0
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

  // Base-template starting values (Aranath 100/0, Celebrian 100/20).
  await pool.query(`
    UPDATE character_state SET energy_initial = 100, shadow_initial = 0, energy = 100, shadow = 0
    WHERE id = 1 AND template_id IS NULL AND owner_user_id IS NULL
  `);
  await pool.query(`
    UPDATE character_state SET energy_initial = 100, shadow_initial = 20, energy = 100, shadow = 20
    WHERE id = 2 AND template_id IS NULL AND owner_user_id IS NULL
  `);

  console.log('✅ Schema ready\n');
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
      table: 'conversation_topics',
      constraint: 'conversation_topics_pkey',
      sql: 'ALTER TABLE conversation_topics ADD PRIMARY KEY (entity_type, topic)',
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
    await seedConversationTopics();
    await seedNpcInteractions();
    await seedEntities();
    await seedRegionBiomeDescriptions();

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
          nullIfEmpty(f.properties.description_summary),
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

    await seedPlacesInteractions();

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

export { main as loadSeeds };
