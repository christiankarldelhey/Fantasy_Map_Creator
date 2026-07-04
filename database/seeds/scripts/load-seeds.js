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

    try {
      await pool.query(
        `INSERT INTO entities (id, name, slug, type, active, tier, parent_id, description, description_summary, url_path, biomes, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
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
           biomes = EXCLUDED.biomes`,
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
    await client.query(`TRUNCATE TABLE ${table} RESTART IDENTITY`);
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
    {
      table: 'region_biome_descriptions',
      constraint: 'region_biome_descriptions_pkey',
      sql: 'ALTER TABLE region_biome_descriptions ADD PRIMARY KEY (id)',
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
    await seedKingdoms();
    await seedClimateZones();
    await seedConversationTopics();
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
                distance_for_encounter, chance_of_encounter, hours_to_encounter, population_ratio, geom, created_at)
              VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,ST_GeomFromGeoJSON($13),NOW())
              ON CONFLICT (id) DO UPDATE SET
                name=EXCLUDED.name, region_type=EXCLUDED.region_type,
                kingdom_id=EXCLUDED.kingdom_id, climate_zone_id=EXCLUDED.climate_zone_id,
                description_text=EXCLUDED.description_text, description_summary=EXCLUDED.description_summary,
                area_km2=EXCLUDED.area_km2, distance_for_encounter=EXCLUDED.distance_for_encounter,
                chance_of_encounter=EXCLUDED.chance_of_encounter, hours_to_encounter=EXCLUDED.hours_to_encounter,
                population_ratio=EXCLUDED.population_ratio, geom=EXCLUDED.geom`,
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
