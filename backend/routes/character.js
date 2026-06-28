import express from 'express';
import pool from '../db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// GET /api/character - Get all characters (templates only, no owner)
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
        c.resistance,
        c.permadeath,
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
      WHERE c.owner_user_id IS NULL
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
        c.resistance,
        c.permadeath,
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
        c.resistance,
        c.permadeath,
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
router.put('/active/position', authenticateToken, async (req, res, next) => {
  try {
    const { current_lng, current_lat } = req.body;

    if (current_lng === undefined || current_lat === undefined) {
      return res.status(400).json({ error: 'Missing current_lng or current_lat' });
    }

    // Get the user's active_character_id
    const userRow = await pool.query('SELECT active_character_id FROM users WHERE id = $1', [req.userId]);
    if (!userRow.rows[0]?.active_character_id) {
      return res.status(404).json({ error: 'No active character found for user' });
    }
    const characterId = userRow.rows[0].active_character_id;

    const result = await pool.query(`
      UPDATE character_state
      SET current_lng = $1, current_lat = $2, updated_at = NOW()
      WHERE id = $3
      RETURNING id, name, current_lng, current_lat, updated_at
    `, [current_lng, current_lat, characterId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No active character found to update' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// PUT /api/character/:id/active - Set a character as active (admin only — direct assignment)
router.put('/:id/active', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!req.isAdmin) {
      return res.status(403).json({ error: 'Admin only' });
    }

    await pool.query('BEGIN');
    await pool.query('UPDATE character_state SET active = false');

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

// POST /api/character/clone/:templateId - Clone a template character for the current user
router.post('/clone/:templateId', authenticateToken, async (req, res, next) => {
  try {
    const { templateId } = req.params;
    const userId = req.userId;

    // Check if user already has a clone of this template
    const existingClone = await pool.query(
      'SELECT id FROM character_state WHERE owner_user_id = $1 AND template_id = $2',
      [userId, templateId]
    );

    let characterId;

    if (existingClone.rows.length > 0) {
      // Return existing clone
      characterId = existingClone.rows[0].id;
    } else {
      // Fetch template
      const template = await pool.query(
        'SELECT * FROM character_state WHERE id = $1 AND owner_user_id IS NULL',
        [templateId]
      );
      if (template.rows.length === 0) {
        return res.status(404).json({ error: 'Template character not found' });
      }
      const t = template.rows[0];

      // Insert clone with a unique slug: <template-slug>-user-<userId>
      const cloneSlug = t.slug ? `${t.slug}-user-${userId}` : null;
      const clone = await pool.query(
        `INSERT INTO character_state
          (name, current_lng, current_lat, type, gender, description, resistance, permadeath, active, owner_user_id, template_id, slug)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, false, $9, $10, $11)
         RETURNING id`,
        [t.name, t.current_lng, t.current_lat, t.type, t.gender, t.description, t.resistance, t.permadeath, userId, t.id, cloneSlug]
      );
      characterId = clone.rows[0].id;
    }

    // Update user's active_character_id
    await pool.query(
      'UPDATE users SET active_character_id = $1, updated_at = NOW() WHERE id = $2',
      [characterId, userId]
    );

    const result = await pool.query(
      'SELECT id, name, current_lng, current_lat, type, gender, active, description, resistance, permadeath, updated_at FROM character_state WHERE id = $1',
      [characterId]
    );

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

export default router;
