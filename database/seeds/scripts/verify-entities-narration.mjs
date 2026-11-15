#!/usr/bin/env node
// Quick check: entities_narration contents + FK resolution after seed.
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../../../backend/.env') });
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

const kinds = await pool.query(
  'SELECT kind, count(*)::int FROM entities_narration GROUP BY 1 ORDER BY 1'
);
console.log('kinds:', kinds.rows);

const fks = await pool.query(`SELECT
  count(*) FILTER (WHERE mover_leg_id IS NOT NULL)::int AS with_leg,
  count(*) FILTER (WHERE entity_id    IS NOT NULL)::int AS with_entity,
  count(*) FILTER (WHERE region_id    IS NOT NULL)::int AS with_region,
  count(*) FILTER (WHERE form         IS NOT NULL)::int AS with_form
  FROM entities_narration`);
console.log('fk coverage:', fks.rows[0]);

const g = await pool.query(
  `SELECT n.id, l.leg_index, l.kind AS leg_kind, l.date_from
     FROM entities_narration n
     JOIN mover_legs l ON l.id = n.mover_leg_id
     JOIN entities e ON e.id = l.entity_id
    WHERE e.slug = 'gandalf' ORDER BY l.leg_index`
);
console.log('gandalf contacts:', g.rows);

const sample = await pool.query(
  `SELECT n.id, n.kind, e.slug, e.type
     FROM entities_narration n JOIN entities e ON e.id = n.entity_id
    WHERE n.kind = 'entity' AND e.slug IS NOT NULL LIMIT 5`
);
console.log('entity fichas:', sample.rows);

const race = await pool.query(
  `SELECT id, tags, disposition->>'en' AS disp FROM entities_narration
    WHERE 'race:dunedain' = ANY(tags) OR 'race:elf' = ANY(tags) LIMIT 3`
);
console.log('race-gated:', race.rows);

const inter = await pool.query(
  `SELECT id, jsonb_array_length(interactive) AS sits
     FROM entities_narration
    WHERE interactive IS NOT NULL AND kind = 'contact' LIMIT 3`
);
console.log('interactive:', inter.rows);

await pool.end();
