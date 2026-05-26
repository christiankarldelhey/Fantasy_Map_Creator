import express from 'express';
import pool from '../db.js';

const router = express.Router();

// GET /api/paths - Return all paths (roads, rivers, streams) as GeoJSON
// Optional query parameter: ?type=road or ?type=river or ?type=stream
router.get('/', async (req, res, next) => {
  try {
    const { type } = req.query;
    
    let whereClause = 'WHERE geom IS NOT NULL';
    const params = [];
    
    if (type) {
      whereClause += ' AND path_type = $1';
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
              'path_type', path_type,
              'terrain_type', terrain_type,
              'difficulty', difficulty
            )
          )
        ), '[]'::json)
      ) as geojson
      FROM paths
      ${whereClause};
    `;

    const result = await pool.query(query, params);
    res.json(result.rows[0].geojson);
  } catch (error) {
    next(error);
  }
});

export default router;
