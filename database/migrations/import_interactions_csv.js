/**
 * import_interactions_csv.js
 * Imports data_public/interactions.csv into the interactions table.
 *
 * Usage:
 *   node database/migrations/import_interactions_csv.js
 *
 * Run AFTER create_interactions_table.sql has been applied.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import pkg from 'pg';
const { Pool } = pkg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../backend/.env') });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const CSV_PATH = path.join(__dirname, '../../data_public/interactions.csv');

/**
 * Parse a single CSV line, respecting double-quoted fields that may contain commas.
 * Returns an array of field strings.
 */
function parseCsvLine(line) {
  const fields = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      fields.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  fields.push(current.trim());
  return fields;
}

async function importInteractions() {
  try {
    console.log('📄 Reading interactions.csv...');
    const csvContent = fs.readFileSync(CSV_PATH, 'utf-8');
    const lines = csvContent.split('\n').filter((l) => l.trim());

    // Header: entity_type,form,intensity,weight,min_danger,max_danger,triggers_roll,prose_hint
    const dataLines = lines.slice(1);
    console.log(`   Found ${dataLines.length} data rows`);

    let inserted = 0;
    let updated = 0;

    for (const line of dataLines) {
      const parts = parseCsvLine(line);
      if (parts.length < 8) continue;

      const [entity_type, form, intensity, weight, min_danger, max_danger, triggers_roll_raw, prose_hint] = parts;
      const triggersRoll = triggers_roll_raw.toLowerCase() === 'true';

      const existing = await pool.query(
        'SELECT id FROM interactions WHERE entity_type = $1 AND form = $2',
        [entity_type, form]
      );

      if (existing.rows.length > 0) {
        await pool.query(
          `UPDATE interactions
           SET intensity = $3, weight = $4, min_danger = $5, max_danger = $6,
               triggers_roll = $7, prose_hint = $8
           WHERE entity_type = $1 AND form = $2`,
          [entity_type, form,
           parseInt(intensity, 10), parseInt(weight, 10),
           parseInt(min_danger, 10), parseInt(max_danger, 10),
           triggersRoll, prose_hint]
        );
        updated++;
      } else {
        await pool.query(
          `INSERT INTO interactions (entity_type, form, intensity, weight, min_danger, max_danger, triggers_roll, prose_hint)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [entity_type, form,
           parseInt(intensity, 10), parseInt(weight, 10),
           parseInt(min_danger, 10), parseInt(max_danger, 10),
           triggersRoll, prose_hint]
        );
        inserted++;
      }
    }

    console.log(`✅ Done: ${inserted} inserted, ${updated} updated`);

    const { rows } = await pool.query(
      'SELECT entity_type, COUNT(*) AS n FROM interactions GROUP BY entity_type ORDER BY entity_type'
    );
    console.log('\n📊 Rows per entity_type:');
    rows.forEach((r) => console.log(`   ${r.entity_type}: ${r.n}`));

    const total = await pool.query('SELECT COUNT(*) FROM interactions');
    console.log(`\n   Total: ${total.rows[0].count} rows`);
  } catch (err) {
    console.error('❌ Import failed:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

importInteractions();
