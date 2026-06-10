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

async function restructureRegionsDescription() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Reading regions from database...\n');
    
    const result = await client.query('SELECT id, name, description FROM regions WHERE description IS NOT NULL ORDER BY name');
    console.log(`📊 Found ${result.rows.length} regions with description\n`);
    
    let updatedCount = 0;
    let skippedCount = 0;
    
    for (const row of result.rows) {
      const oldDesc = row.description;
      
      // Skip if description is not a JSONB object
      if (typeof oldDesc !== 'object' || oldDesc === null) {
        console.log(`⚠️  Skipping ${row.name}: description is not an object`);
        skippedCount++;
        continue;
      }
      
      // Build new structure
      const newDesc = {};
      
      // description: only the description text
      newDesc.description = oldDesc.description || null;
      
      // source: include supplement inside
      newDesc.source = {
        supplement: oldDesc.supplement || null,
        supplement_code: oldDesc.supplement_code || null,
        lotr_refs: oldDesc.source?.lotr_refs || [],
        web_refs: oldDesc.source?.web_refs || []
      };
      
      // Move land, fauna, flora, products to root
      newDesc.land = oldDesc.land || [];
      newDesc.fauna = oldDesc.fauna || null;
      newDesc.flora = oldDesc.flora || null;
      newDesc.products = oldDesc.products || null;
      
      // people: include symbol, military, population inside
      newDesc.people = oldDesc.people || {};
      if (oldDesc.symbol !== undefined) newDesc.people.symbol = oldDesc.symbol;
      if (oldDesc.military !== undefined) newDesc.people.military = oldDesc.military;
      if (oldDesc.population !== undefined) newDesc.people.population = oldDesc.population;
      
      // timeframe_note at root
      newDesc.timeframe_note = oldDesc.timeframe_note || null;
      
      // notes at root (if exists)
      if (oldDesc.notes !== undefined) newDesc.notes = oldDesc.notes;
      
      // Update the database
      await client.query(
        'UPDATE regions SET description = $1 WHERE id = $2',
        [newDesc, row.id]
      );
      
      updatedCount++;
      console.log(`✅ Updated: ${row.name}`);
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 RESTRUCTURE SUMMARY');
    console.log('='.repeat(60));
    console.log(`Regions updated: ${updatedCount}`);
    console.log(`Regions skipped: ${skippedCount}`);
    
    // Verify structure
    console.log('\n📝 Sample new structure:');
    const sampleResult = await client.query(`
      SELECT id, name, jsonb_object_keys(description) as keys 
      FROM regions 
      WHERE description IS NOT NULL 
      LIMIT 1
    `);
    
    if (sampleResult.rows.length > 0) {
      console.log(`\n  Region: ${sampleResult.rows[0].name}`);
      console.log(`  Keys: ${sampleResult.rows[0].keys.join(', ')}`);
      
      const fullSample = await client.query(`
        SELECT description FROM regions WHERE id = $1
      `, [sampleResult.rows[0].id]);
      
      console.log(`\n  Full structure:`);
      console.log(JSON.stringify(fullSample.rows[0].description, null, 2).substring(0, 500) + '...');
    }
    
  } catch (error) {
    console.error('❌ Restructure failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

restructureRegionsDescription()
  .then(() => {
    console.log('\n✅ Restructure complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });
