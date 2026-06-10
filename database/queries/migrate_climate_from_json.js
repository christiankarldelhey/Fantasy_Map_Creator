import pg from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

const { Pool } = pg;

let connectionString;
if (process.env.DB_PASSWORD) {
  connectionString = `postgres://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`;
} else {
  connectionString = `postgres://${process.env.DB_USER}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`;
}

const pool = new Pool({
  connectionString,
});

async function migrateClimateFromJson() {
  const client = await pool.connect();
  
  try {
    console.log('📖 Reading JSON file...\n');
    
    // Read the JSON file
    const jsonPath = path.join(process.cwd(), 'data_public', 'regions_data.json');
    const jsonData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    
    console.log(`📊 Found ${jsonData.regions.length} regions in JSON\n`);
    
    // Filter regions with climate data
    const regionsWithClimate = jsonData.regions.filter(r => r.climate);
    console.log(`📊 Found ${regionsWithClimate.length} regions with climate data\n`);
    
    // Get existing regions from database to match by name (case-insensitive, accent-insensitive)
    const dbRegionsResult = await client.query('SELECT id, name FROM regions ORDER BY name');
    
    // Create a helper function to normalize names for comparison
    const normalizeName = (name) => {
      return name.toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // Remove accents
        .replace(/[^a-z0-9\s-]/g, '') // Remove special characters except spaces and hyphens
        .trim();
    };
    
    // Create a map with normalized names
    const dbRegionsMap = new Map();
    dbRegionsResult.rows.forEach(r => {
      dbRegionsMap.set(normalizeName(r.name), r.id);
    });
    
    console.log(`📊 Found ${dbRegionsMap.size} regions in database\n`);
    
    let climateZonesCreated = 0;
    let junctionRecordsCreated = 0;
    let regionsNotFound = [];
    
    for (const region of regionsWithClimate) {
      // Check if region exists in database (using normalized name)
      const regionId = dbRegionsMap.get(normalizeName(region.name));
      
      if (!regionId) {
        regionsNotFound.push(region.name);
        console.log(`⚠️  Region not found in database: ${region.name}`);
        continue;
      }
      
      // Combine description and notes
      const desc = region.climate.notes 
        ? `${region.climate.description || ''} ${region.climate.notes}`.trim()
        : region.climate.description || '';
      
      const temperature = region.climate.temperature_pattern || null;
      const precipitation = region.climate.precipitation_pattern || null;
      
      // Insert into climate_zones
      const insertResult = await client.query(
        `INSERT INTO climate_zones ("desc", temperature, precipitation, koppen, analog_location, analog_lat, analog_lon)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id`,
        [desc, temperature, precipitation, null, null, null, null]
      );
      
      const climateZoneId = insertResult.rows[0].id;
      climateZonesCreated++;
      
      // Create junction record
      await client.query(
        `INSERT INTO region_climate_zones (region_id, climate_zone_id)
         VALUES ($1, $2)`,
        [regionId, climateZoneId]
      );
      
      junctionRecordsCreated++;
      
      console.log(`✅ Migrated climate for: ${region.name} (Region ID: ${regionId}, Climate Zone ID: ${climateZoneId})`);
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 MIGRATION SUMMARY');
    console.log('='.repeat(60));
    console.log(`Climate zones created: ${climateZonesCreated}`);
    console.log(`Junction records created: ${junctionRecordsCreated}`);
    console.log(`Regions not found in database: ${regionsNotFound.length}`);
    
    if (regionsNotFound.length > 0) {
      console.log('\n⚠️  Regions not found in database:');
      regionsNotFound.forEach(name => console.log(`  - ${name}`));
    }
    
    // Verify counts
    const climateZonesCount = await client.query('SELECT COUNT(*) as count FROM climate_zones');
    const junctionCount = await client.query('SELECT COUNT(*) as count FROM region_climate_zones');
    
    console.log('\n📊 Database verification:');
    console.log(`  Total climate zones in DB: ${climateZonesCount.rows[0].count}`);
    console.log(`  Total junction records in DB: ${junctionCount.rows[0].count}`);
    
    // Show sample data
    console.log('\n📝 Sample climate zones:');
    const sampleResult = await client.query(`
      SELECT cz.id, cz."desc", cz.temperature, cz.precipitation, r.name as region_name
      FROM climate_zones cz
      JOIN region_climate_zones rcz ON cz.id = rcz.climate_zone_id
      JOIN regions r ON rcz.region_id = r.id
      LIMIT 3
    `);
    
    sampleResult.rows.forEach(row => {
      console.log(`\n  ID: ${row.id}`);
      console.log(`  Region: ${row.region_name}`);
      console.log(`  Description: ${row.desc?.substring(0, 100)}...`);
      console.log(`  Temperature: ${row.temperature?.substring(0, 80)}...`);
      console.log(`  Precipitation: ${row.precipitation?.substring(0, 80)}...`);
    });
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

migrateClimateFromJson()
  .then(() => {
    console.log('\n✅ Migration complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });
