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

async function updateTreeRegions() {
  try {
    console.log('🔍 Fetching region and entity data...\n');
    
    // Get region IDs
    const regionsResult = await pool.query(`
      SELECT id, name 
      FROM regions 
      WHERE name IN (
        'Woodmen', 'Dor Guldur', 'Nan Anduin', 'Lamedon', 'Ered Luin',
        'Central Anduin', 'Trollshaws', 'Southern Mirkwood', 'Rhudaur',
        'Arthedain', 'Baranduin'
      )
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
    
    // Get tree entities
    const entitiesResult = await pool.query(`
      SELECT id, name, slug, type, region_ids 
      FROM entities 
      WHERE name IN ('Oak', 'Beech', 'Birch', 'Elm')
    `);
    
    const entityMap = {};
    entitiesResult.rows.forEach(e => {
      entityMap[e.name] = e;
    });
    
    console.log('\nEntity IDs:');
    Object.entries(entityMap).forEach(([name, data]) => {
      console.log(`  ${name}: ${data.id} (type: ${data.type})`);
      console.log(`    Current regions: ${data.region_ids ? data.region_ids.join(', ') : 'none'}`);
    });
    
    console.log('\n' + '='.repeat(60));
    console.log('EXECUTING UPDATES');
    console.log('='.repeat(60) + '\n');
    
    let updatedCount = 0;
    
    // Helper function to update entity with region
    async function addRegionToEntity(entityName, regionName) {
      if (!entityMap[entityName] || !regionMap[regionName]) {
        console.log(`⚠️  Skipping ${entityName} → ${regionName} (missing data)`);
        return;
      }
      
      const currentRegions = entityMap[entityName].region_ids || [];
      if (!currentRegions.includes(regionMap[regionName])) {
        const newRegions = [...currentRegions, regionMap[regionName]];
        await pool.query(
          'UPDATE entities SET region_ids = $1 WHERE id = $2',
          [newRegions, entityMap[entityName].id]
        );
        console.log(`✅ Updated ${entityName}: added region ${regionName} (${regionMap[regionName]})`);
        updatedCount++;
        // Update local cache
        entityMap[entityName].region_ids = newRegions;
      } else {
        console.log(`⏭️  ${entityName} already has region ${regionName}`);
      }
    }
    
    // Oak regions
    console.log('--- Oak ---');
    await addRegionToEntity('Oak', 'Woodmen');
    await addRegionToEntity('Oak', 'Dor Guldur');
    await addRegionToEntity('Oak', 'Nan Anduin');
    await addRegionToEntity('Oak', 'Lamedon');
    await addRegionToEntity('Oak', 'Ered Luin');
    
    // Beech regions
    console.log('\n--- Beech ---');
    await addRegionToEntity('Beech', 'Nan Anduin');
    await addRegionToEntity('Beech', 'Central Anduin');
    await addRegionToEntity('Beech', 'Lamedon');
    await addRegionToEntity('Beech', 'Trollshaws');
    await addRegionToEntity('Beech', 'Southern Mirkwood');
    
    // Birch regions
    console.log('\n--- Birch ---');
    await addRegionToEntity('Birch', 'Lamedon');
    await addRegionToEntity('Birch', 'Rhudaur');
    await addRegionToEntity('Birch', 'Trollshaws');
    await addRegionToEntity('Birch', 'Ered Luin');
    
    // Elm regions
    console.log('\n--- Elm ---');
    await addRegionToEntity('Elm', 'Central Anduin');
    await addRegionToEntity('Elm', 'Nan Anduin');
    await addRegionToEntity('Elm', 'Southern Mirkwood');
    await addRegionToEntity('Elm', 'Arthedain');
    await addRegionToEntity('Elm', 'Baranduin');
    
    console.log('\n' + '='.repeat(60));
    console.log('SUMMARY');
    console.log('='.repeat(60));
    console.log(`Entities updated: ${updatedCount}`);
    
    // Show final state
    console.log('\nFinal region assignments:');
    for (const [name, data] of Object.entries(entityMap)) {
      console.log(`  ${name}: ${data.region_ids ? data.region_ids.join(', ') : 'none'}`);
    }
    
  } catch (error) {
    console.error('Error updating entities:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

updateTreeRegions();
