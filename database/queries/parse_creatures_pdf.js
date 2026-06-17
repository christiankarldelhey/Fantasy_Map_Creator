const fs = require('fs');
const path = require('path');

// Read the creatures text file
const creaturesText = fs.readFileSync(
  path.join(__dirname, '../../data_public/entities/creatures_text.txt'),
  'utf-8'
);

// Read the kingdoms and regions CSV
const csvText = fs.readFileSync(
  path.join(__dirname, '../../data_public/entities/kingdoms_and_regions.csv'),
  'utf-8'
);

// Parse the CSV to create a region lookup
const regionLookup = {};
const csvLines = csvText.split('\n').slice(1); // Skip header
csvLines.forEach(line => {
  if (!line.trim()) return;
  const [kingdom, regionsStr] = line.split(',');
  if (regionsStr) {
    // Remove quotes and split regions
    const regions = regionsStr.replace(/"/g, '').split(',').map(r => r.trim());
    regions.forEach(region => {
      // Extract region name (remove the area info in parentheses)
      const regionName = region.replace(/\s*\([^)]+\)\s*/, '').trim();
      if (regionName) {
        regionLookup[regionName.toLowerCase()] = regionName;
      }
    });
  }
});

// Map section headers to entity types
const sectionTypeMap = {
  'BATS AND BIRDS': 'flying_animals',
  'WATER BEASTS': 'water_animals',
  'POTILI (INSECTS & SPIDERS)': 'insects',
  'RÁVATSAR (AMPHIBIANS & REPTILES)': 'amphibians',
  'LASSANAKÛNI (LEAF-EATERS)': 'herbivores',
  'RIDING AND DRAFT ANIMALS': 'riding_animals',
  'APSANAKÛNI (MEAT-EATERS)': 'carnivores',
  'OTHER DANGEROUS ANIMALS': 'other_animals',
  'DEMONIC WATER MONSTERS': 'water_creatures',
  'DEMONS': 'demons',
  'DRAGONS': 'drakes',
  'GIANTS': 'giants',
  'TROLLS': 'trolls',
  'PÛKEL-CREATURES': 'pukel',
  'GIANT SPIDERS AND INSECTS': 'giant_insects',
  'UNDEAD BEINGS': 'undead'
};

