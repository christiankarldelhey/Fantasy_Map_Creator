import pg from 'pg';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;
const connectionString = 'postgres://christiankarldelhey@localhost:5432/middle_earth';
const pool = new Pool({ connectionString });

async function exportNormalizedEncounters() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Exporting normalized encounters from database...\n');
    
    // Get all encounters with their region relationships
    const result = await client.query(`
      SELECT 
        id,
        name,
        slug,
        category,
        jsonb_array_length(probability_by_region) as region_count,
        probability_by_region
      FROM encounters
      ORDER BY region_count DESC
    `);
    
    const normalizedEncounters = result.rows.map(row => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      category: row.category,
      region_count: row.region_count,
      probability_by_region: row.probability_by_region
    }));
    
    fs.writeFileSync(
      '/Users/christiankarldelhey/Documents/Middle Earth Map/data/normalized_encounters.json',
      JSON.stringify(normalizedEncounters, null, 2)
    );
    
    console.log(`✅ Exported ${normalizedEncounters.length} normalized encounters`);
    console.log('💾 Saved to data/normalized_encounters.json');
    
    // Get category summary
    const categoryResult = await client.query(`
      SELECT category, COUNT(*) as count 
      FROM encounters 
      GROUP BY category 
      ORDER BY count DESC
    `);
    
    console.log('\n=== CATEGORIES ===');
    for (const row of categoryResult.rows) {
      console.log(`${row.category}: ${row.count} unique encounters`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

exportNormalizedEncounters().catch(console.error);
