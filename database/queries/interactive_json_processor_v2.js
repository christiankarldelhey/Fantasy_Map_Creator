const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const filePath = path.join(__dirname, 'people_region_analysis_fixed.json');

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
    'Birch', 'Elm', 'Falathrim', 'Othraim', 'Druedain', 'Marshmen',
    'Noldor', 'Hobbits', 'merchants', 'common orcs', 'trolls and olog-hai',
    "Thranduil's Wood-elves", 'Dwarves of Erebor', 'Dwarves of Durin',
    'Silvan Elves', 'Nenedain', 'Hillmen of Rhudaur', 'Ice-orcs',
    'Orc tribes of the Grey Mountains', 'Lossoth', 'Dwarves of the Blue Mountains',
    'Mountain Giants', 'Falathrim (Sea-Elves)', 'Godhellim (Noldor of Lindon)',
    'Iathrim and Laegrim', 'Lindellim', 'Dwarves of the Iron Hills',
    'Dúnedain and Gondorian farmers', 'Messengers', 'Marshmen of the Ethir Anduin',
    'Urban Northmen', 'Bandits and deserters', 'Gondorian Quarrymen',
    'Princes of Dol Amroth', 'Eredrim', 'Elves of Edhellond', 'Daen Iontis',
    'Stoors of New Maresh', 'Nenedain (Northmen of the Anduin Vales)',
    'Hillmen of Rhudaur (NeDreubhan)', 'Orcs of Goblin-gate', 'Great Eagles',
    'Stone Giants', 'Noldor of Eregion', 'Gwaith-i-Mírdain', 'Sindar of Eregion',
    'Silvan Elves (rural shepherds)', 'Dwarves of Khazad-dûm', 'Galadriel and Celeborn',
    'Celebrimbor', "Orcs of Khazad-dûm", 'Dunlendings (Daen Lintis)',
    'Daen Iontis faction', 'Daen Coentis faction', 'Dúnedain landowners',
    'Stoors of New Maresh', 'Drúedain of Caerdh Wood', 'Traders and smugglers',
    'Merimetsästäjät', 'Helechoth / Aerfaroth', 'Snow-elves of Helloth',
    'Lodge of Awakening', 'Southern whalers and traders', "Sauron's Armies",
    'Gondorian rangers of Ithilien', 'Displaced Gondorian folk',
    'Haradrim and other enemy forces', 'Slaves of Nurn', 'Wild Men of Drúwaith Iaur',
    'Dunir (Dunmen)', 'Dúnedain of the Faithful', 'Danan Lin / Daen folk',
    'Orodbedhrim / Daen Coentis', 'Sakalai (Ethir swamp peoples)',
    'Grey-elves of Edhellond', 'Elves of Rivendell', 'Elrond and his household',
    'Dúnedain of Arnor and Rangers', 'Hillmen of Rhudaur', 'Dúnedain of Rhudaur',
    'Dunlendings (Dunmen) of Rhudaur', 'Hillmen of Rhudaur (Rhudaurrim)',
    'Rhudaurrim (mixed Dúnedain and Hillmen)', 'Trollshaws settlers and garrisons',
    'Onodrim (Ents of Fangorn)', 'Huorns', 'Calenardhons (Men of Calenardhon)',
    'Silvan Elves of the borders', 'Barz Thrugrim and other border factions',
    'Wood-men of Southern Mirkwood', 'Beijabar of Nan Anduin', 'Northmen of the Talath Harroch',
    'Eothraim and Gramuz tribes', 'Gondorian outposts and settlers',
    'Asdriags and Sagath (Easterlings)', 'Elves of Southern Mirkwood',
    'Radagast the Brown', 'The Necromancer of Dol Guldur', 'Orcs and Tereg trolls',
    'Galadhrim', 'Galadriel', 'Celeborn', 'Dúnedain of Arthedain', 'Lossoth of Forochel',
    'Rivermen of the northern waters', 'Hobbits of the Shire', 'Elves of Lindon',
    'Dorwinrim (Wine-merchants)'
  ];
}

async function processObject(obj, existingEntities, regionId, regionName) {
  const objText = JSON.stringify(obj, null, 2);
  
  console.log('\n' + '='.repeat(80));
  console.log(`Region #${regionId}: ${regionName}`);
  console.log('='.repeat(80));
  console.log(objText);
  console.log('='.repeat(80));
  
  // Check if already has disclaimer
  if (obj.disclaimer && obj.disclaimer.startsWith('ONLY ADD region id in entity')) {
    console.log('\n[✓] Ya tiene disclaimer - saltando');
    return obj;
  }
  
  const choice = await question('\n¿Qué hacer? 1) ONLY ADD (entidad existente) 2) Nueva entidad 3) Mantener como está [1/2/3]: ');
  
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
    
    return {
      disclaimer: `ONLY ADD region id in entity ${entityName}`
    };
  } else if (choice === '2') {
    let name = obj.name || '';
    const description = obj.description || '';
    
    const newName = await question(`¿Cambiar name? (actual: "${name}", presiona Enter para mantener): `);
    if (newName.trim()) {
      name = newName.trim();
    }
    
    const type = await question(`Type? (actual: "${obj.type || 'humans'}", presiona Enter para mantener): `) || obj.type || 'humans';
    
    const result = {
      name: name,
      type: type,
      description: description
    };
    
    // Preserve tags if they exist
    if (obj.tags && obj.tags.length > 0) {
      result.tags = obj.tags;
    }
    
    return result;
  }
  
  // Choice 3 or invalid: keep as is
  return obj;
}

async function main() {
  try {
    console.log('Cargando entidades existentes...');
    const existingEntities = await getExistingEntities();
    console.log(`Se encontraron ${existingEntities.length} entidades.\n`);
    
    console.log('Leyendo archivo JSON...');
    const content = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(content);
    
    console.log(`Total de regiones: ${data.people_field_by_region.length}`);
    
    let processedCount = 0;
    let modifiedCount = 0;
    
    for (const region of data.people_field_by_region) {
      if (region.region_id >= 25 && region.region_id <= 87) {
        console.log(`\n${'='.repeat(80)}`);
        console.log(`Procesando Region #${region.region_id}: ${region.region_name}`);
        console.log(`Objetos en list: ${region.list.length}`);
        console.log('='.repeat(80));
        
        for (let i = 0; i < region.list.length; i++) {
          const obj = region.list[i];
          processedCount++;
          
          const newObj = await processObject(obj, existingEntities, region.region_id, region.region_name);
          
          // Check if object was modified
          if (JSON.stringify(newObj) !== JSON.stringify(obj)) {
            region.list[i] = newObj;
            modifiedCount++;
            console.log('✓ Objeto modificado - guardando en archivo...');
            
            // Save immediately to file
            fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
            console.log('✓ Cambio guardado en archivo');
          }
        }
      }
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('Resumen:');
    console.log(`  Total objetos procesados: ${processedCount}`);
    console.log(`  Total objetos modificados: ${modifiedCount}`);
    console.log('='.repeat(80));
    console.log('\n✓ Todos los cambios han sido guardados en people_region_analysis_fixed.json');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    rl.close();
  }
}

main();
