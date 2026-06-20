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
    console.log('Running migration: Add danger column and import entities from CSV\n');
    
    const migrationPath = path.join(__dirname, 'add_danger_column_and_import_entities.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');
    
    await pool.query(migrationSQL);
    
    console.log('✅ Migration completed successfully');
    
    // Verify the change
    const result = await pool.query(`
      SELECT column_name, data_type, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'entities' 
      AND column_name = 'danger'
    `);
    
    if (result.rows.length > 0) {
      console.log('\n✅ Danger column verified:');
      console.log(`  Column: ${result.rows[0].column_name}`);
      console.log(`  Type: ${result.rows[0].data_type}`);
      console.log(`  Default: ${result.rows[0].column_default}`);
    } else {
      console.log('\n⚠️  Warning: Danger column not found in entities table');
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

runMigration();
