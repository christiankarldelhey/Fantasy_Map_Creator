import express from 'express';
import pool from '../db.js';

const router = express.Router();

// GET /api/peaks - Devolver todos los puntos de elevación como GeoJSON
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
              'altitude_type', altitude_type,
              'elevation_final', elevation_final
            )
          )
        ), '[]'::json)
      ) as geojson
      FROM elevation_points
      WHERE geom IS NOT NULL AND elevation_final IS NOT NULL;
    `;

    const result = await pool.query(query);
    res.json(result.rows[0].geojson);
  } catch (error) {
    next(error);
  }
});

export default router;
