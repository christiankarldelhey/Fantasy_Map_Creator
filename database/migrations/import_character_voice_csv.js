/**
 * import_character_voice_csv.js
 * Imports data_public/character_voice.csv into the character_voice table.
 *
 * Usage:
 *   node database/migrations/import_character_voice_csv.js
 *
 * Run AFTER create_dialogue_tables.sql and add_character_slug.sql have been applied.
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

const CSV_PATH = path.join(__dirname, '../../data_public/character_voice.csv');

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

async function importCharacterVoice() {
  try {
    console.log('📄 Reading character_voice.csv...');
    const csvContent = fs.readFileSync(CSV_PATH, 'utf-8');
    const lines = csvContent.split('\n').filter((l) => l.trim());

    const dataLines = lines.slice(1);
    console.log(`   Found ${dataLines.length} data rows`);

    let inserted = 0;
    let updated = 0;

    for (const line of dataLines) {
      const parts = parseCsvLine(line);
      if (parts.length < 4) continue;

      const [characterIdRaw, stance, weightRaw, prose_hint] = parts;
      const character_id = parseInt(characterIdRaw, 10);
      const weight = parseInt(weightRaw, 10);
      if (Number.isNaN(character_id) || Number.isNaN(weight)) continue;

      const result = await pool.query(
        `INSERT INTO character_voice (character_id, stance, weight, prose_hint)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (character_id, stance) DO UPDATE
           SET weight = EXCLUDED.weight, prose_hint = EXCLUDED.prose_hint
         RETURNING (xmax = 0) AS was_inserted`,
        [character_id, stance, weight, prose_hint]
      );

      if (result.rows[0]?.was_inserted) {
        inserted++;
      } else {
        updated++;
      }
    }

    console.log(`✅ Done: ${inserted} inserted, ${updated} updated`);

    const { rows } = await pool.query(
      'SELECT character_id, COUNT(*) AS n FROM character_voice GROUP BY character_id ORDER BY character_id'
    );
    console.log('\n📊 Rows per character_id:');
    rows.forEach((r) => console.log(`   ${r.character_id}: ${r.n}`));

    const total = await pool.query('SELECT COUNT(*) FROM character_voice');
    console.log(`\n   Total: ${total.rows[0].count} rows`);
  } catch (err) {
    console.error('❌ Import failed:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

importCharacterVoice();
