import pg from 'pg';
const { Pool } = pg;
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from backend directory
dotenv.config({ path: path.join(__dirname, '../../backend/.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

function createSlug(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .trim();
}

async function separateCrakesCoots() {
  try {
    console.log('Separating Crakes And Coots into separate entities...\n');
    
    // Delete the original entity
    await pool.query(`DELETE FROM entities WHERE name = 'Crakes And Coots'`);
    console.log('✅ Deleted Crakes And Coots');
    
    // Create Bittern
    const bitternDesc = `A wading and fishing bird found in the deltas of northwestern Endor, the Bittern, or Northern Heron, is known for its strange resonant, mournful cry. It is slow, cunning, deliberate hunter that feeds on snakes, crustaceans, and fish. Bitterns migrate, spending their winters in the wetlands along the temperate seacoasts and their summers in the lakes and deltas of the North.`;
    
    await pool.query(
      `INSERT INTO entities (id, name, slug, type, description, url_path, region_id, biomes)
       VALUES ($1, $2, $3, $4, $5, NULL, NULL, ARRAY['marsh', 'river'])`,
      [randomUUID(), 'Bittern', createSlug('Bittern'), 'flying_animals', bitternDesc]
    );
    console.log('✅ Created Bittern');
    
    // Create Crake
    const crakeDesc = `A black-and-purple ducklike species, the Crake is known as a noisy and obnoxious waterbird. It has wide, splayed feet, allowing it to dash across pondweed and mudflats. Crakes are also excellent swimmers and remarkably swift flyers. They are among the most flexible and adaptable species in all of Middle-earth, ranging as far north as Forodwaith, Mur, and Urb.`;
    
    await pool.query(
      `INSERT INTO entities (id, name, slug, type, description, url_path, region_id, biomes)
       VALUES ($1, $2, $3, $4, $5, NULL, NULL, ARRAY['marsh', 'river'])`,
      [randomUUID(), 'Crake', createSlug('Crake'), 'flying_animals', crakeDesc]
    );
    console.log('✅ Created Crake');
    
    // Create Coot
    const cootDesc = `The Crake's closest relative, the Coot, builds island nests up to three or four feet across from reeds and weeds.`;
    
    await pool.query(
      `INSERT INTO entities (id, name, slug, type, description, url_path, region_id, biomes)
       VALUES ($1, $2, $3, $4, $5, NULL, NULL, ARRAY['marsh', 'river'])`,
      [randomUUID(), 'Coot', createSlug('Coot'), 'flying_animals', cootDesc]
    );
    console.log('✅ Created Coot');
    
    console.log('\n✅ Separation complete!');
    
  } catch (error) {
    console.error('Error separating entities:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

separateCrakesCoots();
