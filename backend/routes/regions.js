import express from 'express';
import pool from '../db.js';

const router = express.Router();

// GET /api/regions - Devolver todas las regiones como GeoJSON
router.get('/', async (req, res, next) => {
  try {
    const query = `
      SELECT json_build_object(
        'type', 'FeatureCollection',
        'features', COALESCE(json_agg(
          json_build_object(
            'type', 'Feature',
            'id', r.id,
            'geometry', ST_AsGeoJSON(r.geom)::json,
            'properties', json_build_object(
              'id', r.id,
              'name', r.name,
              'description', r.description,
              'kingdom', k.name,
              'allegiance', r.allegiance
            )
          )
        ), '[]'::json)
      ) as geojson
      FROM regions r
      LEFT JOIN kingdoms k ON r.kingdom_id = k.id
      WHERE r.geom IS NOT NULL;
    `;

    const result = await pool.query(query);
    res.json(result.rows[0].geojson);
  } catch (error) {
    next(error);
  }
});

export default router;
