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

// Hardcoded list of existing entities
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
  let listStart = -1;
  let braceCount = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const regionMatch = line.match(/^Region #(\d+): (.+)$/);
    
    if (regionMatch) {
      if (currentRegion) {
        regions.push(currentRegion);
      }
      const regionNum = parseInt(regionMatch[1]);
      if (regionNum >= 20 && regionNum <= 87) {
        currentRegion = {
          number: regionNum,
          name: regionMatch[2],
          startLine: i,
          listStart: -1,
          listEnd: -1,
          objects: []
        };
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
        braceCount += (line.match(/\{/g) || []).length;
        braceCount -= (line.match(/\}/g) || []).length;
        
        if (braceCount === 0 && line.trim().startsWith('}')) {
          currentRegion.listStart = listStart;
          currentRegion.listEnd = i;
          inList = false;
        }
      }
    }
  }

  if (currentRegion) {
    regions.push(currentRegion);
  }

  return regions;
}

function parseObjectsInRegion(lines, listStart, listEnd) {
  const objects = [];
  let currentObj = [];
  let braceCount = 0;
  let inObject = false;
  let objStart = -1;

  for (let i = listStart; i <= listEnd; i++) {
    const line = lines[i];
    
    if (line.trim().startsWith('{') && !inObject) {
      inObject = true;
      objStart = i;
      braceCount = 0;
    }
    
    if (inObject) {
      currentObj.push(line);
      braceCount += (line.match(/\{/g) || []).length;
      braceCount -= (line.match(/\}/g) || []).length;
      
      if (braceCount === 0 && currentObj.length > 0) {
        objects.push({
          startLine: objStart,
          endLine: i,
          fullText: currentObj.join('\n')
        });
        currentObj = [];
        inObject = false;
      }
    }
  }

  return objects;
}

async function processObject(obj, existingEntities) {
  console.log('\n' + '='.repeat(80));
  console.log(obj.fullText);
  console.log('='.repeat(80));
  
  // Skip if already has ONLY ADD disclaimer
  if (obj.fullText.includes('ONLY ADD region id in entity')) {
    console.log('\n[Ya tiene disclaimer - saltando]');
    return null;
  }
  
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
    const nameMatch = obj.fullText.match(/"name":\s*"([^"]+)"/);
    const descMatch = obj.fullText.match(/"description":\s*"([^"]+)"/);
    
    let name = nameMatch ? nameMatch[1] : '';
    const description = descMatch ? descMatch[1] : '';
    
    const newName = await question(`¿Cambiar name? (actual: "${name}", presiona Enter para mantener): `);
    if (newName.trim()) {
      name = newName.trim();
    }
    
    const type = await question(`Type? (default: humans): `) || 'humans';
    
    return `    {\n      "name": "${name}",\n      "type": "${type}",\n      "description": "${description}"\n    },`;
  }
  
  return null;
}

async function main() {
  try {
    console.log('Cargando entidades existentes...');
    const existingEntities = await getExistingEntities();
    console.log(`Se encontraron ${existingEntities.length} entidades humanoides.\n`);
    
    console.log('Leyendo archivo de análisis...');
    let content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    
    console.log('Parseando regiones...');
    const regions = parseRegions(content);
    console.log(`Se encontraron ${regions.length} regiones (20-87).\n`);
    
    for (const region of regions) {
      console.log(`\n${'='.repeat(80)}`);
      console.log(`Region #${region.number}: ${region.name}`);
      console.log('='.repeat(80));
      
      if (region.listStart === -1) {
        console.log('No se encontró lista en esta región - saltando');
        continue;
      }
      
      const objects = parseObjectsInRegion(lines, region.listStart, region.listEnd);
      console.log(`Se encontraron ${objects.length} objetos en esta región.`);
      
      for (let i = 0; i < objects.length; i++) {
        const obj = objects[i];
        console.log(`\n[Objeto ${i + 1}/${objects.length}] (líneas ${obj.startLine}-${obj.endLine})`);
        
        const newText = await processObject(obj, existingEntities);
        
        if (newText) {
          // Replace by line numbers
          const before = lines.slice(0, obj.startLine).join('\n');
          const after = lines.slice(obj.endLine + 1).join('\n');
          
          const newContent = before + '\n' + newText + '\n' + after;
          
          fs.writeFileSync(filePath, newContent, 'utf-8');
          
          // Update lines array for next replacements
          const newLines = newContent.split('\n');
          lines.splice(0, lines.length, ...newLines);
          
          console.log('✓ Cambio guardado');
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
