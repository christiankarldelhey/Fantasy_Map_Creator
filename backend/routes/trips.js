import express from 'express';
import pool from '../db.js';
import { computeRoute } from '../services/routing.js';
import { generateDay } from '../services/tripDay.js';
import { buildDayPrompt } from '../services/prompt.js';
import { createSeededRng } from '../services/encounters.js';
import { generateNarrative } from '../services/ai.js';
import { authenticateToken } from '../middleware/auth.js';
import {
  loadCharacterState,
  applyDayState,
  recentNotes,
  computeEnergyDelta,
  computeShadowDelta,
  clamp,
  isHarshWeatherAllDay,
  isQuietNight,
  classifyRegionFamilies,
  shadowSpawnFactor,
  buildDayNote,
  buildConditionBlock,
  TUNING,
} from '../services/characterState.js';

const router = express.Router();

// ---------------------------------------------------------------------------
// POST /api/trips - Create a trip (computes and persists the route)
// Body: { name?, start: {lng, lat}, end: {lng, lat}, transport_mode?, start_date? }
// ---------------------------------------------------------------------------
router.post('/', authenticateToken, async (req, res, next) => {
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

    // Get user's active character
    const userRes = await pool.query(
      'SELECT active_character_id FROM users WHERE id = $1',
      [req.userId]
    );
    const characterId = userRes.rows[0]?.active_character_id;

    const { rows } = await pool.query(
      `INSERT INTO trips
         (name, start_lng, start_lat, end_lng, end_lat, transport_mode, start_date,
          route, total_distance_km, total_time_hours, character_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [
        name || null,
        startLng, startLat, endLng, endLat,
        transport_mode,
        startDate,
        JSON.stringify(route),
        route.summary?.total_distance_km ?? null,
        route.summary?.total_time_hours ?? null,
        characterId ? parseInt(characterId, 10) : null,
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
router.get('/:id', authenticateToken, async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT * FROM trips WHERE id = $1', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Trip not found' });
    const trip = rows[0];

    // Activate the trip's character exclusively
    if (trip.character_id) {
      await pool.query('BEGIN');
      // Deactivate all characters
      await pool.query('UPDATE character_state SET active = false');
      // Activate the trip's character
      await pool.query(
        'UPDATE character_state SET active = true WHERE id = $1',
        [trip.character_id]
      );
      // Update user's active character
      await pool.query(
        'UPDATE users SET active_character_id = $1 WHERE id = $2',
        [trip.character_id, req.userId]
      );
      await pool.query('COMMIT');
    }

    res.json(trip);
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
// PATCH /api/trips/:id/route-completed - Update route_completed with day's geometry
// Body: { day_geometry }
// ---------------------------------------------------------------------------
router.patch('/:id/route-completed', async (req, res, next) => {
  try {
    const { day_geometry } = req.body || {};

    if (!day_geometry) {
      return res.status(400).json({ error: 'day_geometry is required' });
    }

    // Get current trip
    const tripRes = await pool.query('SELECT route_completed FROM trips WHERE id = $1', [req.params.id]);
    if (tripRes.rows.length === 0) return res.status(404).json({ error: 'Trip not found' });
    const trip = tripRes.rows[0];

    // Parse day geometry
    let dayCoords;
    if (typeof day_geometry === 'string') {
      try {
        dayCoords = JSON.parse(day_geometry);
      } catch (e) {
        return res.status(400).json({ error: 'Invalid day_geometry format' });
      }
    } else {
      dayCoords = day_geometry;
    }

    if (!dayCoords.coordinates || !Array.isArray(dayCoords.coordinates)) {
      return res.status(400).json({ error: 'day_geometry must have coordinates array' });
    }

    // Initialize or append to route_completed
    let completedCoords = [];
    if (trip.route_completed) {
      try {
        const completed = typeof trip.route_completed === 'string' 
          ? JSON.parse(trip.route_completed) 
          : trip.route_completed;
        completedCoords = completed.coordinates || [];
      } catch (e) {
        console.warn('Failed to parse existing route_completed, starting fresh');
      }
    }

    // Append new coordinates (avoid duplicates at the junction)
    const lastCoord = completedCoords.length > 0 ? completedCoords[completedCoords.length - 1] : null;
    const firstNewCoord = dayCoords.coordinates[0];

    // Only add first coord if it's different from the last one
    if (!lastCoord || lastCoord[0] !== firstNewCoord[0] || lastCoord[1] !== firstNewCoord[1]) {
      completedCoords.push(...dayCoords.coordinates);
    } else {
      // Skip the first coord to avoid duplicate, add the rest
      completedCoords.push(...dayCoords.coordinates.slice(1));
    }

    // Create GeoJSON LineString
    const routeCompleted = {
      type: 'LineString',
      coordinates: completedCoords
    };

    // Update trip
    const updateRes = await pool.query(
      'UPDATE trips SET route_completed = $1 WHERE id = $2 RETURNING route_completed',
      [JSON.stringify(routeCompleted), req.params.id]
    );

    res.json(updateRes.rows[0]);
  } catch (error) {
    next(error);
  }
});

// ---------------------------------------------------------------------------
// POST /api/trips/:id/days - Generate (and persist) the next day, or a given
// day_number. Body (optional): { day_number, seed }
// ---------------------------------------------------------------------------
router.post('/:id/days', authenticateToken, async (req, res, next) => {
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

    // Load the trip's character (bio + linked entity name + custom prompts) for the prompt
    const charRes = await pool.query(
      `SELECT c.id, c.name, c.slug, c.description, c.gender, c.system_prompt, c.introduction_instructions,
              c.resistance, c.permadeath, c.energy, c.shadow, e.name AS entity_name
       FROM character_state c
       LEFT JOIN entities e ON e.id = c.entity_id
       WHERE c.id = $1`,
      [trip.character_id]
    );
    const character = charRes.rows[0] || {};

    // Journey persistence: read the clone's current energy/shadow at the start
    // of the day. Shadow biases today's encounter spawn (the loop).
    const startState = trip.character_id ? await loadCharacterState(trip.character_id) : null;
    const openingShadow = startState ? startState.shadow : 0;
    const openingEnergy = startState ? startState.energy : 100;
    const dayShadowFactor = shadowSpawnFactor(openingShadow);

    // Load already encountered entities for this trip
    const encounteredEntities = trip.encountered_entities || [];

    // Load already used thoughts for this trip
    const usedThoughtIds = trip.used_thought_ids || [];

    // Gather forms/stances from the previous 2–3 chapters for anti-repetition
    const recentHistoryRes = await pool.query(
      `SELECT encounters FROM trip_days
       WHERE trip_id = $1 AND day_number < $2
       ORDER BY day_number DESC
       LIMIT 3`,
      [trip.id, dayNumber]
    );
    const recentForms = [];
    const recentStances = [];
    for (const row of recentHistoryRes.rows) {
      const encs = Array.isArray(row.encounters) ? row.encounters : [];
      for (const e of encs) {
        if (e.interaction?.form) recentForms.push(e.interaction.form);
        if (e.interaction?.stance?.stance) recentStances.push(e.interaction.stance.stance);
      }
    }

    const day = await generateDay({ 
      trip, 
      dayNumber, 
      rng, 
      excludedEntityIds: encounteredEntities,
      characterId: character.id || null,
      usedThoughtIds,
      character,
      recentForms,
      recentStances,
      shadowFactor: dayShadowFactor,
    });
    if (!day) {
      return res.status(409).json({ error: 'Trip is already complete; no more days to generate' });
    }

    // --- Journey persistence: compute the day's energy/shadow deltas ---
    // (recovery from the resolved night + today's costs; shadow from the
    //  night's shadow_effect + each encounter's shadow_weight + region family)
    let conditionBlock = '';
    let newEnergy = openingEnergy;
    let newShadow = openingShadow;
    let restedWell = false;
    if (trip.character_id) {
      const encounters = day.encounters || [];
      const nightEncounters = encounters.filter((e) => e.phase === 'night');
      const restQuality = day.overnight_interaction?.rest_quality ?? null;
      const shadowEffect = day.overnight_interaction?.shadow_effect ?? 0;
      const families = (day.regions || []).map((r) => r.cultural_family);
      const { throughEnemy } = classifyRegionFamilies(families);
      const quietDay = encounters.length === 0;

      const { delta: energyDelta } = computeEnergyDelta({
        distanceKm: day.distance_km,
        encounters,
        restQuality,
        harshWeatherAllDay: isHarshWeatherAllDay(day.climate),
        quietNight: isQuietNight(nightEncounters, day.nighttime_climate),
      });
      const { delta: shadowDelta } = computeShadowDelta({
        shadowEffect,
        encounters,
        throughEnemyRegion: throughEnemy,
        quietFriendlyDay: quietDay && !throughEnemy,
      });

      newEnergy = clamp(openingEnergy + energyDelta);
      newShadow = clamp(openingShadow + shadowDelta);
      restedWell = restQuality != null && restQuality >= TUNING.REST_TRACK_MIN;

      const note = buildDayNote(day, day.overnight_interaction);
      await applyDayState({
        characterId: trip.character_id,
        tripId: trip.id,
        dayNumber: day.day_number,
        energy: newEnergy,
        shadow: newShadow,
        note,
        restedWell,
      });

      // Build the TRAVELLER'S CONDITION block from the NEW values + causal
      // phrases pulled from the last few log notes (cross-day memory).
      const priorNotes = await recentNotes(trip.character_id, trip.id, 3);
      conditionBlock = buildConditionBlock({
        characterName: character.name || 'The traveller',
        energy: newEnergy,
        shadow: newShadow,
        recentNotes: priorNotes,
      });
    }

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

    const prompt = buildDayPrompt(day, trip, character, language || 'english', previousDaySummary, conditionBlock);

    // Generate AI narrative (optional, if API key is configured)
    const narrative = await generateNarrative(prompt);

    // Persist only the user prompt text (system prompt lives in code)
    const promptText = prompt.user;

    const insertRes = await pool.query(
      `INSERT INTO trip_days
         (trip_id, day_number, date, start_lng, start_lat, end_lng, end_lat,
          distance_km, walking_hours, geometry, regions, terrain_phrases, biomes, altitude,
          road_types, locations, climate, encounters, thoughts, prompt, narrative, is_last_day,
          overnight_location, elevation_profile, places_interaction_id, rest_quality, shadow_effect)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27)
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
        day.terrain_phrases ? JSON.stringify(day.terrain_phrases) : null,
        JSON.stringify(day.biomes),
        JSON.stringify(day.altitude),
        JSON.stringify(day.road_types),
        JSON.stringify(day.locations),
        day.climate ? JSON.stringify(day.climate) : null,
        JSON.stringify(day.encounters),
        day.thoughts ? JSON.stringify(day.thoughts) : null,
        promptText,
        narrative,
        day.is_last_day || false,
        day.overnight_location ? JSON.stringify(day.overnight_location) : null,
        day.elevation_profile ? JSON.stringify(day.elevation_profile) : null,
        day.overnight_interaction?.id ?? null,
        null,
        null,
      ]
    );

    // Advance the trip's current_day if we generated the next sequential day
    if (dayNumber > trip.current_day) {
      await pool.query('UPDATE trips SET current_day = $1 WHERE id = $2', [dayNumber, trip.id]);
    }

    // Permadeath: if any encounter resulted in 'slain' and the character has permadeath enabled
    const wasSlain = day.encounters.some((e) => e.interaction?.outcome === 'slain');
    if (wasSlain && character.permadeath) {
      await pool.query("UPDATE trips SET status = 'dead' WHERE id = $1", [trip.id]);
    }

    // Update encountered entities array with new entities from this day
    const newEntityIds = day.encounters
      .map(e => e.entity?.id)
      .filter(id => id); // filter out null/undefined
    const updatedEncounteredEntities = [...new Set([...encounteredEntities, ...newEntityIds])]; // deduplicate
    
    // Update used thoughts array with new thoughts from this day
    const newThoughtIds = day.thoughts?.options?.map(t => t.thought_id).filter(id => id) || [];
    const updatedUsedThoughtIds = [...new Set([...usedThoughtIds, ...newThoughtIds])]; // deduplicate
    
    await pool.query(
      'UPDATE trips SET encountered_entities = $1, used_thought_ids = $2 WHERE id = $3',
      [updatedEncounteredEntities, updatedUsedThoughtIds, trip.id]
    );

    const tripStatus = wasSlain && character.permadeath ? 'dead' : 'active';
    res.status(201).json({ ...insertRes.rows[0], trip_status: tripStatus });
  } catch (error) {
    next(error);
  }
});

export default router;
