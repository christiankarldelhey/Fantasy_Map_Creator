import pg from 'pg';
const { Pool } = pg;
import dotenv from 'dotenv';
import readline from 'readline';
import { randomUUID } from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from backend directory
dotenv.config({ path: path.join(__dirname, '../../backend/.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
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

// Function to infer type from context
function inferTypeFromContext(context, text) {
  const lowerText = text.toLowerCase();
  
  if (context === 'flora') {
    // Check for trees
    if (lowerText.includes('tree') || lowerText.includes('oak') || lowerText.includes('pine') || 
        lowerText.includes('elm') || lowerText.includes('birch') || lowerText.includes('willow')) {
      return 'trees';
    }
    return 'plants';
  }
  
  if (context === 'fauna') {
    // Check for specific animal types
    if (lowerText.includes('bird') || lowerText.includes('eagle') || lowerText.includes('hawk') ||
        lowerText.includes('owl') || lowerText.includes('crow')) {
      return 'flying_animals';
    }
    if (lowerText.includes('wolf') || lowerText.includes('bear') || lowerText.includes('lion') ||
        lowerText.includes('tiger') || lowerText.includes('cat')) {
      return 'carnivores';
    }
    if (lowerText.includes('deer') || lowerText.includes('horse') || lowerText.includes('cow') ||
        lowerText.includes('sheep') || lowerText.includes('rabbit')) {
      return 'herbivores';
    }
    if (lowerText.includes('troll')) {
      return 'trolls';
    }
    if (lowerText.includes('orc')) {
      return 'orcs';
    }
    if (lowerText.includes('dragon')) {
      return 'drakes';
    }
    if (lowerText.includes('insect') || lowerText.includes('spider') || lowerText.includes('bee')) {
      return 'insects';
    }
    return 'other_animals';
  }
  
  if (context === 'people') {
    // Check for humanoid races
    if (lowerText.includes('dwarf') || lowerText.includes('khazad')) {
      return 'dwarves';
    }
    if (lowerText.includes('elf') || lowerText.includes('elven')) {
      return 'elves';
    }
    if (lowerText.includes('hobbit') || lowerText.includes('halfling')) {
      return 'hobbits';
    }
    if (lowerText.includes('orc')) {
      return 'orcs';
    }
    if (lowerText.includes('troll')) {
      return 'trolls';
    }
    return 'humans';
  }
  
  return 'other_animals';
}

// Function to normalize entity name for matching
function normalizeName(name) {
  return name.toLowerCase().trim().replace(/[^\w\s-]/g, '');
}

// Function to extract entity names from text
function extractEntityNames(text) {
  const names = [];
  
  // Skip if text is too long (likely a description)
  if (text.length > 100) {
    // Try to extract specific names from longer text
    // Look for patterns like "X and Y", "X, Y, and Z", etc.
    const andPattern = /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+and\s+([A-Z][a-z]+)/g;
    let match;
    while ((match = andPattern.exec(text)) !== null) {
      names.push(match[1]);
      names.push(match[2]);
    }
    
    // Look for comma-separated names
    const commaPattern = /([A-Z][a-z]+)(?:,\s+[A-Z][a-z]+)*/g;
    while ((match = commaPattern.exec(text)) !== null) {
      const parts = match[0].split(',').map(p => p.trim());
      names.push(...parts);
    }
    
    // If no names found, return empty (it's a description)
    if (names.length === 0) {
      return [];
    }
  } else {
    // Short text is likely a name
    names.push(text);
  }
  
  return names;
}

// Function to check if text is likely a description vs an entity name
function isLikelyDescription(text) {
  // Check for description indicators
  const descriptionIndicators = [
    'a ', 'an ', 'the ', 'said to have', 'blessed by', 'characterized by',
    'known for', 'famous for', 'rich in', 'abundant with', 'home to',
    'filled with', 'covered with', 'rolling', 'scattered', 'fertile',
    'ancient passage', 'said to be', 'appears to be', 'seems to be'
  ];
  
  const lowerText = text.toLowerCase();
  
  // If starts with article, likely description
  if (/^(a|an|the)\s/.test(lowerText)) {
    return true;
  }
  
  // If contains description indicators
  for (const indicator of descriptionIndicators) {
    if (lowerText.includes(indicator)) {
      return true;
    }
  }
  
  // If very long, likely description
  if (text.length > 50) {
    return true;
  }
  
  return false;
}

// Function to extract entity mentions from JSONB
function extractMentions(jsonbField, context) {
  if (!jsonbField) return [];
  
  const mentions = [];
  
  // Handle different JSONB structures
  if (Array.isArray(jsonbField)) {
    jsonbField.forEach(item => {
      if (typeof item === 'string') {
        // Skip if it's a description
        if (!isLikelyDescription(item)) {
          const names = extractEntityNames(item);
          names.forEach(name => {
            mentions.push({ text: name, context });
          });
        }
      } else if (typeof item === 'object' && item !== null) {
        // Handle object with name, desc, etc.
        if (item.name && !isLikelyDescription(item.name)) {
          const names = extractEntityNames(item.name);
          names.forEach(name => {
            mentions.push({ text: name, context, desc: item.desc });
          });
        }
        // Don't extract from desc field as it's likely description
      }
    });
  } else if (typeof jsonbField === 'object' && jsonbField !== null) {
    // Handle single object
    Object.values(jsonbField).forEach(value => {
      if (typeof value === 'string') {
        if (!isLikelyDescription(value)) {
          const names = extractEntityNames(value);
          names.forEach(name => {
            mentions.push({ text: name, context });
          });
        }
      } else if (Array.isArray(value)) {
        value.forEach(item => {
          if (typeof item === 'string' && !isLikelyDescription(item)) {
            const names = extractEntityNames(item);
            names.forEach(name => {
              mentions.push({ text: name, context });
            });
          }
        });
      }
    });
  }
  
  return mentions;
}

// Function to find matching entity
function findMatchingEntity(mention, allEntities) {
  const normalizedMention = normalizeName(mention.text);
  
  // Try exact match first
  let match = allEntities.find(e => normalizeName(e.name) === normalizedMention);
  if (match) return { entity: match, confidence: 'exact' };
  
  // Try slug match
  match = allEntities.find(e => e.slug === normalizedMention.replace(/\s+/g, '_'));
  if (match) return { entity: match, confidence: 'slug' };
  
  // Try partial match (mention contains entity name or vice versa)
  match = allEntities.find(e => 
    normalizedMention.includes(normalizeName(e.name)) || 
    normalizeName(e.name).includes(normalizedMention)
  );
  if (match) return { entity: match, confidence: 'partial' };
  
  // Try type-based match for common terms
  const lowerMention = mention.text.toLowerCase();
  if (lowerMention.includes('troll')) {
    match = allEntities.find(e => e.type === 'trolls');
    if (match) return { entity: match, confidence: 'type' };
  }
  if (lowerMention.includes('orc')) {
    match = allEntities.find(e => e.type === 'orcs');
    if (match) return { entity: match, confidence: 'type' };
  }
  
  return null;
}

async function analyzeRegions() {
  try {
    console.log('🔍 Analyzing regions to relate entities...\n');
    
    // Fetch all regions
    const regionsResult = await pool.query(`
      SELECT id, name, fauna, flora, people 
      FROM regions 
      ORDER BY id
    `);
    
    // Fetch all entities
    const entitiesResult = await pool.query(`
      SELECT id, name, slug, type, description, region_ids 
      FROM entities
    `);
    
    const allEntities = entitiesResult.rows;
    
    console.log(`Found ${regionsResult.rows.length} regions`);
    console.log(`Found ${allEntities.length} entities\n`);
    
    const proposals = [];
    let processedRegions = 0;
    
    for (const region of regionsResult.rows) {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`Region #${region.id}: ${region.name}`);
      console.log('='.repeat(60));
      
      // Extract mentions from all fields
      const mentions = [
        ...extractMentions(region.fauna, 'fauna'),
        ...extractMentions(region.flora, 'flora'),
        ...extractMentions(region.people, 'people')
      ];
      
      if (mentions.length === 0) {
        console.log('  No mentions found in this region');
        processedRegions++;
        continue;
      }
      
      console.log(`  Found ${mentions.length} mentions to analyze\n`);
      
      for (const mention of mentions) {
        const match = findMatchingEntity(mention, allEntities);
        
        console.log(`\n  📝 Text: "${mention.text}" (${mention.context})`);
        
        if (match) {
          const entity = match.entity;
          const hasRegion = entity.region_ids && entity.region_ids.includes(region.id);
          
          console.log(`  ✅ Match found: ${entity.name} (${entity.type}) [${match.confidence}]`);
          console.log(`     Current regions: ${entity.region_ids ? entity.region_ids.join(', ') : 'none'}`);
          
          if (hasRegion) {
            console.log(`     ℹ️  Entity already has this region - skipping`);
            continue;
          }
          
          console.log(`     💡 Proposal: Add region #${region.id} to entity's region_ids`);
          
          const response = await question('     Accept? (y/n/skip): ');
          
          if (response.toLowerCase() === 'y') {
            proposals.push({
              action: 'update',
              entityId: entity.id,
              entityName: entity.name,
              regionId: region.id,
              regionName: region.name,
              currentRegionIds: entity.region_ids || []
            });
            console.log(`     ✅ Added to proposals`);
          } else if (response.toLowerCase() === 'skip') {
            console.log(`     ⏭️  Skipping remaining mentions for this region`);
            break;
          } else {
            console.log(`     ❌ Rejected`);
          }
        } else {
          console.log(`  ❌ No match found`);
          const inferredType = inferTypeFromContext(mention.context, mention.text);
          console.log(`     💡 Proposal: Create new entity`);
          console.log(`        Name: ${mention.text}`);
          console.log(`        Type: ${inferredType}`);
          console.log(`        Region: #${region.id} (${region.name})`);
          
          const response = await question('     Create new entity? (y/n/skip): ');
          
          if (response.toLowerCase() === 'y') {
            proposals.push({
              action: 'create',
              name: mention.text,
              type: inferredType,
              regionId: region.id,
              regionName: region.name,
              context: mention.context,
              description: mention.desc || `Found in ${region.name} ${mention.context}`
            });
            console.log(`     ✅ Added to proposals`);
          } else if (response.toLowerCase() === 'skip') {
            console.log(`     ⏭️  Skipping remaining mentions for this region`);
            break;
          } else {
            console.log(`     ❌ Rejected`);
          }
        }
      }
      
      processedRegions++;
      
      // Ask if user wants to continue
      if (processedRegions < regionsResult.rows.length) {
        const continueResponse = await question('\nContinue to next region? (y/n): ');
        if (continueResponse.toLowerCase() !== 'y') {
          console.log('\nStopping analysis...');
          break;
        }
      }
    }
    
    // Summary
    console.log(`\n${'='.repeat(60)}`);
    console.log('ANALYSIS COMPLETE');
    console.log('='.repeat(60));
    console.log(`Regions processed: ${processedRegions}/${regionsResult.rows.length}`);
    console.log(`Total proposals: ${proposals.length}`);
    console.log(`  - Updates: ${proposals.filter(p => p.action === 'update').length}`);
    console.log(`  - Creations: ${proposals.filter(p => p.action === 'create').length}`);
    
    if (proposals.length > 0) {
      const executeResponse = await question('\nExecute proposals? (y/n): ');
      
      if (executeResponse.toLowerCase() === 'y') {
        console.log('\nExecuting proposals...\n');
        
        let executed = 0;
        
        for (const proposal of proposals) {
          try {
            if (proposal.action === 'update') {
              const newRegionIds = [...proposal.currentRegionIds, proposal.regionId];
              await pool.query(
                'UPDATE entities SET region_ids = $1 WHERE id = $2',
                [newRegionIds, proposal.entityId]
              );
              console.log(`✅ Updated: ${proposal.entityName} + region #${proposal.regionId}`);
            } else if (proposal.action === 'create') {
              const slug = createSlug(proposal.name);
              await pool.query(
                `INSERT INTO entities (id, name, slug, type, description, region_ids, url_path, biomes)
                 VALUES ($1, $2, $3, $4, $5, $6, NULL, NULL)`,
                [randomUUID(), proposal.name, slug, proposal.type, proposal.description, [proposal.regionId]]
              );
              console.log(`✅ Created: ${proposal.name} (${proposal.type}) in region #${proposal.regionId}`);
            }
            executed++;
          } catch (error) {
            console.error(`❌ Failed: ${proposal.name || proposal.entityName} - ${error.message}`);
          }
        }
        
        console.log(`\n✅ Executed ${executed}/${proposals.length} proposals`);
      } else {
        console.log('\nProposals not executed. You can review them in the log above.');
      }
    }
    
  } catch (error) {
    console.error('Error analyzing regions:', error);
    throw error;
  } finally {
    rl.close();
    await pool.end();
  }
}

analyzeRegions();
