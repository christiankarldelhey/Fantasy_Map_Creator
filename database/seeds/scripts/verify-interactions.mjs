// Wave D verification — does the interactions table match its authored seed?
// Run: node verify-interactions.mjs
// Checks: row parity file↔DB, orphan FKs, situation pointers that resolve
// to no situation descriptor on the parent record, malformed effects.
import path from 'path';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'url';
import pg from 'pg';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../../../backend/.env') });
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

const q = (sql, params) => pool.query(sql, params).then((r) => r.rows);

const file = JSON.parse(
  await fs.readFile(path.join(__dirname, '../data/json/interactions.json'), 'utf8')
);
console.log(`interactions.json: ${file.length} authored rows`);

const dbRows = await q(`SELECT id, act, outcomes, payload,
                             places_narration_id, entities_narration_id
                        FROM interactions`);
console.log(`interactions table: ${dbRows.length} rows`);

const fileIds = new Set(file.map((i) => i.id));
const dbIds = new Set(dbRows.map((r) => r.id));
const missingInDb = file.filter((i) => !dbIds.has(i.id)).map((i) => i.id);
const extraInDb = dbRows.filter((r) => !fileIds.has(r.id)).map((r) => r.id);
console.log(`in file, not in DB: ${missingInDb.length} | in DB, not in file: ${extraInDb.length}`);
if (missingInDb.length) console.log('  missing:', missingInDb.slice(0, 8));
if (extraInDb.length) console.log('  extra:', extraInDb.slice(0, 8));

// Orphans: every parent FK resolves to a real narration record, and every
// payload.situation points at a situation descriptor inside it.
const placeIds = new Set((await q(`SELECT id FROM places_narration`)).map((r) => r.id));
const entIds = new Set((await q(`SELECT id FROM entities_narration`)).map((r) => r.id));
const sitIdsByRecord = new Map();
for (const r of await q(
  `SELECT id, interactive FROM places_narration WHERE interactive IS NOT NULL
   UNION ALL SELECT id, interactive FROM entities_narration WHERE interactive IS NOT NULL`
)) {
  sitIdsByRecord.set(r.id, new Set((r.interactive || []).map((s) => s.id)));
}

let orphanParent = 0, orphanSit = 0, badEffects = 0;
const TYPED = new Set(['energy', 'shadow', 'food', 'water', 'heal', 'item', 'coins', 'lodging', 'rest', 'meal']);
for (const r of dbRows) {
  const parent = r.places_narration_id ?? r.entities_narration_id;
  if (r.places_narration_id && !placeIds.has(r.places_narration_id)) orphanParent++;
  if (r.entities_narration_id && !entIds.has(r.entities_narration_id)) orphanParent++;
  const sit = r.payload?.situation;
  if (sit && !sitIdsByRecord.get(parent)?.has(sit)) orphanSit++;
  for (const e of r.outcomes?.success?.effects ?? []) {
    if (!TYPED.has(e.type)) badEffects++;
  }
}
console.log(`orphan parents: ${orphanParent} | orphan situation ids: ${orphanSit} | non-typed effects: ${badEffects}`);
await pool.end();
