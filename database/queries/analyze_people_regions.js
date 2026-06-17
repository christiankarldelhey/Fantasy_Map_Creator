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

// Function to normalize name for matching
function normalizeName(name) {
  return name.toLowerCase().trim().replace(/[^\w\s-]/g, '');
}

// Function to extract people names from JSONB
function extractPeopleNames(peopleField) {
  if (!peopleField) return [];
  
  const names = [];
  
  if (Array.isArray(peopleField)) {
    peopleField.forEach(item => {
      if (typeof item === 'string') {
        names.push(item);
      } else if (typeof item === 'object' && item !== null) {
        if (item.name) names.push(item.name);
      }
    });
  } else if (typeof peopleField === 'object' && peopleField !== null) {
    Object.values(peopleField).forEach(value => {
      if (typeof value === 'string') {
        names.push(value);
      } else if (Array.isArray(value)) {
        value.forEach(item => {
          if (typeof item === 'string') {
            names.push(item);
          }
        });
      }
    });
  }
  
  return names;
}

// Function to find matching entity
function findMatchingEntity(peopleName, allEntities) {
  const normalizedPeople = normalizeName(peopleName);
  
  // Try exact match first
  let match = allEntities.find(e => normalizeName(e.name) === normalizedPeople);
  if (match) return { entity: match, confidence: 'exact' };
  
  // Try slug match
  match = allEntities.find(e => e.slug === normalizedPeople.replace(/\s+/g, '_'));
  if (match) return { entity: match, confidence: 'slug' };
  
  // Try partial match
  match = allEntities.find(e => 
    normalizedPeople.includes(normalizeName(e.name)) || 
    normalizeName(e.name).includes(normalizedPeople)
  );
  if (match) return { entity: match, confidence: 'partial' };
  
  return null;
}

async function analyzePeopleRegions() {
  try {
    console.log('🔍 Analyzing people field in regions...\n');
    
    // Get all regions with people field
    const regionsResult = await pool.query(`
      SELECT id, name, people 
      FROM regions 
      WHERE people IS NOT NULL 
      ORDER BY id
    `);
    
    console.log(`Found ${regionsResult.rows.length} regions with people data\n`);
    
    // Get humanoid entities
    const entitiesResult = await pool.query(`
      SELECT id, name, slug, type, region_ids 
      FROM entities 
      WHERE type IN ('humans', 'dwarves', 'elves', 'hobbits', 'orcs', 'trolls')
    `);
    
    const allEntities = entitiesResult.rows;
    console.log(`Found ${allEntities.length} humanoid entities\n`);
    
    // Display people field for each region and save to file
    let output = '='.repeat(80) + '\n';
    output += 'PEOPLE FIELD BY REGION (in order)\n';
    output += '='.repeat(80) + '\n\n';
    
    for (const region of regionsResult.rows) {
      output += `Region #${region.id}: ${region.name}\n`;
      output += '-'.repeat(80) + '\n';
      
      if (typeof region.people === 'string') {
        output += region.people;
      } else if (typeof region.people === 'object' && region.people !== null) {
        output += JSON.stringify(region.people, null, 2);
      } else {
        output += String(region.people);
      }
      
      output += '\n\n';
    }
    
    // Save to file
    const outputPath = path.join(__dirname, 'people_regions_analysis.txt');
    fs.writeFileSync(outputPath, output, 'utf-8');
    
    console.log(`Analysis saved to: ${outputPath}`);
    console.log(`Total regions analyzed: ${regionsResult.rows.length}`);
  } catch (error) {
    console.error('Error analyzing people regions:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

analyzePeopleRegions();
