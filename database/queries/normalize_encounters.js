import pg from 'pg';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;
const connectionString = 'postgres://christiankarldelhey@localhost:5432/middle_earth';
const pool = new Pool({ connectionString });

// Helper function to calculate string similarity (Levenshtein distance)
function levenshteinDistance(a, b) {
  const matrix = [];
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

// Check if two names are similar (potential duplicates)
function areSimilar(name1, name2) {
  const dist = levenshteinDistance(name1.toLowerCase(), name2.toLowerCase());
  const maxLen = Math.max(name1.length, name2.length);
  const similarity = 1 - (dist / maxLen);
  return similarity > 0.8; // 80% similarity threshold
}

async function normalizeEncounters() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Extracting encounters from regions...\n');
    
    // Extract all encounters from regions
    const result = await client.query(`
      SELECT id, name, encounters 
      FROM regions 
      WHERE encounters IS NOT NULL 
        AND jsonb_array_length(encounters) > 0
    `);
    
    console.log(`📊 Found ${result.rows.length} regions with encounters\n`);
    
    // Build encounter map
    const encounterMap = new Map();
    const categoryMap = new Map();
    
    for (const row of result.rows) {
      for (const encounterGroup of row.encounters) {
        for (const encounter of encounterGroup.data) {
          const key = encounter.name.toLowerCase();
          
          if (!encounterMap.has(key)) {
            encounterMap.set(key, {
              name: encounter.name,
              slug: encounter.slug,
              category: encounter.category,
              regions: [],
              count: 0
            });
          }
          
          const entry = encounterMap.get(key);
          entry.regions.push({
            region_id: row.id,
            region_name: row.name,
            probability: encounter.probability_pct
          });
          entry.count++;
          
          if (!categoryMap.has(encounter.category)) {
            categoryMap.set(encounter.category, []);
          }
          if (!categoryMap.get(encounter.category).includes(key)) {
            categoryMap.get(encounter.category).push(key);
          }
        }
      }
    }
    
    const uniqueEncounters = Array.from(encounterMap.values()).sort((a, b) => b.count - a.count);
    const categories = Array.from(categoryMap.entries()).sort((a, b) => b[1].length - a[1].length);
    
    console.log('=== CATEGORIES ===');
    for (const [cat, encounters] of categories) {
      console.log(`${cat}: ${encounters.length} unique encounters`);
    }
    
    console.log(`\n=== TOP 20 MOST COMMON ENCOUNTERS ===`);
    for (let i = 0; i < Math.min(20, uniqueEncounters.length); i++) {
      const e = uniqueEncounters[i];
      console.log(`${i+1}. ${e.name} (${e.category}) - appears in ${e.count} regions`);
    }
    
    console.log(`\nTotal unique encounters: ${uniqueEncounters.length}`);
    console.log(`Total regions with encounters: ${result.rows.length}`);
    
    // Find potentially similar encounters (ambiguous cases)
    console.log('\n=== CHECKING FOR SIMILAR ENCOUNTERS ===');
    const ambiguousCases = [];
    const checked = new Set();
    
    for (let i = 0; i < uniqueEncounters.length; i++) {
      for (let j = i + 1; j < uniqueEncounters.length; j++) {
        const e1 = uniqueEncounters[i];
        const e2 = uniqueEncounters[j];
        
        // Skip if same category (we want to keep different types separate)
        if (e1.category === e2.category) {
          if (areSimilar(e1.name, e2.name)) {
            const pairKey = [e1.name, e2.name].sort().join('|');
            if (!checked.has(pairKey)) {
              checked.add(pairKey);
              ambiguousCases.push({
                encounter1: e1,
                encounter2: e2,
                similarity: 1 - (levenshteinDistance(e1.name.toLowerCase(), e2.name.toLowerCase()) / Math.max(e1.name.length, e2.name.length))
              });
            }
          }
        }
      }
    }
    
    if (ambiguousCases.length > 0) {
      console.log(`Found ${ambiguousCases.length} potentially similar encounters to review:\n`);
      for (const case_ of ambiguousCases.slice(0, 10)) {
        console.log(`- "${case_.encounter1.name}" vs "${case_.encounter2.name}" (${(case_.similarity * 100).toFixed(1)}% similar)`);
        console.log(`  Category: ${case_.encounter1.category}`);
        console.log(`  Regions: ${case_.encounter1.count} vs ${case_.encounter2.count}\n`);
      }
    } else {
      console.log('No similar encounters found that need manual review.\n');
    }
    
    // Save ambiguous cases to file
    fs.writeFileSync(
      '/Users/christiankarldelhey/Documents/Middle Earth Map/data/ambiguous_encounters.json',
      JSON.stringify(ambiguousCases, null, 2)
    );
    console.log('💾 Saved ambiguous encounters to data/ambiguous_encounters.json');
    
    // Insert encounters into database with probability_by_region
    console.log('\n=== INSERTING ENCOUNTERS INTO DATABASE ===');
    
    for (const encounter of uniqueEncounters) {
      const probabilityByRegion = encounter.regions.map(r => ({
        region: r.region_name,
        probability: r.probability
      }));
      
      await client.query(
        `INSERT INTO encounters (name, slug, category, probability_by_region) 
         VALUES ($1, $2, $3, $4) 
         ON CONFLICT (slug) DO UPDATE 
         SET probability_by_region = EXCLUDED.probability_by_region`,
        [encounter.name, encounter.slug, encounter.category, JSON.stringify(probabilityByRegion)]
      );
    }
    
    console.log(`✅ Inserted ${uniqueEncounters.length} unique encounters with region probabilities`);
    
    // Save normalized encounters to JSON
    const normalizedEncounters = uniqueEncounters.map(e => ({
      name: e.name,
      slug: e.slug,
      category: e.category,
      region_count: e.count,
      probability_by_region: e.regions.map(r => ({
        region: r.region_name,
        probability: r.probability
      }))
    }));
    
    fs.writeFileSync(
      '/Users/christiankarldelhey/Documents/Middle Earth Map/data/normalized_encounters.json',
      JSON.stringify(normalizedEncounters, null, 2)
    );
    console.log('💾 Saved normalized encounters to data/normalized_encounters.json');
    
    console.log('\n✅ Normalization complete!');
    
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

normalizeEncounters().catch(console.error);
