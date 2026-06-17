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

// Function to create slug from name
function createSlug(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .trim();
}

async function createMissingEntities() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const entitiesToCreate = [
      { name: 'Dúnedain', type: 'humans', description: 'The High Men of the West, descendants of the Númenóreans.' },
      { name: 'Silvan Elves', type: 'elves', description: 'Woodland elves of Mirkwood and other forests.' },
      { name: 'Hobbits', type: 'hobbits', description: 'Small folk of the Shire and surrounding areas.' },
      { name: 'common orcs', type: 'orcs', description: 'Common orc soldiers and warriors.' },
      { name: 'Giants', type: 'giants', description: 'Massive humanoid creatures found in mountains and wilderness.' },
      { name: 'Laiquendi', type: 'elves', description: 'Green-elves of Ossiriand.' },
      { name: 'Sindarin', type: 'elves', description: 'Grey-elves who speak Sindarin.' },
      { name: 'Farathrim', type: 'humans', description: 'People of Far Harad.' },
    ];
    
    for (const entity of entitiesToCreate) {
      const slug = createSlug(entity.name);
      
      // Check if already exists
      const checkResult = await client.query('SELECT id FROM entities WHERE slug = $1', [slug]);
      
      if (checkResult.rows.length > 0) {
        console.log(`- Entity "${entity.name}" already exists, skipping`);
        continue;
      }
      
      const insertQuery = `
        INSERT INTO entities (name, slug, type, description, region_ids)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id
      `;
      
      const result = await client.query(insertQuery, [entity.name, slug, entity.type, entity.description, []]);
      console.log(`✓ Created entity: ${entity.name}`);
    }
    
    await client.query('COMMIT');
    console.log('\n✓ All missing entities created successfully');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating entities:', error);
    throw error;
  } finally {
    client.release();
  }
}

async function main() {
  try {
    await createMissingEntities();
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
