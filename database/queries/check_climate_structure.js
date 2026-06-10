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

async function checkClimateStructure() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Checking climate structure in regions.description...\n');
    
    // Check if description has climate key
    const climateKeyCheck = await client.query(`
      SELECT COUNT(*) as count
      FROM regions
      WHERE description ? 'climate'
    `);
    console.log(`📊 Regions with 'climate' key in description: ${climateKeyCheck.rows[0].count}`);
    
    // Sample climate data
    console.log('\n📝 Sample climate data:');
    const sampleResult = await client.query(`
      SELECT id, name, description->'climate' as climate_data
      FROM regions
      WHERE description ? 'climate'
      LIMIT 3
    `);
    console.table(sampleResult.rows);
    
    // Check structure of climate object
    if (sampleResult.rows.length > 0) {
      console.log('\n📝 Climate structure sample:');
      const firstClimate = sampleResult.rows[0].climate_data;
      console.log(JSON.stringify(firstClimate, null, 2));
    }
    
  } catch (error) {
    console.error('❌ Check failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

checkClimateStructure()
  .then(() => {
    console.log('\n✅ Check complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });
