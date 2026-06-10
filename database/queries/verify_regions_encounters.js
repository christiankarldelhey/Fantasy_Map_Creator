import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;
const connectionString = 'postgres://christiankarldelhey@localhost:5432/middle_earth';
const pool = new Pool({ connectionString });

async function verifyRegionsEncounters() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Verifying regions encounters migration...\n');
    
    // Check total regions
    const totalRegions = await client.query('SELECT COUNT(*) as count FROM regions');
    console.log(`📊 Total regions: ${totalRegions.rows[0].count}`);
    
    // Check regions with encounters
    const regionsWithEncounters = await client.query(`
      SELECT COUNT(*) as count 
      FROM regions 
      WHERE jsonb_array_length(encounters->'data') > 0
    `);
    console.log(`📊 Regions with encounters: ${regionsWithEncounters.rows[0].count}`);
    
    // Check regions without encounters
    const regionsWithoutEncounters = await client.query(`
      SELECT COUNT(*) as count 
      FROM regions 
      WHERE jsonb_array_length(encounters->'data') = 0 OR encounters->'data' IS NULL
    `);
    console.log(`📊 Regions without encounters: ${regionsWithoutEncounters.rows[0].count}`);
    
    // Verify probability sums per region
    console.log('\n🔍 Verifying probability sums per region...');
    const regions = await client.query('SELECT id, name, encounters FROM regions');
    
    let incorrectSums = 0;
    for (const region of regions.rows) {
      const encounters = region.encounters?.data || [];
      const sum = encounters.reduce((acc, e) => acc + (e.probability_pct || 0), 0);
      
      if (sum !== 100 && sum !== 0) {
        console.log(`⚠️  ${region.name}: ${sum}% (should be 100%)`);
        incorrectSums++;
      }
    }
    
    if (incorrectSums === 0) {
      console.log('✅ All regions sum to 100%');
    } else {
      console.log(`❌ ${incorrectSums} regions have incorrect probability sums`);
    }
    
    // Check metadata
    console.log('\n🔍 Checking metadata...');
    const regionsWithMetadata = await client.query(`
      SELECT COUNT(*) as count 
      FROM regions 
      WHERE encounters->>'source' IS NOT NULL
    `);
    console.log(`📊 Regions with metadata (source): ${regionsWithMetadata.rows[0].count}`);
    
    // Sample regions
    console.log('\n=== SAMPLE REGIONS ===');
    const sample = await client.query(`
      SELECT name, encounters 
      FROM regions 
      WHERE jsonb_array_length(encounters->'data') > 0
      LIMIT 3
    `);
    
    for (const row of sample.rows) {
      const encounters = row.encounters;
      console.log(`\nRegion: ${row.name}`);
      console.log(`  Encounters count: ${encounters.data ? encounters.data.length : 0}`);
      console.log(`  Has metadata: ${encounters.source ? 'Yes' : 'No'}`);
      if (encounters.data && encounters.data.length > 0) {
        const sum = encounters.data.reduce((acc, e) => acc + (e.probability_pct || 0), 0);
        console.log(`  Probability sum: ${sum}%`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

verifyRegionsEncounters().catch(console.error);
