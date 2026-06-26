import pool from '../db.js';
import {
  simulatePhaseEncounters,
  PHASE_MORNING,
  PHASE_AFTERNOON,
  PHASE_NIGHT,
} from './encounters.js';
import {
  flattenRoute,
  totalSeconds,
  positionAtSeconds,
  sliceLeg,
} from './tripGeometry.js';
import {
  rollThoughtChance,
  determineThoughtTypeFromEncounters,
  getThoughtsForCharacter,
  selectRandomPhase,
} from './thoughts.js';

// ============================================================================
// Trip Day generator
// ----------------------------------------------------------------------------
// Assembles a rich object for a single day of a trip: the leg walked, regions
// crossed, biomes, elevation, road types, locations passed, climate, and the
// day + night encounters.
// ============================================================================

export const WALK_START_HOUR = 7;
export const WALK_END_HOUR = 19;
export const WALKING_HOURS = WALK_END_HOUR - WALK_START_HOUR; // 12
export const NIGHT_HOURS = 24 - WALKING_HOURS; // 12
export const SECONDS_PER_HOUR = 3600;

// Phase boundaries for the new encounter system
export const MORNING_END_HOUR = 13; // 07:00 - 13:00 (6 hours)
export const AFTERNOON_END_HOUR = 19; // 13:00 - 19:00 (6 hours)
export const MORNING_HOURS = MORNING_END_HOUR - WALK_START_HOUR; // 6
export const AFTERNOON_HOURS = AFTERNOON_END_HOUR - MORNING_END_HOUR; // 6

// ---------------------------------------------------------------------------
// DB helpers
// ---------------------------------------------------------------------------

/** Region containing a point, or null. */
async function regionAtPoint(lng, lat) {
  const { rows } = await pool.query(
    `SELECT name, description_summary
     FROM regions
     WHERE ST_Contains(geom, ST_SetSRID(ST_MakePoint($1, $2), 4326))
     LIMIT 1`,
    [lng, lat]
  );
  return rows[0] || null;
}

/** Resolve the region for many points in a single query (preserves order). */
async function regionsForPoints(points) {
  if (points.length === 0) return [];
  const json = JSON.stringify(points);
  const { rows } = await pool.query(
    `SELECT t.idx,
            r.name,
            r.description_summary
     FROM jsonb_array_elements($1::jsonb) WITH ORDINALITY AS t(elem, idx)
     LEFT JOIN LATERAL (
       SELECT name, description_summary
       FROM regions
       WHERE ST_Contains(geom, ST_SetSRID(ST_MakePoint((elem->>0)::float, (elem->>1)::float), 4326))
       LIMIT 1
     ) r ON true
     ORDER BY t.idx`,
    [json]
  );
  return rows.map((row) => (row.name ? {
    name: row.name,
    description_summary: row.description_summary,
  } : null));
}

/** Entities whose probability_by_region includes the given region name. */
async function entitiesForRegion(regionName) {
  const { rows } = await pool.query(
    `SELECT id, name, slug, type, active, danger, description, description_summary, url_path,
            biomes, probability_by_region
     FROM entities
     WHERE EXISTS (
       SELECT 1 FROM jsonb_array_elements(probability_by_region) e
       WHERE e->>'region' = $1
     )`,
    [regionName]
  );
  return rows;
}

/** Location types that qualify as overnight shelter. */
const OVERNIGHT_LOCATION_TYPES = [
  'town', 'city', 'village', 'settlement', 'inn', 'tavern',
  'fortress', 'fortified city', 'fortified town', 'citadel', 'castle',
  'keep', 'manor', 'camp',
];

/** Tavern/inn types where the character can sleep indoors. */
const INDOOR_REST_TYPES = ['town', 'city', 'village', 'inn', 'tavern', 'fortified city', 'fortified town', 'citadel'];

/**
 * Find the nearest notable location within 10 km of the day's end point.
 * Returns null if none found.
 */
