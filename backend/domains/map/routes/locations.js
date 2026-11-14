import express from 'express';
import pool from '../../../db.js';
import { authenticateToken } from '../../../middleware/auth.js';

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
              'description', pd.aspect->>'en',
              'description_es', pd.aspect->>'es',
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

// GET /api/locations/hidden — admin-only: the locations `visible_in_map`
// hides (georef anchors and authored points kept off the traveller's map),
// with the anchored ficha's radii and prose so the admin map can ghost
// them in. Must register before /:id or 'hidden' parses as an id.
router.get('/hidden', authenticateToken, (req, res, next) => {
  if (!req.isAdmin) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}, async (req, res, next) => {
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
              'description', COALESCE(ficha.aspect_en, ficha.presence_en, pd.aspect->>'en'),
              'description_es', COALESCE(ficha.aspect_es, ficha.presence_es, pd.aspect->>'es'),
              'population', l.population,
              'inhabitants', l.inhabitants,
              'hidden', true,
              'size_radius_km', rad.size_km,
              'influence_radius_km', rad.infl_km
            )
          )
        ), '[]'::json)
      ) as geojson
      FROM locations l
      LEFT JOIN places_narration pd ON pd.id = l.depiction_id
      -- A place's voice reaches as far as its anchored ficha's radii
      -- (same resolution as the day's leg sampling).
      LEFT JOIN LATERAL (
        SELECT MAX(p.size_radius_km) AS size_km,
               MAX(p.influence_radius_km) AS infl_km
          FROM places_narration p WHERE p.location_id = l.id
      ) rad ON true
      -- The anchored ficha's prose beats the anchor's own depiction note:
      -- aspect (the face from outside) first, then presence (being there)
      -- — many fichas carry their prose in presence and have no aspect.
      LEFT JOIN LATERAL (
        SELECT f.aspect->>'en' AS aspect_en, f.aspect->>'es' AS aspect_es,
               f.presence->>'en' AS presence_en, f.presence->>'es' AS presence_es
          FROM places_narration f
         WHERE f.location_id = l.id AND f.kind = 'place'
         ORDER BY (f.aspect IS NOT NULL OR f.presence IS NOT NULL) DESC
         LIMIT 1
      ) ficha ON true
      WHERE l.geom IS NOT NULL
        AND NOT l.visible_in_map;
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
          'description', pd.aspect->>'en',
          'description_es', pd.aspect->>'es',
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
