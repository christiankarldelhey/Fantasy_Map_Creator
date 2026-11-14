#!/usr/bin/env node

/**
 * Middle Earth Database Seed Validator
 * 
 * This script validates seed data integrity, checking for:
 * - Required tables exist
 * - Data counts match expectations
 * - Foreign key integrity
 * - Geometry validity
 * - Data format consistency
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import pg from 'pg';
import dotenv from 'dotenv';
import { PHYSICAL_TYPES } from './physical-types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../../backend/.env') });

const { Pool } = pg;

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Validation configuration
const VALIDATION_CONFIG = {
  // Expected minimum row counts
  minRowCounts: {
    kingdoms: 5,
    climate_zones: 10,
    entities: 100,
    locations: 100,
    regions: 20,
    biomes: 15,
    encounter_forms: 130,
    npc_interactions: 120,
  },
  
  // Tables with geometry that need validation
  geometryTables: [
    'locations',
    'regions', 
    'biomes',
    'water',
    'roads',
    'mover_trails',
  ],
  
  // Foreign key relationships to validate
  foreignKeys: [
    {
      table: 'regions',
      column: 'kingdom_id',
      references: 'kingdoms.id'
    },
    {
      table: 'regions', 
      column: 'climate_zone_id',
      references: 'climate_zones.id'
    },
    {
      table: 'character_state',
      column: 'entity_id',
      references: 'entities.id'
    },
    {
      table: 'mover_legs',
      column: 'mover_id',
      references: 'movers.id'
    },
    {
      table: 'mover_legs',
      column: 'campaign_id',
      references: 'campaigns.id'
    },
    {
      table: 'mover_legs',
      column: 'region_id',
      references: 'regions.id'
    },
    {
      table: 'mover_legs',
      column: 'location_id',
      references: 'locations.id'
    },
    {
      table: 'mover_beats',
      column: 'leg_id',
      references: 'mover_legs.id'
    },
    {
      table: 'mover_trails',
      column: 'leg_id',
      references: 'mover_legs.id'
    },
    {
      table: 'locations',
      column: 'depiction_id',
      references: 'places_narration.id'
    },
    {
      table: 'water',
      column: 'depiction_id',
      references: 'places_narration.id'
    },
    {
      table: 'biomes',
      column: 'depiction_id',
      references: 'places_narration.id'
    },
    {
      table: 'roads',
      column: 'depiction_id',
      references: 'places_narration.id'
    },
    {
      table: 'regions',
      column: 'depiction_id',
      references: 'places_narration.id'
    },
    {
      table: 'kingdoms',
      column: 'depiction_id',
      references: 'places_narration.id'
    },
    {
      table: 'trip_days',
      column: 'places_narration_id',
      references: 'places_narration.id'
    },
  ],
};

// refs key → gazetteer table (ADR-0014); keep in sync with load-seeds.js.
const REF_TABLES = {
  water: 'water',
  biome: 'biomes', biomes: 'biomes',
  road: 'roads', roads: 'roads',
  location: 'locations', locations: 'locations',
  region: 'regions', regions: 'regions',
  kingdom: 'kingdoms', kingdoms: 'kingdoms',
};

/**
 * Check if table exists and has expected minimum rows
 */
async function validateTableCounts() {
  console.log('📊 Validating table row counts...');
  
  for (const [table, minCount] of Object.entries(VALIDATION_CONFIG.minRowCounts)) {
    try {
      const result = await pool.query(`
        SELECT COUNT(*) as count 
        FROM ${table}
      `);
      
      const count = parseInt(result.rows[0].count);
      
      if (count >= minCount) {
        console.log(`✅ ${table}: ${count} rows (min: ${minCount})`);
      } else {
        console.log(`⚠️  ${table}: ${count} rows (expected min: ${minCount})`);
      }
      
    } catch (error) {
      if (error.code === '42P01') {
        console.log(`❌ Table ${table} does not exist`);
      } else {
        console.log(`❌ Error checking ${table}: ${error.message}`);
      }
    }
  }
}

/**
 * Validate geometry data
 */
async function validateGeometries() {
  console.log('\n🗺️  Validating geometry data...');
  
  for (const table of VALIDATION_CONFIG.geometryTables) {
    try {
      // Check if table has geometry column
      const geomCheck = await pool.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = '${table}' 
        AND LOWER(data_type) = 'user-defined'
        AND udt_name = 'geometry'
      `);
      
      if (geomCheck.rows.length === 0) {
        console.log(`⚠️  ${table}: No geometry column found`);
        continue;
      }
      
      const geomColumn = geomCheck.rows[0].column_name;
      
      // Check for invalid geometries
      const invalidResult = await pool.query(`
        SELECT COUNT(*) as count 
        FROM ${table} 
        WHERE NOT ST_IsValid(${geomColumn})
      `);
      
      const invalidCount = parseInt(invalidResult.rows[0].count);
      
      // Check for NULL geometries
      const nullResult = await pool.query(`
        SELECT COUNT(*) as count 
        FROM ${table} 
        WHERE ${geomColumn} IS NULL
      `);
      
      const nullCount = parseInt(nullResult.rows[0].count);
      
      // Check for wrong SRID
      const sridResult = await pool.query(`
        SELECT COUNT(*) as count 
        FROM ${table} 
        WHERE ST_SRID(${geomColumn}) != 4326
      `);
      
      const sridCount = parseInt(sridResult.rows[0].count);
      
      if (invalidCount === 0 && nullCount === 0 && sridCount === 0) {
        console.log(`✅ ${table}: All geometries valid`);
      } else {
        console.log(`⚠️  ${table}: ${invalidCount} invalid, ${nullCount} null, ${sridCount} wrong SRID`);
      }
      
    } catch (error) {
      console.log(`❌ Error validating ${table} geometry: ${error.message}`);
    }
  }
}

/**
 * Validate location type vocabulary + anchor provenance (ADR-0014, #103)
 */
async function validateLocationTypes() {
  console.log('\n🧭 Validating location types...');

  const { rows: [nulls] } = await pool.query(
    `SELECT COUNT(*)::int AS n FROM locations WHERE location_type IS NULL`
  );
  if (nulls.n === 0) {
    console.log('✅ location_type: no nulls');
  } else {
    console.log(`⚠️  ${nulls.n} locations have NULL location_type`);
  }

  const { rows: bad } = await pool.query(
    `SELECT DISTINCT location_type FROM locations WHERE location_type IS NOT NULL`
  );
  const offVocab = bad.map((r) => r.location_type).filter((t) => !PHYSICAL_TYPES.has(t));
  if (offVocab.length === 0) {
    console.log(`✅ location_type: all ${bad.length} values in canonical set`);
  } else {
    console.log(`⚠️  location_type off-vocabulary: ${offVocab.join(', ')}`);
  }

  const { rows: src } = await pool.query(
    `SELECT source, COUNT(*)::int AS n FROM locations GROUP BY source ORDER BY source NULLS FIRST`
  );
  const nullSource = src.find((r) => r.source === null)?.n || 0;
  console.log(
    nullSource === 0
      ? `✅ source: ${src.map((r) => `${r.source}=${r.n}`).join(', ')}`
      : `⚠️  ${nullSource} locations with NULL source (${src.filter((r) => r.source).map((r) => `${r.source}=${r.n}`).join(', ')})`
  );
}

/**
 * Validate foreign key integrity
 */
async function validateForeignKeys() {
  console.log('\n🔗 Validating foreign key integrity...');
  
  for (const fk of VALIDATION_CONFIG.foreignKeys) {
    try {
      const result = await pool.query(`
        SELECT COUNT(*) as count 
        FROM ${fk.table} t
        LEFT JOIN ${fk.references.split('.')[0]} r ON t.${fk.column} = r.id
        WHERE t.${fk.column} IS NOT NULL AND r.id IS NULL
      `);
      
      const orphanCount = parseInt(result.rows[0].count);
      
      if (orphanCount === 0) {
        console.log(`✅ ${fk.table}.${fk.column} → ${fk.references}: No orphaned records`);
      } else {
        console.log(`⚠️  ${fk.table}.${fk.column} → ${fk.references}: ${orphanCount} orphaned records`);
      }
      
    } catch (error) {
      console.log(`❌ Error validating ${fk.table}.${fk.column}: ${error.message}`);
    }
  }
}

/**
 * Validate depiction links (ADR-0014): refs is the authored truth,
 * depiction_id the materialized link. Checks:
 *  - duplicate claims: two records listing the same feature in refs
 *  - dangling refs: refs pointing at feature ids that do not exist
 *  - dead depictions: kind='depiction' records no feature points at
 */
async function validateDepictionLinks() {
  console.log('\n🖼️  Validating depiction links...');

  const { rows: [reg] } = await pool.query(`SELECT to_regclass('places_narration') AS t`);
  if (!reg.t) {
    console.log('⚠️  places_narration not present; run the narration migration first');
    return;
  }

  try {
    const { rows: records } = await pool.query(
      `SELECT id, refs FROM places_narration WHERE refs IS NOT NULL`
    );

    // feature key → claiming record ids
    const claims = new Map();
    const unknownKeys = [];
    for (const r of records) {
      for (const [key, ids] of Object.entries(r.refs || {})) {
        const table = REF_TABLES[key];
        if (!table) { unknownKeys.push(`${r.id}:${key}`); continue; }
        for (const fid of ids || []) {
          const fk = `${table}#${fid}`;
          if (!claims.has(fk)) claims.set(fk, []);
          claims.get(fk).push(r.id);
        }
      }
    }

    const dupes = [...claims.entries()].filter(([, rs]) => rs.length > 1);
    if (dupes.length === 0) {
      console.log('✅ refs: no duplicate feature claims');
    } else {
      console.log(`⚠️  refs: ${dupes.length} features claimed by multiple records`);
      for (const [fk, rs] of dupes.slice(0, 10)) console.log(`   - ${fk}: ${rs.join(', ')}`);
    }

    if (unknownKeys.length) {
      console.log(`⚠️  refs: ${unknownKeys.length} unknown refs keys: ${unknownKeys.slice(0, 10).join(', ')}`);
    }

    // dangling refs → feature id not present in its table
    const byTable = new Map();
    for (const fk of claims.keys()) {
      const [table, fid] = fk.split('#');
      if (!byTable.has(table)) byTable.set(table, []);
      byTable.get(table).push(Number(fid));
    }
    let dangling = 0;
    for (const [table, ids] of byTable) {
      const { rows } = await pool.query(
        `SELECT id FROM ${table} WHERE id = ANY($1::int[])`, [ids]
      );
      const present = new Set(rows.map((r) => r.id));
      const gone = ids.filter((i) => !present.has(i));
      dangling += gone.length;
      if (gone.length) console.log(`   - ${table}: ${gone.length} refs to missing ids (${gone.slice(0, 10).join(', ')})`);
    }
    if (dangling === 0) console.log('✅ refs: all feature ids exist');

    // dead bindings: a record claims features in refs but no feature's
    // depiction_id materialized back to it (refs is the authored truth —
    // the seed materializes; a mismatch means the link never ran).
    const { rows: dead } = await pool.query(
      `SELECT p.id FROM places_narration p
       WHERE p.refs IS NOT NULL
         AND NOT EXISTS (SELECT 1 FROM locations l WHERE l.depiction_id = p.id)
         AND NOT EXISTS (SELECT 1 FROM water w     WHERE w.depiction_id = p.id)
         AND NOT EXISTS (SELECT 1 FROM biomes b    WHERE b.depiction_id = p.id)
         AND NOT EXISTS (SELECT 1 FROM roads r     WHERE r.depiction_id = p.id)
         AND NOT EXISTS (SELECT 1 FROM regions g   WHERE g.depiction_id = p.id)
         AND NOT EXISTS (SELECT 1 FROM kingdoms k  WHERE k.depiction_id = p.id)`
    );
    if (dead.length === 0) {
      console.log('✅ no dead depiction records');
    } else {
      console.log(`⚠️  ${dead.length} records with refs but no materialized depiction_id: ${dead.map((d) => d.id).slice(0, 10).join(', ')}`);
    }

    // overnight records (interactive[] tagged 'context:overnight') must carry
    // at least one scope dimension — a scopeless record can never be resolved
    // (old chk_scope equivalent).
    const { rows: [scopeless] } = await pool.query(
      `SELECT COUNT(*)::int AS n FROM places_narration
       WHERE EXISTS (SELECT 1 FROM jsonb_array_elements(interactive) s
                     WHERE s->'tags' ? 'context:overnight')
         AND location_id IS NULL AND type IS NULL
         AND region_id IS NULL AND cultural_family IS NULL`
    );
    if (scopeless.n === 0) {
      console.log('✅ overnight records: all carry a scope');
    } else {
      console.log(`⚠️  ${scopeless.n} overnight records with no scope dimension (unresolvable)`);
    }
  } catch (error) {
    console.log(`❌ Error validating depiction links: ${error.message}`);
  }
}

