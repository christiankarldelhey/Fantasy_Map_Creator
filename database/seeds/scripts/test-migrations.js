#!/usr/bin/env node

/**
 * Test Seed Migrations
 * 
 * This script tests the seed migrations without dropping any tables.
 * It validates that the migrations can execute successfully and load data.
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

// Migration files to test
const MIGRATION_FILES = [
  '001_seed_kingdoms.sql',
  '002_seed_climate_zones.sql',
  '003_seed_conversation_topics.sql',
  '004_seed_entities_base.sql',
];

/**
 * Test a single migration file
 */
async function testMigration(filename) {
  console.log(`🧪 Testing migration: ${filename}`);
  
  try {
    // Read migration file
    const migrationPath = path.join(__dirname, '../migrations', filename);
    const migration = await fs.readFile(migrationPath, 'utf8');
    
    // Remove DROP statements for testing
    const safeMigration = migration
      .split('\n')
      .filter(line => !line.trim().startsWith('DROP TABLE'))
      .join('\n');
    
    // Execute migration
    await pool.query(safeMigration);
    console.log(`✅ ${filename} - Migration executed successfully`);
    
    return true;
    
  } catch (error) {
    console.error(`❌ ${filename} - Migration failed:`, error.message);
    return false;
  }
}

/**
 * Verify data was loaded correctly
 */
async function verifyData() {
  console.log('\n🔍 Verifying loaded data...');
  
  const checks = [
    { table: 'kingdoms', minCount: 30 },
    { table: 'climate_zones', minCount: 50 },
    { table: 'conversation_topics', minCount: 10 },
    { table: 'entities', minCount: 400 },
  ];
  
  for (const check of checks) {
    try {
      const result = await pool.query(`SELECT COUNT(*) as count FROM ${check.table}`);
      const count = parseInt(result.rows[0].count);
      
      if (count >= check.minCount) {
        console.log(`✅ ${check.table}: ${count} rows (min: ${check.minCount})`);
      } else {
        console.log(`⚠️  ${check.table}: ${count} rows (expected min: ${check.minCount})`);
      }
    } catch (error) {
      console.log(`❌ Error checking ${check.table}: ${error.message}`);
    }
  }
}

/**
 * Main test function
 */
async function main() {
  console.log('🧪 Starting Seed Migration Tests...\n');
  
  try {
    // Test database connection
    await pool.query('SELECT NOW()');
    console.log('✅ Database connection established\n');
    
    // Test each migration
    let successCount = 0;
    for (const filename of MIGRATION_FILES) {
      const success = await testMigration(filename);
      if (success) successCount++;
    }
    
    console.log(`\n📊 Migration Test Results: ${successCount}/${MIGRATION_FILES.length} successful`);
    
    // Verify data if migrations were successful
    if (successCount === MIGRATION_FILES.length) {
      await verifyData();
    }
    
    console.log('\n🎉 Migration testing completed!');
    
  } catch (error) {
    console.error('💥 Fatal error during testing:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { main as testMigrations };
