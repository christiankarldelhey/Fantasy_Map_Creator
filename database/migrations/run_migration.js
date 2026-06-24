import fs from 'fs';
import pool from '../../backend/db.js';

const migrationFile = process.argv[2];

if (!migrationFile) {
  console.error('Usage: node run_migration.js <migration-file.sql>');
  process.exit(1);
}

async function runMigration() {
  try {
    const sql = fs.readFileSync(migrationFile, 'utf-8');
    await pool.query(sql);
    console.log(`Migration ${migrationFile} executed successfully`);
  } catch (error) {
    console.error('Error running migration:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();
