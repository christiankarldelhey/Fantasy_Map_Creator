import express from 'express';
import pool from '../../../db.js';

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
            'id', w.id,
            'geometry', ST_AsGeoJSON(w.geom)::json,
            'properties', json_build_object(
              'id', w.id,
              'name', w.name,
              'water_type', w.water_type,
              'description', COALESCE(wd.description->>'en', w.description)
            )
          )
        ), '[]'::json)
      ) as geojson
      FROM water w
      LEFT JOIN places_narration wd ON wd.id = w.depiction_id
      WHERE w.geom IS NOT NULL;
    `;

    const result = await pool.query(query);
    res.json(result.rows[0].geojson);
  } catch (error) {
    next(error);
  }
});

export default router;
