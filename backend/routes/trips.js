import express from 'express';
import pool from '../db.js';
import { computeRoute } from '../services/routing.js';
import { generateDay } from '../services/tripDay.js';
import { buildDayPrompt } from '../services/prompt.js';
import { createSeededRng } from '../services/encounters.js';
import { generateNarrative } from '../services/ai.js';

const router = express.Router();

// ---------------------------------------------------------------------------
// POST /api/trips - Create a trip (computes and persists the route)
// Body: { name?, start: {lng, lat}, end: {lng, lat}, transport_mode?, start_date? }
// ---------------------------------------------------------------------------
router.post('/', async (req, res, next) => {
  try {
    const { name, start, end, transport_mode = 'walk', start_date } = req.body || {};

    if (!start || !end || start.lng == null || start.lat == null || end.lng == null || end.lat == null) {
      return res.status(400).json({ error: 'start and end coordinates ({lng, lat}) are required' });
    }

    const startLng = parseFloat(start.lng);
    const startLat = parseFloat(start.lat);
    const endLng = parseFloat(end.lng);
    const endLat = parseFloat(end.lat);

    if ([startLng, startLat, endLng, endLat].some((n) => isNaN(n))) {
      return res.status(400).json({ error: 'Invalid coordinates' });
    }

    const route = await computeRoute({ startLng, startLat, endLng, endLat, transportMode: transport_mode });
    if (!route) {
      return res.status(404).json({ error: 'No route found between coordinates' });
    }

    // Default start date: 21 June 1950 (matches the climate dataset year)
    const startDate = start_date || '1950-06-21';

    const { rows } = await pool.query(
      `INSERT INTO trips
         (name, start_lng, start_lat, end_lng, end_lat, transport_mode, start_date,
          route, total_distance_km, total_time_hours)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        name || null,
        startLng, startLat, endLng, endLat,
        transport_mode,
        startDate,
        JSON.stringify(route),
        route.summary?.total_distance_km ?? null,
        route.summary?.total_time_hours ?? null,
      ]
    );

    res.status(201).json(rows[0]);
  } catch (error) {
    next(error);
  }
});

// ---------------------------------------------------------------------------
// GET /api/trips/:id - Fetch a trip
// ---------------------------------------------------------------------------
router.get('/:id', async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT * FROM trips WHERE id = $1', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Trip not found' });
    res.json(rows[0]);
  } catch (error) {
    next(error);
  }
});

// ---------------------------------------------------------------------------
// GET /api/trips/:id/days - List generated days of a trip
// ---------------------------------------------------------------------------
router.get('/:id/days', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM trip_days WHERE trip_id = $1 ORDER BY day_number',
      [req.params.id]
    );
    res.json(rows);
  } catch (error) {
    next(error);
  }
});

// ---------------------------------------------------------------------------
// POST /api/trips/:id/days - Generate (and persist) the next day, or a given
// day_number. Body (optional): { day_number, seed }
// ---------------------------------------------------------------------------
router.post('/:id/days', async (req, res, next) => {
  try {
    const tripRes = await pool.query('SELECT * FROM trips WHERE id = $1', [req.params.id]);
    if (tripRes.rows.length === 0) return res.status(404).json({ error: 'Trip not found' });
    const trip = tripRes.rows[0];

    const { day_number, seed, language } = req.body || {};
    const dayNumber = day_number != null ? parseInt(day_number, 10) : trip.current_day + 1;

    if (!Number.isInteger(dayNumber) || dayNumber < 1) {
      return res.status(400).json({ error: 'day_number must be a positive integer' });
    }

    // Avoid duplicates
    const existing = await pool.query(
      'SELECT id FROM trip_days WHERE trip_id = $1 AND day_number = $2',
      [trip.id, dayNumber]
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: `Day ${dayNumber} already generated for this trip` });
    }

    const rng = seed != null ? createSeededRng(parseInt(seed, 10)) : Math.random;

    const day = await generateDay({ trip, dayNumber, rng });
    if (!day) {
      return res.status(409).json({ error: 'Trip is already complete; no more days to generate' });
    }

    // Load the character (bio + linked entity name) for the prompt
    const charRes = await pool.query(
      `SELECT c.name, c.description, e.name AS entity_name
       FROM character_state c
       LEFT JOIN entities e ON e.id = c.entity_id
       ORDER BY c.id ASC
       LIMIT 1`
    );
    const character = charRes.rows[0] || {};

    let previousDaySummary = null;
    if (dayNumber > 1) {
      const prevRes = await pool.query(
        'SELECT day_number, regions, locations, encounters FROM trip_days WHERE trip_id = $1 AND day_number = $2',
        [trip.id, dayNumber - 1]
      );
      if (prevRes.rows.length > 0) {
        const prev = prevRes.rows[0];
        const regionsStr = (prev.regions || []).map(r => r.name).join(', ') || 'unknown lands';
        const locsStr = (prev.locations || []).map(l => l.name).join(', ') || 'no major settlements';
        const encsStr = (prev.encounters || []).map(e => e.entity?.name).filter(Boolean).join(', ') || 'no major encounters';
        
        previousDaySummary = `In Chapter ${prev.day_number} (yesterday), the traveller journeyed through: ${regionsStr}. They passed near: ${locsStr}. Notable encounters/sights: ${encsStr}.`;
      }
    }

    const prompt = buildDayPrompt(day, trip, character, language || 'english', previousDaySummary);

    // Generate AI narrative (optional, if API key is configured)
    const narrative = await generateNarrative(prompt);

    // Persist only the user prompt text (system prompt lives in code)
    const promptText = prompt.user;

    const insertRes = await pool.query(
      `INSERT INTO trip_days
         (trip_id, day_number, date, start_lng, start_lat, end_lng, end_lat,
          distance_km, walking_hours, geometry, regions, biomes, altitude,
          road_types, locations, climate, encounters, prompt, narrative, is_last_day)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
       RETURNING *`,
      [
        trip.id,
        day.day_number,
        day.date,
        day.start[0], day.start[1],
        day.end[0], day.end[1],
        day.distance_km,
        day.walking_hours,
        JSON.stringify(day.geometry),
        JSON.stringify(day.regions),
        JSON.stringify(day.biomes),
        JSON.stringify(day.altitude),
        JSON.stringify(day.road_types),
        JSON.stringify(day.locations),
        day.climate ? JSON.stringify(day.climate) : null,
        JSON.stringify(day.encounters),
        promptText,
        narrative,
        day.is_last_day || false,
      ]
    );

    // Advance the trip's current_day if we generated the next sequential day
    if (dayNumber > trip.current_day) {
      await pool.query('UPDATE trips SET current_day = $1 WHERE id = $2', [dayNumber, trip.id]);
    }

    // Update character position to the end of this day's journey
    await pool.query(
      `UPDATE character_state
       SET current_lng = $1, current_lat = $2, updated_at = NOW()
       WHERE id = (SELECT id FROM character_state ORDER BY id ASC LIMIT 1)`,
      [day.end[0], day.end[1]]
    );

    res.status(201).json(insertRes.rows[0]);
  } catch (error) {
    next(error);
  }
});

export default router;
