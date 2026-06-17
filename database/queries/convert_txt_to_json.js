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
  let currentObj = null;
  let inDisclaimer = false;
  
  while (i < lines.length) {
    const line = lines[i];
    
    // Check if we hit the next region
    const nextRegionMatch = line.match(/^Region #\d+:/);
    if (nextRegionMatch && i > startIndex + 5) {
      break;
    }
    
    if (line.includes('"list": [')) {
      inList = true;
      i++;
      continue;
    }
    
    if (inList) {
      // Check for disclaimer format
      if (line.includes('ONLY ADD region id in entity')) {
        const entityMatch = line.match(/ONLY ADD region id in entity (.+)$/);
        if (entityMatch) {
          const entityName = entityMatch[1].trim();
          region.list.push({ disclaimer: `ONLY ADD region id in entity ${entityName}` });
          inDisclaimer = true;
        }
        i++;
        continue;
      }
      
      // If we were in a disclaimer and now see a closing brace, end it
      if (inDisclaimer && line.trim() === '}') {
        inDisclaimer = false;
        i++;
        continue;
      }
      
      listContent.push(line);
      braceCount += (line.match(/\{/g) || []).length;
      braceCount -= (line.match(/\}/g) || []).length;
      
      if (braceCount === 0 && listContent.length > 1) {
        // Parse the list as JSON
        try {
          const listJson = JSON.parse(`{${listContent.join('\n')}}`);
          if (listJson.list) {
            region.list = [...region.list, ...listJson.list];
          }
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
    
    // Remove existing regions 25-87 and add new ones
    jsonData.people_field_by_region = jsonData.people_field_by_region.filter(r => r.region_id < 25);
    jsonData.people_field_by_region = [...jsonData.people_field_by_region, ...newRegions];
    
    // Sort by region_id
    jsonData.people_field_by_region.sort((a, b) => a.region_id - b.region_id);
    
    console.log('Guardando archivo JSON actualizado...');
    fs.writeFileSync(jsonPath, JSON.stringify(jsonData, null, 2), 'utf-8');
    
    console.log('✓ Regiones 25-87 agregadas exitosamente');
    console.log(`✓ Total de regiones: ${jsonData.people_field_by_region.length}`);
    
  } catch (error) {
    console.error('Error:', error);
  }
}

main();
