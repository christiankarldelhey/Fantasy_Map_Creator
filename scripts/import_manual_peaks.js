import pg from 'pg';
import fs from 'fs';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

dotenv.config();

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'middle_earth',
  password: process.env.DB_PASSWORD || 'postgres',
  port: process.env.DB_PORT || 5432,
});

async function importManualPeaks() {
  console.log('============================================================');
  console.log('IMPORTING MANUAL PEAK POINTS');
  console.log('============================================================\n');
  
  // Load GeoJSON
  const geojsonPath = join(__dirname, '..', 'data', 'geojson', 'altitude', 'peaks.geojson');
  console.log(`Loading peaks from: ${geojsonPath}\n`);
  
  const geojsonData = JSON.parse(fs.readFileSync(geojsonPath, 'utf8'));
  const features = geojsonData.features;
  
  console.log(`Found ${features.length} peak points\n`);
  
  // Clear existing data
  await pool.query('TRUNCATE TABLE elevation_points RESTART IDENTITY CASCADE;');
  console.log('Cleared existing elevation points\n');
  
  // Insert points
  console.log('Inserting points...');
  let inserted = 0;
  
  for (let i = 0; i < features.length; i++) {
    const feature = features[i];
    const [lon, lat] = feature.geometry.coordinates;
    
    try {
      await pool.query(`
        INSERT INTO elevation_points (geom, source)
        VALUES (ST_SetSRID(ST_MakePoint($1, $2), 4326), 'manual')
      `, [lon, lat]);
      
      inserted++;
      
      if ((i + 1) % 1000 === 0) {
        console.log(`  Inserted ${i + 1}/${features.length} points...`);
      }
    } catch (error) {
      console.error(`Error inserting point ${i}:`, error.message);
    }
  }
  
  console.log(`\n✅ Successfully inserted ${inserted} points\n`);
  
  // Verify
  const countResult = await pool.query('SELECT COUNT(*) as count FROM elevation_points');
  console.log(`Database verification: ${countResult.rows[0].count} points in table\n`);
  
  console.log('============================================================');
  console.log('IMPORT COMPLETE');
  console.log('============================================================');
}

async function main() {
  try {
    await importManualPeaks();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
