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

async function addRegionToThranduil() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Add region 10 to Thranduil's Silvan elves
    const updateQuery = `
      UPDATE entities
      SET region_ids = array_append(region_ids, 10)
      WHERE name LIKE '%Thranduil%'
      AND NOT (10 = ANY(region_ids))
    `;
    
    const result = await client.query(updateQuery);
    console.log(`✓ Added region 10 to Thranduil entity: ${result.rowCount} rows updated`);
    
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
    await addRegionToThranduil();
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
