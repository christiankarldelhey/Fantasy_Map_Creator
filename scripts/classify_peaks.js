import pg from 'pg';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'middle_earth',
  password: process.env.DB_PASSWORD || 'postgres',
  port: process.env.DB_PORT || 5432,
});

const ELEVATION_RANGES = {
  'hills': { min: 100, max: 300, base: 200 },
  'mountains_low': { min: 300, max: 1000, base: 650 },
  'mountains_med': { min: 1000, max: 2500, base: 1750 },
  'mountains_high': { min: 2500, max: 4500, base: 3500 }
};

async function loadPeaksFromGeoJSON(filePath) {
  console.log(`Loading peaks from ${filePath}...`);
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  return data.features;
}

async function classifyPeakByLocation(lon, lat) {
  const query = `
    SELECT altitude_type, priority
    FROM altitude_layers
    WHERE ST_Contains(geom, ST_SetSRID(ST_MakePoint($1, $2), 4326))
    ORDER BY priority DESC
    LIMIT 1;
  `;
  
  const result = await pool.query(query, [lon, lat]);
  
  if (result.rows.length > 0) {
    return result.rows[0].altitude_type;
  }
  
  return null;
}

async function insertPeak(peak, altitudeType) {
  const lon = peak.geometry.coordinates[0];
  const lat = peak.geometry.coordinates[1];
  const props = peak.properties;
  
  const baseElevation = altitudeType ? ELEVATION_RANGES[altitudeType].base : 50;
  
  const query = `
    INSERT INTO detected_peaks (geom, altitude_type, base_elevation, confidence, symbol_area)
    VALUES (
      ST_SetSRID(ST_MakePoint($1, $2), 4326),
      $3,
      $4,
      $5,
      $6
    )
    RETURNING id;
  `;
  
  const result = await pool.query(query, [
    lon,
    lat,
    altitudeType,
    baseElevation,
    props.confidence || 0.5,
    props.area || 0
  ]);
  
  return result.rows[0].id;
}

async function classifyAndInsertPeaks(geojsonPath) {
  console.log('Starting peak classification...\n');
  
  const peaks = await loadPeaksFromGeoJSON(geojsonPath);
  console.log(`Loaded ${peaks.length} peaks from GeoJSON\n`);
  
  await pool.query('TRUNCATE TABLE detected_peaks RESTART IDENTITY;');
  console.log('Cleared existing peaks from database\n');
  
  let stats = {
    total: peaks.length,
    classified: 0,
    unclassified: 0,
    byType: {}
  };
  
  for (let i = 0; i < peaks.length; i++) {
    const peak = peaks[i];
    const lon = peak.geometry.coordinates[0];
    const lat = peak.geometry.coordinates[1];
    
    const altitudeType = await classifyPeakByLocation(lon, lat);
    
    if (altitudeType) {
      stats.classified++;
      stats.byType[altitudeType] = (stats.byType[altitudeType] || 0) + 1;
    } else {
      stats.unclassified++;
    }
    
    await insertPeak(peak, altitudeType);
    
    if ((i + 1) % 100 === 0) {
      console.log(`Processed ${i + 1}/${peaks.length} peaks...`);
    }
  }
  
  console.log('\n✅ Peak classification complete!\n');
  console.log('Statistics:');
  console.log(`  Total peaks: ${stats.total}`);
  console.log(`  Classified: ${stats.classified}`);
  console.log(`  Unclassified: ${stats.unclassified}\n`);
  console.log('By altitude type:');
  Object.entries(stats.byType).forEach(([type, count]) => {
    console.log(`  ${type}: ${count}`);
  });
  
  return stats;
}

async function main() {
  try {
    const geojsonPath = process.argv[2] || './data/detected_peaks.geojson';
    
    await classifyAndInsertPeaks(geojsonPath);
    
    const verifyQuery = `
      SELECT 
        altitude_type,
        COUNT(*) as count,
        ROUND(AVG(base_elevation)::numeric, 2) as avg_elevation,
        ROUND(AVG(confidence)::numeric, 3) as avg_confidence
      FROM detected_peaks
      GROUP BY altitude_type
      ORDER BY 
        CASE altitude_type
          WHEN 'mountains_high' THEN 4
          WHEN 'mountains_med' THEN 3
          WHEN 'mountains_low' THEN 2
          WHEN 'hills' THEN 1
          ELSE 0
        END DESC;
    `;
    
    const result = await pool.query(verifyQuery);
    console.log('\nDatabase verification:');
    console.table(result.rows);
    
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
