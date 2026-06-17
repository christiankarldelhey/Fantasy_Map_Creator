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

async function reviewChamberBirds() {
  try {
    const result = await pool.query(`
      SELECT * FROM entities 
      WHERE name = 'Chamber Birds'
    `);
    
    if (result.rows.length === 0) {
      console.log('Chamber Birds not found');
      return;
    }
    
    const entity = result.rows[0];
    console.log('Chamber Birds entity:');
    console.log('ID:', entity.id);
    console.log('Name:', entity.name);
    console.log('Type:', entity.type);
    console.log('Description:');
    console.log(entity.description);
    console.log('\n' + '='.repeat(60));
    
    // The description mentions Chamber Birds, Barrow Owl, and Cliff Buzzard
    // These should be separate entities
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

reviewChamberBirds();
