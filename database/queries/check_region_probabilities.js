import pg from 'pg';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;
const connectionString = 'postgres://christiankarldelhey@localhost:5432/middle_earth';
const pool = new Pool({ connectionString });

async function checkRegionProbabilities() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Checking region probability sums...\n');
    
    // Get all encounters
    const result = await client.query('SELECT name, slug, probability_by_region FROM encounters');
    
    // Aggregate probabilities by region
    const regionProbabilities = new Map();
    
    for (const row of result.rows) {
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
    
    console.log(`📊 Found ${regionProbabilities.size} regions with encounter data\n`);
    
    // Analyze results
    const okRegions = [];
    const problemRegions = [];
    
    for (const [region, sum] of regionProbabilities) {
      if (sum === 100) {
        okRegions.push({ region, sum });
      } else {
        problemRegions.push({ region, sum, diff: 100 - sum });
      }
    }
    
    console.log(`✅ Regions summing to 100: ${okRegions.length}`);
    console.log(`❌ Regions NOT summing to 100: ${problemRegions.length}\n`);
    
    if (problemRegions.length > 0) {
      console.log('=== PROBLEM REGIONS ===');
      problemRegions.sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));
      
      for (const { region, sum, diff } of problemRegions) {
        const status = diff > 0 ? 'LOW' : 'HIGH';
        console.log(`- ${region}: ${sum}% (${status} by ${Math.abs(diff)}%)`);
      }
      
      // Statistics
      const avgSum = problemRegions.reduce((acc, r) => acc + r.sum, 0) / problemRegions.length;
      const maxSum = Math.max(...problemRegions.map(r => r.sum));
      const minSum = Math.min(...problemRegions.map(r => r.sum));
      
      console.log('\n=== STATISTICS ===');
      console.log(`Average sum: ${avgSum.toFixed(2)}%`);
      console.log(`Max sum: ${maxSum}%`);
      console.log(`Min sum: ${minSum}%`);
    }
    
    // Save report
    const report = {
      total_regions: regionProbabilities.size,
      ok_regions: okRegions.length,
      problem_regions: problemRegions.length,
      ok_regions_list: okRegions,
      problem_regions_list: problemRegions
    };
    
    fs.writeFileSync(
      '/Users/christiankarldelhey/Documents/Middle Earth Map/data/region_probability_report.json',
      JSON.stringify(report, null, 2)
    );
    
    console.log('\n💾 Report saved to data/region_probability_report.json');
    
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

checkRegionProbabilities().catch(console.error);
