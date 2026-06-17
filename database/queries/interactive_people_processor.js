const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const filePath = path.join(__dirname, 'people_regions_analysis.txt');

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

// Hardcoded list of existing entities based on previous analysis
// TODO: Replace with database query when DATABASE_URL is correctly configured
async function getExistingEntities() {
  return [
    'Rohirrim', 'Dunlendings', 'Beornings', 'Woodmen', 'Northmen', 
    'Dunedain', 'Woses', 'Corsairs', 'Haradrim', 'Eothraim', 'Othod',
    'Dunadan', 'Daen folk', 'Daen Coentis', 'Sakalai', 'Grey-elves of Edhellond',
    'Bree-landers', 'Tharbad people', 'Saralainn', 'Beffraen', 'Eagles',
    'Ents', 'Giant Spiders', 'Stone-trolls', 'Cave-trolls', 'Red Wolves',
    'Kine Of Araw', 'Fell Beasts', 'Uruk-hai', 'Mûmakil', 'Oak', 'Beech',
    'Birch', 'Elm', 'Falathrim', 'Othraim', 'Druedain', 'Marshmen'
  ];
}

function parseRegions(content) {
  const regions = [];
  const lines = content.split('\n');
  let currentRegion = null;
  let inList = false;
  let listContent = [];
  let braceCount = 0;
  let listStart = -1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const regionMatch = line.match(/^Region #(\d+): (.+)$/);
    
    if (regionMatch) {
      if (currentRegion) {
        currentRegion.listContent = listContent.join('\n');
        regions.push(currentRegion);
      }
      const regionNum = parseInt(regionMatch[1]);
      if (regionNum >= 20 && regionNum <= 87) {
        currentRegion = {
          number: regionNum,
          name: regionMatch[2],
          startLine: i,
          listStart: -1,
          listContent: ''
        };
        listContent = [];
        inList = false;
        braceCount = 0;
      } else {
        currentRegion = null;
      }
    } else if (currentRegion) {
      if (line.includes('"list": [')) {
        inList = true;
        listStart = i;
        braceCount = 0;
      }
      
      if (inList) {
        listContent.push(line);
        braceCount += (line.match(/\{/g) || []).length;
        braceCount -= (line.match(/\}/g) || []).length;
        
        if (braceCount === 0 && listContent.length > 1) {
          currentRegion.listStart = listStart;
          currentRegion.listEnd = i;
          inList = false;
        }
      }
    }
  }

  if (currentRegion && listContent.length > 0) {
    currentRegion.listContent = listContent.join('\n');
    regions.push(currentRegion);
  }

  return regions;
}

function parseListObjects(listContent) {
  const objects = [];
  const lines = listContent.split('\n');
  let currentObj = [];
  let braceCount = 0;
  let inObject = false;

  for (const line of lines) {
    if (line.trim().startsWith('{')) {
      inObject = true;
      braceCount = 0;
    }
    
    if (inObject) {
      currentObj.push(line);
      braceCount += (line.match(/\{/g) || []).length;
      braceCount -= (line.match(/\}/g) || []).length;
      
      if (braceCount === 0 && currentObj.length > 0) {
        objects.push({
          fullText: currentObj.join('\n'),
          startLine: currentObj[0]
        });
        currentObj = [];
        inObject = false;
      }
    }
  }

  return objects;
}

async function processObject(objText, existingEntities) {
  console.log('\n' + '='.repeat(80));
  console.log(objText);
  console.log('='.repeat(80));
  
  const choice = await question('\n¿Qué hacer? 1) ONLY ADD (entidad existente) 2) Nueva entidad [1/2]: ');
  
  if (choice === '1') {
    console.log('\nEntidades existentes:');
    existingEntities.forEach((name, idx) => {
      console.log(`  ${idx + 1}) ${name}`);
    });
    
    const entityChoice = await question('Selecciona número o escribe nombre personalizado: ');
    const num = parseInt(entityChoice);
    let entityName;
    
    if (!isNaN(num) && num > 0 && num <= existingEntities.length) {
      entityName = existingEntities[num - 1];
    } else {
      entityName = entityChoice.trim();
    }
    
    return `    {\n      ONLY ADD region id in entity ${entityName}\n    },`;
  } else if (choice === '2') {
    // Parse the object to extract name and description
    const nameMatch = objText.match(/"name":\s*"([^"]+)"/);
    const descMatch = objText.match(/"description":\s*"([^"]+)"/);
    
    let name = nameMatch ? nameMatch[1] : '';
    const description = descMatch ? descMatch[1] : '';
    
    const newName = await question(`¿Cambiar name? (actual: "${name}", presiona Enter para mantener): `);
    if (newName.trim()) {
      name = newName.trim();
    }
    
    const type = await question(`Type? (default: humans): `) || 'humans';
    
    return `    {\n      "name": "${name}",\n      "type": "${type}",\n      "description": "${description}"\n    },`;
  }
  
  return objText;
}

async function main() {
  try {
    console.log('Cargando entidades existentes...');
    const existingEntities = await getExistingEntities();
    console.log(`Se encontraron ${existingEntities.length} entidades humanoides.\n`);
    
    console.log('Leyendo archivo de análisis...');
    let content = fs.readFileSync(filePath, 'utf-8');
    
    console.log('Parseando regiones...');
    const regions = parseRegions(content);
    console.log(`Se encontraron ${regions.length} regiones (20-87).\n`);
    
    const allLines = content.split('\n');
    
    for (const region of regions) {
      console.log(`\n${'='.repeat(80)}`);
      console.log(`Region #${region.number}: ${region.name}`);
      console.log('='.repeat(80));
      
      const objects = parseListObjects(region.listContent);
      
      for (let i = 0; i < objects.length; i++) {
        const obj = objects[i];
        
        // Skip if already has ONLY ADD disclaimer
        if (obj.fullText.includes('ONLY ADD region id in entity')) {
          console.log(`\n[Objeto ${i + 1}/${objects.length}] Ya tiene disclaimer - saltando`);
          continue;
        }
        
        console.log(`\n[Objeto ${i + 1}/${objects.length}]`);
        const newText = await processObject(obj.fullText, existingEntities);
        
        if (newText !== obj.fullText) {
          // Find and replace in the original content
          const oldText = obj.fullText;
          
          // Try to find the exact text in the content
          const index = content.indexOf(oldText);
          
          if (index !== -1) {
            // Replace the text
            const newContent = content.substring(0, index) + newText + content.substring(index + oldText.length);
            
            fs.writeFileSync(filePath, newContent, 'utf-8');
            content = newContent;
            console.log('✓ Cambio guardado');
          } else {
            console.log('⚠ No se encontró el texto exacto para reemplazar');
            console.log('Longitud del texto a buscar:', oldText.length);
            console.log('Primeros 100 caracteres:', oldText.substring(0, 100));
            console.log('Últimos 100 caracteres:', oldText.substring(oldText.length - 100));
          }
        }
      }
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('Proceso completado');
    console.log('='.repeat(80));
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    rl.close();
  }
}

main();
