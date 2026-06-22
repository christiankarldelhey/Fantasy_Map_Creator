import pool from '../db.js';
import {
  simulatePhaseEncounters,
  DAY_PHASE,
  NIGHT_PHASE,
  DEFAULT_TIME_STEP,
} from './encounters.js';
import {
  flattenRoute,
  totalSeconds,
  positionAtSeconds,
  sliceLeg,
} from './tripGeometry.js';

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

// ---------------------------------------------------------------------------
// DB helpers
// ---------------------------------------------------------------------------

/** Region (with encounter metrics) containing a point, or null. */
async function regionAtPoint(lng, lat) {
  const { rows } = await pool.query(
    `SELECT name, hours_to_encounter::float AS hours_to_encounter,
            chance_of_encounter::float AS chance_of_encounter
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
            r.hours_to_encounter::float AS hours_to_encounter,
            r.chance_of_encounter::float AS chance_of_encounter
     FROM jsonb_array_elements($1::jsonb) WITH ORDINALITY AS t(elem, idx)
     LEFT JOIN LATERAL (
       SELECT name, hours_to_encounter, chance_of_encounter
       FROM regions
       WHERE ST_Contains(geom, ST_SetSRID(ST_MakePoint((elem->>0)::float, (elem->>1)::float), 4326))
       LIMIT 1
     ) r ON true
     ORDER BY t.idx`,
    [json]
  );
  return rows.map((row) => (row.name ? {
    name: row.name,
    hours_to_encounter: row.hours_to_encounter,
    chance_of_encounter: row.chance_of_encounter,
  } : null));
}

/** Entities whose probability_by_region includes the given region name. */
async function entitiesForRegion(regionName) {
  const { rows } = await pool.query(
    `SELECT id, name, slug, type, active, danger, description, url_path,
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

/** Sample geographic context (biomes, altitude, locations) along a leg LineString. */
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
          'name', l.name, 'type', l.location_type, 'region', l.region)), '[]'::json)
        FROM locations l, leg WHERE ST_DWithin(l.geom, leg.geom, 0.02)) AS locations`,
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
 * Build a getRegionInfo(elapsed) function for the DAY phase: maps elapsed
 * walking hours to a position along the leg, resolves region + entities.
 * Regions and entities are precomputed/cached for the sampled time steps.
 */
async function buildDayRegionResolver(segments, dayStartSeconds, phaseHours, timeStep) {
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
 * @param {number} [params.timeStep]
 * @returns {Promise<Object|null>} the day object, or null if the trip is complete
 */
export async function generateDay({ trip, dayNumber, rng = Math.random, timeStep = DEFAULT_TIME_STEP }) {
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

  // Ordered unique regions crossed during the walking phase
  const dayResolver = await buildDayRegionResolver(segments, dayStartSeconds, walkingHoursThisDay, timeStep);
  const orderedRegions = [];
  for (let elapsed = timeStep; elapsed <= walkingHoursThisDay + 1e-9; elapsed += timeStep) {
    const info = dayResolver(Number(elapsed.toFixed(6)));
    const name = info ? info.name : null;
    if (name && (orderedRegions.length === 0 || orderedRegions[orderedRegions.length - 1] !== name)) {
      orderedRegions.push(name);
    }
  }

  // --- Climate (sampled at leg midpoint, noon) ---
  const midPoint = positionAtSeconds(segments, (dayStartSeconds + dayEndSeconds) / 2);
  const climate = await climateAtPoint(midPoint[0], midPoint[1], noonTimestamp1950(date));

  // --- Encounters ---
  const dayEncounters = simulatePhaseEncounters({
    startHour: WALK_START_HOUR,
    phaseHours: walkingHoursThisDay,
    phase: DAY_PHASE,
    getRegionInfo: dayResolver,
    rng,
    timeStep,
  });

  const nightResolver = await buildNightRegionResolver(leg.end);
  const nightEncounters = simulatePhaseEncounters({
    startHour: WALK_END_HOUR,
    phaseHours: NIGHT_HOURS,
    phase: NIGHT_PHASE,
    getRegionInfo: nightResolver,
    rng,
    timeStep,
  });

  const encounters = [...dayEncounters, ...nightEncounters].sort((a, b) => a.hour_float - b.hour_float);

  // --- Road type breakdown (km) ---
  const roadTypes = {};
  for (const [type, meters] of Object.entries(leg.roadTypeBreakdown)) {
    roadTypes[type] = Number((meters / 1000).toFixed(3));
  }

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
    locations: context.locations || [],
    climate,
    encounters,
  };
}
