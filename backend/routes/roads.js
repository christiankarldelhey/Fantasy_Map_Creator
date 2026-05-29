import express from 'express';
import pool from '../db.js';

const router = express.Router();

// GET /api/roads - Return all roads as GeoJSON
router.get('/', async (req, res, next) => {
  try {
    const query = `
      SELECT json_build_object(
        'type', 'FeatureCollection',
        'features', COALESCE(json_agg(
          json_build_object(
            'type', 'Feature',
            'id', id,
            'geometry', ST_AsGeoJSON(geom)::json,
            'properties', json_build_object(
              'id', id,
              'name', name,
              'terrain_type', terrain_type,
              'difficulty', difficulty
            )
          )
        ), '[]'::json)
      ) as geojson
      FROM roads
      WHERE geom IS NOT NULL;
    `;

    const result = await pool.query(query);
    res.json(result.rows[0].geojson);
  } catch (error) {
    next(error);
  }
});

export default router;
