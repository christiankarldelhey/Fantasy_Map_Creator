import express from 'express';
import pool from '../db.js';

const router = express.Router();

// GET /api/locations - Devolver todas las ubicaciones como GeoJSON
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
              'type', location_type,
              'slug', slug,
              'url_path', url_path,
              'region', region,
              'description', description,
              'population', population,
              'inhabitants', inhabitants
            )
          )
        ), '[]'::json)
      ) as geojson
      FROM locations
      WHERE geom IS NOT NULL;
    `;

    const result = await pool.query(query);
    res.json(result.rows[0].geojson);
  } catch (error) {
    next(error);
  }
});

// GET /api/locations/:id - Obtener una ubicación específica
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const query = `
      SELECT json_build_object(
        'type', 'Feature',
        'id', id,
        'geometry', ST_AsGeoJSON(geom)::json,
        'properties', json_build_object(
          'id', id,
          'name', name,
          'type', location_type,
          'slug', slug,
          'url_path', url_path,
          'region', region,
          'description', description,
          'population', population,
          'inhabitants', inhabitants
        )
      ) as feature
      FROM locations
      WHERE id = $1;
    `;

    const result = await pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Location not found' });
    }
    
    res.json(result.rows[0].feature);
  } catch (error) {
    next(error);
  }
});

export default router;
