import pg from 'pg';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;
const connectionString = 'postgres://christiankarldelhey@localhost:5432/middle_earth';
const pool = new Pool({ connectionString });

async function fixRegionProbabilities() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Fixing region probability sums...\n');
    
    // Get all encounters
    const result = await client.query('SELECT id, name, slug, probability_by_region FROM encounters');
    
    // Aggregate probabilities by region and track which encounters contribute
    const regionData = new Map();
    
    for (const row of result.rows) {
      const probs = row.probability_by_region || [];
      for (const prob of probs) {
        const region = prob.region;
        const probability = prob.probability || 0;
        
        if (!regionData.has(region)) {
          regionData.set(region, {
            total: 0,
            encounters: []
          });
        }
        
        regionData.get(region).total += probability;
        regionData.get(region).encounters.push({
          encounter_id: row.id,
          probability: probability
        });
      }
    }
    
    console.log(`📊 Found ${regionData.size} regions\n`);
    
    // Normalize each region
    let fixedCount = 0;
    for (const [region, data] of regionData) {
      if (data.total !== 100 && data.total > 0) {
        const scaleFactor = 100 / data.total;
        
        console.log(`Fixing ${region}: ${data.total}% -> 100% (scale: ${scaleFactor.toFixed(3)})`);
        
        // Update each encounter's probability for this region
        for (const encounter of data.encounters) {
          const newProbability = Math.round(encounter.probability * scaleFactor);
          
          await client.query(`
            UPDATE encounters 
            SET probability_by_region = (
              SELECT jsonb_agg(
                CASE 
                  WHEN elem->>'region' = $1 THEN 
                    jsonb_build_object('region', $1, 'probability', $2::int)
                  ELSE 
                    elem
                END
              )
              FROM jsonb_array_elements(probability_by_region) elem
            )
            WHERE id = $3
          `, [region, newProbability, encounter.encounter_id]);
        }
        
        fixedCount++;
      }
    }
    
    console.log(`\n✅ Fixed ${fixedCount} regions\n`);
    
    // Verify
    console.log('🔍 Verifying fixes...');
    const verifyResult = await client.query('SELECT name, slug, probability_by_region FROM encounters');
    
    const regionProbabilities = new Map();
    for (const row of verifyResult.rows) {
      const probs = row.probability_by_region || [];
      for (const prob of probs) {
        const region = prob.region;
        const probability = prob.probability || 0;
        
        if (!regionProbabilities.has(region)) {
          regionProbabilities.set(region, 0);
        }
        regionProbabilities.set(region, regionProbabilities.get(region) + probability);
      }
    }
    
    const stillWrong = [];
    for (const [region, sum] of regionProbabilities) {
      if (sum !== 100) {
        stillWrong.push({ region, sum });
      }
    }
    
    if (stillWrong.length > 0) {
      console.log(`⚠️  ${stillWrong.length} regions still not summing to 100:`);
      for (const { region, sum } of stillWrong) {
        console.log(`  - ${region}: ${sum}%`);
      }
    } else {
      console.log('✅ All regions now sum to 100%');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

fixRegionProbabilities().catch(console.error);
