import express from 'express';
import pool from '../db.js';

const router = express.Router();

// GET /api/character - Get all characters
router.get('/', async (req, res, next) => {
  try {
    const result = await pool.query(`
      SELECT 
        c.id, 
        c.name, 
        c.current_lng, 
        c.current_lat, 
        c.type,
        c.gender,
        c.active,
        c.description,
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
    `);

    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

// GET /api/character/active - Get the active character
router.get('/active', async (req, res, next) => {
  try {
    const result = await pool.query(`
      SELECT 
        c.id, 
        c.name, 
        c.current_lng, 
        c.current_lat, 
        c.type,
        c.gender,
        c.active,
        c.description,
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
      WHERE c.active = true
      LIMIT 1
    `);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No active character found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// GET /api/character/:id - Get a specific character
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT 
        c.id, 
        c.name, 
        c.current_lng, 
        c.current_lat, 
        c.type,
        c.gender,
        c.active,
        c.description,
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
      WHERE c.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Character not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// PUT /api/character/active/position - Update the active character's position
router.put('/active/position', async (req, res, next) => {
  try {
    const { current_lng, current_lat } = req.body;

    if (current_lng === undefined || current_lat === undefined) {
      return res.status(400).json({ error: 'Missing current_lng or current_lat' });
    }

    const result = await pool.query(`
      UPDATE character_state
      SET current_lng = $1, current_lat = $2, updated_at = NOW()
      WHERE active = true
      RETURNING id, name, current_lng, current_lat, updated_at
    `, [current_lng, current_lat]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No active character found to update' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// PUT /api/character/:id/active - Set a character as active
router.put('/:id/active', async (req, res, next) => {
  try {
    const { id } = req.params;

    // Start transaction
    await pool.query('BEGIN');

    // Deactivate all characters
    await pool.query('UPDATE character_state SET active = false');

    // Activate the specified character
    const result = await pool.query(`
      UPDATE character_state
      SET active = true
      WHERE id = $1
      RETURNING id, name, current_lng, current_lat, type, gender, active, description, updated_at
    `, [id]);

    if (result.rows.length === 0) {
      await pool.query('ROLLBACK');
      return res.status(404).json({ error: 'Character not found' });
    }

    await pool.query('COMMIT');

    res.json(result.rows[0]);
  } catch (error) {
    await pool.query('ROLLBACK');
    next(error);
  }
});

export default router;
