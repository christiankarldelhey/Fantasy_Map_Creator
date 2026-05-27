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

const NEIGHBOR_RADIUS = 1500; // meters (1.5km)

async function calculateNeighborDensity() {
  console.log('============================================================');
  console.log('CALCULATING NEIGHBOR DENSITY');
  console.log('============================================================\n');
  
  console.log(`Radius: ${NEIGHBOR_RADIUS}m (${NEIGHBOR_RADIUS/1000}km)\n`);
  
  // Step 1: Count neighbors for each point
  console.log('Step 1: Counting neighbors for each point...');
  console.log('(This may take 2-5 minutes for 10k points)\n');
  
  const countQuery = `
    UPDATE elevation_points ep1
    SET neighbor_count = (
      SELECT COUNT(*)
      FROM elevation_points ep2
      WHERE ep2.id != ep1.id
        AND ST_DWithin(
          ep1.geom::geography,
          ep2.geom::geography,
          $1
        )
    );
  `;
  
  const startTime = Date.now();
  await pool.query(countQuery, [NEIGHBOR_RADIUS]);
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  
  console.log(`  ✅ Neighbor counts calculated in ${elapsed}s\n`);
  
  // Step 2: Get max neighbor count
  const maxQuery = `
    SELECT MAX(neighbor_count) as max_neighbors
    FROM elevation_points;
  `;
  
  const maxResult = await pool.query(maxQuery);
  const maxNeighbors = maxResult.rows[0].max_neighbors;
  
  console.log(`Maximum neighbors found: ${maxNeighbors}\n`);
  
  // Step 3: Normalize density (0-1)
  console.log('Step 2: Normalizing density values...');
  
  const normalizeQuery = `
    UPDATE elevation_points
    SET neighbor_density = CASE 
      WHEN $1 > 0 THEN neighbor_count::decimal / $1
      ELSE 0
    END;
  `;
  
  await pool.query(normalizeQuery, [maxNeighbors]);
  console.log(`  ✅ Density normalized\n`);
  
  // Step 4: Show statistics
  console.log('Density Statistics:');
  console.log('─────────────────────────────────────────────────────────\n');
  
  const statsQuery = `
    SELECT 
      altitude_type,
      COUNT(*) as points,
      ROUND(MIN(neighbor_count)::numeric, 0) as min_neighbors,
      ROUND(AVG(neighbor_count)::numeric, 1) as avg_neighbors,
      ROUND(MAX(neighbor_count)::numeric, 0) as max_neighbors,
      ROUND(AVG(neighbor_density)::numeric, 3) as avg_density
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
  
  console.log('Type              | Points | Min | Avg  | Max | Avg Density');
  console.log('────────────────────────────────────────────────────────────────');
  statsResult.rows.forEach(row => {
    const type = row.altitude_type.padEnd(17);
    const points = row.points.toString().padStart(6);
    const min = row.min_neighbors.toString().padStart(3);
    const avg = row.avg_neighbors.toString().padStart(4);
    const max = row.max_neighbors.toString().padStart(3);
    const density = row.avg_density.toString().padStart(5);
    console.log(`${type} | ${points} | ${min} | ${avg} | ${max} | ${density}`);
  });
  
  console.log('\n============================================================');
  console.log('NEIGHBOR DENSITY CALCULATION COMPLETE');
  console.log('============================================================');
}

async function main() {
  try {
    await calculateNeighborDensity();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
