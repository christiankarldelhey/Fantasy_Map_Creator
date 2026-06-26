import express from 'express';
import pool from '../db.js';

const router = express.Router();

// ---------------------------------------------------------------------------
// GET /api/users/me - Get the admin user (singleton) with settings
// ---------------------------------------------------------------------------
router.get('/me', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT 
        u.id, 
        u.email, 
        u.active_character_id,
        u.active_trip_id,
        u.settings,
        u.created_at,
        u.updated_at,
        c.id as character_id,
        c.name as character_name,
        c.current_lng as character_lng,
        c.current_lat as character_lat,
        c.type as character_type,
        c.gender as character_gender,
        c.active as character_active,
        c.description as character_description,
        c.updated_at as character_updated_at,
        t.id as trip_id,
        t.name as trip_name,
        t.start_lng as trip_start_lng,
        t.start_lat as trip_start_lat,
        t.end_lng as trip_end_lng,
        t.end_lat as trip_end_lat,
        t.transport_mode as trip_transport_mode,
        t.start_date as trip_start_date,
        t.current_day as trip_current_day,
        t.created_at as trip_created_at,
        t.route as trip_route
       FROM users u
       LEFT JOIN character_state c ON u.active_character_id = c.id
       LEFT JOIN trips t ON u.active_trip_id = t.id
       WHERE u.email = 'admin@middleearth.com'
       LIMIT 1`
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Admin user not found' });
    }

    const user = rows[0];
    
    // Format response with nested objects
    res.json({
      id: user.id,
      email: user.email,
      active_character_id: user.active_character_id,
      active_trip_id: user.active_trip_id,
      settings: user.settings,
      created_at: user.created_at,
      updated_at: user.updated_at,
      active_character: user.character_id ? {
        id: user.character_id,
        name: user.character_name,
        current_lng: user.character_lng,
        current_lat: user.character_lat,
        type: user.character_type,
        gender: user.character_gender,
        active: user.character_active,
        description: user.character_description,
        updated_at: user.character_updated_at
      } : null,
      active_trip: user.trip_id ? {
        id: user.trip_id,
        name: user.trip_name,
        start_lng: user.trip_start_lng,
        start_lat: user.trip_start_lat,
        end_lng: user.trip_end_lng,
        end_lat: user.trip_end_lat,
        transport_mode: user.trip_transport_mode,
        start_date: user.trip_start_date,
        current_day: user.trip_current_day,
        created_at: user.trip_created_at,
        route: user.trip_route
      } : null
    });
  } catch (error) {
    next(error);
  }
});

// ---------------------------------------------------------------------------
// PUT /api/users/me - Update user settings (active character, active trip, settings)
// Body: { active_character_id?, active_trip_id?, settings? }
// ---------------------------------------------------------------------------
router.put('/me', async (req, res, next) => {
  try {
    const { active_character_id, active_trip_id, settings } = req.body || {};

    // Build dynamic update query
    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (active_character_id !== undefined) {
      updates.push(`active_character_id = $${paramIndex++}`);
      values.push(active_character_id);
    }

    if (active_trip_id !== undefined) {
      updates.push(`active_trip_id = $${paramIndex++}`);
      values.push(active_trip_id);
    }

    if (settings !== undefined) {
      updates.push(`settings = $${paramIndex++}`);
      values.push(settings);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updates.push(`updated_at = NOW()`);
    values.push('admin@middleearth.com');

    const query = `
      UPDATE users
      SET ${updates.join(', ')}
      WHERE email = $${paramIndex}
      RETURNING id, email, active_character_id, active_trip_id, settings, updated_at
    `;

    const { rows } = await pool.query(query, values);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Admin user not found' });
    }

    res.json(rows[0]);
  } catch (error) {
    next(error);
  }
});

// ---------------------------------------------------------------------------
// PATCH /api/users/me/settings - Partial update of settings JSONB
// Body: { settings: { ...partialSettings } }
// ---------------------------------------------------------------------------
router.patch('/me/settings', async (req, res, next) => {
  try {
    const { settings } = req.body || {};

    if (!settings || typeof settings !== 'object') {
      return res.status(400).json({ error: 'settings object required' });
    }

    const { rows } = await pool.query(
      `UPDATE users
       SET settings = settings || $1::jsonb, updated_at = NOW()
       WHERE email = 'admin@middleearth.com'
       RETURNING id, email, active_character_id, active_trip_id, settings, updated_at`,
      [settings]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Admin user not found' });
    }

    res.json(rows[0]);
  } catch (error) {
    next(error);
  }
});

export default router;
