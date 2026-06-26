/**
 * replace_voice_topics_from_csv.js
 * Replaces conversation_topics and character_voice tables with data from (2).csv files.
 *
 * Usage:
 *   node database/migrations/replace_voice_topics_from_csv.js
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

const TOPICS_CSV_PATH = path.join(__dirname, '../../data_public/conversation_topics (2).csv');
const VOICE_CSV_PATH = path.join(__dirname, '../../data_public/character_voice (2).csv');

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

async function replaceConversationTopics() {
  console.log('📄 Replacing conversation_topics...');
  const csvContent = fs.readFileSync(TOPICS_CSV_PATH, 'utf-8');
  const lines = csvContent.split('\n').filter((l) => l.trim());
  const dataLines = lines.slice(1);

  await pool.query('TRUNCATE TABLE conversation_topics');
  console.log('   Table truncated');

  let inserted = 0;
  for (const line of dataLines) {
    const parts = parseCsvLine(line);
    if (parts.length < 3) continue;

    const [entity_type, topic, prose_hint] = parts;
    await pool.query(
      `INSERT INTO conversation_topics (entity_type, topic, prose_hint) VALUES ($1, $2, $3)`,
      [entity_type, topic, prose_hint]
    );
    inserted++;
  }

  const { rows } = await pool.query('SELECT COUNT(*) FROM conversation_topics');
  console.log(`✅ conversation_topics: ${inserted} inserted, ${rows[0].count} total rows`);
}

async function replaceCharacterVoice() {
  console.log('📄 Replacing character_voice...');
  const csvContent = fs.readFileSync(VOICE_CSV_PATH, 'utf-8');
  const lines = csvContent.split('\n').filter((l) => l.trim());
  const dataLines = lines.slice(1);

  await pool.query('TRUNCATE TABLE character_voice');
  console.log('   Table truncated');

  let inserted = 0;
  for (const line of dataLines) {
    const parts = parseCsvLine(line);
    if (parts.length < 4) continue;

    const [characterIdRaw, stance, weightRaw, prose_hint] = parts;
    const character_id = parseInt(characterIdRaw, 10);
    const weight = parseInt(weightRaw, 10);
    if (Number.isNaN(character_id) || Number.isNaN(weight)) continue;

    await pool.query(
      `INSERT INTO character_voice (character_id, stance, weight, prose_hint) VALUES ($1, $2, $3, $4)`,
      [character_id, stance, weight, prose_hint]
    );
    inserted++;
  }

  const { rows } = await pool.query('SELECT COUNT(*) FROM character_voice');
  console.log(`✅ character_voice: ${inserted} inserted, ${rows[0].count} total rows`);
}

async function main() {
  try {
    await replaceConversationTopics();
    await replaceCharacterVoice();
  } catch (err) {
    console.error('❌ Replace failed:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
