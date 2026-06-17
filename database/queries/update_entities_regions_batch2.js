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

async function updateEntitiesBatch2() {
  try {
    console.log('🔍 Fetching region and entity data...\n');
    
    // Get region IDs
    const regionsResult = await pool.query(`
      SELECT id, name 
      FROM regions 
      WHERE name IN (
        'Central Anduin', 'Woodmen', 'Central Misty Mountains', 'West Rhudaur',
        'En Egladil', 'Trollshaws', 'Ettenmoors', 'Mänoriand', 'South Downs',
        'Rohan', 'Wold', 'North Misty Mountains', 'Wilderness of Arnor',
        'Lone-lands', 'Fangorn', 'Dor Guldur'
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
    
    // Get entity IDs for existing entities
    const entitiesResult = await pool.query(`
      SELECT id, name, slug, type, region_ids 
      FROM entities 
      WHERE name IN (
        'Great Eagles', 'Wargs', 'Beornings', 'Ëgil''s Vipers', 'Woodmen',
        'Red Wolves', 'Grass Cats', 'Grey Wolves', 'Ground Bees',
        'Horses of Rohan', 'Rohirrim', 'Wild Goats', 'Culcarnix',
        'Kine Of Araw', 'Fell Beasts'
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
    
    // Check for entities that might not exist
    const checkEntities = ['Ents', 'Giant Spiders', 'Jackals'];
    console.log('\nChecking for potentially missing entities:');
    for (const entityName of checkEntities) {
      const result = await pool.query(
        "SELECT id, name, slug, type FROM entities WHERE name ILIKE $1",
        [`%${entityName}%`]
      );
      if (result.rows.length > 0) {
        result.rows.forEach(e => {
          console.log(`  ${entityName} → Found: ${e.name} (${e.id})`);
        });
      } else {
        console.log(`  ${entityName} → Not found (will create if needed)`);
      }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('EXECUTING UPDATES');
    console.log('='.repeat(60) + '\n');
    
    let updatedCount = 0;
    let createdCount = 0;
    
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
      } else {
        console.log(`⏭️  ${entityName} already has region ${regionName}`);
      }
    }
    
    // Central Anduin
    await addRegionToEntity('Great Eagles', 'Central Anduin');
    await addRegionToEntity('Wargs', 'Central Anduin');
    await addRegionToEntity('Beornings', 'Central Anduin');
    
    // Woodmen
    await addRegionToEntity("Ëgil's Vipers", 'Woodmen');
    await addRegionToEntity('Woodmen', 'Woodmen');
    
    // Central Misty Mountains
    await addRegionToEntity('Great Eagles', 'Central Misty Mountains');
    await addRegionToEntity('Wargs', 'Central Misty Mountains');
    await addRegionToEntity('Beornings', 'Central Misty Mountains');
    
    // West Rhudaur - Wolves → Red Wolves
    await addRegionToEntity('Red Wolves', 'West Rhudaur');
    
    // En Egladil - Wolves → Red Wolves
    await addRegionToEntity('Red Wolves', 'En Egladil');
    
    // Trollshaws - Wolves → Red Wolves
    await addRegionToEntity('Red Wolves', 'Trollshaws');
    
    // Ettenmoors - Wolves → Red Wolves
    await addRegionToEntity('Red Wolves', 'Ettenmoors');
    
    // South Downs - Wolves → Red Wolves
    await addRegionToEntity('Red Wolves', 'South Downs');
    
    // Lone-lands - Wolves → Red Wolves
    await addRegionToEntity('Red Wolves', 'Lone-lands');
    
    // Rohan - Horses of Rohan
    await addRegionToEntity('Horses of Rohan', 'Rohan');
    
    // Wold
    await addRegionToEntity('Grass Cats', 'Wold');
    await addRegionToEntity('Grey Wolves', 'Wold');
    await addRegionToEntity('Ground Bees', 'Wold');
    await addRegionToEntity('Horses of Rohan', 'Wold');
    await addRegionToEntity('Rohirrim', 'Wold');
    
    // North Misty Mountains
    await addRegionToEntity('Great Eagles', 'North Misty Mountains');
    await addRegionToEntity('Wargs', 'North Misty Mountains');
    await addRegionToEntity('Beornings', 'North Misty Mountains');
    
    // Wilderness of Arnor
    await addRegionToEntity('Great Eagles', 'Wilderness of Arnor');
    await addRegionToEntity('Wargs', 'Wilderness of Arnor');
    await addRegionToEntity('Beornings', 'Wilderness of Arnor');
    
    // Dor Guldur
    await addRegionToEntity('Wild Goats', 'Dor Guldur');
    await addRegionToEntity('Culcarnix', 'Dor Guldur');
    await addRegionToEntity('Kine Of Araw', 'Dor Guldur');
    await addRegionToEntity("Ëgil's Vipers", 'Dor Guldur');
    await addRegionToEntity('Fell Beasts', 'Dor Guldur');
    
    // Create new entities
    console.log('\n' + '-'.repeat(60));
    console.log('CREATING NEW ENTITIES');
    console.log('-'.repeat(60) + '\n');
    
    // Falathrim (Sea-Elves) - Mänoriand
    if (regionMap['Mänoriand']) {
      const slug = createSlug('Falathrim');
      await pool.query(
        `INSERT INTO entities (id, name, slug, type, description, region_ids, url_path, biomes)
         VALUES ($1, $2, $3, $4, $5, $6, NULL, NULL)`,
        [randomUUID(), 'Falathrim', slug, 'elves', 'Sea-elves who dwell by the coasts, skilled in shipbuilding and sailing.', [regionMap['Mänoriand']]]
      );
      console.log(`✅ Created Falathrim: type=elves, region=Mänoriand (${regionMap['Mänoriand']})`);
      createdCount++;
    }
    
    // Stone-trolls - Mänoriand
    if (regionMap['Mänoriand']) {
      const slug = createSlug('Stone-trolls');
      await pool.query(
        `INSERT INTO entities (id, name, slug, type, description, region_ids, url_path, biomes)
         VALUES ($1, $2, $3, $4, $5, $6, NULL, NULL)`,
        [randomUUID(), 'Stone-trolls', slug, 'trolls', 'Trolls that turn to stone when exposed to sunlight, found in rocky areas and hills.', [regionMap['Mänoriand']]]
      );
      console.log(`✅ Created Stone-trolls: type=trolls, region=Mänoriand (${regionMap['Mänoriand']})`);
      createdCount++;
    }
    
    // Cave-trolls - Mänoriand
    if (regionMap['Mänoriand']) {
      const slug = createSlug('Cave-trolls');
      await pool.query(
        `INSERT INTO entities (id, name, slug, type, description, region_ids, url_path, biomes)
         VALUES ($1, $2, $3, $4, $5, $6, NULL, NULL)`,
        [randomUUID(), 'Cave-trolls', slug, 'trolls', 'Trolls that dwell in caves and underground passages, adapted to darkness.', [regionMap['Mänoriand']]]
      );
      console.log(`✅ Created Cave-trolls: type=trolls, region=Mänoriand (${regionMap['Mänoriand']})`);
      createdCount++;
    }
    
    // Check and create Ents if not exists
    const entsResult = await pool.query("SELECT id, name FROM entities WHERE name ILIKE '%ent%'");
    if (entsResult.rows.length === 0) {
      if (regionMap['Fangorn']) {
        const slug = createSlug('Ents');
        await pool.query(
          `INSERT INTO entities (id, name, slug, type, description, region_ids, url_path, biomes)
           VALUES ($1, $2, $3, $4, $5, $6, NULL, NULL)`,
          [randomUUID(), 'Ents', slug, 'trees', 'Ancient tree-like beings, shepherds of the forests, also known as Onodrim.', [regionMap['Fangorn']]]
        );
        console.log(`✅ Created Ents: type=trees, region=Fangorn (${regionMap['Fangorn']})`);
        createdCount++;
      }
    } else {
      // Update existing Ents with Fangorn
      const entsEntity = entsResult.rows[0];
      if (regionMap['Fangorn']) {
        const currentRegions = entsEntity.region_ids || [];
        if (!currentRegions.includes(regionMap['Fangorn'])) {
          const newRegions = [...currentRegions, regionMap['Fangorn']];
          await pool.query(
            'UPDATE entities SET region_ids = $1 WHERE id = $2',
            [newRegions, entsEntity.id]
          );
          console.log(`✅ Updated ${entsEntity.name}: added region Fangorn (${regionMap['Fangorn']})`);
          updatedCount++;
        }
      }
    }
    
    // Check and create Giant Spiders if not exists
    const spidersResult = await pool.query("SELECT id, name FROM entities WHERE name ILIKE '%giant spider%' OR name ILIKE '%spider%'");
    if (spidersResult.rows.length === 0) {
      if (regionMap['Dor Guldur']) {
        const slug = createSlug('Giant Spiders');
        await pool.query(
          `INSERT INTO entities (id, name, slug, type, description, region_ids, url_path, biomes)
           VALUES ($1, $2, $3, $4, $5, $6, NULL, NULL)`,
          [randomUUID(), 'Giant Spiders', slug, 'giant_insects', 'Enormous spiders that inhabit dark places, known for their venom and webs.', [regionMap['Dor Guldur']]]
        );
        console.log(`✅ Created Giant Spiders: type=giant_insects, region=Dor Guldur (${regionMap['Dor Guldur']})`);
        createdCount++;
      }
    } else {
      // Update existing Giant Spiders with Dor Guldur
      const spiderEntity = spidersResult.rows[0];
      if (regionMap['Dor Guldur']) {
        const currentRegions = spiderEntity.region_ids || [];
        if (!currentRegions.includes(regionMap['Dor Guldur'])) {
          const newRegions = [...currentRegions, regionMap['Dor Guldur']];
          await pool.query(
            'UPDATE entities SET region_ids = $1 WHERE id = $2',
            [newRegions, spiderEntity.id]
          );
          console.log(`✅ Updated ${spiderEntity.name}: added region Dor Guldur (${regionMap['Dor Guldur']})`);
          updatedCount++;
        }
      }
    }
    
    // Check and create Jackals if not exists
    const jackalsResult = await pool.query("SELECT id, name FROM entities WHERE name ILIKE '%jackal%'");
    if (jackalsResult.rows.length === 0) {
      if (regionMap['Dor Guldur']) {
        const slug = createSlug('Jackals');
        await pool.query(
          `INSERT INTO entities (id, name, slug, type, description, region_ids, url_path, biomes)
           VALUES ($1, $2, $3, $4, $5, $6, NULL, NULL)`,
          [randomUUID(), 'Jackals', slug, 'carnivores', 'Scavenging canines found in arid and desert regions, known for their cunning.', [regionMap['Dor Guldur']]]
        );
        console.log(`✅ Created Jackals: type=carnivores, region=Dor Guldur (${regionMap['Dor Guldur']})`);
        createdCount++;
      }
    } else {
      // Update existing Jackals with Dor Guldur
      const jackalEntity = jackalsResult.rows[0];
      if (regionMap['Dor Guldur']) {
        const currentRegions = jackalEntity.region_ids || [];
        if (!currentRegions.includes(regionMap['Dor Guldur'])) {
          const newRegions = [...currentRegions, regionMap['Dor Guldur']];
          await pool.query(
            'UPDATE entities SET region_ids = $1 WHERE id = $2',
            [newRegions, jackalEntity.id]
          );
          console.log(`✅ Updated ${jackalEntity.name}: added region Dor Guldur (${regionMap['Dor Guldur']})`);
          updatedCount++;
        }
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

updateEntitiesBatch2();
