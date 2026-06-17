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

async function fixEgladil() {
  try {
    console.log('🔍 Fetching En Egladil region ID...\n');
    
    // Get En Egladil region ID
    const regionResult = await pool.query(
      "SELECT id, name FROM regions WHERE name = 'En Egladil'"
    );
    
    if (regionResult.rows.length === 0) {
      console.log('❌ Region "En Egladil" not found');
      return;
    }
    
    const region = regionResult.rows[0];
    console.log(`Found region: ${region.name} (ID: ${region.id})\n`);
    
    // Get Red Wolves entity
    const entityResult = await pool.query(
      "SELECT id, name, region_ids FROM entities WHERE name = 'Red Wolves'"
    );
    
    if (entityResult.rows.length === 0) {
      console.log('❌ Entity "Red Wolves" not found');
      return;
    }
    
    const entity = entityResult.rows[0];
    console.log(`Found entity: ${entity.name} (ID: ${entity.id})`);
    console.log(`Current regions: ${entity.region_ids ? entity.region_ids.join(', ') : 'none'}\n`);
    
    // Add region if not already present
    const currentRegions = entity.region_ids || [];
    if (!currentRegions.includes(region.id)) {
      const newRegions = [...currentRegions, region.id];
      await pool.query(
        'UPDATE entities SET region_ids = $1 WHERE id = $2',
        [newRegions, entity.id]
      );
      console.log(`✅ Updated Red Wolves: added region En Egladil (${region.id})`);
      console.log(`New regions: ${newRegions.join(', ')}`);
    } else {
      console.log(`⏭️  Red Wolves already has region En Egladil`);
    }
    
  } catch (error) {
    console.error('Error:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

fixEgladil();
