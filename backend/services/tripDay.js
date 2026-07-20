import pool from '../db.js';
import {
  simulatePhaseEncounters,
  simulateNightEncounters,
  PHASE_MORNING,
  PHASE_AFTERNOON,
  PHASE_NIGHT,
} from './encounters.js';
import { resolveEncounter } from './interactionResolver.js';
import { resolveOvernight, resolveRegionAtPoint } from './placesInteractions.js';
import { loadTerrainPhrases } from './terrainPhrases.js';
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
import { getMoonPhase } from './moonPhase.js';
import { FRIENDLY_FAMILIES, MAX_EVIL_ENCOUNTERS_PER_DAY } from './characterState.js';

/** Count encounters drawn from evil (shadow_weight > 0) entities. */
function countEvilEncounters(encounters) {
  return (encounters || []).filter(
    (e) => Number.isFinite(e?.entity?.shadow_weight) && e.entity.shadow_weight > 0
  ).length;
}

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

export const TERRAIN_CATEGORIES = [
  'forest', 'hills', 'marsh', 'plain', 'desert',
  'mountains_low', 'mountains_med', 'mountains_high',
  'road', 'trail',
];

// ---------------------------------------------------------------------------
// DB helpers
// ---------------------------------------------------------------------------

/** Region containing a point, or null. */
async function regionAtPoint(lng, lat) {
  const { rows } = await pool.query(
    `SELECT name, description_summary, cultural_family, COALESCE(population_ratio, 0.5) AS population_ratio
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
            r.description_summary,
            r.cultural_family,
            COALESCE(r.population_ratio, 0.5) AS population_ratio
     FROM jsonb_array_elements($1::jsonb) WITH ORDINALITY AS t(elem, idx)
     LEFT JOIN LATERAL (
       SELECT name, description_summary, cultural_family, population_ratio
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
    cultural_family: row.cultural_family,
    population_ratio: Number(row.population_ratio),
  } : null));
}

/** Entities whose probability_by_region includes the given region name. */
async function entitiesForRegion(regionName) {
  const { rows } = await pool.query(
    `SELECT id, name, slug, type, active, danger, description, description_summary, url_path,
            biomes, probability_by_region, shadow_weight
     FROM entities
     WHERE EXISTS (
       SELECT 1 FROM jsonb_array_elements(probability_by_region) e
       WHERE e->>'region' = $1
     )`,
    [regionName]
  );
  return rows;
}

// Daily checkpoints are computed in routing.js; tripDay.js uses them directly.

/** Types of location that allow sleeping indoors. */
const INDOOR_REST_TYPES = ['town', 'city', 'village', 'inn', 'tavern', 'fortified city', 'fortified town', 'citadel'];

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
       (SELECT COALESCE(json_agg(json_build_object(
          'type', b.type,
          'area_km2', round((ST_Area(ST_Intersection(b.geom, leg.geom)::geography) / 1000000)::numeric, 2),
          'total_area_km2', round((ST_Area(b.geom::geography) / 1000000)::numeric, 2),
          'fraction', ST_LineLocatePoint(leg.geom, ST_Centroid(ST_Intersection(b.geom, leg.geom)))
        )), '[]'::json)
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
        WHERE ST_DWithin(l.geom::geography, leg.geom::geography, 10000)
          AND ST_Distance(l.geom::geography, ST_StartPoint(leg.geom)::geography) > 3000) AS locations,
       (SELECT COALESCE(json_agg(json_build_object(
          'name', w.name,
          'type', w.water_type,
          'description', w.description,
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

/**
 * Sample climate aligned to the narrative phases.
 *   - morning   (07:00-13:00): sampled at 07:00, 10:00 on the walking leg
 *   - afternoon (13:00-19:00): sampled at 13:00, 16:00 on the walking leg
 *   - night at camp (19:00 -> 07:00 next day): sampled at 19:00, 22:00,
 *     01:00, 04:00 at the camp position (leg end), so extreme night events
 *     (a midnight storm, a hard frost, wind) can surface in the narration.
 * Hours past midnight roll the date forward one day in the timestamp.
 */
async function sampleHourlyClimate(segments, dayStartSeconds, dayEndSeconds, dateISO, moonPhase = null) {
  // hour, phase, nextDay flag; walking hours use the leg, night uses the camp.
  const specs = [
    { hour: 7, phase: PHASE_MORNING, nextDay: false },
    { hour: 10, phase: PHASE_MORNING, nextDay: false },
    { hour: 13, phase: PHASE_AFTERNOON, nextDay: false },
    { hour: 16, phase: PHASE_AFTERNOON, nextDay: false },
    { hour: 19, phase: PHASE_NIGHT, nextDay: false },
    { hour: 22, phase: PHASE_NIGHT, nextDay: false },
    { hour: 1, phase: PHASE_NIGHT, nextDay: true },
    { hour: 4, phase: PHASE_NIGHT, nextDay: true },
  ];

  const legDuration = dayEndSeconds - dayStartSeconds;
  const campPoint = positionAtSeconds(segments, dayEndSeconds);
  const climateData = [];

  for (const { hour, phase, nextDay } of specs) {
    let point;
    if (phase === PHASE_NIGHT) {
      // Camped: weather is read at the camp, not along the (finished) leg.
      point = campPoint;
    } else {
      // Interpolate position for this hour over the walking window (07:00-19:00).
      const walkFraction = Math.max(0, Math.min(1, (hour - WALK_START_HOUR) / WALKING_HOURS));
      point = positionAtSeconds(segments, dayStartSeconds + walkFraction * legDuration);
    }

    const stampDate = nextDay ? addDaysISO(dateISO, 1) : dateISO;
    const [, month, day] = stampDate.split('-');
    const timestamp = `1950-${month}-${day} ${hour.toString().padStart(2, '0')}:00:00`;
    const climate = await climateAtPoint(point[0], point[1], timestamp);

    climateData.push({
      time: timestamp,
      phase,
      climate: climate || null,
      moon: moonPhase,
    });
  }

  return climateData;
}

/**
 * Sample climate overnight at the camp, from dusk until the next morning.
 * Focused on how conditions feel to a sleeping traveller (wind, rain, cold).
 * Hours past midnight roll the date forward one day in the timestamp.
 */
async function sampleNighttimeClimate(segments, dayEndSeconds, dateISO, moonPhase = null) {
  const specs = [
    { hour: 20, nextDay: false },
    { hour: 23, nextDay: false },
    { hour: 2, nextDay: true },
    { hour: 5, nextDay: true },
    { hour: 7, nextDay: true },
  ];

  const campPoint = positionAtSeconds(segments, dayEndSeconds);
  const climateData = [];

  for (const { hour, nextDay } of specs) {
    const stampDate = nextDay ? addDaysISO(dateISO, 1) : dateISO;
    const [, month, day] = stampDate.split('-');
    const timestamp = `1950-${month}-${day} ${hour.toString().padStart(2, '0')}:00:00`;
    const climate = await climateAtPoint(campPoint[0], campPoint[1], timestamp);

    climateData.push({
      time: timestamp,
      phase: PHASE_NIGHT,
      climate: climate || null,
      moon: moonPhase,
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
 * Find the road_type of the segment active at a given cumulative-seconds offset.
 * Falls back to 'off_road' if no matching segment is found.
 */
function roadTypeAtSeconds(segments, targetSeconds) {
  let acc = 0;
  for (const seg of segments) {
    if (targetSeconds <= acc + seg.seconds) return seg.road_type || 'off_road';
    acc += seg.seconds;
  }
  return segments.length > 0
    ? segments[segments.length - 1].road_type || 'off_road'
    : 'off_road';
}

/**
 * Build a getRegionInfo(elapsed) function for a walking phase: maps elapsed
 * walking hours to a position along the leg, resolves region + entities.
 * Regions and entities are precomputed/cached for the sampled time steps.
 * Also includes road_type and population_ratio for the encounter engine.
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
    const absoluteSeconds = dayStartSeconds + elapsed * SECONDS_PER_HOUR;
    const road_type = roadTypeAtSeconds(segments, absoluteSeconds);
    if (region) {
      byStep.set(elapsed, {
        ...region,
        entities: entityCache.get(region.name) || [],
        road_type,
      });
    } else {
      byStep.set(elapsed, null);
    }
  });

  return (elapsed) => byStep.get(Number(elapsed.toFixed(6))) || null;
}

/**
 * Build a getRegionInfo function for the NIGHT phase: the company is camped at
 * a fixed position, so the region/entities are constant.
 * Night always uses road_type 'off_road' (party is camped, not on a road).
 */
async function buildNightRegionResolver(campPoint) {
  const region = await regionAtPoint(campPoint[0], campPoint[1]);
  if (!region) return () => null;
  const entities = await entitiesForRegion(region.name);
  const info = { ...region, entities, road_type: 'off_road' };
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
 * @param {Object} [params.character] - character row with resistance stat for rolls
 * @param {Array<string>} [params.recentForms] - forms used in previous chapters (anti-repetition)
 * @param {Array<string>} [params.recentStances] - stances used in previous chapters (anti-repetition)
 * @returns {Promise<Object|null>} the day object, or null if the trip is complete
 */
export async function generateDay({ trip, dayNumber, rng = Math.random, excludedEntityIds = [], characterId = null, usedThoughtIds = [], character = {}, recentForms = [], recentStances = [], shadowFactor = 1, shadowBand = null, characterSlug = null }) {
  const route = typeof trip.route === 'string' ? JSON.parse(trip.route) : trip.route;
  const segments = flattenRoute(route);
  const routeSeconds = totalSeconds(segments);
  const checkpoints = route?.checkpoints || [];
  const checkpoint = checkpoints[dayNumber - 1] || null;

  let dayStartSeconds;
  let dayEndSeconds;

  if (checkpoints.length > 0) {
    if (dayNumber > checkpoints.length) {
      return null; // all checkpoints consumed; trip is complete
    }
    dayStartSeconds = dayNumber === 1 ? 0 : checkpoints[dayNumber - 2].time_seconds;
    dayEndSeconds = checkpoints[dayNumber - 1].time_seconds;
  } else {
    // Legacy route without checkpoints
    dayStartSeconds = (dayNumber - 1) * WALKING_HOURS * SECONDS_PER_HOUR;
    if (dayStartSeconds >= routeSeconds - 1e-6) {
      return null; // trip already complete
    }
    dayEndSeconds = Math.min(dayNumber * WALKING_HOURS * SECONDS_PER_HOUR, routeSeconds);
  }

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
  const moonPhase = getMoonPhase(date);

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
      orderedRegions.push({
        name,
        description_summary: info.description_summary || null,
        cultural_family: info.cultural_family || null,
      });
    }
  }

  // --- Region-specific terrain phrases for the prompt ---
  const regionNames = orderedRegions.map((r) => r.name);

  // Map biomes to terrain phrase categories
  const biomeCategories = new Set();
  if (context.biomes && Array.isArray(context.biomes)) {
    for (const biome of context.biomes) {
      const type = biome.type;
      if (type) {
        biomeCategories.add(type);
      }
    }
  }

  const categoriesToLoad = Array.from(biomeCategories);
  const terrainPhrases = await loadTerrainPhrases(regionNames, categoriesToLoad);

  // --- Climate (sampled hourly along the leg) ---
  const climate = await sampleHourlyClimate(segments, dayStartSeconds, dayEndSeconds, date, moonPhase);

  // --- Overnight climate at camp (dusk to 7am, sensation-focused) ---
  const nighttimeClimate = await sampleNighttimeClimate(segments, dayEndSeconds, date, moonPhase);

  // --- Encounters ---
  // The shadow loop biases the spawn toward evil entities, capped per day and
  // damped in friendly regions.
  // Morning phase (07:00 - 13:00)
  const morningResult = simulatePhaseEncounters({
    startHour: WALK_START_HOUR,
    phaseHours: MORNING_HOURS,
    phase: PHASE_MORNING,
    getRegionInfo: walkingResolver,
    rng,
    excludedEntityIds,
    shadowFactor,
    excludeEvil: false,
    friendlyFamilies: FRIENDLY_FAMILIES,
  });

  let evilSoFar = countEvilEncounters(morningResult.encounters);

  // Afternoon phase (13:00 - 19:00)
  const afternoonResult = simulatePhaseEncounters({
    startHour: MORNING_END_HOUR,
    phaseHours: AFTERNOON_HOURS,
    phase: PHASE_AFTERNOON,
    getRegionInfo: walkingResolver,
    rng,
    excludedEntityIds: [...excludedEntityIds, ...morningResult.usedEntityIds],
    shadowFactor,
    excludeEvil: evilSoFar >= MAX_EVIL_ENCOUNTERS_PER_DAY,
    friendlyFamilies: FRIENDLY_FAMILIES,
  });

  evilSoFar += countEvilEncounters(afternoonResult.encounters);

  // Night phase (19:00 - 07:00 next day), split into before-sleep and mid-night timings
  const nightResolver = await buildNightRegionResolver(leg.end);
  const nightRegion = nightResolver(0);
  const nightResult = simulateNightEncounters({
    region: nightRegion,
    rng,
    base: 1.6,
    excludedEntityIds: [...excludedEntityIds, ...morningResult.usedEntityIds, ...afternoonResult.usedEntityIds],
    shadowFactor,
    excludeEvil: evilSoFar >= MAX_EVIL_ENCOUNTERS_PER_DAY,
    friendlyFamilies: FRIENDLY_FAMILIES,
  });

  // Collect raw encounters in phase order, strip internal field
  const rawEncounters = [...morningResult.encounters, ...afternoonResult.encounters, ...nightResult.encounters]
    .sort((a, b) => a.hour_float - b.hour_float)
    .map((e) => ({
      ...e,
      entity: {
        ...e.entity,
        probability_by_region: undefined
      }
    }));

  // --- Resolve interaction forms for each encounter ---
  const chapterForms = []; // tracks forms used within this chapter
  const chapterStances = []; // tracks stances used within this chapter
  const encounters = [];

  // Build a region name -> cultural_family map for npc_interactions queries
  const culturalFamilyByRegion = new Map();
  for (const r of orderedRegions) {
    if (r.name && r.cultural_family) {
      culturalFamilyByRegion.set(r.name, r.cultural_family);
    }
  }

  for (const e of rawEncounters) {
    const encounterCulturalFamily = culturalFamilyByRegion.get(e.region) || null;
    const interaction = await resolveEncounter(
      e.entity,
      character,
      recentForms,
      rng,
      [...recentStances, ...chapterStances],
      chapterForms,
      {
        shadowBand,
        characterSlug,
        culturalFamily: encounterCulturalFamily,
        regionId: null,
      }
    );
    chapterForms.push(interaction.form);
    if (interaction.stance) chapterStances.push(interaction.stance.stance);
    encounters.push({ ...e, interaction });
  }

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

  // Add road/trail categories to terrain phrases if there are road types
  if (Object.keys(roadTypes).length > 0) {
    biomeCategories.add('road');
    biomeCategories.add('trail');
    const categoriesToLoad = Array.from(biomeCategories);
    const additionalTerrainPhrases = await loadTerrainPhrases(regionNames, categoriesToLoad);
    // Merge additional phrases into existing terrainPhrases
    for (const region of regionNames) {
      if (!terrainPhrases[region]) {
        terrainPhrases[region] = {};
      }
      if (additionalTerrainPhrases[region]) {
        Object.assign(terrainPhrases[region], additionalTerrainPhrases[region]);
      }
    }
  }

  // --- Biomes: derive the clock hour each is crossed from its leg fraction ---
  const biomesWithTime = (context.biomes || []).map((b) => {
    const frac = typeof b.fraction === 'number' ? Math.max(0, Math.min(1, b.fraction)) : 0;
    const hourFloat = WALK_START_HOUR + frac * walkingHoursThisDay;
    const hh = Math.floor(hourFloat);
    const mm = Math.round((hourFloat - hh) * 60);
    return {
      type: b.type,
      area_km2: b.area_km2,
      total_area_km2: b.total_area_km2,
      fraction: b.fraction,
      hour_float: Number(hourFloat.toFixed(2)),
      hour: `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`,
    };
  });

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
      description: w.description || null,
      crossing_type: crossingType,
      hour_float: Number(hourFloat.toFixed(2)),
      hour: `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`,
    };
  });

  // --- Overnight location: take it from the day's checkpoint ---
  let overnightLocation = null;
  if (checkpoint && checkpoint.location) {
    overnightLocation = {
      id: checkpoint.location.id,
      name: checkpoint.location.name,
      type: checkpoint.location.type,
      region: checkpoint.location.region,
      region_id: checkpoint.location.region_id,
      description: checkpoint.location.description,
      indoor: INDOOR_REST_TYPES.includes(checkpoint.location.type),
      distance_km: 0,
    };
  }

  let overnightContext = 'IN_WILD';
  let overnightRegionId = null;
  if (overnightLocation) {
    overnightContext = 'IN_LOCATION';
    overnightRegionId = overnightLocation.region_id;
  } else {
    const campRegion = await resolveRegionAtPoint(leg.end[0], leg.end[1]);
    if (campRegion) overnightRegionId = campRegion.id;
  }

  const overnightInteraction = await resolveOvernight({
    context: overnightContext,
    locationId: overnightContext === 'IN_LOCATION' ? overnightLocation.id : null,
    locationType: overnightContext === 'IN_LOCATION' ? overnightLocation.type : null,
    regionId: overnightRegionId,
  });

  console.log(
    `[OVERNIGHT] context=${overnightContext} ` +
    `place=${overnightLocation ? overnightLocation.name : 'wild'} ` +
    `scope=${overnightInteraction.scope}`
  );

  // --- Elevation profile: 3-point DEM sampling ---
  const elevationProfile = await sampleElevationProfile(segments, dayStartSeconds, dayEndSeconds);

  return {
    day_number: dayNumber,
    date,
    moon_phase: moonPhase,
    start: leg.start,
    end: leg.end,
    distance_km: Number((leg.distance_m / 1000).toFixed(3)),
    walking_hours: Number(walkingHoursThisDay.toFixed(2)),
    is_last_day: dayEndSeconds >= routeSeconds - 1e-6,
    geometry: legGeoJSON,
    regions: orderedRegions,
    terrain_phrases: terrainPhrases,
    biomes: biomesWithTime,
    altitude: context.altitude || [],
    road_types: roadTypes,
    locations,
    climate,
    nighttime_climate: nighttimeClimate,
    encounters,
    thoughts,
    water_crossings: waterCrossings,
    overnight_location: overnightLocation,
    overnight_interaction: overnightInteraction,
    elevation_profile: elevationProfile || null,
    rng,
  };
}
