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

async function cleanSourceFields() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Cleaning source fields in regions...\n');
    
    const result = await client.query('SELECT id, name, source FROM regions WHERE source IS NOT NULL');
    console.log(`📊 Found ${result.rows.length} regions with source data\n`);
    
    let updatedCount = 0;
    
    for (const row of result.rows) {
      const oldSource = row.source;
      
      // Remove web_refs and lotr_refs from source
      const newSource = {
        supplement: oldSource.supplement || null,
        supplement_code: oldSource.supplement_code || null
      };
      
      // Update the database
      await client.query(
        'UPDATE regions SET source = $1 WHERE id = $2',
        [newSource, row.id]
      );
      
      updatedCount++;
      console.log(`✅ Updated: ${row.name}`);
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 CLEANUP SUMMARY');
    console.log('='.repeat(60));
    console.log(`Regions updated: ${updatedCount}`);
    
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

cleanSourceFields()
  .then(() => {
    console.log('\n✅ Cleanup complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });
