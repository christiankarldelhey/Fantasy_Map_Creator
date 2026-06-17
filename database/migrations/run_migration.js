import pg from 'pg';
const { Pool } = pg;
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from backend directory
dotenv.config({ path: path.join(__dirname, '../../backend/.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function runMigration() {
  try {
    console.log('Running migration: Convert region_id to region_ids array\n');
    
    const migrationPath = path.join(__dirname, 'alter_entities_region_id_to_array.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');
    
    await pool.query(migrationSQL);
    
    console.log('✅ Migration completed successfully');
    
    // Verify the change
    const result = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'entities' 
      AND column_name LIKE 'region%'
    `);
    
    console.log('\nCurrent region-related columns:');
    result.rows.forEach(row => {
      console.log(`  ${row.column_name}: ${row.data_type}`);
    });
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

runMigration();
