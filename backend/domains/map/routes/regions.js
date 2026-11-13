import express from 'express';
import pool from '../../../db.js';

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
              'slug', r.slug,
              'url_path', r.url_path,
              'description', COALESCE(rd.payload->'rotation', to_jsonb(r.description_summary)),
              'land', COALESCE(rd.payload->'facts'->'land', r.land),
              'notes', COALESCE(rd.payload->'facts'->>'notes', r.notes),
              'people', COALESCE(rd.payload->'facts'->'people', r.people),
              'source', COALESCE(rd.payload->'facts'->'source', r.source),
              'products', COALESCE(rd.payload->'facts'->>'products', r.products),
              'kingdom', k.name
            )
          )
        ), '[]'::json)
      ) as geojson
      FROM regions r
      LEFT JOIN kingdoms k ON r.kingdom_id = k.id
      LEFT JOIN places_narration rd ON rd.id = r.depiction_id
      WHERE r.geom IS NOT NULL;
    `;

    const result = await pool.query(query);
    res.json(result.rows[0].geojson);
  } catch (error) {
    next(error);
  }
});

export default router;