// Biome keywords
const biomeKeywords = {
  'marsh': ['marsh', 'swamp', 'bog', 'wetland', 'nindalf', 'wetwang'],
  'desert': ['desert', 'dune', 'waste'],
  'forest': ['forest', 'wood', 'mirkwood', 'fangorn', 'old forest'],
  'mountains': ['mountain', 'hill', 'peak', 'cliff'],
  'plains': ['plain', 'steppe', 'grassland', 'field'],
  'river': ['river', 'lake', 'stream', 'water'],
  'cave': ['cave', 'cavern', 'underground']
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

// Function to clean entity name
function cleanName(name) {
  return name
    .replace(/\s+/g, ' ')
    .trim();
}

// Function to extract biomes from description
function extractBiomes(description) {
  if (!description) return null;
  const descLower = description.toLowerCase();
  const foundBiomes = [];
  
  for (const [biome, keywords] of Object.entries(biomeKeywords)) {
    for (const keyword of keywords) {
      if (descLower.includes(keyword)) {
        if (!foundBiomes.includes(biome)) {
          foundBiomes.push(biome);
        }
        break;
      }
    }
  }
  
  return foundBiomes.length > 0 ? foundBiomes : null;
}

// Function to find region IDs from description
function findRegions(description) {
  if (!description) return null;
  const descLower = description.toLowerCase();
  const foundRegions = [];
  
  for (const [key, regionName] of Object.entries(regionLookup)) {
    if (descLower.includes(key)) {
      foundRegions.push(regionName);
    }
  }
  
  return foundRegions.length > 0 ? foundRegions : null;
}

// Parse the creatures text
const lines = creaturesText.split('\n');
const entities = [];
let currentType = null;
let currentEntity = null;

// Skip words that are not entity names
const skipWords = ['NOTE', 'SEE', 'MONSTER', 'GLOSSARY', 'ANIMAL', 'LOCATIONS', 'ORIGINS', 'MORGOTH', 'ARDA', 'CREATURES', 'THE', 'A', 'AN'];

// Stats patterns to skip
const statsPatterns = [/^[a-z]{1,3}-/, /^;/, /\d+ft/, /\d+inch/, /\d+feet/, /^\d+$/];

for (let i = 0; i < lines.length; i++) {
  const line = lines[i].trim();
  
  // Check if this is a section header
  for (const [section, type] of Object.entries(sectionTypeMap)) {
    if (line.includes(section)) {
      currentType = type;
      if (currentEntity && currentEntity.description.length > 50) {
        entities.push(currentEntity);
      }
      currentEntity = null;
      break;
    }
  }
  
  // Check if this is an entity name (all caps with colon, but not a skip word)
  const entityMatch = line.match(/^([A-Z][A-Z\s]+):/);
  if (entityMatch && currentType) {
    const name = entityMatch[1].trim();
    
    // Skip if it's a word we should ignore
    const isSkipWord = skipWords.some(word => name === word || name.startsWith(word + ' '));
    if (isSkipWord) {
      continue;
    }
    
    // Skip if it's too short or looks like stats
    if (name.length < 3 || statsPatterns.some(pattern => pattern.test(name))) {
      continue;
    }
    
    // Save previous entity if exists and has meaningful description
    if (currentEntity && currentEntity.description.length > 50) {
      entities.push(currentEntity);
    }
    
    currentEntity = {
      name: cleanName(name),
      type: currentType,
      description: ''
    };
  } else if (currentEntity && line && 
             !line.match(/^[A-Z\s]+:/) && 
             !line.includes('Animal Glossary') && 
             !line.includes('Monster Glossary') && 
             !line.includes('NOTE:') && 
             !line.includes('See Monsters') &&
             !line.includes('See Flying') &&
             !line.includes('See ICE') &&
             !line.match(/^\d+$/) &&
             !line.match(/^/) &&
             !statsPatterns.some(pattern => pattern.test(line))) {
    // Add to description
    if (currentEntity.description) {
      currentEntity.description += ' ' + line;
    } else {
      currentEntity.description = line;
    }
  }
}

// Don't forget the last entity
if (currentEntity && currentEntity.description.length > 50) {
  entities.push(currentEntity);
}

// Generate SQL INSERT statements
const sqlStatements = [];
sqlStatements.push('-- Insert entities from MERP 8005 - Creatures of Middle-Earth');
sqlStatements.push('');

entities.forEach(entity => {
  const slug = createSlug(entity.name);
  const biomes = extractBiomes(entity.description);
  const regions = findRegions(entity.description);
  
  let biomesStr = biomes ? `ARRAY[${biomes.map(b => `'${b}'`).join(', ')}]` : 'NULL';
  let regionIdStr = 'NULL'; // We'll need to look up actual region IDs from the database
  
  sqlStatements.push(`INSERT INTO entities (name, slug, type, description, url_path, region_id, biomes)`);
  sqlStatements.push(`VALUES (`);
  sqlStatements.push(`  '${entity.name.replace(/'/g, "''")}',`);
  sqlStatements.push(`  '${slug}',`);
  sqlStatements.push(`  '${entity.type}',`);
  sqlStatements.push(`  '${entity.description.replace(/'/g, "''").substring(0, 4000)}',`);
  sqlStatements.push(`  NULL,`);
  sqlStatements.push(`  ${regionIdStr},`);
  sqlStatements.push(`  ${biomesStr}`);
  sqlStatements.push(`);`);
  sqlStatements.push('');
  
  // Add comment about regions found
  if (regions) {
    sqlStatements.push(`-- Found regions: ${regions.join(', ')}`);
    sqlStatements.push('');
  }
});

// Write to SQL file
const outputPath = path.join(__dirname, 'insert_entities_from_merp.sql');
fs.writeFileSync(outputPath, sqlStatements.join('\n'));

console.log(`Generated ${entities.length} entity insert statements`);
console.log(`Output written to: ${outputPath}`);
console.log('\nEntity types found:');
const typeCounts = {};
entities.forEach(e => {
  typeCounts[e.type] = (typeCounts[e.type] || 0) + 1;
});
console.log(typeCounts);
