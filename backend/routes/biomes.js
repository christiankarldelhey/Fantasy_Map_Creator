import express from 'express';
import pool from '../db.js';

const router = express.Router();

// GET /api/biomes - Devolver todos los biomas como GeoJSON
// Optional query parameter: ?type=forest to filter by type
router.get('/', async (req, res, next) => {
  try {
    const { type } = req.query;
    
    let whereClause = 'WHERE geom IS NOT NULL';
    const params = [];
    
    if (type) {
      whereClause += ' AND type = $1';
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
              'name', name,
              'type', type,
              'description', description,
              'area_km2', area_km2
            )
          )
        ), '[]'::json)
      ) as geojson
      FROM biomes
      ${whereClause};
    `;

    const result = await pool.query(query, params);
    res.json(result.rows[0].geojson);
  } catch (error) {
    next(error);
  }
});

export default router;
