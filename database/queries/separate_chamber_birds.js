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

async function separateChamberBirds() {
  try {
    console.log('Separating Chamber Birds into separate entities...\n');
    
    // Update Chamber Birds to only describe Chamber Bird
    const chamberBirdDesc = `White, mute, and almost blind, the odd, fungus-eating Chamber Bird is one of the many strange inhabitants of Moria. They seek out the fungus by their remarkable sense of smell (odd indeed for a bird) and note enemies by their inaudibly high cries, in the manner of bats. Their large, gaping beaks have serrated edges and their bluish talons are both sharp and strong. Totally herbivorous (primarily fungivorous), they rarely attack animals unless surprised or starving (some instinct for meat seems to remain from some predacious ancestor).`;
    
    await pool.query(
      `UPDATE entities 
       SET name = 'Chamber Bird', 
           slug = 'chamber_bird',
           description = $1 
       WHERE name = 'Chamber Birds'`,
      [chamberBirdDesc]
    );
    console.log('✅ Updated Chamber Bird');
    
    // Create Barrow Owl
    const barrowOwlDesc = `The Barrow Owl is a small, rare Owl which has taken to living in the open barrows and abandoned gopher tunnels of Eriador (especially in northern Cardolan). Nocturnal and exceedingly specialized, they are virtually blind when confronted with bright light (e.g., in day- or torchlight). This is important, for they startle easily and swarm like Bees when confronted with a potential foe. They carry numerous diseases, including rabies and lycanthresis, to which they are immune. (Normally 2nd-3rd level, the latter disease is a severe psychiatric infliction that affects victims in 110 days and leaves them with the false belief that they are wild animals.)`;
    
    await pool.query(
      `INSERT INTO entities (id, name, slug, type, description, url_path, region_id, biomes)
       VALUES ($1, $2, $3, $4, $5, NULL, NULL, ARRAY['forest'])`,
      [randomUUID(), 'Barrow Owl', createSlug('Barrow Owl'), 'flying_animals', barrowOwlDesc]
    );
    console.log('✅ Created Barrow Owl');
    
    // Create Cliff Buzzard
    const cliffBuzzardDesc = `The Cliff Buzzard is a large, black-feathered bird of the mountains. It builds its nest on inaccessible cliffs. Often several pairs will nest in the same area, behavior more typical of the Corvidae (crowlike birds) than of the Raptors (Hawks and so on). Cliff Buzzards exhibit a great deal of intelligence (for birds) and will cooperate in hunting. They will band together to mob some large creature and drive it over a cliff so that they may all feast together on the shattered body. Any wounded creature, no matter what its size, may be subject to the unwanted attentions of the Cliff Buzzards. They are most common on the southern slopes of the White Mountains.`;
    
    await pool.query(
      `INSERT INTO entities (id, name, slug, type, description, url_path, region_id, biomes)
       VALUES ($1, $2, $3, $4, $5, NULL, NULL, ARRAY['mountains'])`,
      [randomUUID(), 'Cliff Buzzard', createSlug('Cliff Buzzard'), 'flying_animals', cliffBuzzardDesc]
    );
    console.log('✅ Created Cliff Buzzard');
    
    console.log('\n✅ Separation complete!');
    
  } catch (error) {
    console.error('Error separating entities:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

separateChamberBirds();
