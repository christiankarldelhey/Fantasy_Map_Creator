#!/usr/bin/env node

/**
 * Middle Earth Database Seed Loader
 * 
 * This script loads all seed data into the database in the correct order.
 * It handles CSV files, GeoJSON files, and SQL files with proper error handling
 * and validation.
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables (for local development)
// In Railway, DATABASE_URL is set automatically
dotenv.config();

const { Pool } = pg;

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Migration files in order
const MIGRATION_FILES = [
  '001_seed_kingdoms.sql',
  '002_seed_climate_zones.sql',
  '003_seed_conversation_topics.sql',
  '004_seed_entities_base.sql',
  '005_seed_locations_points.sql',
  '006_seed_roads_lines.sql',
  '007_seed_regions_polygons.sql',
  '008_seed_biomes_polygons.sql',
  '009_seed_water_polygons.sql',
];

/**
 * Execute a SQL file with error handling
 */
async function executeSqlFile(filePath) {
  try {
    const sql = await fs.readFile(filePath, 'utf8');
    console.log(`📄 Executing: ${path.basename(filePath)}`);
    
    await pool.query(sql);
    console.log(`✅ Completed: ${path.basename(filePath)}`);
  } catch (error) {
    console.error(`❌ Error in ${path.basename(filePath)}:`, error.message);
    throw error;
  }
}

/**
 * Run seed migrations in order
 */
async function runSeedMigrations() {
  const migrationsDir = path.join(__dirname, '../migrations');
  
  for (const filename of MIGRATION_FILES) {
    const filePath = path.join(migrationsDir, filename);
    
    try {
      await fs.access(filePath);
      await executeSqlFile(filePath);
    } catch (error) {
      if (error.code === 'ENOENT') {
        console.log(`⚠️  Migration not found: ${filename}`);
      } else {
        console.error(`❌ Error in migration ${filename}:`, error.message);
        throw error;
      }
    }
  }
}

/**
 * Main execution function
 */
async function main() {
  console.log('🌱 Starting Middle Earth Database Seed Loading...\n');
  
  try {
    // Test database connection
    await pool.query('SELECT NOW()');
    console.log('✅ Database connection established\n');
    
    // Run seed migrations
    console.log('📋 Running seed migrations...');
    await runSeedMigrations();
    console.log('✅ Seed migrations completed\n');
    
    console.log('🎉 All seed data loaded successfully!');
    
  } catch (error) {
    console.error('💥 Fatal error during seed loading:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { main as loadSeeds };
