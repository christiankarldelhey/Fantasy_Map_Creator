import express from 'express';
import pool from '../db.js';

const router = express.Router();

// GET /api/character - Obtener el estado y posición del personaje/compañía
router.get('/', async (req, res, next) => {
  try {
    const result = await pool.query(`
      SELECT 
        c.id, 
        c.name, 
        c.current_lng, 
        c.current_lat, 
        c.updated_at,
        (
          SELECT name 
          FROM locations 
          WHERE ST_DWithin(geom, ST_SetSRID(ST_Point(c.current_lng, c.current_lat), 4326), 0.01)
          ORDER BY ST_Distance(geom, ST_SetSRID(ST_Point(c.current_lng, c.current_lat), 4326)) ASC
          LIMIT 1
        ) as current_location,
        (
          SELECT name 
          FROM regions 
          WHERE ST_Contains(geom, ST_SetSRID(ST_Point(c.current_lng, c.current_lat), 4326))
          LIMIT 1
        ) as current_region
      FROM character_state c
      ORDER BY c.id ASC
      LIMIT 1
    `);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Character state not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// PUT /api/character - Actualizar la posición del personaje/compañía
router.put('/', async (req, res, next) => {
  try {
    const { current_lng, current_lat } = req.body;

    if (current_lng === undefined || current_lat === undefined) {
      return res.status(400).json({ error: 'Missing current_lng or current_lat' });
    }

    const result = await pool.query(`
      UPDATE character_state
      SET current_lng = $1, current_lat = $2, updated_at = NOW()
      WHERE id = (SELECT id FROM character_state ORDER BY id ASC LIMIT 1)
      RETURNING id, name, current_lng, current_lat, updated_at
    `);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Character state not found to update' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

export default router;
