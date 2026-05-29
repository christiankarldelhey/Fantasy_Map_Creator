const fs = require('fs');
const crypto = require('crypto');

// Leer el CSV
const csvPath = '/Users/christiankarldelhey/Documents/Middle Earth Map/data/locations_updated.csv';
const csvData = fs.readFileSync(csvPath, 'utf8');
const lines = csvData.split('\n').filter(line => line.trim());

const header = lines[0];
const rows = lines.slice(1);

// Procesar cada fila
const processedRows = rows.map(row => {
    // Parsear CSV con comillas
    const columns = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < row.length; i++) {
        const char = row[i];
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            columns.push(current);
            current = '';
        } else {
            current += char;
        }
    }
    columns.push(current);
    
    let [id, external_id, name, location_type, population, race, description, region, image_url, geom_wkt] = columns;
    
    // Si no tiene external_id o está vacío, generar uno único
    if (!external_id || external_id === '""' || external_id.trim() === '') {
        external_id = crypto.randomBytes(16).toString('hex');
    }
    
    // Reconstruir la fila con comillas
    return `"${id}","${external_id}","${name}","${location_type}","${population}","${race}","${description}","${region}","${image_url}","${geom_wkt}"`;
});

// Escribir el CSV procesado
const output = [header, ...processedRows].join('\n');
fs.writeFileSync(csvPath, output);

console.log('CSV procesado exitosamente');
console.log(`Total registros: ${processedRows.length}`);
