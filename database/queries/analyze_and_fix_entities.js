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

// Function to normalize name (Title Case)
function normalizeName(name) {
  // Handle cases like "H U R N D A E N" -> "Hurndaen"
  if (name.match(/^[A-Z](\s+[A-Z])+$/)) {
    return name.replace(/\s+/g, '');
  }
  
  // Capitalize first letter, lowercase the rest
  return name
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// Function to create slug from name
function createSlug(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .trim();
}

// Function to detect multiple creatures in description
function detectMultipleCreatures(description) {
  if (!description) return [];
  
  const creatures = [];
  const patterns = [
    /The\s+([A-Z][a-z]+)\s+is\s+(?:a|an)/g,
    /([A-Z][a-z]+)\s+(?:is|are)\s+(?:a|an|the)/g,
    /(?:The\s+)?([A-Z][a-z]+)\s+(?:bird|bat|creature|beast|animal|insect|spider|dragon|troll|giant|demon|undead)/g,
    /([A-Z][a-z]+)\s+(?:is|are)\s+found/g,
    /(?:The\s+)?([A-Z][a-z]+)\s+(?:has|have)/g,
  ];
  
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(description)) !== null) {
      const creatureName = match[1];
      if (creatureName && creatureName.length > 2 && !creatures.includes(creatureName)) {
        creatures.push(creatureName);
      }
    }
  }
  
  return creatures;
}

async function analyzeAndFixEntities() {
  try {
    console.log('Analyzing entities...\n');
    
    // Get all entities
    const result = await pool.query('SELECT * FROM entities ORDER BY id');
    const entities = result.rows;
    
    console.log(`Total entities: ${entities.length}\n`);
    
    const fixes = [];
    
    for (const entity of entities) {
      const originalName = entity.name;
      const normalized = normalizeName(originalName);
      const newSlug = createSlug(normalized);
      
      // Check if name needs normalization
      if (originalName !== normalized) {
        fixes.push({
          id: entity.id,
          type: 'name_normalization',
          original: originalName,
          normalized: normalized,
          originalSlug: entity.slug,
          newSlug: newSlug
        });
      }
      
      // Check for multiple creatures in description
      const multipleCreatures = detectMultipleCreatures(entity.description);
      if (multipleCreatures.length > 0) {
        console.log(`\n⚠️  Entity "${entity.name}" may contain multiple creatures:`);
        console.log(`   Detected: ${multipleCreatures.join(', ')}`);
        console.log(`   Description preview: ${entity.description.substring(0, 200)}...`);
      }
    }
    
    console.log(`\n\n${'='.repeat(60)}`);
    console.log(`Found ${fixes.length} entities needing name normalization:\n`);
    
    fixes.forEach(fix => {
      console.log(`ID: ${fix.id}`);
      console.log(`  Original: "${fix.original}" (slug: ${fix.originalSlug})`);
      console.log(`  Normalized: "${fix.normalized}" (slug: ${fix.newSlug})`);
      console.log();
    });
    
    // Apply fixes
    if (fixes.length > 0) {
      console.log(`${'='.repeat(60)}`);
      console.log('Applying fixes...\n');
      
      for (const fix of fixes) {
        await pool.query(
          'UPDATE entities SET name = $1, slug = $2 WHERE id = $3',
          [fix.normalized, fix.newSlug, fix.id]
        );
        console.log(`✅ Updated entity ${fix.id}: "${fix.original}" -> "${fix.normalized}"`);
      }
      
      console.log(`\n✅ Applied ${fixes.length} fixes`);
    } else {
      console.log('No name normalizations needed.');
    }
    
  } catch (error) {
    console.error('Error analyzing entities:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

analyzeAndFixEntities();
