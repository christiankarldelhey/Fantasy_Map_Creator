import express from 'express';
import pool from '../../../db.js';
import { authenticateToken } from '../../../middleware/auth.js';
import { REF_TABLES } from '../../game/services/world/resolveNarrative.js';

// Admin-only georeferencing tool (ADR-0013): positions fichas on the map by
// creating/adopting `locations` anchor points. Every route requires a valid
// JWT whose payload carries isAdmin.

const router = express.Router();

const DEPICTION_TABLES = [...new Set(Object.values(REF_TABLES))];

router.use(authenticateToken, (req, res, next) => {
  if (!req.isAdmin) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
});

// GET /api/admin/georef/places?status=unpositioned|positioned|all
// Light list for the side carousel — ficha detail loads per-id.
router.get('/places', async (req, res, next) => {
  try {
    const { status = 'unpositioned' } = req.query;
    // Position lives on the anchor (ADR-0014 #105): a record is positioned
    // when its location has a point. places_narration.geom is the legacy
    // copy (deprecated, drops in #104) — read it only as fallback.
    const geomFilter =
      status === 'unpositioned' ? 'AND COALESCE(l.geom, p.geom) IS NULL' :
      status === 'positioned'   ? 'AND COALESCE(l.geom, p.geom) IS NOT NULL' : '';

    const { rows } = await pool.query(
      `SELECT p.id, p.kind, p.name, p.type, p.region_id, p.location_id,
              p.payload->'region_ids' AS region_ids,
              p.size_radius_km, p.influence_radius_km,
              COALESCE(l.geom, p.geom) IS NOT NULL AS positioned,
              ST_AsGeoJSON(COALESCE(l.geom, p.geom))::json AS geom
       FROM places_narration p
       LEFT JOIN locations l ON l.id = p.location_id
       WHERE p.kind = 'place' ${geomFilter}
       ORDER BY p.id`
    );
    res.json({ places: rows });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/georef/places/:id — full record for the read panel,
// including the features this record depicts (depiction bindings).
router.get('/places/:id', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT p.id, p.kind, p.action, p.name, p.type, p.region_id, p.place_ref,
              p.location_id, p.cultural_family, p.priority,
              p.tags, p.size_radius_km, p.influence_radius_km,
              p.description, p.variants, p.mechanics, p.refs,
              ST_AsGeoJSON(COALESCE(l.geom, p.geom))::json AS geom, p.payload,
              (SELECT jsonb_agg(jsonb_build_object('table', x.t, 'id', x.id, 'name', x.name))
                 FROM (
                   SELECT 'locations' AS t, id, name FROM locations WHERE depiction_id = p.id
                   UNION ALL SELECT 'water',    id, name FROM water    WHERE depiction_id = p.id
                   UNION ALL SELECT 'biomes',   id, name FROM biomes   WHERE depiction_id = p.id
                   UNION ALL SELECT 'roads',    id, name FROM roads    WHERE depiction_id = p.id
                   UNION ALL SELECT 'regions',  id, name FROM regions  WHERE depiction_id = p.id
                   UNION ALL SELECT 'kingdoms', id, name FROM kingdoms WHERE depiction_id = p.id
                 ) x) AS depictions
       FROM places_narration p
       LEFT JOIN locations l ON l.id = p.location_id
       WHERE p.id = $1`,
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Place not found' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/georef/locations/nearby?lon&lat&km
// Candidate locations for adoption + the region containing the click point.
router.get('/locations/nearby', async (req, res, next) => {
  try {
    const lon = parseFloat(req.query.lon);
    const lat = parseFloat(req.query.lat);
    const km = parseFloat(req.query.km) || 10;
    if (Number.isNaN(lon) || Number.isNaN(lat)) {
      return res.status(400).json({ error: 'lon and lat are required' });
    }

    const point = 'ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography';
    const [nearby, containing] = await Promise.all([
      pool.query(
        `SELECT l.id, l.name, l.location_type, l.region_id,
                ST_AsGeoJSON(l.geom)::json AS geom,
                ROUND((ST_Distance(l.geom::geography, ${point}) / 1000)::numeric, 2) AS distance_km,
                (SELECT COUNT(*) FROM places_narration p WHERE p.location_id = l.id) AS anchored_places
         FROM locations l
         WHERE l.geom IS NOT NULL
           AND ST_DWithin(l.geom::geography, ${point}, $3 * 1000)
         ORDER BY distance_km
         LIMIT 20`,
        [lon, lat, km]
      ),
      pool.query(
        `SELECT r.id, r.name
         FROM regions r
         WHERE ST_Contains(r.geom, ST_SetSRID(ST_MakePoint($1, $2), 4326))
         LIMIT 1`,
        [lon, lat]
      )
    ]);

    res.json({ candidates: nearby.rows, region: containing.rows[0] || null });
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/georef/locations
// { name, location_type?, description?, description_es?, lon, lat,
//   visible_in_map?, region_id? } → creates an adventure anchor point.
// region_id defaults to point-in-polygon; `region` legacy text follows it.
router.post('/locations', async (req, res, next) => {
  try {
    const { name, location_type = null, description = null, description_es = null,
            lon, lat, visible_in_map = false, region_id = null } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'name is required' });
    }
    if (Number.isNaN(parseFloat(lon)) || Number.isNaN(parseFloat(lat))) {
      return res.status(400).json({ error: 'lon and lat are required' });
    }

    const { rows } = await pool.query(
      `INSERT INTO locations
         (name, location_type, description, description_es, region, region_id,
          visible_in_map, geom, source)
       VALUES (
         $1, $2, $3, $4,
         (SELECT r.name FROM regions r
          WHERE r.id = COALESCE($5,
            (SELECT rr.id FROM regions rr
             WHERE ST_Contains(rr.geom, ST_SetSRID(ST_MakePoint($6, $7), 4326))
             LIMIT 1))),
         COALESCE($5,
           (SELECT rr.id FROM regions rr
            WHERE ST_Contains(rr.geom, ST_SetSRID(ST_MakePoint($6, $7), 4326))
            LIMIT 1)),
         $8, ST_SetSRID(ST_MakePoint($6, $7), 4326), 'georef')
       RETURNING id, name, location_type, region, region_id, visible_in_map,
                 ST_AsGeoJSON(geom)::json AS geom`,
      [name.trim(), location_type, description, description_es,
       region_id, lon, lat, visible_in_map === true]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/admin/georef/places/:id
// { lon?, lat?, location_id?, region_id?, type?, cultural_family?, priority?,
//   size_radius_km?, influence_radius_km? }
// ADR-0014 (#105): position writes go to the anchor, never to the record —
//   location_id + point → moves that anchor's geom
//   point alone         → moves the record's current anchor, or creates a
//                         georef anchor named after the record and links it
//   location_id alone   → links only
router.patch('/places/:id', async (req, res, next) => {
  try {
    const { lon, lat, location_id, region_id, type, cultural_family, priority,
            size_radius_km, influence_radius_km } = req.body;

    const sets = [];
    const params = [req.params.id];
    const add = (expr, value) => { params.push(value); sets.push(expr.replace('?', `$${params.length}`)); };

    let lonIdx, latIdx;
    if (lon !== undefined && lat !== undefined) {
      if (Number.isNaN(parseFloat(lon)) || Number.isNaN(parseFloat(lat))) {
        return res.status(400).json({ error: 'lon and lat must be numbers' });
      }
      params.push(parseFloat(lon), parseFloat(lat));
      lonIdx = params.length - 1;
      latIdx = params.length;
    }

    // Anchor write path. anchorId is undefined when untouched, null on
    // explicit unlink, or the anchor to write/link.
    let anchorId = location_id;
    if (lonIdx !== undefined) {
      if (anchorId === undefined) {
        const { rows: [cur] } = await pool.query(
          'SELECT location_id FROM places_narration WHERE id = $1', [req.params.id]
        );
        if (!cur) return res.status(404).json({ error: 'Place not found' });
        anchorId = cur.location_id;
      }
      if (anchorId != null) {
        const moved = await pool.query(
          'UPDATE locations SET geom = ST_SetSRID(ST_MakePoint($1, $2), 4326) WHERE id = $3 RETURNING id',
          [lon, lat, anchorId]
        );
        if (moved.rowCount === 0) {
          return res.status(404).json({ error: `location ${anchorId} not found` });
        }
      } else {
        const { rows: [pl] } = await pool.query(
          'SELECT name FROM places_narration WHERE id = $1', [req.params.id]
        );
        if (!pl) return res.status(404).json({ error: 'Place not found' });
        const { rows: [loc] } = await pool.query(
          `INSERT INTO locations (name, region, region_id, geom, source)
           VALUES ($1,
             (SELECT rr.name FROM regions rr
               WHERE ST_Contains(rr.geom, ST_SetSRID(ST_MakePoint($2, $3), 4326)) LIMIT 1),
             (SELECT rr.id FROM regions rr
               WHERE ST_Contains(rr.geom, ST_SetSRID(ST_MakePoint($2, $3), 4326)) LIMIT 1),
             ST_SetSRID(ST_MakePoint($2, $3), 4326), 'georef')
           RETURNING id`,
          [pl.name, lon, lat]
        );
        anchorId = loc.id;
      }
    }
    if (anchorId !== undefined) add('location_id = ?', anchorId);

    // The containing region is spatial truth: derive it from the point unless
    // the user picked one explicitly. payload.region/region_ids follow so the
    // list filter never shows the ficha under its old region.
    let regionExpr;
    if (region_id != null) {
      // Cast the param: a null/untyped bind inside CASE makes PG fail with
      // "could not determine data type of parameter $N".
      params.push(region_id);
      regionExpr = `($${params.length})::int`;
    } else if (region_id === null && lonIdx === undefined) {
      sets.push('region_id = NULL');
      sets.push(`payload = COALESCE(payload, '{}'::jsonb) - 'region' - 'region_ids'`);
    } else if (lonIdx !== undefined) {
      regionExpr = `(SELECT rr.id FROM regions rr WHERE ST_Contains(rr.geom, ST_SetSRID(ST_MakePoint($${lonIdx}, $${latIdx}), 4326)) LIMIT 1)`;
    }
    if (regionExpr) {
      sets.push(`region_id = ${regionExpr}`);
      sets.push(`payload = CASE WHEN (${regionExpr}) IS NULL THEN payload
        ELSE (COALESCE(payload,'{}'::jsonb) - 'region' - 'region_ids') || jsonb_build_object(
          'region_ids', jsonb_build_array((${regionExpr})::int),
          'region', (SELECT r2.name FROM regions r2 WHERE r2.id = (${regionExpr})::int))
        END`);
    }
    if (type !== undefined) add('type = ?', type);
    if (cultural_family !== undefined) add('cultural_family = ?', cultural_family);
    if (priority !== undefined) add('priority = ?', priority);
    if (size_radius_km !== undefined) add('size_radius_km = ?', size_radius_km);
    if (influence_radius_km !== undefined) add('influence_radius_km = ?', influence_radius_km);

    if (sets.length === 0) {
      return res.status(400).json({ error: 'nothing to update' });
    }

    const { rows } = await pool.query(
      `UPDATE places_narration SET ${sets.join(', ')} WHERE id = $1 RETURNING id`,
      params
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Place not found' });

    const { rows: [row] } = await pool.query(
      `SELECT p.id, p.name, p.type, p.region_id, p.location_id,
              p.cultural_family, p.priority,
              p.size_radius_km, p.influence_radius_km,
              ST_AsGeoJSON(COALESCE(l.geom, p.geom))::json AS geom
       FROM places_narration p
       LEFT JOIN locations l ON l.id = p.location_id
       WHERE p.id = $1`,
      [req.params.id]
    );
    res.json(row);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/admin/georef/places/:id/bindings
// { refs: { water?: [id...], location?: [id...], road?, biome?, region?, kingdom? } }
// The refs column is the authored truth (ADR-0014 → #106); depiction_id
// materializes immediately so the binding is visible before the next seed. A
// feature claimed by another record is a conflict — rebind it there first.
router.patch('/places/:id/bindings', async (req, res, next) => {
  try {
    const { refs } = req.body;
    if (!refs || typeof refs !== 'object' || Array.isArray(refs)) {
      return res.status(400).json({ error: 'refs object required' });
    }

    const { rows: [rec] } = await pool.query(
      'SELECT id FROM places_narration WHERE id = $1', [req.params.id]
    );
    if (!rec) return res.status(404).json({ error: 'Place not found' });

    const claims = [];
    for (const [key, ids] of Object.entries(refs)) {
      const table = REF_TABLES[key];
      if (!table) return res.status(400).json({ error: `unknown refs key '${key}'` });
      if (!Array.isArray(ids) || ids.some((i) => !Number.isInteger(i))) {
        return res.status(400).json({ error: `refs.${key} must be an array of integer ids` });
      }
      for (const fid of ids) claims.push({ table, fid });
    }

    for (const { table, fid } of claims) {
      const { rows: [f] } = await pool.query(
        `SELECT id, depiction_id FROM ${table} WHERE id = $1`, [fid]
      );
      if (!f) return res.status(404).json({ error: `${table} ${fid} not found` });
      if (f.depiction_id != null && f.depiction_id !== req.params.id) {
        return res.status(409).json({
          error: `${table} ${fid} already depicted by '${f.depiction_id}' — rebind it there first`,
        });
      }
    }

    await pool.query(
      `UPDATE places_narration SET refs = $2::jsonb WHERE id = $1`,
      [req.params.id, JSON.stringify(refs)]
    );
    for (const table of DEPICTION_TABLES) {
      await pool.query('UPDATE ' + table + ' SET depiction_id = NULL WHERE depiction_id = $1', [req.params.id]);
    }
    for (const { table, fid } of claims) {
      await pool.query('UPDATE ' + table + ' SET depiction_id = $1 WHERE id = $2', [req.params.id, fid]);
    }

    res.json({ ok: true, linked: claims.length });
  } catch (err) {
    next(err);
  }
});

export default router;