/**
 * Validate the narration-v2 record shape (ADR-0015):
 *  - kind is only 'place' or 'ambient'
 *  - name/type are localized {en,es} objects when present
 *  - payload carries only provenance/scope-metadata keys (no prose)
 *  - region_id is region_ids' first element when the list is present
 *  - every gating/driver tag exists in the narration_tags registry
 *  - every situation carries at least one option with an outcome
 */
async function validateNarrationShape() {
  console.log('\n📐 Validating narration record shape...');

  const { rows: [reg] } = await pool.query(`SELECT to_regclass('places_narration') AS t`);
  if (!reg.t) {
    console.log('⚠️  places_narration not present; run the narration migration first');
    return;
  }

  try {
    const { rows: [badKinds] } = await pool.query(
      `SELECT COUNT(*)::int AS n FROM places_narration WHERE kind NOT IN ('place','ambient')`
    );
    if (badKinds.n === 0) {
      console.log('✅ kind vocabulary: only place/ambient');
    } else {
      console.log(`⚠️  ${badKinds.n} records with a kind outside place/ambient`);
    }

    // payload keeps provenance + scope metadata only — prose/spec keys that
    // migrated to real columns must not linger.
    const ALLOWED_PAYLOAD_KEYS = [
      'origin', 'legacy_id', 'anchor_hint', 'location_ref', 'approx_point',
      'region', 'region_confidence', 'place_ref', 'title',
      'region_name', 'category',
    ];
    const { rows: dirty } = await pool.query(
      `SELECT p.id, k.key FROM places_narration p,
              jsonb_object_keys(p.payload) k(key)
       WHERE NOT (k.key = ANY($1::text[]))
       LIMIT 10`,
      [ALLOWED_PAYLOAD_KEYS]
    );
    if (dirty.length === 0) {
      console.log('✅ payload: provenance keys only');
    } else {
      console.log(`⚠️  unexpected payload keys: ${dirty.map((d) => `${d.id}.${d.key}`).join(', ')}`);
    }

    const { rows: [badLoc] } = await pool.query(
      `SELECT COUNT(*)::int AS n FROM places_narration
       WHERE (name IS NOT NULL AND jsonb_typeof(name) <> 'object')
          OR (type IS NOT NULL AND jsonb_typeof(type) <> 'object')`
    );
    if (badLoc.n === 0) {
      console.log('✅ name/type are localized objects');
    } else {
      console.log(`⚠️  ${badLoc.n} records with non-localized name/type`);
    }

    const { rows: [misaligned] } = await pool.query(
      `SELECT COUNT(*)::int AS n FROM places_narration
       WHERE region_ids IS NOT NULL AND region_id IS DISTINCT FROM region_ids[1]`
    );
    if (misaligned.n === 0) {
      console.log('✅ region_id is region_ids[1] wherever the list exists');
    } else {
      console.log(`⚠️  ${misaligned.n} records whose region_id is not region_ids[1]`);
    }

    const { rows: [emptySits] } = await pool.query(
      `SELECT COUNT(*)::int AS n FROM places_narration
       WHERE EXISTS (SELECT 1 FROM jsonb_array_elements(interactive) s
                     WHERE jsonb_typeof(s->'options') <> 'array'
                        OR jsonb_array_length(s->'options') = 0)`
    );
    if (emptySits.n === 0) {
      console.log('✅ every situation carries at least one option');
    } else {
      console.log(`⚠️  ${emptySits.n} records have situations with no options`);
    }

    await validateNarrationTags();
  } catch (error) {
    console.log(`❌ Error validating narration shape: ${error.message}`);
  }
}

