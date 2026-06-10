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

async function checkRegions() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Checking regions table...\n');
    
    // Check description column type
    const typeResult = await client.query(`
      SELECT data_type 
      FROM information_schema.columns 
      WHERE table_name = 'regions' 
      AND column_name = 'description'
    `);
    console.log(`📊 Description column type: ${typeResult.rows[0].data_type}`);
    
    // Check if any regions have climate data in description
    const climateCheck = await client.query(`
      SELECT COUNT(*) as count
      FROM regions
      WHERE description::text LIKE '%climate%'
    `);
    console.log(`📊 Regions with 'climate' in description: ${climateCheck.rows[0].count}`);
    
    // Sample description data
    console.log('\n📝 Sample description data:');
    const sampleResult = await client.query(`
      SELECT id, name, description
      FROM regions
      WHERE description IS NOT NULL
      LIMIT 3
    `);
    console.table(sampleResult.rows);
    
    // Check if description is JSONB
    const jsonbCheck = await client.query(`
      SELECT COUNT(*) as count
      FROM regions
      WHERE jsonb_typeof(description) IS NOT NULL
    `);
    console.log(`\n📊 Regions with JSONB description: ${jsonbCheck.rows[0].count}`);
    
  } catch (error) {
    console.error('❌ Check failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

checkRegions()
  .then(() => {
    console.log('\n✅ Check complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });
