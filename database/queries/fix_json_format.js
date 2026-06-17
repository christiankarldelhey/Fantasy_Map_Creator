const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'people_region_analysis.json');

async function main() {
  try {
    console.log('Leyendo archivo...');
    const content = fs.readFileSync(filePath, 'utf-8');
    
    console.log('Buscando el final de la región 24...');
    // Find the end of region 24 (before "Region #25")
    const region25Index = content.indexOf('Region #25');
    
    if (region25Index === -1) {
      console.log('No se encontró "Region #25", el archivo parece estar bien');
      return;
    }
    
    // Extract only the valid part (regions 1-24)
    const validContent = content.substring(0, region25Index).trim();
    
    // Add the closing JSON structure
    const fixedContent = validContent + '\n  ]\n}';
    
    console.log('Guardando archivo corregido...');
    fs.writeFileSync(filePath, fixedContent, 'utf-8');
    
    console.log('✓ Archivo corregido - solo se mantienen las regiones 1-24');
    console.log('ℹ Las regiones 25-87 fueron eliminadas por estar en formato incorrecto');
    console.log('ℹ Puedes agregarlas nuevamente usando el script interactivo');
    
  } catch (error) {
    console.error('Error:', error);
  }
}

main();
