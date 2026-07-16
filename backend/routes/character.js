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
        c.energy,
        c.shadow,
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

// GET /api/character/my - Get all clones belonging to the authenticated user
router.get('/my', authenticateToken, async (req, res, next) => {
  try {
    const userId = req.userId;
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
        c.energy,
        c.shadow,
        c.permadeath,
        c.updated_at,
        c.template_id,
        (u.active_character_id = c.id) as is_active_for_user,
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
      JOIN users u ON u.id = $1
      WHERE c.owner_user_id = $1
      ORDER BY c.template_id ASC
    `, [userId]);

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
        c.energy,
        c.shadow,
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
        c.energy,
        c.shadow,
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
      RETURNING id, name, current_lng, current_lat, type, gender, active, description, resistance, permadeath, energy, shadow, updated_at
    `, [current_lng, current_lat, characterId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No active character found to update' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// PUT /api/character/:id/active - Set a character as active
// Admins can set any character; normal users can only switch between their own clones
router.put('/:id/active', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    if (req.isAdmin) {
      // Admin: direct global assignment (original behaviour)
      await pool.query('BEGIN');
      await pool.query('UPDATE character_state SET active = false');
      const result = await pool.query(`
        UPDATE character_state
        SET active = true
        WHERE id = $1
        RETURNING id, name, current_lng, current_lat, type, gender, active, description, resistance, permadeath, energy, shadow, updated_at
      `, [id]);
      if (result.rows.length === 0) {
        await pool.query('ROLLBACK');
        return res.status(404).json({ error: 'Character not found' });
      }
      await pool.query('COMMIT');
      return res.json(result.rows[0]);
    }

    // Normal user: validate the character belongs to them
    const ownerCheck = await pool.query(
      'SELECT id FROM character_state WHERE id = $1 AND owner_user_id = $2',
      [id, userId]
    );
    if (ownerCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Character does not belong to this user' });
    }

    // Activate character exclusively (global flag + user preference)
    await pool.query('BEGIN');
    await pool.query('UPDATE character_state SET active = false');
    await pool.query('UPDATE character_state SET active = true WHERE id = $1', [id]);
    await pool.query(
      'UPDATE users SET active_character_id = $1, updated_at = NOW() WHERE id = $2',
      [id, userId]
    );
    await pool.query('COMMIT');

    const result = await pool.query(`
      SELECT 
        c.id, c.name, c.current_lng, c.current_lat, c.type, c.gender, c.active,
        c.description, c.resistance,
        c.energy,
        c.shadow, c.permadeath, c.updated_at,
        (
          SELECT name FROM locations
          WHERE ST_DWithin(geom, ST_SetSRID(ST_Point(c.current_lng, c.current_lat), 4326), 0.01)
          ORDER BY ST_Distance(geom, ST_SetSRID(ST_Point(c.current_lng, c.current_lat), 4326)) ASC
          LIMIT 1
        ) as current_location,
        (
          SELECT name FROM regions
          WHERE ST_Contains(geom, ST_SetSRID(ST_Point(c.current_lng, c.current_lat), 4326))
          LIMIT 1
        ) as current_region
      FROM character_state c
      WHERE c.id = $1
    `, [id]);

    res.json(result.rows[0]);
  } catch (error) {
    await pool.query('ROLLBACK').catch(() => {});
    next(error);
  }
});

// POST /api/character/clone-all - Clone all template characters for the current user (idempotent)
// If the user already has a clone for a template, it is skipped.
// Sets active_character_id to the clone of template id=1 if user has no active character.
router.post('/clone-all', authenticateToken, async (req, res, next) => {
  try {
    const userId = req.userId;

    // Fetch all templates
    const templates = await pool.query(
      'SELECT * FROM character_state WHERE owner_user_id IS NULL ORDER BY id ASC'
    );

    const clones = [];
    for (const t of templates.rows) {
      const existing = await pool.query(
        'SELECT id FROM character_state WHERE owner_user_id = $1 AND template_id = $2',
        [userId, t.id]
      );

      let characterId;
      if (existing.rows.length > 0) {
        characterId = existing.rows[0].id;
      } else {
        const cloneSlug = t.slug ? `${t.slug}-user-${userId}` : null;
        // Copy the template's starting values into the clone's live state.
        const clone = await pool.query(
          `INSERT INTO character_state
            (name, current_lng, current_lat, type, gender, description, resistance, permadeath, active, owner_user_id, template_id, slug, energy, shadow, energy_initial, shadow_initial)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, false, $9, $10, $11, $12, $13, $12, $13)
           RETURNING id`,
          [t.name, t.current_lng, t.current_lat, t.type, t.gender, t.description, t.resistance, t.permadeath, userId, t.id, cloneSlug, t.energy_initial ?? 100, t.shadow_initial ?? 0]
        );
        characterId = clone.rows[0].id;
      }
      clones.push({ templateId: t.id, characterId });
    }

    // If user has no active character, assign clone of first template (Aranath, id=1)
    const userRow = await pool.query('SELECT active_character_id FROM users WHERE id = $1', [userId]);
    if (!userRow.rows[0]?.active_character_id && clones.length > 0) {
      await pool.query(
        'UPDATE users SET active_character_id = $1, updated_at = NOW() WHERE id = $2',
        [clones[0].characterId, userId]
      );
    }

    // Return all user clones
    const result = await pool.query(`
      SELECT 
        c.id, c.name, c.current_lng, c.current_lat, c.type, c.gender, c.active,
        c.description, c.resistance,
        c.energy,
        c.shadow, c.permadeath, c.updated_at, c.template_id,
        (u.active_character_id = c.id) as is_active_for_user,
        (
          SELECT name FROM locations
          WHERE ST_DWithin(geom, ST_SetSRID(ST_Point(c.current_lng, c.current_lat), 4326), 0.01)
          ORDER BY ST_Distance(geom, ST_SetSRID(ST_Point(c.current_lng, c.current_lat), 4326)) ASC
          LIMIT 1
        ) as current_location,
        (
          SELECT name FROM regions
          WHERE ST_Contains(geom, ST_SetSRID(ST_Point(c.current_lng, c.current_lat), 4326))
          LIMIT 1
        ) as current_region
      FROM character_state c
      JOIN users u ON u.id = $1
      WHERE c.owner_user_id = $1
      ORDER BY c.template_id ASC
    `, [userId]);

    res.json(result.rows);
  } catch (error) {
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
      // Copy the template's starting values into the clone's live state.
      const clone = await pool.query(
        `INSERT INTO character_state
          (name, current_lng, current_lat, type, gender, description, resistance, permadeath, active, owner_user_id, template_id, slug, energy, shadow, energy_initial, shadow_initial)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, false, $9, $10, $11, $12, $13, $12, $13)
         RETURNING id`,
        [t.name, t.current_lng, t.current_lat, t.type, t.gender, t.description, t.resistance, t.permadeath, userId, t.id, cloneSlug, t.energy_initial ?? 100, t.shadow_initial ?? 0]
      );
      characterId = clone.rows[0].id;
    }

    // Update user's active_character_id
    await pool.query(
      'UPDATE users SET active_character_id = $1, updated_at = NOW() WHERE id = $2',
      [characterId, userId]
    );

    const result = await pool.query(
      'SELECT id, name, current_lng, current_lat, type, gender, active, description, resistance, permadeath, energy, shadow, updated_at FROM character_state WHERE id = $1',
      [characterId]
    );

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

export default router;