async function findOvernightLocation(endLng, endLat) {
  const typeList = OVERNIGHT_LOCATION_TYPES.map((_, i) => `$${i + 3}`).join(', ');
  const { rows } = await pool.query(
    `SELECT name, location_type AS type, region, description,
            round((ST_Distance(geom::geography, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography) / 1000)::numeric, 2) AS distance_km
     FROM locations
     WHERE location_type = ANY($3::text[])
       AND ST_DWithin(geom::geography, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography, 10000)
     ORDER BY ST_Distance(geom::geography, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography)
     LIMIT 1`,
    [endLng, endLat, OVERNIGHT_LOCATION_TYPES]
  );
  return rows[0] || null;
}

/**
 * Sample real DEM elevation at 3 points in the day (dawn, midday, dusk).
 * Returns null if DEM is not available.
 */
async function sampleElevationProfile(segments, dayStartSeconds, dayEndSeconds) {
  const midSeconds = dayStartSeconds + (dayEndSeconds - dayStartSeconds) / 2;

  const ptDawn = positionAtSeconds(segments, dayStartSeconds);
  const ptMid = positionAtSeconds(segments, midSeconds);
  const ptDusk = positionAtSeconds(segments, dayEndSeconds);

  try {
    const [r0, r1, r2] = await Promise.all([
      pool.query('SELECT get_elevation_at_point($1, $2) AS elev', [ptDawn[0], ptDawn[1]]),
      pool.query('SELECT get_elevation_at_point($1, $2) AS elev', [ptMid[0], ptMid[1]]),
      pool.query('SELECT get_elevation_at_point($1, $2) AS elev', [ptDusk[0], ptDusk[1]]),
    ]);

    const e0 = parseFloat(r0.rows[0]?.elev) || 0;
    const e1 = parseFloat(r1.rows[0]?.elev) || 0;
    const e2 = parseFloat(r2.rows[0]?.elev) || 0;

    const totalGain = Math.max(0, e1 - e0) + Math.max(0, e2 - e1);
    const totalLoss = Math.max(0, e0 - e1) + Math.max(0, e1 - e2);
    const significant = totalGain > 150 || totalLoss > 150;

    return { dawn_m: Math.round(e0), midday_m: Math.round(e1), dusk_m: Math.round(e2), total_gain_m: Math.round(totalGain), total_loss_m: Math.round(totalLoss), significant };
  } catch {
    return null;
  }
}

/** Sample geographic context (biomes, altitude, locations) along a leg LineString.
 *  Locations are gathered within 10 km of the leg, each tagged with the fraction
 *  (0..1) of the leg at which it is nearest, so the caller can derive a passing time. */
async function sampleLegContext(legGeoJSON) {
  const geojson = JSON.stringify(legGeoJSON);
  const { rows } = await pool.query(
    `WITH leg AS (
       SELECT ST_SetSRID(ST_GeomFromGeoJSON($1), 4326) AS geom
     )
     SELECT
       (SELECT COALESCE(json_agg(DISTINCT b.type), '[]'::json)
        FROM biomes b, leg WHERE ST_Intersects(b.geom, leg.geom)) AS biomes,
       (SELECT COALESCE(json_agg(DISTINCT a.altitude_type), '[]'::json)
        FROM altitude_layers a, leg WHERE ST_Intersects(a.geom, leg.geom)) AS altitude,
       (SELECT COALESCE(json_agg(json_build_object(
          'name', l.name,
          'type', l.location_type,
          'region', l.region,
          'description', l.description,
          'fraction', ST_LineLocatePoint(leg.geom, ST_ClosestPoint(leg.geom, l.geom)),
          'distance_km', round((ST_Distance(l.geom::geography, leg.geom::geography) / 1000)::numeric, 2)
        ) ORDER BY ST_LineLocatePoint(leg.geom, ST_ClosestPoint(leg.geom, l.geom))), '[]'::json)
        FROM locations l, leg
        WHERE ST_DWithin(l.geom::geography, leg.geom::geography, 10000)) AS locations,
       (SELECT COALESCE(json_agg(json_build_object(
          'name', w.name,
          'type', w.water_type,
          'fraction', ST_LineLocatePoint(
            leg.geom,
            ST_ClosestPoint(leg.geom, ST_Centroid(ST_Intersection(leg.geom, w.geom)))
          )
        ) ORDER BY ST_LineLocatePoint(
            leg.geom,
            ST_ClosestPoint(leg.geom, ST_Centroid(ST_Intersection(leg.geom, w.geom)))
        )), '[]'::json)
        FROM water w, leg
        WHERE w.water_type IN ('river', 'stream')
          AND ST_Intersects(w.geom, leg.geom)) AS water_crossings`,
    [geojson]
  );
  return rows[0];
}

