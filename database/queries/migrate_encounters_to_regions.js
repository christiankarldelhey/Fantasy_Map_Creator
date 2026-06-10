import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;
const connectionString = 'postgres://christiankarldelhey@localhost:5432/middle_earth';
const pool = new Pool({ connectionString });

async function migrateEncountersToRegions() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Starting migration of encounters to regions...\n');
    
    // Get all encounters with their probability_by_region
    const encountersResult = await client.query('SELECT id, name, slug, probability_by_region FROM encounters');
    
    console.log(`📊 Found ${encountersResult.rows.length} encounters\n`);
    
    // Build a map of region -> encounters
    const regionEncounters = new Map();
    
    for (const encounter of encountersResult.rows) {
      const probs = encounter.probability_by_region || [];
      
      for (const prob of probs) {
        const regionName = prob.region;
        const probability = prob.probability || 0;
        
        if (!regionEncounters.has(regionName)) {
          regionEncounters.set(regionName, []);
        }
        
        regionEncounters.get(regionName).push({
          encounter_id: encounter.id,
          name: encounter.name,
          slug: encounter.slug,
          probability_pct: probability
        });
      }
    }
    
    console.log(`📊 Found encounters for ${regionEncounters.size} regions\n`);
    
    // Update each region
    let updatedCount = 0;
    let preservedMetadataCount = 0;
    
    for (const [regionName, encounters] of regionEncounters) {
      // Get the region's current encounters metadata
      const regionResult = await client.query(
        'SELECT id, name, encounters FROM regions WHERE name = $1',
        [regionName]
      );
      
      if (regionResult.rows.length === 0) {
        console.warn(`⚠️  Region not found: ${regionName}`);
        continue;
      }
      
      const region = regionResult.rows[0];
      const currentEncounters = region.encounters || {};
      
      // Preserve metadata only if they exist
      const metadata = {};
      if (currentEncounters.source !== undefined && currentEncounters.source !== null) {
        metadata.source = currentEncounters.source;
        preservedMetadataCount++;
      }
      if (currentEncounters.distance !== undefined && currentEncounters.distance !== null) {
        metadata.distance = currentEncounters.distance;
      }
      if (currentEncounters.chance_pct !== undefined && currentEncounters.chance_pct !== null) {
        metadata.chance_pct = currentEncounters.chance_pct;
      }
      if (currentEncounters.time_hours !== undefined && currentEncounters.time_hours !== null) {
        metadata.time_hours = currentEncounters.time_hours;
      }
      
      // Also preserve any other top-level fields that might exist
      if (currentEncounters.data !== undefined) {
        // We'll replace data, but keep other fields
      }
      
      // Build new encounters data with references (include slug for readability)
      const newData = encounters.map(e => ({
        encounter_id: e.encounter_id,
        slug: e.slug,
        probability_pct: e.probability_pct
      }));
      
      // Update the region
      const newEncounters = {
        data: newData,
        ...metadata
      };
      
      await client.query(
        'UPDATE regions SET encounters = $1 WHERE id = $2',
        [JSON.stringify(newEncounters), region.id]
      );
      
      updatedCount++;
      
      if (updatedCount % 10 === 0) {
        console.log(`  Progress: ${updatedCount}/${regionEncounters.size} regions updated`);
      }
    }
    
    console.log(`\n✅ Updated ${updatedCount} regions`);
    console.log(`📊 Preserved metadata for ${preservedMetadataCount} regions\n`);
    
    // Verify
    console.log('🔍 Verifying migration...');
    const verifyResult = await client.query(`
      SELECT r.name, r.encounters
      FROM regions r
      WHERE jsonb_array_length(r.encounters->'data') > 0
      LIMIT 5
    `);
    
    console.log('\n=== SAMPLE REGIONS ===');
    for (const row of verifyResult.rows) {
      const encounters = row.encounters;
      console.log(`\nRegion: ${row.name}`);
      console.log(`  Metadata: source=${encounters.source}, distance=${encounters.distance}, chance_pct=${encounters.chance_pct}, time_hours=${encounters.time_hours}`);
      console.log(`  Encounters count: ${encounters.data ? encounters.data.length : 0}`);
      if (encounters.data && encounters.data.length > 0) {
        console.log(`  First encounter: encounter_id=${encounters.data[0].encounter_id}, probability=${encounters.data[0].probability_pct}%`);
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

migrateEncountersToRegions().catch(console.error);
