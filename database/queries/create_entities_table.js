import pg from 'pg';
const { Pool } = pg;
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from backend directory
dotenv.config({ path: path.join(__dirname, '../../backend/.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function executeSchema() {
  try {
    console.log('Reading schema file...');
    const schemaPath = path.join(__dirname, '../schema.sql');
    const schemaSQL = fs.readFileSync(schemaPath, 'utf-8');
    
    console.log('Executing schema...');
    await pool.query(schemaSQL);
    console.log('✅ Schema executed successfully');
  } catch (error) {
    console.error('❌ Error executing schema:', error);
    throw error;
  }
}

async function executeInserts() {
  try {
    console.log('Reading insert file...');
    const insertPath = path.join(__dirname, 'insert_entities_from_merp.sql');
    const insertSQL = fs.readFileSync(insertPath, 'utf-8');
    
    console.log('Executing inserts...');
    await pool.query(insertSQL);
    console.log('✅ Inserts executed successfully');
  } catch (error) {
    console.error('❌ Error executing inserts:', error);
    throw error;
  }
}

async function main() {
  try {
    await executeSchema();
    await executeInserts();
    console.log('\n✅ All operations completed successfully');
  } catch (error) {
    console.error('\n❌ Operation failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