/** Climate at a point/timestamp using the PostGIS transition function. */
async function climateAtPoint(lng, lat, timestamp) {
  try {
    const { rows } = await pool.query(
      `SELECT get_climate_at_point_with_transition($1, $2, $3) AS result`,
      [lng, lat, timestamp]
    );
    const result = rows[0] && rows[0].result;
    if (!result || result.error) return null;
    return result;
  } catch (e) {
    return null;
  }
}

/** Sample climate at multiple hours along a leg. */
async function sampleHourlyClimate(segments, dayStartSeconds, dayEndSeconds, dateISO) {
  const hours = [0, 3, 6, 9, 12, 15, 18, 21];
  const climateData = [];
  
  const legDuration = dayEndSeconds - dayStartSeconds;
  const [, month, day] = dateISO.split('-');
  
  for (const hour of hours) {
    // Interpolate position along the leg for this hour
    const hourFraction = hour / 24; // fraction of the day
    const elapsedSeconds = dayStartSeconds + (hourFraction * legDuration);
    const point = positionAtSeconds(segments, elapsedSeconds);
    
    const timestamp = `1950-${month}-${day} ${hour.toString().padStart(2, '0')}:00:00`;
    const climate = await climateAtPoint(point[0], point[1], timestamp);
    
    climateData.push({
      time: timestamp,
      climate: climate || null
    });
  }
  
  return climateData;
}

// ---------------------------------------------------------------------------
// Date helpers
// ---------------------------------------------------------------------------

function addDaysISO(startDateISO, days) {
  const d = new Date(startDateISO);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}

function noonTimestamp1950(dateISO) {
  // dateISO is YYYY-MM-DD; map to 1950 noon for the climate dataset
  const [, month, day] = dateISO.split('-');
  return `1950-${month}-${day} 12:00:00`;
}

// ---------------------------------------------------------------------------
// Encounter region resolver builders
// ---------------------------------------------------------------------------

/**
 * Build a getRegionInfo(elapsed) function for a walking phase: maps elapsed
 * walking hours to a position along the leg, resolves region + entities.
 * Regions and entities are precomputed/cached for the sampled time steps.
 */
async function buildWalkingPhaseResolver(segments, dayStartSeconds, phaseHours, timeStep) {
  const steps = [];
  for (let elapsed = timeStep; elapsed <= phaseHours + 1e-9; elapsed += timeStep) {
    steps.push(Number(elapsed.toFixed(6)));
  }

  const points = steps.map((elapsed) =>
    positionAtSeconds(segments, dayStartSeconds + elapsed * SECONDS_PER_HOUR)
  );

  const regions = await regionsForPoints(points);

  // Attach entities (cached per region name)
  const entityCache = new Map();
  for (const region of regions) {
    if (region && !entityCache.has(region.name)) {
      entityCache.set(region.name, await entitiesForRegion(region.name));
    }
  }

  const byStep = new Map();
  steps.forEach((elapsed, i) => {
    const region = regions[i];
    if (region) {
      byStep.set(elapsed, { ...region, entities: entityCache.get(region.name) || [] });
    } else {
      byStep.set(elapsed, null);
    }
  });

  return (elapsed) => byStep.get(Number(elapsed.toFixed(6))) || null;
}

/**
 * Build a getRegionInfo function for the NIGHT phase: the company is camped at
 * a fixed position, so the region/entities are constant.
 */
async function buildNightRegionResolver(campPoint) {
  const region = await regionAtPoint(campPoint[0], campPoint[1]);
  if (!region) return () => null;
  const entities = await entitiesForRegion(region.name);
  const info = { ...region, entities };
  return () => info;
}

// ---------------------------------------------------------------------------
// Main generator
// ---------------------------------------------------------------------------

