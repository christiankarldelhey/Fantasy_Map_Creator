const fs = require('fs');
const path = require('path');

const inputPath = path.join(__dirname, 'people_regions_analysis.txt');
const outputPath = path.join(__dirname, 'people_regions_analysis.json');

function parseRegions(content) {
  const regions = [];
  const lines = content.split('\n');
  let currentRegion = null;
  let inList = false;
  let listContent = [];
  let braceCount = 0;
  let listStart = -1;
  let metadata = {};

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const regionMatch = line.match(/^Region #(\d+): (.+)$/);
    
    if (regionMatch) {
      if (currentRegion) {
        currentRegion.listContent = listContent.join('\n');
        // Parse the list content as JSON
        try {
          const listJson = JSON.parse(`{${currentRegion.listContent}}`);
          currentRegion.list = listJson.list;
          currentRegion.metadata = metadata;
          regions.push(currentRegion);
        } catch (e) {
          console.log(`Error parsing region #${currentRegion.number}: ${e.message}`);
        }
      }
      const regionNum = parseInt(regionMatch[1]);
      currentRegion = {
        number: regionNum,
        name: regionMatch[2],
        startLine: i,
        listStart: -1,
        listContent: '',
        list: null,
        metadata: {}
      };
      listContent = [];
      metadata = {};
      inList = false;
      braceCount = 0;
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
      } else if (line.trim().startsWith('"') && line.includes(':')) {
        // Parse metadata fields like "symbol", "military", "population", "description"
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
          metadata[key] = value;
        }
      }
    }
  }

  if (currentRegion && listContent.length > 0) {
    currentRegion.listContent = listContent.join('\n');
    try {
      const listJson = JSON.parse(`{${currentRegion.listContent}}`);
      currentRegion.list = listJson.list;
      currentRegion.metadata = metadata;
      regions.push(currentRegion);
    } catch (e) {
      console.log(`Error parsing region #${currentRegion.number}: ${e.message}`);
    }
  }

  return regions;
}

async function main() {
  try {
    console.log('Leyendo archivo de análisis...');
    const content = fs.readFileSync(inputPath, 'utf-8');
    
    console.log('Parseando regiones...');
    const regions = parseRegions(content);
    console.log(`Se encontraron ${regions.length} regiones.\n`);
    
    // Convert to clean JSON structure
    const jsonData = regions.map(r => ({
      region_id: r.number,
      region_name: r.name,
      people: r.list,
      metadata: r.metadata
    }));
    
    console.log('Guardando archivo JSON...');
    fs.writeFileSync(outputPath, JSON.stringify(jsonData, null, 2), 'utf-8');
    
    console.log(`✓ Archivo JSON guardado en: ${outputPath}`);
    console.log(`✓ Total de regiones: ${jsonData.length}`);
    
  } catch (error) {
    console.error('Error:', error);
  }
}

main();
