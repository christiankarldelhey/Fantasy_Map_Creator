import pg from 'pg';
import dotenv from 'dotenv';

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

async function migrateRemainingClimateFromBackup() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Finding regions with climate data in backup but no climate zone...\n');
    
    // Find regions that have climate data in backup but no climate zone
    const result = await client.query(`
      SELECT rb.id, rb.name, rb.description->'climate' as climate_data,
             rb.koppen, rb.analog_location, rb.analog_lat, rb.analog_lon
      FROM regions_backup rb
      WHERE rb.description ? 'climate'
      AND rb.id NOT IN (SELECT region_id FROM climate_zones WHERE region_id IS NOT NULL)
      ORDER BY rb.name
    `);
    
    console.log(`📊 Found ${result.rows.length} regions to migrate\n`);
    
    let climateZonesCreated = 0;
    
    for (const row of result.rows) {
      const climateData = row.climate_data;
      
      // Combine description and notes
      const desc = climateData.notes 
        ? `${climateData.description || ''} ${climateData.notes}`.trim()
        : climateData.description || '';
      
      const temperature = climateData.temperature_pattern || null;
      const precipitation = climateData.precipitation_pattern || null;
      
      // Insert into climate_zones with region_id
      await client.query(
        `INSERT INTO climate_zones ("desc", temperature, precipitation, koppen, analog_location, analog_lat, analog_lon, region_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [desc, temperature, precipitation, row.koppen, row.analog_location, row.analog_lat, row.analog_lon, row.id]
      );
      
      climateZonesCreated++;
      console.log(`✅ Migrated climate for: ${row.name} (Region ID: ${row.id})`);
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 MIGRATION SUMMARY');
    console.log('='.repeat(60));
    console.log(`Climate zones created: ${climateZonesCreated}`);
    
    // Verify counts
    const totalClimateZones = await client.query('SELECT COUNT(*) as count FROM climate_zones');
    const totalRegions = await client.query('SELECT COUNT(*) as count FROM regions');
    const regionsWithClimateZones = await client.query('SELECT COUNT(*) as count FROM climate_zones WHERE region_id IS NOT NULL');
    
    console.log('\n📊 Database verification:');
    console.log(`  Total climate zones: ${totalClimateZones.rows[0].count}`);
    console.log(`  Total regions: ${totalRegions.rows[0].count}`);
    console.log(`  Regions with climate zones: ${regionsWithClimateZones.rows[0].count}`);
    
    // Show regions without climate zones
    const regionsWithoutClimate = await client.query(`
      SELECT id, name FROM regions 
      WHERE id NOT IN (SELECT region_id FROM climate_zones WHERE region_id IS NOT NULL)
      ORDER BY name
    `);
    
    if (regionsWithoutClimate.rows.length > 0) {
      console.log(`\n⚠️  Regions without climate zones (${regionsWithoutClimate.rows.length}):`);
      regionsWithoutClimate.rows.forEach(r => console.log(`  - ${r.name} (ID: ${r.id})`));
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

migrateRemainingClimateFromBackup()
  .then(() => {
    console.log('\n✅ Migration complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });
