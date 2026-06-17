const fs = require('fs');
const path = require('path');

const txtPath = path.join(__dirname, 'people_regions_analysis.txt');
const jsonPath = path.join(__dirname, 'people_region_analysis.json');

function parseRegionFromText(lines, startIndex) {
  const region = {
    region_id: null,
    region_name: null,
    list: [],
    symbol: null,
    military: null,
    population: null,
    description: null
  };
  
  // Parse region header
  const headerMatch = lines[startIndex].match(/^Region #(\d+): (.+)$/);
  if (headerMatch) {
    region.region_id = parseInt(headerMatch[1]);
    region.region_name = headerMatch[2];
  }
  
  let i = startIndex + 2; // Skip separator line
  let inList = false;
  let braceCount = 0;
  let listContent = [];
  
  while (i < lines.length) {
    const line = lines[i];
    
    // Check if we hit the next region
    const nextRegionMatch = line.match(/^Region #\d+:/);
    if (nextRegionMatch && i > startIndex + 5) {
      break;
    }
    
    if (line.includes('"list": [')) {
      inList = true;
    }
    
    if (inList) {
      listContent.push(line);
      braceCount += (line.match(/\{/g) || []).length;
      braceCount -= (line.match(/\}/g) || []).length;
      
      if (braceCount === 0 && listContent.length > 1) {
        // Parse the list as JSON
        try {
          const listJson = JSON.parse(`{${listContent.join('\n')}}`);
          region.list = listJson.list;
        } catch (e) {
          console.log(`Error parsing list for region ${region.region_id}: ${e.message}`);
        }
        inList = false;
        listContent = [];
      }
    } else if (line.trim().startsWith('"') && line.includes(':')) {
      // Parse metadata fields
      const match = line.match(/"(\w+)":\s*(.+)$/);
      if (match) {
        const key = match[1];
        let value = match[2].trim();
        if (value.endsWith(',')) {
          value = value.slice(0, -1);
        }
        if (value.startsWith('"') && value.endsWith('"')) {
          value = value.slice(1, -1);
        } else if (value === 'null') {
          value = null;
        }
        if (region.hasOwnProperty(key)) {
          region[key] = value;
        }
      }
    }
    
    i++;
  }
  
  return region;
}

async function main() {
  try {
    console.log('Leyendo archivo de texto...');
    const txtContent = fs.readFileSync(txtPath, 'utf-8');
    const txtLines = txtContent.split('\n');
    
    console.log('Leyendo archivo JSON...');
    const jsonContent = fs.readFileSync(jsonPath, 'utf-8');
    const jsonData = JSON.parse(jsonContent);
    
    console.log('Buscando regiones 25-87...');
    const newRegions = [];
    
    for (let i = 0; i < txtLines.length; i++) {
      const line = txtLines[i];
      const regionMatch = line.match(/^Region #(\d+):/);
      
      if (regionMatch) {
        const regionNum = parseInt(regionMatch[1]);
        if (regionNum >= 25 && regionNum <= 87) {
          console.log(`Procesando región #${regionNum}...`);
          const region = parseRegionFromText(txtLines, i);
          if (region.region_id) {
            newRegions.push(region);
          }
        }
      }
    }
    
    console.log(`Se encontraron ${newRegions.length} regiones nuevas`);
    
    // Add new regions to existing data
    jsonData.people_field_by_region = [...jsonData.people_field_by_region, ...newRegions];
    
    console.log('Guardando archivo JSON actualizado...');
    fs.writeFileSync(jsonPath, JSON.stringify(jsonData, null, 2), 'utf-8');
    
    console.log('✓ Regiones 25-87 agregadas exitosamente');
    console.log(`✓ Total de regiones: ${jsonData.people_field_by_region.length}`);
    
  } catch (error) {
    console.error('Error:', error);
  }
}

main();
