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
import { fileURLToPath } from 'url';
import pg from 'pg';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../../../backend/.env') });

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
    npc_interactions: 120,
  },
  
  // Tables with geometry that need validation
  geometryTables: [
    'locations',
    'regions', 
    'biomes',
    'water',
    'roads',
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
  ],
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
        AND data_type = 'user-defined'
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
 * Validate foreign key integrity
 */
async function validateForeignKeys() {
  console.log('\n🔗 Validating foreign key integrity...');
  
  for (const fk of VALIDATION_CONFIG.foreignKeys) {
    try {
      const result = await pool.query(`
        SELECT COUNT(*) as count 
        FROM ${fk.table} t
        LEFT JOIN ${fk.references.split('.')[0]} r ON t.${fk.column} = ${fk.references}
        WHERE t.${fk.column} IS NOT NULL AND ${fk.references.split('.')[0]}.id IS NULL
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
    await validateForeignKeys();
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

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { main as validateSeeds };
