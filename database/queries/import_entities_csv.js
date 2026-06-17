import pg from 'pg';
const { Pool } = pg;
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from backend directory
dotenv.config({ path: path.join(__dirname, '../../backend/.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Type corrections mapping
const typeCorrections = {
  'meat_eating_animals': 'carnivores',
  'leaf_eating_animals': 'herbivores',
  'dragons': 'drakes',
  'reptiles': 'amphibians',
  'water_beasts': 'water_animals'
};

// Function to create slug from name
function createSlug(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .trim();
}

// Function to parse biomes from CSV format
function parseBiomes(biomesStr) {
  if (!biomesStr || biomesStr === 'NULL') return null;
  
  // CSV format: "{forest,mountains}" or "forest,mountains"
  const cleaned = biomesStr.replace(/[{}]/g, '');
  if (!cleaned) return null;
  
  return cleaned.split(',').map(b => b.trim());
}

async function importEntities() {
  try {
    console.log('Reading CSV file...\n');
    
    const csvPath = path.join(__dirname, '../../data_public/entities/entidades_faltantes (1).csv');
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    const lines = csvContent.split('\n').slice(1); // Skip header
    
    // Function to parse CSV line considering quoted fields
    function parseCSVLine(line) {
      const result = [];
      let current = '';
      let inQuotes = false;
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          result.push(current);
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current);
      return result;
    }
    
    // Get existing entities from database
    const existingResult = await pool.query('SELECT name, slug FROM entities');
    const existingNames = new Set(existingResult.rows.map(e => e.name.toLowerCase()));
    const existingSlugs = new Set(existingResult.rows.map(e => e.slug.toLowerCase()));
    
    console.log(`Found ${existingNames.size} existing entities in database\n`);
    
    const entitiesToInsert = [];
    const skippedEntities = [];
    const typeCorrectionsApplied = [];
    
    for (const line of lines) {
      if (!line.trim()) continue;
      
      const [id, name, slug, type, description, urlPath, regionId, biomes, createdAt] = parseCSVLine(line);
      
      if (!name) continue;
      
      // Check if entity already exists
      if (existingNames.has(name.toLowerCase()) || existingSlugs.has(slug.toLowerCase())) {
        skippedEntities.push(name);
        continue;
      }
      
      // Apply type corrections
      let correctedType = type;
      if (typeCorrections[type]) {
        correctedType = typeCorrections[type];
        typeCorrectionsApplied.push({ name, original: type, corrected: correctedType });
      }
      
      // Parse biomes
      const biomesArray = parseBiomes(biomes);
      
      entitiesToInsert.push({
        id,
        name: name.replace(/"/g, ''),
        slug: slug.replace(/"/g, ''),
        type: correctedType,
        description: description ? description.replace(/"/g, '').replace(/\n/g, ' ') : '',
        urlPath: urlPath || 'NULL',
        regionId: regionId || 'NULL',
        biomes: biomesArray
      });
    }
    
    console.log(`Found ${entitiesToInsert.length} new entities to insert`);
    console.log(`Skipped ${skippedEntities.length} existing entities\n`);
    
    if (typeCorrectionsApplied.length > 0) {
      console.log('Type corrections applied:');
      typeCorrectionsApplied.forEach(({ name, original, corrected }) => {
        console.log(`  ${name}: ${original} → ${corrected}`);
      });
      console.log();
    }
    
    if (entitiesToInsert.length === 0) {
      console.log('No new entities to insert.');
      return;
    }
    
    // Execute inserts using parameterized queries
    console.log('\nExecuting INSERT statements...\n');
    
    let insertedCount = 0;
    for (const entity of entitiesToInsert) {
      try {
        await pool.query(
          `INSERT INTO entities (id, name, slug, type, description, url_path, region_id, biomes)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            entity.id,
            entity.name,
            entity.slug,
            entity.type,
            entity.description.substring(0, 4000),
            entity.urlPath === 'NULL' ? null : entity.urlPath,
            entity.regionId === 'NULL' ? null : entity.regionId,
            entity.biomes
          ]
        );
        insertedCount++;
        console.log(`✅ Inserted: ${entity.name}`);
      } catch (error) {
        console.error(`❌ Failed to insert ${entity.name}:`, error.message);
      }
    }
    
    console.log(`\n✅ Successfully inserted ${insertedCount} entities`);
    
    // Verify
    const countResult = await pool.query('SELECT COUNT(*) as count FROM entities');
    console.log(`\nTotal entities in database: ${countResult.rows[0].count}`);
    
  } catch (error) {
    console.error('Error importing entities:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

importEntities();
