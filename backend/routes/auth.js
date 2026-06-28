import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import pool from '../db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();
const SALT_ROUNDS = 10;
const JWT_EXPIRES_IN = '7d';

function generateToken(user) {
  return jwt.sign(
    { userId: user.id, email: user.email, isAdmin: user.is_admin },
    process.env.JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

// ---------------------------------------------------------------------------
// POST /api/auth/register
// Body: { email, password, username? }
// ---------------------------------------------------------------------------
router.post('/register', async (req, res, next) => {
  try {
    const { email, password, username } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const password_hash = await bcrypt.hash(password, SALT_ROUNDS);

    const { rows } = await pool.query(
      `INSERT INTO users (email, password_hash, username, is_admin, settings)
       VALUES ($1, $2, $3, false, '{}'::jsonb)
       RETURNING id, email, username, is_admin, active_character_id, active_trip_id, settings, created_at`,
      [email.toLowerCase(), password_hash, username || null]
    );

    const user = rows[0];
    const token = generateToken(user);

    res.status(201).json({ token, user });
  } catch (error) {
    next(error);
  }
});

// ---------------------------------------------------------------------------
// POST /api/auth/login
// Body: { email, password }
// ---------------------------------------------------------------------------
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const { rows } = await pool.query(
      `SELECT u.id, u.email, u.username, u.is_admin, u.password_hash,
              u.active_character_id, u.active_trip_id, u.settings, u.created_at,
              c.id as character_id, c.name as character_name, c.current_lng as character_lng,
              c.current_lat as character_lat, c.type as character_type, c.gender as character_gender,
              c.active as character_active, c.description as character_description, c.updated_at as character_updated_at,
              t.id as trip_id, t.name as trip_name
       FROM users u
       LEFT JOIN character_state c ON u.active_character_id = c.id
       LEFT JOIN trips t ON u.active_trip_id = t.id
       WHERE u.email = $1`,
      [email.toLowerCase()]
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const row = rows[0];

    if (!row.password_hash) {
      return res.status(401).json({ error: 'Account has no password set. Contact admin.' });
    }

    const valid = await bcrypt.compare(password, row.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = buildUserObject(row);
    const token = generateToken(user);

    res.json({ token, user });
  } catch (error) {
    next(error);
  }
});

// ---------------------------------------------------------------------------
// GET /api/auth/me — restore session from token
// ---------------------------------------------------------------------------
router.get('/me', authenticateToken, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT u.id, u.email, u.username, u.is_admin,
              u.active_character_id, u.active_trip_id, u.settings, u.created_at,
              c.id as character_id, c.name as character_name, c.current_lng as character_lng,
              c.current_lat as character_lat, c.type as character_type, c.gender as character_gender,
              c.active as character_active, c.description as character_description, c.updated_at as character_updated_at,
              t.id as trip_id, t.name as trip_name
       FROM users u
       LEFT JOIN character_state c ON u.active_character_id = c.id
       LEFT JOIN trips t ON u.active_trip_id = t.id
       WHERE u.id = $1`,
      [req.userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(buildUserObject(rows[0]));
  } catch (error) {
    next(error);
  }
});

function buildUserObject(row) {
  return {
    id: row.id,
    email: row.email,
    username: row.username,
    is_admin: row.is_admin,
    active_character_id: row.active_character_id,
    active_trip_id: row.active_trip_id,
    settings: row.settings,
    created_at: row.created_at,
    active_character: row.character_id ? {
      id: row.character_id, name: row.character_name,
      current_lng: row.character_lng, current_lat: row.character_lat,
      type: row.character_type, gender: row.character_gender,
      active: row.character_active, description: row.character_description,
      updated_at: row.character_updated_at
    } : null,
    active_trip: row.trip_id ? {
      id: row.trip_id, name: row.trip_name
    } : null
  };
}

export default router;
