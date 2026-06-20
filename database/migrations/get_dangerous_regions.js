import pg from 'pg';
const { Pool } = pg;
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from backend directory
dotenv.config({ path: path.join(__dirname, '../../backend/.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function getMostDangerousRegions() {
  try {
    console.log('🔍 Calculating most dangerous regions...\n');
    
    const query = `
      WITH region_danger AS (
        SELECT 
          UNNEST(region_ids) as region_id,
          danger
        FROM entities
        WHERE danger IS NOT NULL 
          AND region_ids IS NOT NULL
      ),
      region_stats AS (
        SELECT 
          r.id as region_id,
          r.name as region_name,
          COUNT(rd.danger) as encounter_count,
          SUM(rd.danger) as total_danger,
          AVG(rd.danger) as avg_danger
        FROM region_danger rd
        JOIN regions r ON rd.region_id = r.id
        GROUP BY r.id, r.name
      )
      SELECT 
        region_name,
        encounter_count,
        total_danger,
        ROUND(avg_danger::numeric, 2) as avg_danger
      FROM region_stats
      WHERE encounter_count > 0
      ORDER BY avg_danger DESC, total_danger DESC;
    `;
    
    const result = await pool.query(query);
    
    console.log(`📊 All Regions Ranked by Danger (Total: ${result.rows.length}):\n`);
    console.log('┌─────────────────────────────────┬──────────────┬──────────────┬──────────────┐');
    console.log('│ Region Name                    │ Encounters    │ Total Danger │ Avg Danger   │');
    console.log('├─────────────────────────────────┼──────────────┼──────────────┼──────────────┤');
    
    result.rows.forEach(row => {
      const name = row.region_name.substring(0, 31).padEnd(31);
      const encounters = row.encounter_count.toString().padEnd(14);
      const total = row.total_danger.toString().padEnd(14);
      const avg = row.avg_danger.toString().padEnd(14);
      console.log(`│ ${name} │ ${encounters} │ ${total} │ ${avg} │`);
    });
    
    console.log('└─────────────────────────────────┴──────────────┴──────────────┴──────────────┘');
    
    console.log('\n📈 Summary:');
    console.log(`  Total regions analyzed: ${result.rows.length}`);
    console.log(`  Highest average danger: ${result.rows[0]?.avg_danger || 'N/A'} (${result.rows[0]?.region_name || 'N/A'})`);
    console.log(`  Lowest average danger: ${result.rows[result.rows.length - 1]?.avg_danger || 'N/A'} (${result.rows[result.rows.length - 1]?.region_name || 'N/A'})`);
    
  } catch (error) {
    console.error('❌ Query failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

getMostDangerousRegions();
