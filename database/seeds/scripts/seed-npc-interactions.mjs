import fs from 'fs/promises';
import path from 'path';
import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../../backend/.env') });

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

const DATA_DIR = path.join(__dirname, '../data');

function parseCsv(text) {
  const lines = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') { inQuotes = !inQuotes; current += ch; }
    else if (ch === '\n' && !inQuotes) { lines.push(current.replace(/\r$/, '')); current = ''; }
    else current += ch;
  }
  if (current.trim()) lines.push(current);
  const headers = splitCsvLine(lines[0]);
  return lines.slice(1).filter(l => l.trim()).map(line => {
    const values = splitCsvLine(line);
    const obj = {};
    headers.forEach((h, i) => { obj[h] = values[i] ?? null; });
    return obj;
  });
}

function splitCsvLine(line) {
  const fields = [];
  let field = '';
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') { if (inQ && line[i + 1] === '"') { field += '"'; i++; } else inQ = !inQ; }
    else if (ch === ',' && !inQ) { fields.push(field); field = ''; }
    else field += ch;
  }
  fields.push(field);
  return fields.map(f => { f = f.trim(); if (f.startsWith('"') && f.endsWith('"')) f = f.slice(1, -1).replace(/""/g, '"'); return f === '' ? null : f; });
}

function nullIfEmpty(v) { return (v === null || v === undefined || v === '' || v === '""') ? null : v; }

async function main() {
  console.log('🎭 Seeding npc_interactions...');
  const text = await fs.readFile(path.join(DATA_DIR, 'csv/dialogue_master.csv'), 'utf8');
  const rows = parseCsv(text);
  for (const r of rows) {
    await pool.query(
      `INSERT INTO npc_interactions (id, entity_id, entity_type, interaction_form, shadow_band,
         character_id, cultural_family, region_id, npc_attitude, concrete_content,
         tension, traveller_stance, topic)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       ON CONFLICT (id) DO UPDATE SET
         entity_id        = EXCLUDED.entity_id,
         entity_type      = EXCLUDED.entity_type,
         interaction_form = EXCLUDED.interaction_form,
         shadow_band      = EXCLUDED.shadow_band,
         character_id     = EXCLUDED.character_id,
         cultural_family  = EXCLUDED.cultural_family,
         region_id        = EXCLUDED.region_id,
         npc_attitude     = EXCLUDED.npc_attitude,
         concrete_content = EXCLUDED.concrete_content,
         tension          = EXCLUDED.tension,
         traveller_stance = EXCLUDED.traveller_stance,
         topic            = EXCLUDED.topic`,
      [
        nullIfEmpty(r.id),
        nullIfEmpty(r.entity_id),
        r.entity_type,
        r.interaction_form,
        r.shadow_band,
        nullIfEmpty(r.character_id),
        nullIfEmpty(r.cultural_family),
        nullIfEmpty(r.region_id),
        nullIfEmpty(r.npc_attitude),
        nullIfEmpty(r.concrete_content),
        nullIfEmpty(r.tension),
        nullIfEmpty(r.traveller_stance),
        nullIfEmpty(r.topic),
      ]
    );
  }
  const { rows: [{ count }] } = await pool.query('SELECT COUNT(*) AS count FROM npc_interactions');
  console.log(`✅ npc_interactions: ${count} rows`);
  await pool.end();
}

main().catch(e => { console.error(e); process.exit(1); });
