import express from 'express';
import pool from '../../../db.js';

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
            'id', l.id,
            'geometry', ST_AsGeoJSON(l.geom)::json,
            'properties', json_build_object(
              'id', l.id,
              'name', l.name,
              'type', l.location_type,
              'slug', l.slug,
              'url_path', l.url_path,
              'region', l.region,
              'description', COALESCE(pd.payload->'description'->>'en', l.description),
              'description_es', COALESCE(pd.payload->'description'->>'es', l.description_es),
              'population', l.population,
              'inhabitants', l.inhabitants
            )
          )
        ), '[]'::json)
      ) as geojson
      FROM locations l
      LEFT JOIN places_narration pd ON pd.id = l.depiction_id
      WHERE l.geom IS NOT NULL
        AND l.visible_in_map;
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
        'id', l.id,
        'geometry', ST_AsGeoJSON(l.geom)::json,
        'properties', json_build_object(
          'id', l.id,
          'name', l.name,
          'type', l.location_type,
          'slug', l.slug,
          'url_path', l.url_path,
          'region', l.region,
          'description', COALESCE(pd.payload->'description'->>'en', l.description),
          'description_es', COALESCE(pd.payload->'description'->>'es', l.description_es),
          'population', l.population,
          'inhabitants', l.inhabitants
        )
      ) as feature
      FROM locations l
      LEFT JOIN places_narration pd ON pd.id = l.depiction_id
      WHERE l.id = $1;
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
