import express from 'express';
import pool from '../db.js';

const router = express.Router();

// GET /api/altitude - Devolver todas las capas de altitud procesadas como GeoJSON
// Optional query parameter: ?type=hills to filter by altitude type
router.get('/', async (req, res, next) => {
  try {
    const { type } = req.query;
    
    let whereClause = 'WHERE geom IS NOT NULL';
    const params = [];
    
    if (type) {
      whereClause += ' AND altitude_type = $1';
      params.push(type);
    }
    
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
              'priority', priority,
              'area_km2', area_km2
            )
          ) ORDER BY priority
        ), '[]'::json)
      ) as geojson
      FROM altitude_layers
      ${whereClause};
    `;

    const result = await pool.query(query, params);
    res.json(result.rows[0].geojson);
  } catch (error) {
    next(error);
  }
});

export default router;
