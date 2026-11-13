// ============================================================================
// Export generated narration records → data/json/narration.json (#104)
// ----------------------------------------------------------------------------
// After the legacy prose stores drop, this file is the seed source for every
// non-ficha record: depictions (dep:*) and interactions (ovn:*). Fichas stay
// in places.json — anything not authored there is exported from the live table.
// ============================================================================
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from '../../../backend/db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '..', 'data');

const { rows } = await pool.query(
  `SELECT id, kind, action, location_id, place_ref, region_id, region_ids, name, type,
          cultural_family, priority, tags, size_radius_km, influence_radius_km,
          description, variants, mechanics, refs, payload
     FROM places_narration
    WHERE id LIKE 'dep:%' OR id LIKE 'ovn:%'
    ORDER BY id`
);

const COLS = [
  'id', 'kind', 'action', 'location_id', 'place_ref', 'region_id', 'region_ids', 'name', 'type',
  'cultural_family', 'priority', 'tags', 'size_radius_km', 'influence_radius_km',
  'description', 'variants', 'mechanics', 'refs', 'payload',
];

const records = rows.map((r) =>
  Object.fromEntries(COLS.map((c) => [c, r[c]]).filter(([, v]) => v !== null))
);

const file = path.join(DATA_DIR, 'json/narration.json');
await fs.writeFile(file, JSON.stringify({ records }, null, 2));
console.log(`✅ narration.json: ${records.length} records → ${file}`);
await pool.end();
