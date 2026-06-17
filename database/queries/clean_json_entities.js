const fs = require('fs');
const path = require('path');

const inputFile = path.join(__dirname, 'people_region_analysis_fixed.json');
const outputFile = path.join(__dirname, 'people_region_analysis_cleaned.json');
const reportFile = path.join(__dirname, 'duplicate_names_report.txt');

function normalizeName(name) {
  return name.toLowerCase().trim().replace(/\s+/g, ' ');
}

function findSimilarNames(names) {
  const normalized = {};
  const duplicates = [];
  
  // Group by normalized name
  names.forEach(name => {
    const normalizedKey = normalizeName(name);
    if (!normalized[normalizedKey]) {
      normalized[normalizedKey] = [];
    }
    normalized[normalizedKey].push(name);
  });
  
  // Find groups with more than 1 variation
  Object.keys(normalized).forEach(key => {
    if (normalized[key].length > 1) {
      duplicates.push({
        normalized: key,
        variations: [...new Set(normalized[key])] // Remove exact duplicates
      });
    }
  });
  
  return duplicates;
}

function main() {
  try {
    console.log('Leyendo archivo JSON...');
    const content = fs.readFileSync(inputFile, 'utf-8');
    const data = JSON.parse(content);
    
    console.log(`Total de regiones: ${data.people_field_by_region.length}`);
    
    // Extract all entity names
    const entityNames = [];
    const disclaimerNames = [];
    
    data.people_field_by_region.forEach(region => {
      region.list.forEach(item => {
        if (item.name) {
          entityNames.push(item.name);
        }
        if (item.disclaimer && item.disclaimer.includes('ONLY ADD region id in entity')) {
          const match = item.disclaimer.match(/ONLY ADD region id in entity (.+)/);
          if (match) {
            disclaimerNames.push(match[1].trim());
          }
        }
      });
    });
    
    console.log(`\nTotal nombres de entidades: ${entityNames.length}`);
    console.log(`Total nombres en disclaimers: ${disclaimerNames.length}`);
    
    // Find duplicates in entity names
    console.log('\nBuscando duplicados en nombres de entidades...');
    const entityDuplicates = findSimilarNames(entityNames);
    
    // Find duplicates in disclaimer names
    console.log('Buscando duplicados en nombres de disclaimers...');
    const disclaimerDuplicates = findSimilarNames(disclaimerNames);
    
    // Find cross-references (entity names that appear in disclaimers)
    console.log('Buscando referencias cruzadas...');
    const entityNamesSet = new Set(entityNames.map(n => normalizeName(n)));
    const disclaimerNamesSet = new Set(disclaimerNames.map(n => normalizeName(n)));
    const crossReferences = [];
    
    disclaimerNames.forEach(dName => {
      const dNorm = normalizeName(dName);
      if (entityNamesSet.has(dNorm)) {
        crossReferences.push(dName);
      }
    });
    
    // Generate report
    console.log('Generando reporte...');
    let report = 'REPORTE DE DUPLICADOS Y SIMILITUDES EN NOMBRES DE ENTIDADES\n';
    report += '='.repeat(80) + '\n\n';
    
    report += `Total nombres de entidades: ${entityNames.length}\n`;
    report += `Total nombres en disclaimers: ${disclaimerNames.length}\n\n`;
    
    if (entityDuplicates.length > 0) {
      report += 'DUPLICADOS EN NOMBRES DE ENTIDADES (case-insensitive):\n';
      report += '-'.repeat(80) + '\n';
      entityDuplicates.forEach(dup => {
        report += `Normalizado: "${dup.normalized}"\n`;
        report += `  Variaciones: ${dup.variations.join(', ')}\n\n`;
      });
    } else {
      report += '✓ No se encontraron duplicados en nombres de entidades\n\n';
    }
    
    if (disclaimerDuplicates.length > 0) {
      report += 'DUPLICADOS EN NOMBRES DE DISCLAIMERS (case-insensitive):\n';
      report += '-'.repeat(80) + '\n';
      disclaimerDuplicates.forEach(dup => {
        report += `Normalizado: "${dup.normalized}"\n`;
        report += `  Variaciones: ${dup.variations.join(', ')}\n\n`;
      });
    } else {
      report += '✓ No se encontraron duplicados en nombres de disclaimers\n\n';
    }
    
    if (crossReferences.length > 0) {
      report += 'REFERENCIAS CRUZADAS (nombres en disclaimers que existen como entidades):\n';
      report += '-'.repeat(80) + '\n';
      crossReferences.forEach(name => {
        report += `  - ${name}\n`;
      });
      report += '\n';
    } else {
      report += '✓ No se encontraron referencias cruzadas\n\n';
    }
    
    // List all unique entity names
    report += 'TODOS LOS NOMBRES ÚNICOS DE ENTIDADES:\n';
    report += '-'.repeat(80) + '\n';
    const uniqueEntityNames = [...new Set(entityNames)].sort();
    uniqueEntityNames.forEach(name => {
      report += `  - ${name}\n`;
    });
    
    fs.writeFileSync(reportFile, report, 'utf-8');
    console.log(`✓ Reporte guardado en: ${reportFile}`);
    
    // Clean the JSON
    console.log('\nLimpiando JSON...');
    let tagsRemoved = 0;
    let symbolRemoved = 0;
    let militaryRemoved = 0;
    let populationRemoved = 0;
    
    data.people_field_by_region.forEach(region => {
      // Remove tags from list items
      region.list.forEach(item => {
        if (item.tags) {
          delete item.tags;
          tagsRemoved++;
        }
      });
      
      // Remove symbol, military, population from region
      if (region.symbol !== undefined) {
        delete region.symbol;
        symbolRemoved++;
      }
      if (region.military !== undefined) {
        delete region.military;
        militaryRemoved++;
      }
      if (region.population !== undefined) {
        delete region.population;
        populationRemoved++;
      }
    });
    
    console.log(`  Tags eliminados: ${tagsRemoved}`);
    console.log(`  Symbol eliminados: ${symbolRemoved}`);
    console.log(`  Military eliminados: ${militaryRemoved}`);
    console.log(`  Population eliminados: ${populationRemoved}`);
    
    // Save cleaned JSON
    fs.writeFileSync(outputFile, JSON.stringify(data, null, 2), 'utf-8');
    console.log(`\n✓ JSON limpio guardado en: ${outputFile}`);
    
    // Validate
    console.log('Validando JSON limpio...');
    const cleanedContent = fs.readFileSync(outputFile, 'utf-8');
    JSON.parse(cleanedContent);
    console.log('✓ JSON válido');
    
    console.log('\n' + '='.repeat(80));
    console.log('Proceso completado exitosamente');
    console.log('='.repeat(80));
    
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();
