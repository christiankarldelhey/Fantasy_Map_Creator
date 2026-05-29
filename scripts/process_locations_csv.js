const fs = require('fs');
const crypto = require('crypto');

// Leer el CSV modificado
const csvData = fs.readFileSync('/tmp/locations_modified.csv', 'utf8');
const lines = csvData.split('\n').filter(line => line.trim());

const header = lines[0];
const rows = lines.slice(1);

// Procesar cada fila
const processedRows = rows.map(row => {
    const columns = row.split('\t');
    let [id, external_id, name, location_type, population, race, description, region, image_url, geom_wkt] = columns;
    
    // Si no tiene external_id, generar uno único
    if (!external_id || external_id.trim() === '') {
        external_id = crypto.randomBytes(16).toString('hex');
    }
    
    return [id, external_id, name, location_type, population, race, description, region, image_url, geom_wkt].join('\t');
});

// Escribir el CSV procesado
const output = [header, ...processedRows].join('\n');
fs.writeFileSync('/tmp/locations_final.csv', output);

console.log('CSV procesado exitosamente');
console.log(`Total registros: ${processedRows.length}`);
