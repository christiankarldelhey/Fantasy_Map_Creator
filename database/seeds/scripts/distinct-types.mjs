import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import dotenv from 'dotenv';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../../../backend/.env') });
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

// distinct type leaves: where en is null/missing or differs from a single-word english token
const { rows } = await pool.query(`
  SELECT type->>'en' AS en, type->>'es' AS es, count(*)::int AS n
    FROM places_narration
   WHERE type IS NOT NULL
   GROUP BY 1, 2
   ORDER BY n DESC, 1 NULLS FIRST`);
console.log(`distinct type values: ${rows.length}`);
for (const r of rows) console.log(`  en=${JSON.stringify(r.en)} es=${JSON.stringify(r.es)} ×${r.n}`);
await pool.end();
