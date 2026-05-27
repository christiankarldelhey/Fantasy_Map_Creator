import pg from 'pg';
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

async function classifyElevationPoints() {
  console.log('============================================================');
  console.log('CLASSIFYING ELEVATION POINTS BY ALTITUDE LAYER');
  console.log('============================================================\n');
  
  // Step 1: Classify points by spatial join with altitude_layers
  console.log('Step 1: Classifying points by altitude_layers...');
  
  const classifyQuery = `
    UPDATE elevation_points ep
    SET altitude_type = al.altitude_type
    FROM altitude_layers al
    WHERE ST_Contains(al.geom, ep.geom)
      AND ep.altitude_type IS NULL;
  `;
  
  const classifyResult = await pool.query(classifyQuery);
  console.log(`  ✅ Classified ${classifyResult.rowCount} points\n`);
  
  // Step 2: Set remaining points (outside altitude layers) as 'plain'
  console.log('Step 2: Setting unclassified points as "plain"...');
  
  const plainQuery = `
    UPDATE elevation_points
    SET altitude_type = 'plain'
    WHERE altitude_type IS NULL;
  `;
  
  const plainResult = await pool.query(plainQuery);
  console.log(`  ✅ Set ${plainResult.rowCount} points as plain\n`);
  
  // Step 3: Show statistics
  console.log('Classification Statistics:');
  console.log('─────────────────────────────────────────────────────────\n');
  
  const statsQuery = `
    SELECT 
      altitude_type,
      COUNT(*) as count,
      ROUND((COUNT(*)::decimal / (SELECT COUNT(*) FROM elevation_points) * 100), 1) as percentage
    FROM elevation_points
    GROUP BY altitude_type
    ORDER BY 
      CASE altitude_type
        WHEN 'mountains_high' THEN 5
        WHEN 'mountains_med' THEN 4
        WHEN 'mountains_low' THEN 3
        WHEN 'hills' THEN 2
        WHEN 'plain' THEN 1
        ELSE 0
      END DESC;
  `;
  
  const statsResult = await pool.query(statsQuery);
  
  console.log('Altitude Type      | Count  | Percentage');
  console.log('─────────────────────────────────────────────');
  statsResult.rows.forEach(row => {
    const type = row.altitude_type.padEnd(18);
    const count = row.count.toString().padStart(6);
    const pct = row.percentage.toString().padStart(5);
    console.log(`${type} | ${count} | ${pct}%`);
  });
  
  console.log('\n============================================================');
  console.log('CLASSIFICATION COMPLETE');
  console.log('============================================================');
}

async function main() {
  try {
    await classifyElevationPoints();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
