import express from 'express';
import pool from '../db.js';

const router = express.Router();

// GET /api/water - Return all water bodies (rivers, streams, lakes) as GeoJSON
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
              'water_type', water_type,
              'description', description
            )
          )
        ), '[]'::json)
      ) as geojson
      FROM water
      WHERE geom IS NOT NULL;
    `;

    const result = await pool.query(query);
    res.json(result.rows[0].geojson);
  } catch (error) {
    next(error);
  }
});

export default router;
