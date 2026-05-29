const { Pool } = require('pg');
const fs = require('fs');

const pool = new Pool({
  user: 'christiankarldelhey',
  host: 'localhost',
  database: 'middle_earth',
  port: 5432,
});

async function importLocations() {
  const csvPath = '/Users/christiankarldelhey/Documents/Middle Earth Map/data/locations_updated.csv';
  const csvData = fs.readFileSync(csvPath, 'utf8');
  const lines = csvData.split('\n').filter(line => line.trim());

  const header = lines[0];
  const rows = lines.slice(1);

  console.log(`Procesando ${rows.length} registros...`);

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    for (const row of rows) {
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
      
      // Limpiar valores
      id = id ? parseInt(id) : null;
      population = population ? parseInt(population) : null;
      description = description || null;
      region = region || null;
      image_url = image_url || null;
      
      // Verificar si el registro existe por external_id
      const checkResult = await client.query(
        'SELECT id FROM locations WHERE external_id = $1',
        [external_id]
      );
      
      if (checkResult.rows.length > 0) {
        // Actualizar registro existente
        await client.query(
          `UPDATE locations 
           SET name = $1, location_type = $2, population = $3, race = $4, 
               description = $5, region = $6, image_url = $7
           WHERE external_id = $8`,
          [name, location_type, population, race, description, region, image_url, external_id]
        );
      } else {
        // Insertar nuevo registro (sin especificar ID, dejar que la DB lo genere)
        await client.query(
          `INSERT INTO locations (external_id, name, location_type, population, race, description, region, image_url, geom)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, ST_GeomFromText($9, 4326))`,
          [external_id, name, location_type, population, race, description, region, image_url, geom_wkt]
        );
      }
    }

    await client.query('COMMIT');
    console.log('Importación completada exitosamente');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error durante la importación:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

importLocations().catch(console.error);
