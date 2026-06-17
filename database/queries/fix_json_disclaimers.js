import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const jsonFilePath = path.join(__dirname, 'people_region_analysis_fixed.json');

// Mapping of incorrect names to correct names
const nameCorrections = {
  'Dunedain': 'Dúnedain',
  'Dunadan': 'Dúnedain',
  'Silvan': 'Silvan Elves',
  'Snow Elves': 'Snow-elves',
  'Asdriags and Sagath': 'Sagath',
  'Falathrim (Sea-Elves)': 'Falathrim',
  'Orcs': 'common orcs',
  'Giants': 'Giants',
  'Laiquendi of Harlindon': 'Laiquendi',
  'Orc tribes of the Grey Mountains': 'common orcs',
  'Gondor settlers': 'Gondorian settlers',
  'Gondorians Settlers': 'Gondorian settlers',
  'Gondor Settlers': 'Gondorian settlers',
  'Dunledings': 'Dunlendings',
  'Witch King of Angmar': 'Angmar veterans',
  'Rivermen': 'Rivermen traders',
  'Huorns': 'Ents',
  'trolls and olog-hai': 'Orcs of Khazad-dum',
  "Thranduil's Wood-elves": "Thranduil's Silvan elves",
  'common orcs and trolls': 'common orcs',
  'Asdriags settlers': 'Asdriags',
  'Silvan Elves Elves': 'Silvan Elves',
  'Sindarin': 'Sindarin',
  'common orcs of Khazad-dum': 'Orcs of Khazad-dum',
  'Rivermen traders traders': 'Rivermen traders',
};

function fixDisclaimer(disclaimer) {
  let fixed = disclaimer;
  
  // Special case for Thranduil with regex
  fixed = fixed.replace(/ONLY ADD (?:this )?region id in entity Thranduil.*Wood-elves/gi, "ONLY ADD region id in entity Thranduil's Silvan elves");
  
  for (const [incorrect, correct] of Object.entries(nameCorrections)) {
    const regex = new RegExp(`ONLY ADD (?:this )?region id in entity ${incorrect.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i');
    fixed = fixed.replace(regex, `ONLY ADD region id in entity ${correct}`);
  }
  
  return fixed;
}

async function main() {
  try {
    console.log('Reading JSON file...');
    const content = fs.readFileSync(jsonFilePath, 'utf-8');
    const data = JSON.parse(content);
    
    let correctionsCount = 0;
    
    data.people_field_by_region.forEach(region => {
      region.list.forEach(item => {
        if (item.disclaimer) {
          const original = item.disclaimer;
          const fixed = fixDisclaimer(original);
          
          if (original !== fixed) {
            item.disclaimer = fixed;
            correctionsCount++;
            console.log(`Fixed: "${original}" -> "${fixed}"`);
          }
        }
      });
    });
    
    console.log(`\nTotal corrections: ${correctionsCount}`);
    
    // Save the fixed JSON
    fs.writeFileSync(jsonFilePath, JSON.stringify(data, null, 2), 'utf-8');
    console.log(`✓ JSON file updated: ${jsonFilePath}`);
    
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();
