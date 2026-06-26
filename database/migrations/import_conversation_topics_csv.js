/**
 * import_conversation_topics_csv.js
 * Imports data_public/conversation_topics.csv into the conversation_topics table.
 *
 * Usage:
 *   node database/migrations/import_conversation_topics_csv.js
 *
 * Run AFTER create_dialogue_tables.sql has been applied.
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

const CSV_PATH = path.join(__dirname, '../../data_public/conversation_topics.csv');

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

async function importConversationTopics() {
  try {
    console.log('📄 Reading conversation_topics.csv...');
    const csvContent = fs.readFileSync(CSV_PATH, 'utf-8');
    const lines = csvContent.split('\n').filter((l) => l.trim());

    const dataLines = lines.slice(1);
    console.log(`   Found ${dataLines.length} data rows`);

    let inserted = 0;
    let updated = 0;

    for (const line of dataLines) {
      const parts = parseCsvLine(line);
      if (parts.length < 3) continue;

      const [entity_type, topic, prose_hint] = parts;

      const result = await pool.query(
        `INSERT INTO conversation_topics (entity_type, topic, prose_hint)
         VALUES ($1, $2, $3)
         ON CONFLICT (entity_type, topic) DO UPDATE SET prose_hint = EXCLUDED.prose_hint
         RETURNING (xmax = 0) AS was_inserted`,
        [entity_type, topic, prose_hint]
      );

      if (result.rows[0]?.was_inserted) {
        inserted++;
      } else {
        updated++;
      }
    }

    console.log(`✅ Done: ${inserted} inserted, ${updated} updated`);

    const { rows } = await pool.query(
      'SELECT entity_type, COUNT(*) AS n FROM conversation_topics GROUP BY entity_type ORDER BY entity_type'
    );
    console.log('\n📊 Rows per entity_type:');
    rows.forEach((r) => console.log(`   ${r.entity_type}: ${r.n}`));

    const total = await pool.query('SELECT COUNT(*) FROM conversation_topics');
    console.log(`\n   Total: ${total.rows[0].count} rows`);
  } catch (err) {
    console.error('❌ Import failed:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

importConversationTopics();
