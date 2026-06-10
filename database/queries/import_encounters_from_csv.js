import pg from 'pg';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;
const connectionString = 'postgres://christiankarldelhey@localhost:5432/middle_earth';
const pool = new Pool({ connectionString });

async function importEncountersFromCSV() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Reading CSV file...\n');
    
    const csvContent = fs.readFileSync(
      '/Users/christiankarldelhey/Documents/Middle Earth Map/data_public/encounters_final.csv',
      'utf-8'
    );
    
    const lines = csvContent.split('\n').filter(line => line.trim());
    const headers = lines[0].split(',');
    
    const encounters = [];
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line.trim()) continue;
      
      // Parse CSV handling quoted fields manually
      const values = [];
      let current = '';
      let inQuotes = false;
      
      for (let j = 0; j < line.length; j++) {
        const char = line[j];
        if (char === '"') {
          if (inQuotes && j + 1 < line.length && line[j + 1] === '"') {
            // Escaped quote ("")
            current += '"';
            j++;
          } else {
            inQuotes = !inQuotes;
          }
        } else if (char === ',' && !inQuotes) {
          values.push(current);
          current = '';
        } else {
          current += char;
        }
      }
      values.push(current);
      
      if (values.length < 6) {
        console.warn(`Skipping malformed line ${i}: ${line.substring(0, 50)}...`);
        continue;
      }
      
      const id = values[0].trim();
      const name = values[1].trim();
      const slug = values[2].trim();
      const category = values[3].trim();
      const createdAt = values[4].trim();
      const probabilityByRegionStr = values[5];
      
      // Parse the JSON string from CSV
      let probabilityByRegion = [];
      if (probabilityByRegionStr && probabilityByRegionStr !== '""') {
        try {
          // CSV uses "" to escape quotes, so we need to convert "" to "
          let cleaned = probabilityByRegionStr
            .replace(/^"|"$/g, '')  // Remove outer quotes
            .replace(/""/g, '"');   // Convert "" to "
          
          // Handle cases where the JSON might be malformed
          if (cleaned && cleaned !== '[]') {
            probabilityByRegion = JSON.parse(cleaned);
          }
        } catch (e) {
          console.warn(`Failed to parse probability_by_region for ${name}: ${e.message}`);
          console.warn(`  Original: ${probabilityByRegionStr}`);
        }
      }
      
      encounters.push({
        id,
        name,
        slug,
        category,
        created_at: createdAt,
        probability_by_region: probabilityByRegion
      });
    }
    
    console.log(`📊 Found ${encounters.length} encounters in CSV\n`);
    
    // Group encounters by slug to handle duplicates
    console.log('🔗 Grouping encounters by slug...');
    const encountersBySlug = new Map();
    
    for (const encounter of encounters) {
      if (!encountersBySlug.has(encounter.slug)) {
        encountersBySlug.set(encounter.slug, {
          id: encounter.id,
          name: encounter.name,
          slug: encounter.slug,
          category: encounter.category,
          created_at: encounter.created_at,
          probability_by_region: []
        });
      }
      
      const existing = encountersBySlug.get(encounter.slug);
      // Merge probability_by_region arrays
      existing.probability_by_region = existing.probability_by_region.concat(encounter.probability_by_region);
    }
    
    console.log(`📊 ${encountersBySlug.size} unique encounters after deduplication\n`);
    
    // Clear existing encounters
    console.log('🗑️  Clearing existing encounters table...');
    await client.query('TRUNCATE TABLE encounters CASCADE');
    console.log('✅ Table cleared\n');
    
    // Insert new encounters using IDs from CSV
    console.log('📥 Inserting new encounters...');
    let inserted = 0;
    
    for (const [slug, encounter] of encountersBySlug) {
      await client.query(
        `INSERT INTO encounters (id, name, slug, category, created_at, probability_by_region) 
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          encounter.id,
          encounter.name,
          encounter.slug,
          encounter.category,
          encounter.created_at,
          JSON.stringify(encounter.probability_by_region)
        ]
      );
      inserted++;
      
      if (inserted % 50 === 0) {
        console.log(`  Progress: ${inserted}/${encountersBySlug.size}`);
      }
    }
    
    console.log(`✅ Inserted ${inserted} encounters\n`);
    
    // Verify
    const result = await client.query('SELECT COUNT(*) as count FROM encounters');
    console.log(`📊 Total encounters in database: ${result.rows[0].count}`);
    
    // Show sample
    const sample = await client.query('SELECT name, slug, category FROM encounters LIMIT 5');
    console.log('\n=== SAMPLE ENCOUNTERS ===');
    for (const row of sample.rows) {
      console.log(`- ${row.name} (${row.slug}) - ${row.category}`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

importEncountersFromCSV().catch(console.error);
