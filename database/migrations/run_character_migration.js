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
    console.log('Running migration: Create character_state table\n');
    
    const migrationPath = path.join(__dirname, 'create_character_state_table.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');
    
    await pool.query(migrationSQL);
    
    console.log('✅ Migration completed successfully');
    
    // Verify the change
    const result = await pool.query(`
      SELECT * FROM character_state
    `);
    
    console.log('\nCurrent character state rows in DB:');
    result.rows.forEach(row => {
      console.log(`  ID: ${row.id}, Name: ${row.name}, Lng: ${row.current_lng}, Lat: ${row.current_lat}`);
    });
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

runMigration();
