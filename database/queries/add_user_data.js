const fs = require('fs');
const path = require('path');

const jsonPath = path.join(__dirname, 'people_region_analysis.json');

// Copia los datos que me proporcionaste aquí y los procesaré
// Por ahora, voy a leer el archivo de texto original y usar los datos que me diste para las regiones que fallaron

async function main() {
  try {
    console.log('Leyendo archivo JSON...');
    const jsonContent = fs.readFileSync(jsonPath, 'utf-8');
    const jsonData = JSON.parse(jsonContent);
    
    console.log('Las regiones 25-87 tienen listas vacías debido a errores de parsing.');
    console.log('Necesito que me proporciones los datos en un formato más manejable.');
    console.log('');
    console.log('Opciones:');
    console.log('1. Proporcionar los datos en un archivo JSON separado');
    console.log('2. Pegar los datos de cada región individualmente');
    console.log('3. Usar el script interactivo para agregar cada región manualmente');
    
    // Mostrar estado actual
    console.log('');
    console.log('Estado actual:');
    console.log(`- Total de regiones: ${jsonData.people_field_by_region.length}`);
    console.log(`- Regiones con listas vacías: ${jsonData.people_field_by_region.filter(r => r.list && r.list.length === 0).length}`);
    
  } catch (error) {
    console.error('Error:', error);
  }
}

main();
