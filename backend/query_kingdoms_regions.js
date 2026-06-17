import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function queryKingdomsAndRegions() {
  try {
    console.log('📦 Querying kingdoms and their regions from database...');

    // Query to get all kingdoms with their regions
    const query = `
      SELECT 
        k.id as kingdom_id,
        k.name as kingdom_name,
        k.description as kingdom_description,
        r.id as region_id,
        r.name as region_name,
        r.region_type,
        r.area_km2
      FROM kingdoms k
      LEFT JOIN regions r ON k.id = r.kingdom_id
      ORDER BY k.name, r.name;
    `;

    const result = await pool.query(query);
    const rows = result.rows;

    if (rows.length === 0) {
      console.log('⚠️  No data found in the database');
      return;
    }

    console.log(`✅ Found ${rows.length} kingdom-region relationships`);
    
    // Group by kingdom
    const kingdoms = {};
    rows.forEach(row => {
      if (!kingdoms[row.kingdom_name]) {
        kingdoms[row.kingdom_name] = {
          id: row.kingdom_id,
          description: row.kingdom_description,
          regions: []
        };
      }
      if (row.region_name) {
        kingdoms[row.kingdom_name].regions.push({
          id: row.region_id,
          name: row.region_name,
          type: row.region_type,
          area: row.area_km2
        });
      }
    });

    // Print table
    console.log('\n' + '='.repeat(100));
    console.log('KINGDOMS AND THEIR REGIONS');
    console.log('='.repeat(100));
    
    Object.entries(kingdoms).forEach(([kingdomName, data]) => {
      console.log(`\n🏰 ${kingdomName} (ID: ${data.id})`);
      if (data.description) {
        console.log(`   Description: ${data.description}`);
      }
      if (data.regions.length > 0) {
        console.log(`   Regions (${data.regions.length}):`);
        data.regions.forEach(region => {
          const areaStr = region.area ? `${region.area} km²` : 'N/A';
          console.log(`      - ${region.name} (${region.type || 'N/A'}) - Area: ${areaStr}`);
        });
      } else {
        console.log(`   Regions: None`);
      }
    });

    console.log('\n' + '='.repeat(100));
    console.log(`Total Kingdoms: ${Object.keys(kingdoms).length}`);
    console.log(`Total Regions: ${rows.filter(r => r.region_name).length}`);
    console.log('='.repeat(100) + '\n');

  } catch (error) {
    console.error('❌ Error querying database:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

queryKingdomsAndRegions();