/**
 * Generate a single day's object for a trip.
 *
 * @param {Object} params
 * @param {Object} params.trip - trip row ({ route, start_date, ... })
 * @param {number} params.dayNumber - 1-based day index
 * @param {() => number} [params.rng] - RNG (defaults to Math.random)
 * @param {Array<string>} [params.excludedEntityIds] - entity IDs to exclude from encounters
 * @param {number} [params.characterId] - character ID for thought selection
 * @param {Array<number>} [params.usedThoughtIds] - thought IDs already used in this trip
 * @returns {Promise<Object|null>} the day object, or null if the trip is complete
 */
export async function generateDay({ trip, dayNumber, rng = Math.random, excludedEntityIds = [], characterId = null, usedThoughtIds = [] }) {
  const route = typeof trip.route === 'string' ? JSON.parse(trip.route) : trip.route;
  const segments = flattenRoute(route);
  const routeSeconds = totalSeconds(segments);

  const dayStartSeconds = (dayNumber - 1) * WALKING_HOURS * SECONDS_PER_HOUR;
  if (dayStartSeconds >= routeSeconds - 1e-6) {
    return null; // trip already complete
  }
  const dayEndSeconds = Math.min(dayNumber * WALKING_HOURS * SECONDS_PER_HOUR, routeSeconds);

  const leg = sliceLeg(segments, dayStartSeconds, dayEndSeconds);
  const walkingHoursThisDay = leg.seconds / SECONDS_PER_HOUR;

  // Leg geometry (need >= 2 points for PostGIS LineString)
  const legCoords = leg.coordinates.length >= 2
    ? leg.coordinates
    : [leg.start, leg.end];
  const legGeoJSON = { type: 'LineString', coordinates: legCoords };

  const startDate = typeof trip.start_date === 'string'
    ? trip.start_date.slice(0, 10)
    : new Date(trip.start_date).toISOString().slice(0, 10);
  const date = addDaysISO(startDate, dayNumber - 1);

  // --- Geographic sampling ---
  const context = await sampleLegContext(legGeoJSON);

  // Ordered unique regions crossed during the walking phase (with description_summary)
  const timeStep = 0.5; // Fixed time step for region sampling
  const walkingResolver = await buildWalkingPhaseResolver(segments, dayStartSeconds, walkingHoursThisDay, timeStep);
  const orderedRegions = [];
  const seenRegions = new Set(); // Track seen regions to avoid duplicates

  for (let elapsed = timeStep; elapsed <= walkingHoursThisDay + 1e-9; elapsed += timeStep) {
    const info = walkingResolver(Number(elapsed.toFixed(6)));
    const name = info ? info.name : null;

    // Only add if we haven't seen this region before
    if (name && !seenRegions.has(name)) {
      seenRegions.add(name);
      orderedRegions.push({ name, description_summary: info.description_summary || null });
    }
  }

  // --- Climate (sampled hourly along the leg) ---
  const climate = await sampleHourlyClimate(segments, dayStartSeconds, dayEndSeconds, date);

  // --- Encounters ---
  // Morning phase (07:00 - 13:00)
  const morningResult = simulatePhaseEncounters({
    startHour: WALK_START_HOUR,
    phaseHours: MORNING_HOURS,
    phase: PHASE_MORNING,
    getRegionInfo: walkingResolver,
    rng,
    excludedEntityIds,
  });

  // Afternoon phase (13:00 - 19:00)
  const afternoonResult = simulatePhaseEncounters({
    startHour: MORNING_END_HOUR,
    phaseHours: AFTERNOON_HOURS,
    phase: PHASE_AFTERNOON,
    getRegionInfo: walkingResolver,
    rng,
    excludedEntityIds: [...excludedEntityIds, ...morningResult.usedEntityIds],
  });

  // Night phase (19:00 - 07:00 next day)
  const nightResolver = await buildNightRegionResolver(leg.end);
  const nightResult = simulatePhaseEncounters({
    startHour: WALK_END_HOUR,
    phaseHours: NIGHT_HOURS,
    phase: PHASE_NIGHT,
    getRegionInfo: nightResolver,
    rng,
    excludedEntityIds: [...excludedEntityIds, ...morningResult.usedEntityIds, ...afternoonResult.usedEntityIds],
  });

  const encounters = [...morningResult.encounters, ...afternoonResult.encounters, ...nightResult.encounters]
    .sort((a, b) => a.hour_float - b.hour_float)
    .map((e) => ({
      ...e,
      entity: {
        ...e.entity,
        probability_by_region: undefined
      }
    }));

  // --- Character Thoughts ---
  let thoughts = null;
  if (characterId && rollThoughtChance(rng)) {
    const selectedPhase = selectRandomPhase(rng);

    // Group encounters by phase (they already have the phase property)
    const encountersByPhase = { morning: [], afternoon: [], night: [] };
    for (const e of encounters) {
      if (e.phase === PHASE_MORNING) {
        encountersByPhase.morning.push(e);
      } else if (e.phase === PHASE_AFTERNOON) {
        encountersByPhase.afternoon.push(e);
      } else if (e.phase === PHASE_NIGHT) {
        encountersByPhase.night.push(e);
      }
    }

    const phaseEncounters = encountersByPhase[selectedPhase];
    const thoughtType = determineThoughtTypeFromEncounters(phaseEncounters);

    const thoughtOptions = await getThoughtsForCharacter(characterId, thoughtType, usedThoughtIds);

    if (thoughtOptions.length > 0) {
      thoughts = {
        phase: selectedPhase,
        type: thoughtType,
        options: thoughtOptions.map(t => ({
          id: t.id,
          thought: t.thought,
          thought_id: t.thought_id
        }))
      };
    }
  }

  // --- Road type breakdown (km) ---
  const roadTypes = {};
  for (const [type, meters] of Object.entries(leg.roadTypeBreakdown)) {
    roadTypes[type] = Number((meters / 1000).toFixed(3));
  }

  // --- Locations: derive the clock hour each is passed from its leg fraction ---
  const locations = (context.locations || []).map((l) => {
    const frac = typeof l.fraction === 'number' ? Math.max(0, Math.min(1, l.fraction)) : 0;
    const hourFloat = WALK_START_HOUR + frac * walkingHoursThisDay;
    const hh = Math.floor(hourFloat);
    const mm = Math.round((hourFloat - hh) * 60);
    return {
      name: l.name,
      type: l.type,
      region: l.region,
      description: l.description,
      distance_km: l.distance_km,
      hour_float: Number(hourFloat.toFixed(2)),
      hour: `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`,
    };
  });

  // --- Water crossings: rivers and streams intersecting the leg ---
  const waterCrossings = (context.water_crossings || []).map((w) => {
    const frac = typeof w.fraction === 'number' ? Math.max(0, Math.min(1, w.fraction)) : 0;
    const hourFloat = WALK_START_HOUR + frac * walkingHoursThisDay;
    const hh = Math.floor(hourFloat);
    const mm = Math.round((hourFloat - hh) * 60);
    const crossingType = w.type === 'river' ? 'bridge' : 'ford';
    return {
      name: w.name || null,
      type: w.type,
      crossing_type: crossingType,
      hour_float: Number(hourFloat.toFixed(2)),
      hour: `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`,
    };
  });

  // --- Overnight location: nearest settlement within 10 km of leg end ---
  const overnightLocation = await findOvernightLocation(leg.end[0], leg.end[1]);
  if (overnightLocation) {
    overnightLocation.indoor = INDOOR_REST_TYPES.includes(overnightLocation.type);
  }

  // --- Elevation profile: 3-point DEM sampling ---
  const elevationProfile = await sampleElevationProfile(segments, dayStartSeconds, dayEndSeconds);

  return {
    day_number: dayNumber,
    date,
    start: leg.start,
    end: leg.end,
    distance_km: Number((leg.distance_m / 1000).toFixed(3)),
    walking_hours: Number(walkingHoursThisDay.toFixed(2)),
    is_last_day: dayEndSeconds >= routeSeconds - 1e-6,
    geometry: legGeoJSON,
    regions: orderedRegions,
    biomes: context.biomes || [],
    altitude: context.altitude || [],
    road_types: roadTypes,
    locations,
    climate,
    encounters,
    thoughts,
    water_crossings: waterCrossings,
    overnight_location: overnightLocation || null,
    elevation_profile: elevationProfile || null,
  };
}
