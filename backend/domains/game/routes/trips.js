import express from 'express';
import pool from '../../../db.js';
import { generateDay } from '../services/world/tripDay.js';
import { createSeededRng } from '../services/world/encounters.js';
import {
  computeRoute,
  climateStats,
} from '../adapters/mapClient.js';
import {
  SYSTEM_PROMPT,
  buildTravellerBlocks,
  loadNarratorCharacter,
  loadRecentEncounterForms,
  narrateDay,
  notableItemsOf,
} from '../adapters/storyClient.js';
import { authenticateToken } from '../../../middleware/auth.js';
import {
  loadCharacterState,
  applyDayState,
  resolveFate,
  TUNING,
  resolveDayState,
  shadowSpawnFactor,
  shadowBand,
} from '../services/character/index.js';
import {
  loadInventory,
  aggregateEffects,
  applyInventoryChanges,
  provisionForTrip,
} from '../services/character/inventory.js';

const router = express.Router();

// ---------------------------------------------------------------------------
// GET /api/trips/meta/system-prompt - Expose the current narrator system prompt
// so the frontend System tab can show it "from code" without duplicating it.
// ---------------------------------------------------------------------------
router.get('/meta/system-prompt', (req, res) => {
  res.json({ system_prompt: SYSTEM_PROMPT });
});

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

    // Provision consumables if the trip starts near a settlement (indoor rest type).
    if (characterId) {
      const { rows: startLocRows } = await pool.query(
        `SELECT l.location_type FROM locations l
         WHERE ST_DWithin(l.geom, ST_SetSRID(ST_MakePoint($1, $2), 4326), 0.05)
         ORDER BY ST_Distance(l.geom, ST_SetSRID(ST_MakePoint($1, $2), 4326)) ASC
         LIMIT 1`,
        [startLng, startLat]
      );
      const startType = startLocRows[0]?.location_type;
      const INDOOR_REST_TYPES = ['town', 'city', 'village', 'inn', 'tavern', 'fortified city', 'fortified town', 'citadel'];
      if (startType && INDOOR_REST_TYPES.includes(startType)) {
        await provisionForTrip(parseInt(characterId, 10));
      }
    }

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

    if (trip.status === 'dead' || trip.status === 'completed') {
      return res.status(409).json({ error: `Trip is ${trip.status}; no more days to generate` });
    }

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
    const character = await loadNarratorCharacter(trip.character_id);

    // Journey persistence: read the clone's current energy/shadow at the start
    // of the day. Shadow biases today's encounter spawn (the loop).
    const startState = trip.character_id ? await loadCharacterState(trip.character_id) : null;
    const openingShadow = startState ? startState.shadow : 0;
    const openingEnergy = startState ? startState.energy : 100;
    const dayShadowFactor = shadowSpawnFactor(openingShadow);
    const sBand = shadowBand(openingShadow);

    // Load already encountered entities for this trip
    const encounteredEntities = trip.encountered_entities || [];

    // Load already used thoughts for this trip
    const usedThoughtIds = trip.used_thought_ids || [];

    // Load consumed region-description indices for this trip
    const usedRegionDescriptions = trip.used_region_descriptions || {};

    // Gather forms from the previous 2–3 chapters for anti-repetition
    const recentForms = await loadRecentEncounterForms(trip.id, dayNumber);

    const day = await generateDay({
      trip,
      dayNumber,
      rng,
      excludedEntityIds: encounteredEntities,
      characterId: character.id || null,
      usedThoughtIds,
      usedRegionDescriptions,
      character,
      recentForms,
      shadowFactor: dayShadowFactor,
      shadowBand: sBand,
      characterSlug: character.slug || null,
    });
    if (!day) {
      return res.status(409).json({ error: 'Trip is already complete; no more days to generate' });
    }

    const END_CAUSE_MAP = {
      slain: 'slain',
      dead_exhaustion: 'exhaustion',
      dead_shadow: 'shadow',
    };

    // --- Journey persistence: compute the day's energy/shadow deltas ---
    // (recovery from the resolved night + today's costs; shadow from the
    //  night's shadow_effect + each encounter's shadow_weight + region family)
    let conditionBlock = '';
    let endStateBlock = '';
    let equipmentBlock = '';
    let newEnergy = openingEnergy;
    let newShadow = openingShadow;
    let fate = { fate: 'living', status: 'active', halted: false };
    let dayEvents = [];
    let meals = [];

    if (trip.character_id) {
      const inventoryRows = await loadInventory(trip.character_id);
      const effects = aggregateEffects(inventoryRows);

      const resolution = resolveDayState({
        day,
        startState,
        effects,
        inventoryRows,
      });

      newEnergy = resolution.newEnergy;
      newShadow = resolution.newShadow;
      fate = resolution.fate;
      dayEvents = resolution.dayEvents;
      meals = resolution.meals || [];

      // Persist state and inventory changes.
      await applyDayState({
        characterId: trip.character_id,
        tripId: trip.id,
        dayNumber: day.day_number,
        energy: newEnergy,
        shadow: newShadow,
        note: resolution.note,
        fate: fate.fate === 'living' ? null : fate.fate,
        restedWell: resolution.restedWell,
        fatigue: resolution.conditions?.fatigue,
        wounded: resolution.conditions?.wounded,
      });
      await applyInventoryChanges({
        characterId: trip.character_id,
        consumedRation: resolution.food.consumed,
        foodItemIds: resolution.food.itemIds,
        waterAfter: resolution.water.waterAfter,
        containerRowId: effects.containerRowId,
        coinsAfter: resolution.lodging.coinsAfter,
        daysWithoutFood: resolution.food.newDaysWithoutFood,
        daysWithoutWater: resolution.water.newDaysWithoutWater,
      });

      if (fate.halted) {
        const endCause = END_CAUSE_MAP[fate.fate] || null;
        await pool.query(
          "UPDATE trips SET status = 'dead', end_cause = $1, ended_at = NOW() WHERE id = $2",
          [endCause, trip.id]
        );
      }

      ({ conditionBlock, equipmentBlock, endStateBlock } = await buildTravellerBlocks({
        characterId: trip.character_id,
        tripId: trip.id,
        characterName: character.name,
        energy: newEnergy,
        shadow: newShadow,
        wounded: resolution.conditions?.wounded,
        fate: fate.fate,
        meanTemperature: resolution.meanTemperature,
        coldShift: effects.coldShift,
        rations: effects.rations,
        daysWithoutFood: resolution.food.newDaysWithoutFood,
        daysWithoutWater: resolution.water.newDaysWithoutWater,
        waterHeld: resolution.water.waterAfter,
        waterCapacity: effects.waterCapacity,
        flaskFrozen: resolution.flaskFrozen,
        coins: resolution.lodging.coinsAfter,
        turnedAway: resolution.lodging.turnedAway,
        notableItems: resolution.notableItems,
      }));
    }

    // The narrator needs to know what was eaten and drunk at each meal.
    day.meals = meals;

    // Generate AI narrative (optional, if API key is configured). Provider and
    // sampling params rotate per day; capture what was actually used.
    const { prompt, generation } = await narrateDay({
      day,
      trip,
      character,
      language: language || 'english',
      conditionBlock,
      equipmentBlock,
      endStateBlock,
    });
    const narrative = generation.text;

    // Persist only the user prompt text (system prompt lives in code)
    const promptText = prompt.user;

    const insertRes = await pool.query(
      `INSERT INTO trip_days
         (trip_id, day_number, date, start_lng, start_lat, end_lng, end_lat,
          distance_km, walking_hours, geometry, regions, terrain_phrases, biomes, altitude,
          road_types, locations, climate, encounters, thoughts, prompt, narrative, is_last_day,
          overnight_location, elevation_profile, places_interaction_id, rest_quality, shadow_effect,
          energy_start, energy_end, shadow_start, shadow_end,
          ia_provider, temperature, frequency_penalty, presence_penalty, top_p, meals)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37)
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
        day.overnight_interaction?.rest_quality ?? null,
        day.overnight_interaction?.shadow_effect ?? null,
        openingEnergy,
        newEnergy,
        openingShadow,
        newShadow,
        generation.ia_provider,
        generation.temperature,
        generation.frequency_penalty,
        generation.presence_penalty,
        generation.top_p,
        JSON.stringify(meals),
      ]
    );

    // Advance the trip's current_day if we generated the next sequential day
    if (dayNumber > trip.current_day) {
      await pool.query('UPDATE trips SET current_day = $1 WHERE id = $2', [dayNumber, trip.id]);
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
      'UPDATE trips SET encountered_entities = $1, used_thought_ids = $2, used_region_descriptions = $3 WHERE id = $4',
      [updatedEncounteredEntities, updatedUsedThoughtIds, usedRegionDescriptions, trip.id]
    );

    const endCause = END_CAUSE_MAP[fate.fate] || null;
    const tripStatus = fate.status === 'dead' ? 'dead' : trip.status;
    res.status(201).json({
      ...insertRes.rows[0],
      trip_status: tripStatus,
      character_status: fate.status,
      end_cause: endCause,
      day_events: dayEvents,
    });
  } catch (error) {
    next(error);
  }
});

// ---------------------------------------------------------------------------
// POST /api/trips/:id/days/:dayNumber/redo-narration - Rebuild the prompt from
// the existing day data and re-generate the narrative with the LLM.  Encounters,
// climate, terrain and character state are NOT changed — only prompt + narrative
// + AI sampling metadata are updated.
// ---------------------------------------------------------------------------
router.post('/:id/days/:dayNumber/redo-narration', authenticateToken, async (req, res, next) => {
  try {
    const dayNumber = parseInt(req.params.dayNumber, 10);
    if (!Number.isInteger(dayNumber) || dayNumber < 1) {
      return res.status(400).json({ error: 'dayNumber must be a positive integer' });
    }

    const tripRes = await pool.query('SELECT * FROM trips WHERE id = $1', [req.params.id]);
    if (tripRes.rows.length === 0) return res.status(404).json({ error: 'Trip not found' });
    const trip = tripRes.rows[0];

    const dayRes = await pool.query(
      'SELECT * FROM trip_days WHERE trip_id = $1 AND day_number = $2',
      [trip.id, dayNumber]
    );
    if (dayRes.rows.length === 0) {
      return res.status(404).json({ error: `Day ${dayNumber} not found for this trip` });
    }
    const existingDay = dayRes.rows[0];

    const character = await loadNarratorCharacter(trip.character_id);

    let conditionBlock = '';
    let endStateBlock = '';
    let equipmentBlock = '';
    if (trip.character_id) {
      const startState = await loadCharacterState(trip.character_id);
      const energyEnd = existingDay.energy_end != null ? existingDay.energy_end : (startState ? startState.energy : 100);
      const shadowEnd = existingDay.shadow_end != null ? existingDay.shadow_end : (startState ? startState.shadow : 0);

      const inventoryRows = await loadInventory(trip.character_id);
      const effects = aggregateEffects(inventoryRows);
      const { meanTemperature } = climateStats(existingDay.climate);

      const encounterOutcomes = [];
      for (const e of (existingDay.encounters || [])) {
        const outcome = e.interaction?.outcome;
        if (outcome && WOUND_COSTS[outcome]) encounterOutcomes.push(outcome);
      }
      const fate = resolveFate({ energy: energyEnd, shadow: shadowEnd, encounterOutcomes });

      ({ conditionBlock, equipmentBlock, endStateBlock } = await buildTravellerBlocks({
        characterId: trip.character_id,
        tripId: trip.id,
        characterName: character.name,
        energy: energyEnd,
        shadow: shadowEnd,
        wounded: startState?.wounded ?? 'none',
        fate: fate.fate,
        meanTemperature,
        coldShift: effects.coldShift,
        rations: effects.rations,
        daysWithoutFood: startState?.days_without_food ?? 0,
        coins: startState?.coins ?? TUNING.STARTING_COINS,
        turnedAway: existingDay.overnight_interaction?.turned_away ?? false,
        notableItems: notableItemsOf(inventoryRows),
      }));
    }

    // Reconstruct the day object that buildDayPrompt expects
    const day = {
      day_number: existingDay.day_number,
      date: existingDay.date,
      distance_km: existingDay.distance_km,
      geometry: existingDay.geometry,
      regions: existingDay.regions || [],
      terrain_phrases: existingDay.terrain_phrases || {},
      biomes: existingDay.biomes || [],
      altitude: existingDay.altitude || [],
      road_types: existingDay.road_types || {},
      locations: existingDay.locations || [],
      climate: existingDay.climate || [],
      encounters: existingDay.encounters || [],
      thoughts: existingDay.thoughts || null,
      overnight_location: existingDay.overnight_location || null,
      elevation_profile: existingDay.elevation_profile || null,
      is_last_day: existingDay.is_last_day || false,
      meals: existingDay.meals || [],
      // These fields are used by buildDayPrompt for variety selection;
      // use a stable rng so the prompt structure doesn't shift on redo.
      rng: Math.random,
    };

    const { prompt, generation } = await narrateDay({
      day,
      trip,
      character,
      language: req.body?.language || 'english',
      conditionBlock,
      equipmentBlock,
      endStateBlock,
    });

    const updateRes = await pool.query(
      `UPDATE trip_days
       SET prompt = $1, narrative = $2,
           ia_provider = $3, temperature = $4, frequency_penalty = $5,
           presence_penalty = $6, top_p = $7
       WHERE trip_id = $8 AND day_number = $9
       RETURNING *`,
      [
        prompt.user,
        generation.text,
        generation.ia_provider,
        generation.temperature,
        generation.frequency_penalty,
        generation.presence_penalty,
        generation.top_p,
        trip.id,
        dayNumber,
      ]
    );

    res.json(updateRes.rows[0]);
  } catch (error) {
    next(error);
  }
});

export default router;
