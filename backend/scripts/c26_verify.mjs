// C26 verification: each entity should only ever resolve rows that
// describe it — whitelist rows for their entities, agnostic rows for all.
import pool from '../db.js';
import { resolveEncounter } from '../domains/game/services/world/interactionResolver.js';

const names = process.argv[2] ? process.argv[2].split(',') : [
  'Waterfowl','Ruins','Cavern','Sheep','Deer','Eagles','Fisheries',
  'Apiaries','Settlement Camp','Elven Site','Lossoth Site','Timberlands',
  'Burial Sites','Boars','Elk',
];
const { rows: ents } = await pool.query(
  `SELECT * FROM entities WHERE name = ANY($1)`, [names]
);
const char = { slug: 'celebrian-user-5' };

for (const e of ents) {
  const seen = new Set();
  for (let i = 0; i < 60; i++) {
    const r = await resolveEncounter(e, char, [], Math.random, [], {
      shadowBand: 'clear', characterSlug: char.slug, nightTiming: 'before_sleep',
    });
    const key = (r.dialogue_content?.id || '-') + '|' + r.form;
    if (seen.has(key)) continue;
    seen.add(key);
    const dc = r.dialogue_content;
    console.log(
      e.name.padEnd(16), 'form=' + r.form.padEnd(17),
      dc ? `row:${dc.id.slice(0, 8)} att: ${(dc.npc_attitude || '').slice(0, 65)}` : 'NO ROW',
      r.decision ? 'DECISION' : ''
    );
  }
}
await pool.end();
