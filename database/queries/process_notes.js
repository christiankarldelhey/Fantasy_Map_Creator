const fs = require('fs');
const path = require('path');

const notesPath = path.join(__dirname, 'notes.txt');
const jsonPath = path.join(__dirname, 'people_region_analysis_fixed.json');

async function main() {
  try {
    console.log('Leyendo archivo notes.txt...');
    const notesContent = fs.readFileSync(notesPath, 'utf-8');
    
    console.log('Leyendo archivo JSON...');
    const jsonContent = fs.readFileSync(jsonPath, 'utf-8');
    const jsonData = JSON.parse(jsonContent);
    
    // Split by region headers
    const regionBlocks = notesContent.split(/^Region #\d+: /gm);
    
    console.log(`Se encontraron ${regionBlocks.length - 1} bloques de regiones`);
    
    const newRegions = [];
    
    for (let i = 1; i < regionBlocks.length; i++) {
      const block = regionBlocks[i];
      const lines = block.split('\n');
      const headerLine = lines[0];
      
      // Extract region number and name
      const headerMatch = headerLine.match(/^(\d+): (.+)$/);
      if (!headerMatch) {
        console.log(`No se pudo parsear header: ${headerLine}`);
        continue;
      }
      
      const regionId = parseInt(headerMatch[1]);
      const regionName = headerMatch[2];
      
      // Find the JSON block (after the separator line)
      let jsonStart = -1;
      for (let j = 0; j < lines.length; j++) {
        if (lines[j].trim() === '{') {
          jsonStart = j;
          break;
        }
      }
      
      if (jsonStart === -1) {
        console.log(`No se encontró JSON para región #${regionId}`);
        continue;
      }
      
      // Extract JSON lines
      const jsonLines = lines.slice(jsonStart);
      const jsonStr = jsonLines.join('\n');
      
      try {
        const regionData = JSON.parse(jsonStr);
        regionData.region_id = regionId;
        regionData.region_name = regionName;
        
        newRegions.push(regionData);
        console.log(`✓ Región #${regionId} (${regionName}) procesada`);
      } catch (e) {
        console.log(`Error parseando JSON para región #${regionId}: ${e.message}`);
      }
    }
    
    console.log(`\nTotal de regiones procesadas: ${newRegions.length}`);
    
    // Remove existing regions 25-87 and add new ones
    jsonData.people_field_by_region = jsonData.people_field_by_region.filter(r => r.region_id < 25);
    jsonData.people_field_by_region = [...jsonData.people_field_by_region, ...newRegions];
    
    // Sort by region_id
    jsonData.people_field_by_region.sort((a, b) => a.region_id - b.region_id);
    
    console.log('Guardando archivo JSON actualizado...');
    fs.writeFileSync(jsonPath, JSON.stringify(jsonData, null, 2), 'utf-8');
    
    console.log('✓ Regiones 25-87 agregadas exitosamente');
    console.log(`✓ Total de regiones: ${jsonData.people_field_by_region.length}`);
    
    // Verify
    const r25 = jsonData.people_field_by_region.find(r => r.region_id === 25);
    const r87 = jsonData.people_field_by_region.find(r => r.region_id === 87);
    console.log(`✓ Región 25: ${r25.region_name}, list length: ${r25.list.length}`);
    console.log(`✓ Región 87: ${r87.region_name}, list length: ${r87.list.length}`);
    
  } catch (error) {
    console.error('Error:', error);
  }
}

main();
