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

async function verifyDangerColumn() {
  try {
    console.log('Verifying danger column data...\n');
    
    // Get statistics
    const statsResult = await pool.query(`
      SELECT 
        COUNT(*) as total_entities,
        COUNT(CASE WHEN danger IS NOT NULL THEN 1 END) as entities_with_danger,
        MIN(danger) as min_danger,
        MAX(danger) as max_danger,
        AVG(danger) as avg_danger
      FROM entities
    `);
    
    console.log('📊 Danger Column Statistics:');
    console.log(`  Total entities: ${statsResult.rows[0].total_entities}`);
    console.log(`  Entities with danger: ${statsResult.rows[0].entities_with_danger}`);
    console.log(`  Min danger: ${statsResult.rows[0].min_danger}`);
    console.log(`  Max danger: ${statsResult.rows[0].max_danger}`);
    console.log(`  Avg danger: ${statsResult.rows[0].avg_danger ? Number(statsResult.rows[0].avg_danger).toFixed(2) : 'N/A'}`);
    
    // Sample entities with different danger levels
    const sampleResult = await pool.query(`
      SELECT name, type, danger 
      FROM entities 
      WHERE danger IS NOT NULL
      ORDER BY danger DESC, name
      LIMIT 10
    `);
    
    console.log('\n📋 Sample entities with danger levels:');
    sampleResult.rows.forEach(row => {
      console.log(`  ${row.name} (${row.type}): danger = ${row.danger}`);
    });
    
    // Check for any entities with NULL danger
    const nullDangerResult = await pool.query(`
      SELECT COUNT(*) as count
      FROM entities
      WHERE danger IS NULL
    `);
    
    if (nullDangerResult.rows[0].count > 0) {
      console.log(`\n⚠️  Warning: ${nullDangerResult.rows[0].count} entities have NULL danger values`);
    } else {
      console.log('\n✅ All entities have danger values populated');
    }
    
  } catch (error) {
    console.error('❌ Verification failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

verifyDangerColumn();