/**
 * Every gating tag (situation/variant tags + not_tags + option drivers) must
 * resolve against the narration_tags registry. Pattern families are stored
 * as a single '*' row whose pattern lives in tags.json.
 */
async function validateNarrationTags() {
  const { rows: [reg] } = await pool.query(`SELECT to_regclass('narration_tags') AS t`);
  if (!reg.t) {
    console.log('⚠️  narration_tags not present; run the narration migration first');
    return;
  }

  const tagsFile = JSON.parse(
    await fs.readFile(path.join(__dirname, '../data/json/tags.json'), 'utf8')
  );
  const patterns = new Map(
    Object.entries(tagsFile.families || {})
      .filter(([, d]) => d.pattern)
      .map(([fam, d]) => [fam, new RegExp(d.pattern)])
  );
  const { rows: registered } = await pool.query(
    `SELECT family, value FROM narration_tags`
  );
  const closed = new Map();
  for (const r of registered) {
    if (r.value === '*') continue;
    (closed.get(r.family) || closed.set(r.family, new Set()).get(r.family)).add(r.value);
  }
  const tagOk = (tag) => {
    const i = String(tag).indexOf(':');
    if (i < 0) return false;
    const [fam, val] = [tag.slice(0, i), tag.slice(i + 1)];
    if (patterns.has(fam)) return patterns.get(fam).test(val);
    return closed.get(fam)?.has(val) ?? false;
  };

  const { rows } = await pool.query(
    `SELECT id, interactive, variants FROM places_narration
      WHERE interactive IS NOT NULL OR variants IS NOT NULL`
  );
  const bad = [];
  for (const r of rows) {
    const check = (tag, where) => { if (!tagOk(tag)) bad.push(`${r.id}:${where}:${tag}`); };
    for (const s of r.interactive || []) {
      for (const t of s?.tags || []) check(t, 'interactive');
      for (const t of s?.not_tags || []) check(t, 'interactive-not');
      for (const o of s?.options || []) { if (o?.tag) check(o.tag, 'option-driver'); }
    }
    for (const v of r.variants || []) {
      for (const t of v?.tags || []) check(t, 'variant');
      for (const t of v?.not_tags || []) check(t, 'variant-not');
    }
  }
  if (bad.length === 0) {
    console.log('✅ all gating/driver tags resolve against narration_tags');
  } else {
    console.log(`⚠️  ${bad.length} tags outside the registry: ${bad.slice(0, 15).join(', ')}`);
  }
}

