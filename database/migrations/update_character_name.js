import pg from 'pg';
const { Pool } = pg;
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from backend directory
dotenv.config({ path: path.join(__dirname, '../../backend/.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function runUpdate() {
  try {
    console.log("Updating character name to 'Aranath'...\n");
    
    // Update name in DB
    await pool.query(`
      UPDATE character_state
      SET name = 'Aranath'
      WHERE id = 1
    `);
    
    console.log('✅ Name updated successfully');
    
    // Verify
    const result = await pool.query('SELECT * FROM character_state WHERE id = 1');
    console.log('Current character state:', result.rows[0]);
    
  } catch (error) {
    console.error('❌ Update failed:', error);
  } finally {
    await pool.end();
  }
}

runUpdate();
