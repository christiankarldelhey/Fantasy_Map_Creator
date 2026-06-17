import pg from 'pg';
const { Pool } = pg;
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from backend directory
dotenv.config({ path: path.join(__dirname, '../../backend/.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Function to create slug from name
function createSlug(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .trim();
}

// Function to extract creature names from description
function extractCreaturesFromDescription(description, entityType) {
  if (!description) return [];
  
  const creatures = [];
  
  // Pattern for sentences starting with "The X is..." or "X is..."
  const isPattern = /(?:The\s+)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+(?:is|are)\s+(?:a|an|the|found|located)/g;
  
  // Pattern for sentences like "The X, a Y, is..."
  const appositivePattern = /(?:The\s+)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?),\s+(?:a|an)\s+/g;
  
  // Pattern for "X is a [type]..."
  const typePattern = /(?:The\s+)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+is\s+(?:a|an)\s+(?:bird|bat|creature|beast|animal|insect|spider|dragon|troll|giant|demon|undead|wolf|eagle|bear|lion|snake|fish)/g;
  
  // Pattern for "X, also known as Y"
  const alsoKnownPattern = /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?),\s+(?:also\s+known\s+as|aka)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/g;
  
  // Pattern for "X and Y are..."
  const andPattern = /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+and\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+are/g;
  
  const patterns = [isPattern, appositivePattern, typePattern, alsoKnownPattern, andPattern];
  
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(description)) !== null) {
      for (let i = 1; i < match.length; i++) {
        const creatureName = match[i];
        if (creatureName && creatureName.length > 2 && !creatures.includes(creatureName)) {
          creatures.push(creatureName);
        }
      }
    }
  }
  
  return creatures;
}

// Function to split description by creature
function splitDescriptionByCreature(description, creatureNames) {
  if (!description || creatureNames.length === 0) return {};
  
  const splits = {};
  const lowerDesc = description.toLowerCase();
  
  creatureNames.forEach(name => {
    const lowerName = name.toLowerCase();
    const index = lowerDesc.indexOf(lowerName);
    
    if (index !== -1) {
      // Find the start of the sentence
      let start = index;
      while (start > 0 && description[start - 1] !== '.' && description[start - 1] !== '\n') {
        start--;
      }
      
      // Find the end of the sentence
      let end = index + lowerName.length;
      while (end < description.length && description[end] !== '.' && description[end] !== '\n') {
        end++;
      }
      
      splits[name] = description.substring(start, end + 1).trim();
    }
  });
  
  return splits;
}

async function analyzeMixedDescriptions() {
  try {
    console.log('Analyzing mixed descriptions...\n');
    
    // Get all entities
    const result = await pool.query('SELECT * FROM entities ORDER BY id');
    const entities = result.rows;
    
    const mixedEntities = [];
    
    for (const entity of entities) {
      const creatures = extractCreaturesFromDescription(entity.description, entity.type);
      
      if (creatures.length > 1) {
        mixedEntities.push({
          id: entity.id,
          name: entity.name,
          type: entity.type,
          description: entity.description,
          detectedCreatures: creatures
        });
      }
    }
    
    console.log(`Found ${mixedEntities.length} entities with potentially mixed descriptions:\n`);
    
    mixedEntities.forEach((entity, index) => {
      console.log(`${index + 1}. ${entity.name} (${entity.type})`);
      console.log(`   Detected creatures: ${entity.detectedCreatures.join(', ')}`);
      console.log(`   Description: ${entity.description.substring(0, 300)}...`);
      console.log();
    });
    
    if (mixedEntities.length > 0) {
      console.log('\n' + '='.repeat(60));
      console.log('Do you want to separate these entities? (y/n)');
      console.log('This will:');
      console.log('1. Split the description into separate entities');
      console.log('2. Delete the original mixed entity');
      console.log('3. Create new entities for each detected creature');
    }
    
  } catch (error) {
    console.error('Error analyzing mixed descriptions:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

analyzeMixedDescriptions();