/**
 * Validate mover leg rules (Living Map seed family).
 * Tolerates empty tables: no movers authored yet is a valid state.
 */
async function validateMovers() {
  console.log('\n🚶 Validating movers...');

  const { rows: [t] } = await pool.query(`SELECT to_regclass('mover_legs') AS t`);
  if (!t.t) {
    console.log('⚠️  mover tables not present; run the movers migration first');
    return;
  }

  const checks = [
    {
      label: 'date windows sane (date_to >= date_from)',
      sql: `SELECT COUNT(*) AS n FROM mover_legs WHERE date_to < date_from`,
    },
    {
      label: 'leg-kind scopes (presence→region, resident→location)',
      sql: `SELECT COUNT(*) AS n FROM mover_legs
            WHERE (kind = 'presence' AND region_id IS NULL)
               OR (kind = 'resident' AND location_id IS NULL AND location_type IS NULL)`,
    },
    {
      label: 'presence legs carry a level',
      sql: `SELECT COUNT(*) AS n FROM mover_legs WHERE kind = 'presence' AND level IS NULL`,
    },
    {
      label: 'march legs carry radii',
      sql: `SELECT COUNT(*) AS n FROM mover_legs
            WHERE kind = 'march' AND (notice_radius_km IS NULL OR contact_radius_km IS NULL)`,
    },
    {
      label: 'march legs have baked trail rows',
      sql: `SELECT COUNT(*) AS n FROM mover_legs l
            WHERE l.kind = 'march'
              AND NOT EXISTS (SELECT 1 FROM mover_trails tr WHERE tr.leg_id = l.id)`,
    },
    {
      label: 'no overlapping legs per mover',
      sql: `SELECT COUNT(*) AS n FROM mover_legs a
            JOIN mover_legs b ON a.mover_id = b.mover_id AND a.id < b.id
            WHERE a.date_from <= b.date_to AND b.date_from <= a.date_to`,
    },
    {
      label: 'trail rows inside their leg window',
      sql: `SELECT COUNT(*) AS n FROM mover_trails tr
            JOIN mover_legs l ON tr.leg_id = l.id
            WHERE tr.date < l.date_from OR tr.date > l.date_to`,
    },
  ];

  for (const { label, sql } of checks) {
    try {
      const { rows: [{ n }] } = await pool.query(sql);
      if (Number(n) === 0) {
        console.log(`✅ ${label}`);
      } else {
        console.log(`⚠️  ${label}: ${n} violations`);
      }
    } catch (error) {
      console.log(`❌ ${label}: ${error.message}`);
    }
  }
}

/**
 * Validate data formats and consistency
 */
