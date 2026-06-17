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

async function separateKingfishers() {
  try {
    console.log('Separating Kingfishers into separate entities...\n');
    
    // Update Kingfishers to only describe Kingfisher
    const kingfisherDesc = `The smallest of Endor's fisherfowl, the Kingfisher is also the most attractive. It has a large, silvery bill and silver, blue, orange and white feathers. The Kingfisher's riverbank home belies its beauty, though, for it is little more than a dirty hole full of old fish bones and rotting mess. Besides fish, the Kingfisher preys on insects, centipedes, and small lizards and amphibians.`;
    
    await pool.query(
      `UPDATE entities 
       SET name = 'Kingfisher', 
           slug = 'kingfisher',
           description = $1 
       WHERE name = 'Kingfishers'`,
      [kingfisherDesc]
    );
    console.log('✅ Updated Kingfisher');
    
    // Create Kirinki
    const kirinkiDesc = `The Kirinki is a tiny scarlet bird with an extremely high chirp that was one of the most beloved songbirds of Númenor. After the Downfall in S.A. 3319, knowledge of these wondrous singers became confined to verse, illustrations in books, and works of art depicting the little creatures. Some of the Faithful who escaped from Númenor, however, brought their pet Kirinkir with them. Whether any survived or thrived is another matter, although there have been rumors that Radagast the Brown has a pair at his home at Rhosgobel (near the southwestern eaves of Mirkwood).`;
    
    await pool.query(
      `INSERT INTO entities (id, name, slug, type, description, url_path, region_id, biomes)
       VALUES ($1, $2, $3, $4, $5, NULL, NULL, ARRAY['forest'])`,
      [randomUUID(), 'Kirinki', createSlug('Kirinki'), 'flying_animals', kirinkiDesc]
    );
    console.log('✅ Created Kirinki');
    
    console.log('\n✅ Separation complete!');
    
  } catch (error) {
    console.error('Error separating entities:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

separateKingfishers();
