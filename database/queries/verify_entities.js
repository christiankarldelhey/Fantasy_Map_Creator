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

async function verifyEntities() {
  try {
    console.log('Verifying entities table...\n');
    
    // Count total entities
    const countResult = await pool.query('SELECT COUNT(*) as count FROM entities');
    console.log(`Total entities: ${countResult.rows[0].count}\n`);
    
    // Count by type
    const typeResult = await pool.query(`
      SELECT type, COUNT(*) as count 
      FROM entities 
      GROUP BY type 
      ORDER BY count DESC
    `);
    console.log('Entities by type:');
    typeResult.rows.forEach(row => {
      console.log(`  ${row.type}: ${row.count}`);
    });
    
    // Show sample entities
    console.log('\nSample entities:');
    const sampleResult = await pool.query(`
      SELECT name, type, slug, biomes 
      FROM entities 
      ORDER BY RANDOM() 
      LIMIT 5
    `);
    sampleResult.rows.forEach(row => {
      console.log(`  - ${row.name} (${row.type})`);
      console.log(`    Slug: ${row.slug}`);
      console.log(`    Biomes: ${row.biomes ? row.biomes.join(', ') : 'NULL'}`);
    });
    
    // Check for entities with biomes
    const biomeResult = await pool.query(`
      SELECT COUNT(*) as count 
      FROM entities 
      WHERE biomes IS NOT NULL
    `);
    console.log(`\nEntities with biomes: ${biomeResult.rows[0].count}`);
    
    // Check for entities with descriptions
    const descResult = await pool.query(`
      SELECT COUNT(*) as count 
      FROM entities 
      WHERE description IS NOT NULL AND description != ''
    `);
    console.log(`Entities with descriptions: ${descResult.rows[0].count}`);
    
  } catch (error) {
    console.error('Error verifying entities:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

verifyEntities();