async function validateDataFormats() {
  console.log('\n📋 Validating data formats...');
  
  // Check for required non-null fields
  const requiredFields = [
    { table: 'kingdoms', column: 'name' },
    { table: 'climate_zones', column: 'koppen' },
    { table: 'entities', column: 'type' },
    { table: 'locations', column: 'name' },
    { table: 'regions', column: 'name' },
  ];
  
  for (const field of requiredFields) {
    try {
      const result = await pool.query(`
        SELECT COUNT(*) as count 
        FROM ${field.table} 
        WHERE ${field.column} IS NULL OR ${field.column} = ''
      `);
      
      const nullCount = parseInt(result.rows[0].count);
      
      if (nullCount === 0) {
        console.log(`✅ ${field.table}.${field.column}: No null/empty values`);
      } else {
        console.log(`⚠️  ${field.table}.${field.column}: ${nullCount} null/empty values`);
      }
      
    } catch (error) {
      console.log(`❌ Error checking ${field.table}.${field.column}: ${error.message}`);
    }
  }
  
  // Check for duplicate slugs in entities
  try {
    const duplicateResult = await pool.query(`
      SELECT slug, COUNT(*) as count 
      FROM entities 
      WHERE slug IS NOT NULL 
      GROUP BY slug 
      HAVING COUNT(*) > 1
    `);
    
    if (duplicateResult.rows.length === 0) {
      console.log('✅ entities.slug: No duplicates');
    } else {
      console.log(`⚠️  entities.slug: ${duplicateResult.rows.length} duplicates found`);
      duplicateResult.rows.forEach(row => {
        console.log(`   - ${row.slug}: ${row.count} occurrences`);
      });
    }
  } catch (error) {
    console.log(`❌ Error checking entities.slug: ${error.message}`);
  }
}

/**
 * Validate seed files exist
 */
async function validateSeedFiles() {
  console.log('\n📁 Validating seed files...');
  
  const seedDir = path.join(__dirname, '../data');
  const migrationsDir = path.join(__dirname, '../migrations');
  
  // Check data directories
  const dataDirs = ['csv', 'geojson', 'sql'];
  for (const dir of dataDirs) {
    try {
      await fs.access(path.join(seedDir, dir));
      console.log(`✅ data/${dir}/ directory exists`);
    } catch (error) {
      console.log(`⚠️  data/${dir}/ directory missing`);
    }
  }
  
  // Check migration files
  const migrationFiles = [
    '001_seed_kingdoms.sql',
    '002_seed_climate_zones.sql',
    '010_seed_npc_interactions.sql',
  ];
  
  for (const file of migrationFiles) {
    try {
      await fs.access(path.join(migrationsDir, file));
      console.log(`✅ migrations/${file} exists`);
    } catch (error) {
      console.log(`⚠️  migrations/${file} missing`);
    }
  }
}

/**
 * Generate validation report
 */
async function generateReport() {
  console.log('\n📄 Generating validation report...');
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const reportFile = path.join(__dirname, `../validation-report-${timestamp}.txt`);
  
  // Get table statistics
  const tablesResult = await pool.query(`
    SELECT table_name, 
           (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
    FROM information_schema.tables t
    WHERE table_schema = 'public'
    ORDER BY table_name
  `);
  
  let report = 'Middle Earth Database Validation Report\n';
  report += `Generated: ${new Date().toISOString()}\n`;
  report += '=' .repeat(50) + '\n\n';
  
  report += 'Tables:\n';
  for (const row of tablesResult.rows) {
    try {
      const countResult = await pool.query(`SELECT COUNT(*) as count FROM ${row.table_name}`);
      report += `- ${row.table_name}: ${countResult.rows[0].count} rows, ${row.column_count} columns\n`;
    } catch (error) {
      report += `- ${row.table_name}: Error counting rows\n`;
    }
  }
  
  await fs.writeFile(reportFile, report);
  console.log(`✅ Report saved to: ${reportFile}`);
}

/**
 * Main execution function
 */
async function main() {
  console.log('🔍 Starting Middle Earth Database Seed Validation...\n');
  
  try {
    // Test database connection
    await pool.query('SELECT NOW()');
    console.log('✅ Database connection established\n');
    
    // Run all validations
    await validateSeedFiles();
    await validateTableCounts();
    await validateGeometries();
    await validateLocationTypes();
    await validateForeignKeys();
    await validateDepictionLinks();
    await validateNarrationShape();
    await validateMovers();
    await validateDataFormats();
    await generateReport();
    
    console.log('\n🎉 Validation completed!');
    
  } catch (error) {
    console.error('💥 Fatal error during validation:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run if called directly (pathToFileURL handles spaces in the repo path)
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}

export { main as validateSeeds };
