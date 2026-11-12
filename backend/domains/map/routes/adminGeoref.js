import express from 'express';
import pool from '../../../db.js';
import { authenticateToken } from '../../../middleware/auth.js';

// Admin-only georeferencing tool (ADR-0013): positions fichas on the map by
// creating/adopting `locations` anchor points. Every route requires a valid
// JWT whose payload carries isAdmin.

const router = express.Router();

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
    const geomFilter =
      status === 'unpositioned' ? 'AND p.geom IS NULL' :
      status === 'positioned'   ? 'AND p.geom IS NOT NULL' : '';

    const { rows } = await pool.query(
      `SELECT p.id, p.kind, p.name, p.type, p.region_id, p.location_id,
              p.payload->'region_ids' AS region_ids,
              p.size_radius_km, p.influence_radius_km,
              p.geom IS NOT NULL AS positioned,
              ST_AsGeoJSON(p.geom)::json AS geom
       FROM places p
       WHERE p.kind = 'place' ${geomFilter}
       ORDER BY p.id`
    );
    res.json({ places: rows });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/georef/places/:id — full record for the read panel.
router.get('/places/:id', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT p.id, p.kind, p.name, p.type, p.region_id, p.place_ref,
              p.location_id, p.tags, p.size_radius_km, p.influence_radius_km,
              ST_AsGeoJSON(p.geom)::json AS geom, p.payload
       FROM places p WHERE p.id = $1`,
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
                (SELECT COUNT(*) FROM places p WHERE p.location_id = l.id) AS anchored_places
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
          visible_in_map, geom)
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
         $8, ST_SetSRID(ST_MakePoint($6, $7), 4326))
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
// { lon?, lat?, location_id?, region_id?, type?,
//   size_radius_km?, influence_radius_km? }
// Moves/edits the ficha only — never writes locations.geom (several fichas can
// share one location).
router.patch('/places/:id', async (req, res, next) => {
  try {
    const { lon, lat, location_id, region_id, type,
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
      sets.push(`geom = ST_SetSRID(ST_MakePoint($${lonIdx}, $${latIdx}), 4326)`);
    }
    if (location_id !== undefined) add('location_id = ?', location_id);
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
    if (size_radius_km !== undefined) add('size_radius_km = ?', size_radius_km);
    if (influence_radius_km !== undefined) add('influence_radius_km = ?', influence_radius_km);

    if (sets.length === 0) {
      return res.status(400).json({ error: 'nothing to update' });
    }

    const { rows } = await pool.query(
      `UPDATE places SET ${sets.join(', ')} WHERE id = $1
       RETURNING id, name, type, region_id, location_id,
                 size_radius_km, influence_radius_km,
                 ST_AsGeoJSON(geom)::json AS geom`,
      params
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Place not found' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

export default router;
