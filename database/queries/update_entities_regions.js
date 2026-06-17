import pg from 'pg';
const { Pool } = pg;
import dotenv from 'dotenv';
import { randomUUID } from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from backend directory
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

async function updateEntities() {
  try {
    console.log('🔍 Fetching region and entity data...\n');
    
    // Get region IDs
    const regionsResult = await pool.query(`
      SELECT id, name 
      FROM regions 
      WHERE name IN ('Eothraim', 'Mirkwood Wilds', 'Woodland Realm', 'Westmarch', 'Iron Hills')
      ORDER BY name
    `);
    
    const regionMap = {};
    regionsResult.rows.forEach(r => {
      regionMap[r.name] = r.id;
    });
    
    console.log('Region IDs:');
    Object.entries(regionMap).forEach(([name, id]) => {
      console.log(`  ${name}: ${id}`);
    });
    
    // Get entity IDs
    const entitiesResult = await pool.query(`
      SELECT id, name, slug, type, region_ids 
      FROM entities 
      WHERE name IN (
        'Culcarnix', 'Wild Goats', 'Kine Of Araw', 'Ëgil''s Vipers', 
        'Great Eagles', 'Grass Cats', 'Grey Wolves', 'Ground Bees',
        'Rohirrim', 'Dunlendings', 'Wargs', 'North Bears', 'Fell Beasts'
      )
    `);
    
    const entityMap = {};
    entitiesResult.rows.forEach(e => {
      entityMap[e.name] = e;
    });
    
    console.log('\nEntity IDs:');
    Object.entries(entityMap).forEach(([name, data]) => {
      console.log(`  ${name}: ${data.id} (type: ${data.type})`);
    });
    
    // Check for boars
    const boarsResult = await pool.query(`
      SELECT id, name, slug, type 
      FROM entities 
      WHERE name ILIKE '%boar%' OR slug ILIKE '%boar%'
    `);
    
    console.log('\nBoars-related entities:');
    if (boarsResult.rows.length > 0) {
      boarsResult.rows.forEach(b => {
        console.log(`  ${b.name}: ${b.id} (type: ${b.type})`);
      });
    } else {
      console.log('  None found - will create new "Wild Boars" entity');
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('EXECUTING UPDATES');
    console.log('='.repeat(60) + '\n');
    
    let updatedCount = 0;
    let createdCount = 0;
    
    // Update Culcarnix - Eothraim
    if (entityMap['Culcarnix'] && regionMap['Eothraim']) {
      const currentRegions = entityMap['Culcarnix'].region_ids || [];
      if (!currentRegions.includes(regionMap['Eothraim'])) {
        const newRegions = [...currentRegions, regionMap['Eothraim']];
        await pool.query(
          'UPDATE entities SET region_ids = $1 WHERE id = $2',
          [newRegions, entityMap['Culcarnix'].id]
        );
        console.log(`✅ Updated Culcarnix: added region Eothraim (${regionMap['Eothraim']})`);
        updatedCount++;
      } else {
        console.log(`⏭️  Culcarnix already has region Eothraim`);
      }
    }
    
    // Update Mirkwood Wilds entities
    const mirkwoodEntities = ['Wild Goats', 'Culcarnix', 'Kine Of Araw', "Ëgil's Vipers"];
    for (const entityName of mirkwoodEntities) {
      if (entityMap[entityName] && regionMap['Mirkwood Wilds']) {
        const currentRegions = entityMap[entityName].region_ids || [];
        if (!currentRegions.includes(regionMap['Mirkwood Wilds'])) {
          const newRegions = [...currentRegions, regionMap['Mirkwood Wilds']];
          await pool.query(
            'UPDATE entities SET region_ids = $1 WHERE id = $2',
            [newRegions, entityMap[entityName].id]
          );
          console.log(`✅ Updated ${entityName}: added region Mirkwood Wilds (${regionMap['Mirkwood Wilds']})`);
          updatedCount++;
        } else {
          console.log(`⏭️  ${entityName} already has region Mirkwood Wilds`);
        }
      }
    }
    
    // Update Woodland Realm
    if (entityMap['Great Eagles'] && regionMap['Woodland Realm']) {
      const currentRegions = entityMap['Great Eagles'].region_ids || [];
      if (!currentRegions.includes(regionMap['Woodland Realm'])) {
        const newRegions = [...currentRegions, regionMap['Woodland Realm']];
        await pool.query(
          'UPDATE entities SET region_ids = $1 WHERE id = $2',
          [newRegions, entityMap['Great Eagles'].id]
        );
        console.log(`✅ Updated Great Eagles: added region Woodland Realm (${regionMap['Woodland Realm']})`);
        updatedCount++;
      } else {
        console.log(`⏭️  Great Eagles already has region Woodland Realm`);
      }
    }
    
    // Update Westmarch entities
    const westmarchEntities = ['Grass Cats', 'Grey Wolves', 'Ground Bees', 'Rohirrim', 'Dunlendings'];
    for (const entityName of westmarchEntities) {
      if (entityMap[entityName] && regionMap['Westmarch']) {
        const currentRegions = entityMap[entityName].region_ids || [];
        if (!currentRegions.includes(regionMap['Westmarch'])) {
          const newRegions = [...currentRegions, regionMap['Westmarch']];
          await pool.query(
            'UPDATE entities SET region_ids = $1 WHERE id = $2',
            [newRegions, entityMap[entityName].id]
          );
          console.log(`✅ Updated ${entityName}: added region Westmarch (${regionMap['Westmarch']})`);
          updatedCount++;
        } else {
          console.log(`⏭️  ${entityName} already has region Westmarch`);
        }
      }
    }
    
    // Update Iron Hills entities
    const ironHillsEntities = ['Grey Wolves', 'Wargs', 'North Bears', 'Fell Beasts'];
    for (const entityName of ironHillsEntities) {
      if (entityMap[entityName] && regionMap['Iron Hills']) {
        const currentRegions = entityMap[entityName].region_ids || [];
        if (!currentRegions.includes(regionMap['Iron Hills'])) {
          const newRegions = [...currentRegions, regionMap['Iron Hills']];
          await pool.query(
            'UPDATE entities SET region_ids = $1 WHERE id = $2',
            [newRegions, entityMap[entityName].id]
          );
          console.log(`✅ Updated ${entityName}: added region Iron Hills (${regionMap['Iron Hills']})`);
          updatedCount++;
        } else {
          console.log(`⏭️  ${entityName} already has region Iron Hills`);
        }
      }
    }
    
    // Create Horses of Rohan
    if (regionMap['Westmarch']) {
      const slug = createSlug('Horses of Rohan');
      await pool.query(
        `INSERT INTO entities (id, name, slug, type, description, region_ids, url_path, biomes)
         VALUES ($1, $2, $3, $4, $5, $6, NULL, NULL)`,
        [randomUUID(), 'Horses of Rohan', slug, 'riding_animals', 'Horses bred and ridden by the Rohirrim, known for their speed and endurance.', [regionMap['Westmarch']]]
      );
      console.log(`✅ Created Horses of Rohan: type=riding_animals, region=Westmarch (${regionMap['Westmarch']})`);
      createdCount++;
    }
    
    // Handle Wild Boars
    if (boarsResult.rows.length > 0) {
      // Use existing boars entity
      const boarsEntity = boarsResult.rows[0];
      if (regionMap['Westmarch']) {
        const currentRegions = boarsEntity.region_ids || [];
        if (!currentRegions.includes(regionMap['Westmarch'])) {
          const newRegions = [...currentRegions, regionMap['Westmarch']];
          await pool.query(
            'UPDATE entities SET region_ids = $1 WHERE id = $2',
            [newRegions, boarsEntity.id]
          );
          console.log(`✅ Updated ${boarsEntity.name}: added region Westmarch (${regionMap['Westmarch']})`);
          updatedCount++;
        } else {
          console.log(`⏭️  ${boarsEntity.name} already has region Westmarch`);
        }
      }
    } else {
      // Create new Wild Boars entity
      if (regionMap['Westmarch']) {
        const slug = createSlug('Wild Boars');
        await pool.query(
          `INSERT INTO entities (id, name, slug, type, description, region_ids, url_path, biomes)
           VALUES ($1, $2, $3, $4, $5, $6, NULL, NULL)`,
          [randomUUID(), 'Wild Boars', slug, 'herbivores', 'Wild pigs found in forests and woodlands, known for their aggressive behavior when threatened.', [regionMap['Westmarch']]]
        );
        console.log(`✅ Created Wild Boars: type=herbivores, region=Westmarch (${regionMap['Westmarch']})`);
        createdCount++;
      }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('SUMMARY');
    console.log('='.repeat(60));
    console.log(`Entities updated: ${updatedCount}`);
    console.log(`Entities created: ${createdCount}`);
    console.log(`Total changes: ${updatedCount + createdCount}`);
    
  } catch (error) {
    console.error('Error updating entities:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

updateEntities();
