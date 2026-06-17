import pg from 'pg';
const { Pool } = pg;
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../backend/.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function fixThranduilName() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Update the entity name and slug to match the disclaimer
    const updateQuery = `
      UPDATE entities
      SET name = $1, slug = $2
      WHERE name LIKE '%Thranduil%'
    `;
    
    await client.query(updateQuery, ["Thranduil's Silvan elves", "thranduils_silvan_elves"]);
    console.log("✓ Updated Thranduil entity name and slug");
    
    await client.query('COMMIT');
    console.log('✓ Update completed successfully');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error:', error);
    throw error;
  } finally {
    client.release();
  }
}

async function main() {
  try {
    await fixThranduilName();
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
