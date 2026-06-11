import express from 'express';
import pool from '../db.js';

const router = express.Router();

// GET /api/search?q={query} - Buscar locations y regions por nombre
router.get('/', async (req, res, next) => {
  try {
    const { q } = req.query;

    // Validar que se haya proporcionado un query con al menos 2 caracteres
    if (!q || typeof q !== 'string' || q.length < 2) {
      return res.json({ results: [] });
    }

    const searchTerm = `%${q}%`;

    // Buscar locations
    const locationsQuery = `
      SELECT 
        id, 
        name, 
        'location' as type, 
        location_type,
        ST_AsGeoJSON(geom) as geometry
      FROM locations 
      WHERE geom IS NOT NULL 
        AND name ILIKE $1
      ORDER BY name
      LIMIT 10
    `;

    // Buscar regions
    const regionsQuery = `
      SELECT 
        id, 
        name, 
        'region' as type, 
        region_type,
        ST_AsGeoJSON(geom) as geometry
      FROM regions
      WHERE geom IS NOT NULL
        AND name ILIKE $1
      ORDER BY name
      LIMIT 10
    `;

    const [locationsResult, regionsResult] = await Promise.all([
      pool.query(locationsQuery, [searchTerm]),
      pool.query(regionsQuery, [searchTerm])
    ]);

    // Combinar resultados
    const results = [
      ...locationsResult.rows.map(row => ({
        id: row.id,
        name: row.name,
        type: row.type,
        location_type: row.location_type,
        geometry: JSON.parse(row.geometry)
      })),
      ...regionsResult.rows.map(row => ({
        id: row.id,
        name: row.name,
        type: row.type,
        region_type: row.region_type,
        geometry: JSON.parse(row.geometry)
      }))
    ];

    res.json({ results });
  } catch (error) {
    next(error);
  }
});

export default router;
