// Wave A verification — does the interactions backfill match what the
// narration interactive[] JSONB holds? Run: node verify-interactions.mjs
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../../../backend/.env') });
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

const q = (sql) => pool.query(sql).then((r) => r.rows);

// Source expectations, counted the same way the backfill reads them.
const placeSits = await q(`
  SELECT id, interactive FROM places_narration
  WHERE jsonb_typeof(interactive) = 'array' AND jsonb_array_length(interactive) > 0`);
const entSits = await q(`
  SELECT id, form, interactive FROM entities_narration
  WHERE jsonb_typeof(interactive) = 'array' AND jsonb_array_length(interactive) > 0`);

let expected = 0, expectedFromOpts = 0, expectedSole = 0, narrativeOnly = 0;
for (const r of placeSits)
    for (const s of r.interactive) expected += (s.options ?? []).length, expectedFromOpts += (s.options ?? []).length;
for (const r of entSits)
    for (const s of r.interactive) {
      const opts = (s.options ?? []).length;
      const cmds = (s.commands ?? []).length;
      if (opts) { expected += opts; expectedFromOpts += opts; }
      else if (s.stance || cmds) { expected += 1; expectedSole += 1; }
      else narrativeOnly += 1;
    }

const actual = await q(`
  SELECT count(*)::int total,
         count(*) FILTER (WHERE places_narration_id IS NOT NULL)::int place,
         count(*) FILTER (WHERE entities_narration_id IS NOT NULL)::int entity
  FROM interactions`);
const byAct = await q(`SELECT act, count(*)::int c FROM interactions GROUP BY act ORDER BY c DESC`);
const orphans = await q(`
  SELECT count(*)::int c FROM interactions i
  WHERE (i.places_narration_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM places_narration p WHERE p.id = i.places_narration_id))
     OR (i.entities_narration_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM entities_narration e WHERE e.id = i.entities_narration_id))`);
const badEffects = await q(`
  SELECT count(*)::int c FROM interactions
  WHERE jsonb_typeof(outcomes->'success'->'effects') <> 'array'`);

console.log(`source: ${placeSits.length} place recs + ${entSits.length} entity recs w/ interactive`);
console.log(`expected interactions: ${expected} (${expectedFromOpts} from options + ${expectedSole} derived sole; ${narrativeOnly} narrative-only skipped)`);
console.log(`actual:   ${actual[0].total} (${actual[0].place} place + ${actual[0].entity} entity)`);
console.log(`by act:   ${byAct.map((r) => `${r.act}:${r.c}`).join(' ')}`);
console.log(`orphan parents: ${orphans[0].c} | non-array effects: ${badEffects[0].c}`);
console.log(actual[0].total === expected && !orphans[0].c && !badEffects[0].c
  ? '✅ backfill matches the authored source'
  : '❌ MISMATCH — investigate');
await pool.end();
