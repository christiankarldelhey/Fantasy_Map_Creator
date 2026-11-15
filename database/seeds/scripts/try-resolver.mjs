// Smoke test: resolveEncounter against the live seeded entities_narration.
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../../../backend/.env') });
process.env.DATABASE_URL = process.env.DATABASE_URL; // already set

const { resolveEncounter, clearAllEncounterCaches } = await import(
  '../../../backend/domains/game/services/world/interactionResolver.js'
);
const { default: pg } = await import('pg');
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

const { rows: ents } = await pool.query(
  `SELECT id, name, slug, type, danger FROM entities
   WHERE type IN ('humans','orcs','elves','herbivores','wolves','rangers')
     AND danger IS NOT NULL ORDER BY type, name LIMIT 12`
);

const rng = (() => { let a = 42; return () => { a = (a * 16807) % 2147483647; return (a - 1) / 2147483646; }; })();

for (const e of ents) {
  clearAllEncounterCaches();
  const r = await resolveEncounter(e, {}, [], rng, [], {
    characterSlug: 'aranath-user-1',
    culturalFamily: 'northman',
    regionId: 62,
    nightTiming: 'before_sleep',
  });
  console.log(`\n${e.name} [${e.type}, danger ${e.danger}]`);
  console.log(`  form=${r.form} intensity=${r.intensity}`);
  console.log(`  prose_hint=${(r.prose_hint || '').slice(0, 80)}`);
  if (r.dialogue_content) {
    const dc = r.dialogue_content;
    console.log(`  contact=${dc.id} topic=${dc.topic}`);
    console.log(`  attitude=${(dc.npc_attitude || '').slice(0, 70)}`);
    console.log(`  tension=${(dc.tension || '').slice(0, 70)}`);
    if (dc.options?.length) console.log(`  options=${dc.options.map(o => o.id || o.label).join(', ')}`);
    if (dc.commands?.length) console.log(`  commands=${dc.commands.map(c => c.type).join(', ')}`);
  } else console.log('  contact=none');
  if (r.decision) console.log(`  DECISION=${r.decision.id} (${r.decision.options.length} options)`);
}
await pool.end();
