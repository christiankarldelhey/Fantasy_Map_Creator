import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;
const connectionString = 'postgres://christiankarldelhey@localhost:5432/middle_earth';
const pool = new Pool({ connectionString });

async function restoreEncountersMetadata() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Restoring encounters metadata from regions_backup...\n');
    
    // Get regions with metadata in backup
    const backupResult = await client.query(`
      SELECT name, encounters 
      FROM regions_backup 
      WHERE encounters IS NOT NULL 
        AND encounters != '[]'::jsonb
        AND jsonb_typeof(encounters) = 'array'
        AND (encounters->0->>'source' IS NOT NULL 
             OR encounters->0->>'distance' IS NOT NULL 
             OR encounters->0->>'chance_pct' IS NOT NULL 
             OR encounters->0->>'time_hours' IS NOT NULL)
    `);
    
    console.log(`📊 Found ${backupResult.rows.length} regions with metadata in backup\n`);
    
    let restoredCount = 0;
    
    for (const backupRow of backupResult.rows) {
      const regionName = backupRow.name;
      const backupEncountersArray = backupRow.encounters;
      
      // Get current region encounters
      const regionResult = await client.query(
        'SELECT id, name, encounters FROM regions WHERE name = $1',
        [regionName]
      );
      
      if (regionResult.rows.length === 0) {
        console.warn(`⚠️  Region not found in regions table: ${regionName}`);
        continue;
      }
      
      const region = regionResult.rows[0];
      const currentEncounters = region.encounters || {};
      
      // Extract metadata from first element of backup array
      const backupEncounters = backupEncountersArray[0] || {};
      const metadata = {};
      if (backupEncounters.source !== undefined && backupEncounters.source !== null) {
        metadata.source = backupEncounters.source;
      }
      if (backupEncounters.distance !== undefined && backupEncounters.distance !== null) {
        metadata.distance = backupEncounters.distance;
      }
      if (backupEncounters.chance_pct !== undefined && backupEncounters.chance_pct !== null) {
        metadata.chance_pct = backupEncounters.chance_pct;
      }
      if (backupEncounters.time_hours !== undefined && backupEncounters.time_hours !== null) {
        metadata.time_hours = backupEncounters.time_hours;
      }
      
      // Merge metadata with current encounters (keep existing data)
      const newEncounters = {
        ...currentEncounters,
        ...metadata
      };
      
      // Update the region
      await client.query(
        'UPDATE regions SET encounters = $1 WHERE id = $2',
        [JSON.stringify(newEncounters), region.id]
      );
      
      restoredCount++;
      
      if (restoredCount % 10 === 0) {
        console.log(`  Progress: ${restoredCount}/${backupResult.rows.length} regions restored`);
      }
    }
    
    console.log(`\n✅ Restored metadata for ${restoredCount} regions\n`);
    
    // Verify
    console.log('🔍 Verifying restoration...');
    const verifyResult = await client.query(`
      SELECT COUNT(*) as count 
      FROM regions 
      WHERE encounters->>'source' IS NOT NULL
    `);
    console.log(`📊 Regions with metadata (source): ${verifyResult.rows[0].count}`);
    
    // Sample
    const sample = await client.query(`
      SELECT name, encounters 
      FROM regions 
      WHERE encounters->>'source' IS NOT NULL
      LIMIT 3
    `);
    
    console.log('\n=== SAMPLE REGIONS WITH METADATA ===');
    for (const row of sample.rows) {
      const encounters = row.encounters;
      console.log(`\nRegion: ${row.name}`);
      console.log(`  source: ${encounters.source}`);
      console.log(`  distance: ${encounters.distance}`);
      console.log(`  chance_pct: ${encounters.chance_pct}`);
      console.log(`  time_hours: ${encounters.time_hours}`);
      console.log(`  data count: ${encounters.data ? encounters.data.length : 0}`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

restoreEncountersMetadata().catch(console.error);
