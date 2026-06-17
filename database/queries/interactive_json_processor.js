const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const filePath = path.join(__dirname, 'people_region_analysis.json');

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

async function processObject(obj, existingEntities) {
  console.log('\n' + '='.repeat(80));
  console.log(JSON.stringify(obj, null, 2));
  console.log('='.repeat(80));
  
  // Skip if already has disclaimer
  if (obj.disclaimer) {
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
    
    return { disclaimer: `ONLY ADD region id in entity ${entityName}` };
  } else if (choice === '2') {
    let name = obj.name || '';
    const description = obj.description || '';
    
    const newName = await question(`¿Cambiar name? (actual: "${name}", presiona Enter para mantener): `);
    if (newName.trim()) {
      name = newName.trim();
    }
    
    const type = await question(`Type? (default: humans): `) || 'humans';
    
    return {
      name: name,
      type: type,
      description: description
    };
  }
  
  return null;
}

async function main() {
  try {
    console.log('Cargando entidades existentes...');
    const existingEntities = await getExistingEntities();
    console.log(`Se encontraron ${existingEntities.length} entidades humanoides.\n`);
    
    console.log('Leyendo archivo JSON...');
    const content = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(content);
    
    console.log(`Se encontraron ${data.people_field_by_region.length} regiones.\n`);
    
    // Find starting point (region 20)
    let startRegionIndex = data.people_field_by_region.findIndex(r => r.region_id === 20);
    if (startRegionIndex === -1) {
      console.log('No se encontró la región #20');
      return;
    }
    
    // Find starting object (Dúnedain of Dor‑en‑Ernil is index 1 in region 20)
    let startObjectIndex = 1;
    
    for (let i = startRegionIndex; i < data.people_field_by_region.length; i++) {
      const region = data.people_field_by_region[i];
      
      console.log(`\n${'='.repeat(80)}`);
      console.log(`Region #${region.region_id}: ${region.region_name}`);
      console.log('='.repeat(80));
      
      const startIndex = (i === startRegionIndex) ? startObjectIndex : 0;
      
      for (let j = startIndex; j < region.list.length; j++) {
        const obj = region.list[j];
        console.log(`\n[Objeto ${j + 1}/${region.list.length}]`);
        
        const newObj = await processObject(obj, existingEntities);
        
        if (newObj) {
          region.list[j] = newObj;
          
          // Save the entire JSON
          fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
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
