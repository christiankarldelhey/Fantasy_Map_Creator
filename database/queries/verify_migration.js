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

async function verifyMigration() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Verifying migration...\n');
    
    // Check climate zones created
    const climateZonesResult = await client.query('SELECT COUNT(*) as count FROM climate_zones');
    console.log(`📊 Climate zones created: ${climateZonesResult.rows[0].count}`);
    
    // Check junction records created
    const junctionResult = await client.query('SELECT COUNT(*) as count FROM region_climate_zones');
    console.log(`📊 Junction records created: ${junctionResult.rows[0].count}`);
    
    // Check regions without climate data
    const noClimateResult = await client.query(`
      SELECT COUNT(*) as count 
      FROM regions r
      LEFT JOIN region_climate_zones rcz ON r.id = rcz.region_id
      WHERE rcz.climate_zone_id IS NULL
    `);
    console.log(`📊 Regions without climate data: ${noClimateResult.rows[0].count}`);
    
    // Check if climate columns still exist in regions
    const columnsResult = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'regions' 
      AND column_name IN ('koppen', 'analog_location', 'analog_lat', 'analog_lon')
    `);
    console.log(`📊 Climate columns still in regions: ${columnsResult.rows.length}`);
    if (columnsResult.rows.length > 0) {
      console.log('   Columns:', columnsResult.rows.map(r => r.column_name).join(', '));
    }
    
    // Sample climate zone data
    console.log('\n📝 Sample climate zone data:');
    const sampleResult = await client.query('SELECT * FROM climate_zones LIMIT 3');
    console.table(sampleResult.rows);
    
    // Sample junction data
    console.log('\n📝 Sample junction data:');
    const junctionSampleResult = await client.query(`
      SELECT r.name as region_name, cz.id as climate_zone_id, cz.koppen
      FROM regions r
      JOIN region_climate_zones rcz ON r.id = rcz.region_id
      JOIN climate_zones cz ON rcz.climate_zone_id = cz.id
      LIMIT 5
    `);
    console.table(junctionSampleResult.rows);
    
  } catch (error) {
    console.error('❌ Verification failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

verifyMigration()
  .then(() => {
    console.log('\n✅ Verification complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });
