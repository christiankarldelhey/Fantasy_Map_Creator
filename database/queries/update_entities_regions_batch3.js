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

async function updateEntitiesBatch3() {
  try {
    console.log('🔍 Fetching region and entity data...\n');
    
    // Get region IDs
    const regionsResult = await pool.query(`
      SELECT id, name 
      FROM regions 
      WHERE name IN (
        'Rhûn', 'Harad', 'Mordor', 'Lamedon', 'Nan Anduin', 'Central Anduin',
        'Dor Guldur', 'Mirkwood Wilds', 'Woodmen'
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
        'Kine Of Araw', 'Fell Beasts', 'Haradrim', 'Uruk-hai', 'Mûmakil'
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
    
    // Update existing entities
    await addRegionToEntity('Kine Of Araw', 'Rhûn');
    await addRegionToEntity('Fell Beasts', 'Mordor');
    await addRegionToEntity('Haradrim', 'Harad');
    await addRegionToEntity('Uruk-hai', 'Mordor');
    
    // Check and create Mûmakil if not exists
    if (!entityMap['Mûmakil']) {
      if (regionMap['Harad']) {
        const slug = createSlug('Mûmakil');
        await pool.query(
          `INSERT INTO entities (id, name, slug, type, description, region_ids, url_path, biomes)
           VALUES ($1, $2, $3, $4, $5, $6, NULL, NULL)`,
          [randomUUID(), 'Mûmakil', slug, 'riding_animals', 'Giant war-mammoths of Harad, used as living siege engines by the Haradrim. Their thick hides and immense size make them nearly unstoppable in battle.', [regionMap['Harad']]]
        );
        console.log(`✅ Created Mûmakil: type=riding_animals, region=Harad (${regionMap['Harad']})`);
        createdCount++;
      }
    } else {
      await addRegionToEntity('Mûmakil', 'Harad');
    }
    
    // Create new flora entities
    console.log('\n' + '-'.repeat(60));
    console.log('CREATING NEW FLORA ENTITIES');
    console.log('-'.repeat(60) + '\n');
    
    // Southern Mirkwood flora (region 83)
    const southernMirkwoodFlora = [
      {
        name: 'Furry oak',
        type: 'trees',
        description: 'Tall, closely spaced hardwoods with branchless lower trunks and umbrella crowns about forty feet up. Their dense canopies and thick bark make Southern Mirkwood\'s interior dark, damp and resistant to many pests and blights.',
        biomes: ['forest']
      },
      {
        name: 'Chap-beech',
        type: 'trees',
        description: 'Companion beech-like trees with smooth trunks and tight crowns that interweave with furry oaks. Together they form the shadowed, foggy forest typical of the southern eaves of Mirkwood.',
        biomes: ['forest']
      },
      {
        name: 'Grape-leaf magnolia',
        type: 'plants',
        description: 'A broadleaf evergreen with large, holly-like leaves and downward-hanging blood-red flowers. Its nectar yields a dark red honey that can be mildly intoxicating, prized by the Beijabar for brewing magnolia mead.',
        biomes: ['forest']
      },
      {
        name: 'Mirkwood rose-tree',
        type: 'plants',
        description: 'Tall, hedge-forming shrubs or small trees bearing masses of rose, burgundy and white blossoms from late spring to autumn. Needle-sharp thorns make them formidable living walls, first planted by Elves as boundaries and later valued by healers for their nectar.',
        biomes: ['forest', 'hedge']
      },
      {
        name: 'Milk-white trumpet (Giant Datura)',
        type: 'plants',
        description: 'A tall, foul-scented shrub up to twelve feet in height, with huge white trumpet-flowers that shed pollen explosively. The pollen can cause nausea and temporary blindness; the black seeds are potent psychoactive poisons—one intoxicates, several can be fatal to most races, though Elves are said to be immune.',
        biomes: ['forest', 'edge']
      },
      {
        name: 'Din Fainen (death-moss)',
        type: 'plants',
        description: 'A pale, clinging moss that grows in dark, damp hollows and on rotting trunks in the shadowed forest. Contact or ingestion can be deadly; it is carefully harvested for use in the most virulent poisons.',
        biomes: ['forest', 'swamp']
      },
      {
        name: 'Loth-nu-Fuin (Glorious Lichen)',
        type: 'plants',
        description: 'A striking lichen that forms pale, intricate patterns on rocks and old trunks in the deepest shadowed parts of Mirkwood. It is used by lore-masters and alchemists as a marker of deep shadow and in rare draughts tied to dreams and visions.',
        biomes: ['forest', 'rock']
      }
    ];
    
    // Assign Southern Mirkwood flora to multiple regions
    const mirkwoodRegions = [];
    if (regionMap['Dor Guldur']) mirkwoodRegions.push(regionMap['Dor Guldur']);
    if (regionMap['Mirkwood Wilds']) mirkwoodRegions.push(regionMap['Mirkwood Wilds']);
    if (regionMap['Woodmen']) mirkwoodRegions.push(regionMap['Woodmen']);
    
    for (const flora of southernMirkwoodFlora) {
      if (mirkwoodRegions.length > 0) {
        const slug = createSlug(flora.name);
        await pool.query(
          `INSERT INTO entities (id, name, slug, type, description, region_ids, url_path, biomes)
           VALUES ($1, $2, $3, $4, $5, $6, NULL, $7)`,
          [randomUUID(), flora.name, slug, flora.type, flora.description, mirkwoodRegions, flora.biomes]
        );
        console.log(`✅ Created ${flora.name}: type=${flora.type}, regions=${mirkwoodRegions.join(', ')}`);
        createdCount++;
      }
    }
    
    // Eothraim flora (region 1)
    const eothraimFlora = [
      {
        name: 'Riparian willow',
        type: 'plants',
        description: 'Riparian willows are water-loving trees and shrubs that line the humid valleys of rivers such as the Warwater and Surubeki. They anchor the banks with dense root systems, provide shade to streams, and offer flexible wood for baskets, poles, and simple tools.',
        biomes: ['river', 'grassland'],
        region: 'Eothraim'
      },
      {
        name: 'Riparian poplar',
        type: 'plants',
        description: 'Riparian poplars are tall, fast-growing trees that form scattered groves along the river valleys of Eothraim and similar plains regions. With light crowns and shimmering leaves that rustle in the wind, they thrive on alluvial soils where seasonal floods replenish nutrients.',
        biomes: ['river', 'grassland'],
        region: 'Eothraim'
      }
    ];
    
    for (const flora of eothraimFlora) {
      if (regionMap[flora.region]) {
        const slug = createSlug(flora.name);
        await pool.query(
          `INSERT INTO entities (id, name, slug, type, description, region_ids, url_path, biomes)
           VALUES ($1, $2, $3, $4, $5, $6, NULL, $7)`,
          [randomUUID(), flora.name, slug, flora.type, flora.description, [regionMap[flora.region]], flora.biomes]
        );
        console.log(`✅ Created ${flora.name}: type=${flora.type}, region=${flora.region} (${regionMap[flora.region]})`);
        createdCount++;
      }
    }
    
    // Lamedon flora (region 19)
    const lamedonFlora = [
      {
        name: 'Lebethron',
        type: 'trees',
        description: 'Lebethron is a dark, fine-grained hardwood of Gondor, valued for its strength and smooth finish. It is used for walking-sticks, spear-shafts, carved fittings and select ship and house timbers.',
        biomes: ['forest', 'hills']
      },
      {
        name: 'Athelas (Kingsfoil)',
        type: 'plants',
        description: 'Athelas, or Kingsfoil, is a slender-leaved healing herb found along old ways, in sheltered dells and near springs. To most it is only a pleasantly scented plant used in simples and poultices, but in the hands of the rightful kings and those with great healing power its leaves, bruised in hot water, can recall the wounded from the shadow.',
        biomes: ['forest', 'river']
      },
      {
        name: 'Gwingyrn (Elven ship-timber)',
        type: 'trees',
        description: 'Gwingyrn is a tall, straight, pale-barked tree prized by Elven and Dúnedain shipwrights. Its wood is light but strong and holds fastenings well, making it ideal for masts, spars and planking.',
        biomes: ['coastal', 'forest']
      },
      {
        name: 'Oiolair of Tolfalas',
        type: 'trees',
        description: 'The Oiolair is an evergreen coastal tree associated with the isle of Tolfalas and the seaward fringes of Gondor. With glossy leaves and aromatic resin, it weathers salt winds and storms, binding cliffs and dunes with its roots.',
        biomes: ['coastal']
      },
      {
        name: 'Mallos',
        type: 'plants',
        description: 'Mallos is a fair flower of Gondor, bearing soft golden trumpets on slender stems. It grows in sunny meadows and sheltered coastal lawns, often mingled with alfirin.',
        biomes: ['meadow', 'coastal']
      },
      {
        name: 'Alfirin',
        type: 'plants',
        description: 'Alfirin is a delicate white or pale flower of Gondor, often described as star-like or bell-shaped. It blossoms in quiet meads and along gentle slopes, frequently found together with mallos.',
        biomes: ['meadow', 'coastal']
      },
      {
        name: 'Oak',
        type: 'trees',
        description: 'Oaks are broad-crowned hardwood trees common in the temperate forests of Middle-earth. In Lamedon they survive as remnants of once greater woods, providing strong timber, acorns for wildlife and shade for farms and roads.',
        biomes: ['forest', 'hills']
      },
      {
        name: 'Beech',
        type: 'trees',
        description: 'Beeches are smooth-barked hardwoods with dense, high canopies and a carpet of leaf-litter beneath. In southern Gondor they linger in upland groves and ravines, marking older, cooler forest pockets amid cleared farmland.',
        biomes: ['forest', 'hills']
      },
      {
        name: 'Birch',
        type: 'trees',
        description: 'Birches are light-barked, fast-colonising trees that favor cooler slopes and disturbed ground. Their white trunks and fluttering leaves brighten Lamedon\'s higher vales, often forming mixed groves with oak and beech on the edges of older forests.',
        biomes: ['forest', 'hills']
      },
      {
        name: 'Date palms',
        type: 'trees',
        description: 'Date palms grow along the warm southern coasts of Gondor and in sheltered river-mouth oases. In Lamedon and the Ethir Anduin their tall, feather-fronded crowns mark irrigated gardens and estate orchards, providing sweet fruit, shade and fibre.',
        biomes: ['coastal', 'desert']
      }
    ];
    
    for (const flora of lamedonFlora) {
      if (regionMap['Lamedon']) {
        const slug = createSlug(flora.name);
        await pool.query(
          `INSERT INTO entities (id, name, slug, type, description, region_ids, url_path, biomes)
           VALUES ($1, $2, $3, $4, $5, $6, NULL, $7)`,
          [randomUUID(), flora.name, slug, flora.type, flora.description, [regionMap['Lamedon']], flora.biomes]
        );
        console.log(`✅ Created ${flora.name}: type=${flora.type}, region=Lamedon (${regionMap['Lamedon']})`);
        createdCount++;
      }
    }
    
    // Central Anduin flora (region 35)
    const centralAnduinFlora = [
      {
        name: 'Elm',
        type: 'trees',
        description: 'Elms are tall, broad-crowned trees common in moist river-vales such as the Anduin Vales. Their arching branches form shaded avenues along banks and field-edges, and their deep roots help bind alluvial soils.',
        biomes: ['forest', 'river']
      },
      {
        name: 'Ancient mountain pines of Rhudaur',
        type: 'trees',
        description: 'These ancient mountain pines cling to the steep valleys and hillsides of Rhudaur and the upper Anduin basin. Tall, dark-needled and deeply rooted, they endure cold winds, thin soils and heavy snow.',
        biomes: ['mountains', 'forest']
      },
      {
        name: 'Goblin-gate cave fungi',
        type: 'plants',
        description: 'Goblin-gate cave fungi are a collection of pallid mushrooms, molds and lichen-like growths that thrive in the damp, lightless tunnels under the High Pass. They feed on rotting timbers, refuse and the leavings of Goblin feasts.',
        biomes: ['cave', 'underground']
      },
      {
        name: 'Medicinal herbs of the Anduin Vales',
        type: 'plants',
        description: 'This term covers the many healing herbs found in the Anduin Vales: simples that ease fever, restore strength, close wounds or clear the lungs. Woodmen, Beornings and wandering healers know where to find such plants along stream-banks, in forest glades and on sunlit hills.',
        biomes: ['river', 'meadow', 'forest']
      }
    ];
    
    for (const flora of centralAnduinFlora) {
      if (regionMap['Central Anduin']) {
        const slug = createSlug(flora.name);
        await pool.query(
          `INSERT INTO entities (id, name, slug, type, description, region_ids, url_path, biomes)
           VALUES ($1, $2, $3, $4, $5, $6, NULL, $7)`,
          [randomUUID(), flora.name, slug, flora.type, flora.description, [regionMap['Central Anduin']], flora.biomes]
        );
        console.log(`✅ Created ${flora.name}: type=${flora.type}, region=Central Anduin (${regionMap['Central Anduin']})`);
        createdCount++;
      }
    }
    
    // Nan Anduin and Central Anduin flora
    const nanAnduinFlora = [
      {
        name: 'Wild persimmons',
        type: 'plants',
        description: 'Wild persimmon trees growing in warm, sheltered vales and river-terraces of Southern Rhovanion. Their orange fruit ripens late, offering sweet, sticky food for Beijabar, Woodmen and wildlife alike.',
        biomes: ['river', 'vale', 'orchard']
      },
      {
        name: 'Carefree mustard',
        type: 'plants',
        description: 'A hardy yellow-flowering herb of fields and river-banks whose seeds and leaves are used in poultices and teas to ease fevers, clear the chest and restore appetite. Common in the Anduin vales and Talath Harroch farmsteads.',
        biomes: ['fields', 'river', 'settled']
      },
      {
        name: 'Splayfoot goodwort',
        type: 'plants',
        description: 'A low, broad-leafed herb of damp meadows and marshy margins. Infusions are said to steady the nerves, cheer the heart and give courage before battle or long journeys, making it a favorite of Northmen healers.',
        biomes: ['meadow', 'marsh']
      }
    ];
    
    const nanAnduinRegions = [];
    if (regionMap['Nan Anduin']) nanAnduinRegions.push(regionMap['Nan Anduin']);
    if (regionMap['Central Anduin']) nanAnduinRegions.push(regionMap['Central Anduin']);
    
    for (const flora of nanAnduinFlora) {
      if (nanAnduinRegions.length > 0) {
        const slug = createSlug(flora.name);
        await pool.query(
          `INSERT INTO entities (id, name, slug, type, description, region_ids, url_path, biomes)
           VALUES ($1, $2, $3, $4, $5, $6, NULL, $7)`,
          [randomUUID(), flora.name, slug, flora.type, flora.description, nanAnduinRegions, flora.biomes]
        );
        console.log(`✅ Created ${flora.name}: type=${flora.type}, regions=${nanAnduinRegions.join(', ')}`);
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

updateEntitiesBatch3();
