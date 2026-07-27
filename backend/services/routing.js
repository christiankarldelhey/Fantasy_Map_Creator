import pool from '../db.js';

// Haversine distance between two coordinates in meters
export const getDistance = (c1, c2) => {
  const R = 6371000;
  const dLat = (c2[1] - c1[1]) * Math.PI / 180;
  const dLon = (c2[0] - c1[0]) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(c1[1] * Math.PI / 180) * Math.cos(c2[1] * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// Configuration for different transportation modes and terrain multipliers
export const TRANSPORT_CONFIGS = {
  walk: {
    baseSpeed: 1.39, // 5.0 km/h in m/s
    useDirectnessRouting: true,
    roadMultipliers: {
      'Royal Road': 1.2,
      'Main Road': 1.1,
      'Regular Road': 1.0,
      'Trail': 0.9,
      'off_road': 0.8
    },
    biomeMultipliers: {
      'plain': 1.0,
      'forest': 0.85,
      'desert': 0.70,
      'marsh': 0.55
    },
    elevationMultipliers: {
      'plain': 1.0,
      'hills': 0.80,
      'mountains_low': 0.65,
      'mountains_med': 0.50,
      'mountains_high': 0.35
    }
  },
  horse: {
    baseSpeed: 3.33, // 12.0 km/h in m/s
    roadMultipliers: {
      'Royal Road': 1.4,
      'Main Road': 1.3,
      'Regular Road': 1.0,
      'Trail': 0.6,
      'off_road': 0.4
    },
    biomeMultipliers: {
      'plain': 1.0,
      'forest': 0.75,
      'desert': 0.60,
      'marsh': 0.35
    },
    elevationMultipliers: {
      'plain': 1.0,
      'hills': 0.70,
      'mountains_low': 0.50,
      'mountains_med': 0.30,
      'mountains_high': 0.15
    }
  }
};

// ---------------------------------------------------------------------------
// Daily checkpoint helpers
// ---------------------------------------------------------------------------

const WALKING_HOURS = 12;
const SECONDS_PER_HOUR = 3600;
const DAY_BUFFER_BEFORE_M = 15000;
const DAY_BUFFER_AFTER_M = 5000;
const LOCATION_ON_ROUTE_BUFFER_M = 100;
const WALK_SHORTCUT_MAX_DISTANCE_M = 35000;
const WALK_SHORTCUTS_PER_VERTEX = 3;
const WALK_SHORTCUT_GRID_DEGREES = 0.35;

function interpolateMonotonic(target, xs, ys) {
  if (xs.length === 0) return 0;
  if (target <= xs[0]) return ys[0];
  if (target >= xs[xs.length - 1]) return ys[xs.length - 1];

  let lo = 0;
  let hi = xs.length - 1;
  while (hi - lo > 1) {
    const mid = Math.floor((lo + hi) / 2);
    if (xs[mid] <= target) lo = mid;
    else hi = mid;
  }

  if (xs[hi] === xs[lo]) return ys[lo];
  const t = (target - xs[lo]) / (xs[hi] - xs[lo]);
  return ys[lo] + t * (ys[hi] - ys[lo]);
}

function interpolateCoords(a, b, f) {
  return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
}

function coordinateAtDistance(targetDist, coords, dists) {
  if (dists.length === 0 || coords.length === 0) return null;
  if (targetDist <= dists[0]) return coords[0];
  const lastIdx = dists.length - 1;
  if (targetDist >= dists[lastIdx]) return coords[lastIdx];

  let lo = 0;
  let hi = lastIdx;
  while (hi - lo > 1) {
    const mid = Math.floor((lo + hi) / 2);
    if (dists[mid] <= targetDist) lo = mid;
    else hi = mid;
  }

  if (dists[hi] === dists[lo]) return coords[lo];
  const f = (targetDist - dists[lo]) / (dists[hi] - dists[lo]);
  return interpolateCoords(coords[lo], coords[hi], f);
}

function appendSegmentToRoute(coords, dists, times, segmentCoords, segmentDist, segmentTime) {
  if (!segmentCoords || segmentCoords.length < 2) return;

  const lastCoord = coords[coords.length - 1];
  const first = segmentCoords[0];
  const duplicateFirst = lastCoord && first && getDistance(first, lastCoord) < 1.0;
  const startIndex = duplicateFirst ? 1 : 0;

  const pairDists = [];
  for (let i = startIndex; i < segmentCoords.length; i++) {
    const prev = i === 0 ? lastCoord : segmentCoords[i - 1];
    const d = getDistance(prev, segmentCoords[i]);
    pairDists.push(d);
  }

  const rawTotal = pairDists.reduce((sum, d) => sum + d, 0);
  const scale = rawTotal > 0 ? segmentDist / rawTotal : 0;

  for (let i = startIndex; i < segmentCoords.length; i++) {
    const pairRaw = pairDists[i - startIndex];
    const d = pairRaw * scale;
    const t = segmentDist > 0 ? (d / segmentDist) * segmentTime : 0;

    coords.push(segmentCoords[i]);
    dists.push(dists[dists.length - 1] + d);
    times.push(times[times.length - 1] + t);
  }
}

function buildCumulativeRouteData(path, startLng, startLat, offRoadStartDistance, offRoadStartTime, offRoadEndDistance, offRoadEndTime, geoData) {
  const coords = [[startLng, startLat]];
  const dists = [0];
  const times = [0];

  if (geoData.off_road_start_geom && geoData.off_road_start_geom.coordinates) {
    appendSegmentToRoute(coords, dists, times, geoData.off_road_start_geom.coordinates, offRoadStartDistance, offRoadStartTime);
  }

  for (const edge of path) {
    if (edge.geometry && edge.geometry.coordinates) {
      appendSegmentToRoute(coords, dists, times, edge.geometry.coordinates, parseFloat(edge.segment_length) || 0, parseFloat(edge.travel_time_seconds) || 0);
    }
  }

  if (geoData.off_road_end_geom && geoData.off_road_end_geom.coordinates) {
    appendSegmentToRoute(coords, dists, times, geoData.off_road_end_geom.coordinates, offRoadEndDistance, offRoadEndTime);
  }

  return { coords, dists, times };
}

function routeLineWKT(coords) {
  if (!coords || coords.length < 2) return null;
  const pairs = coords.map(([lng, lat]) => `${lng} ${lat}`).join(', ');
  return `LINESTRING(${pairs})`;
}

async function fetchLocationsAlongRoute(routeWKT, totalDist) {
  const query = `
    WITH route AS (
      SELECT ST_SetSRID(ST_GeomFromText($1), 4326) AS geom
    )
    SELECT l.id, l.name, l.location_type AS type, l.region, l.region_id, l.description,
           ST_X(l.geom) AS lng, ST_Y(l.geom) AS lat,
           ST_LineLocatePoint(route.geom, ST_ClosestPoint(route.geom, l.geom)) AS fraction
    FROM locations l, route
    WHERE ST_DWithin(l.geom::geography, route.geom::geography, $2)
    ORDER BY fraction
  `;
  const { rows } = await pool.query(query, [routeWKT, LOCATION_ON_ROUTE_BUFFER_M]);
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    type: r.type,
    region: r.region,
    region_id: r.region_id,
    description: r.description,
    lng: parseFloat(r.lng),
    lat: parseFloat(r.lat),
    distance_m: parseFloat(r.fraction) * totalDist
  }));
}

function computeDailyCheckpoints(totalTime, totalDist, candidates, coords, dists, times, endLng, endLat) {
  const checkpoints = [];
  let prevTime = 0;
  let prevDist = 0;
  let day = 1;
  const EPS = 1e-6;
  const MIN_ADVANCE_M = 1;

  while (prevTime < totalTime - EPS) {
    const targetTime = Math.min(prevTime + WALKING_HOURS * SECONDS_PER_HOUR, totalTime);

    if (targetTime >= totalTime - EPS) {
      checkpoints.push({
        day_number: day,
        location: null,
        coordinates: [endLng, endLat],
        distance_m: totalDist,
        time_seconds: totalTime,
        is_destination: true
      });
      break;
    }

    const targetDist = interpolateMonotonic(targetTime, times, dists);
    const windowStart = Math.max(prevDist + MIN_ADVANCE_M, targetDist - DAY_BUFFER_BEFORE_M);
    const windowEnd = targetDist + DAY_BUFFER_AFTER_M;

    let best = null;
    let bestDelta = Infinity;
    for (const c of candidates) {
      if (c.distance_m <= prevDist + MIN_ADVANCE_M) continue;
      if (c.distance_m < windowStart || c.distance_m > windowEnd) continue;
      const delta = Math.abs(c.distance_m - targetDist);
      if (delta < bestDelta) {
        bestDelta = delta;
        best = c;
      }
    }

    if (best) {
      const actualDist = best.distance_m;
      const actualTime = interpolateMonotonic(actualDist, dists, times);
      checkpoints.push({
        day_number: day,
        location: {
          id: best.id,
          name: best.name,
          type: best.type,
          region: best.region,
          region_id: best.region_id,
          description: best.description
        },
        coordinates: [best.lng, best.lat],
        distance_m: actualDist,
        time_seconds: actualTime,
        is_destination: false
      });
      prevTime = actualTime;
      prevDist = actualDist;
    } else {
      const actualDist = targetDist;
      const actualTime = targetTime;
      checkpoints.push({
        day_number: day,
        location: null,
        coordinates: coordinateAtDistance(actualDist, coords, dists),
        distance_m: actualDist,
        time_seconds: actualTime,
        is_destination: false
      });
      prevTime = actualTime;
      prevDist = actualDist;
    }

    day++;
  }

  return checkpoints;
}

// Dijkstra's algorithm for shortest path routing in JavaScript
export function findShortestPath(roads, startCoord, endCoord, config) {
  const getKey = (coord) => `${coord[0].toFixed(5)},${coord[1].toFixed(5)}`;
  const graph = {};
  const vertices = new Map();
  const connectedPairs = new Set();

  const getMultiplier = (multipliers, type) => multipliers[type] || multipliers.plain || 1.0;
  const getRouteCost = (segmentLength, roadMult, biomeMult, elevMult) => {
    if (!config.useDirectnessRouting) return segmentLength / (config.baseSpeed * roadMult * biomeMult * elevMult);
    return segmentLength / (roadMult * biomeMult * elevMult);
  };
  const addVertex = (key, coord, road) => {
    if (!vertices.has(key)) vertices.set(key, { coord, roads: [] });
    vertices.get(key).roads.push(road);
  };
  const addGraphEdge = (k1, k2, road, segmentLength, isOffRoad = false) => {
    if (!graph[k1]) graph[k1] = [];
    if (!graph[k2]) graph[k2] = [];

    const roadName = isOffRoad ? 'off_road' : (road.name || 'Regular Road');
    const roadMult = config.roadMultipliers[roadName] || config.roadMultipliers['Regular Road'] || 1.0;
    const biomeMult = getMultiplier(config.biomeMultipliers, road.biome_type);
    const elevMult = getMultiplier(config.elevationMultipliers, road.altitude_type);
    const speed = config.baseSpeed * roadMult * biomeMult * elevMult;
    const segment = {
      ...road,
      name: isOffRoad ? 'Cross-country' : road.name,
      is_off_road: isOffRoad,
      geometry: { type: 'LineString', coordinates: [vertices.get(k1).coord, vertices.get(k2).coord] },
      segment_length: segmentLength,
      effective_speed: speed,
      travel_time_seconds: segmentLength / speed
    };
    const cost = getRouteCost(segmentLength, roadMult, biomeMult, elevMult);
    graph[k1].push({ toKey: k2, cost, road: segment });
    graph[k2].push({ toKey: k1, cost, road: segment });
  };

  roads.forEach(road => {
    const coords = road.geometry.coordinates;
    for (let i = 0; i < coords.length - 1; i++) {
      const p1 = coords[i];
      const p2 = coords[i + 1];
      const k1 = getKey(p1);
      const k2 = getKey(p2);
      addVertex(k1, p1, road);
      addVertex(k2, p2, road);
      addGraphEdge(k1, k2, road, getDistance(p1, p2));
      connectedPairs.add([k1, k2].sort().join('|'));
    }
  });

  if (config.useDirectnessRouting) {
    const grid = new Map();
    const gridKey = ([lng, lat]) => `${Math.floor(lng / WALK_SHORTCUT_GRID_DEGREES)},${Math.floor(lat / WALK_SHORTCUT_GRID_DEGREES)}`;
    for (const [key, vertex] of vertices) {
      const bucket = gridKey(vertex.coord);
      if (!grid.has(bucket)) grid.set(bucket, []);
      grid.get(bucket).push(key);
    }

    const shortcutPairs = new Set();
    for (const [key, vertex] of vertices) {
      const [lng, lat] = vertex.coord;
      const cellLng = Math.floor(lng / WALK_SHORTCUT_GRID_DEGREES);
      const cellLat = Math.floor(lat / WALK_SHORTCUT_GRID_DEGREES);
      const candidates = [];
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          for (const candidateKey of grid.get(`${cellLng + dx},${cellLat + dy}`) || []) {
            if (candidateKey === key) continue;
            const pairKey = [key, candidateKey].sort().join('|');
            if (connectedPairs.has(pairKey) || shortcutPairs.has(pairKey)) continue;
            const candidate = vertices.get(candidateKey);
            const distance = getDistance(vertex.coord, candidate.coord);
            if (distance <= WALK_SHORTCUT_MAX_DISTANCE_M) candidates.push({ candidateKey, distance });
          }
        }
      }

      candidates.sort((a, b) => a.distance - b.distance);
      for (const { candidateKey, distance } of candidates.slice(0, WALK_SHORTCUTS_PER_VERTEX)) {
        const pairKey = [key, candidateKey].sort().join('|');
        if (shortcutPairs.has(pairKey)) continue;
        const candidate = vertices.get(candidateKey);
        const localRoads = [...vertex.roads, ...candidate.roads];
        const biomeRoad = localRoads.reduce((slowest, road) => getMultiplier(config.biomeMultipliers, road.biome_type) < getMultiplier(config.biomeMultipliers, slowest.biome_type) ? road : slowest, localRoads[0]);
        const elevationRoad = localRoads.reduce((slowest, road) => getMultiplier(config.elevationMultipliers, road.altitude_type) < getMultiplier(config.elevationMultipliers, slowest.altitude_type) ? road : slowest, localRoads[0]);
        addGraphEdge(key, candidateKey, {
          id: null,
          biome_type: biomeRoad.biome_type,
          altitude_type: elevationRoad.altitude_type,
          terrain_type: 'off_road'
        }, distance, true);
        shortcutPairs.add(pairKey);
      }
    }
  }

  const getClosestVertex = (target) => {
    let closestKey = null;
    let minDist = Infinity;
    for (const [key, vertex] of vertices) {
      const dist = getDistance(vertex.coord, target);
      if (dist < minDist) {
        minDist = dist;
        closestKey = key;
      }
    }
    return { key: closestKey };
  };

  const startVertex = getClosestVertex(startCoord);
  const endVertex = getClosestVertex(endCoord);
  if (!startVertex.key || !endVertex.key) return null;

  const startKey = startVertex.key;
  const endKey = endVertex.key;
  if (startKey === endKey) {
    return { path: [], startVertexCoord: vertices.get(startKey).coord, endVertexCoord: vertices.get(endKey).coord };
  }

  const distances = {};
  const previous = {};
  const visited = new Set();
  const queue = [];
  Object.keys(graph).forEach(key => {
    distances[key] = Infinity;
    previous[key] = null;
  });
  distances[startKey] = 0;
  queue.push({ key: startKey, dist: 0 });

  while (queue.length > 0) {
    queue.sort((a, b) => a.dist - b.dist);
    const { key: currentKey } = queue.shift();
    if (currentKey === endKey) break;
    if (visited.has(currentKey)) continue;
    visited.add(currentKey);

    for (const edge of graph[currentKey] || []) {
      if (visited.has(edge.toKey)) continue;
      const alt = distances[currentKey] + edge.cost;
      if (alt < distances[edge.toKey]) {
        distances[edge.toKey] = alt;
        previous[edge.toKey] = { key: currentKey, road: edge.road };
        queue.push({ key: edge.toKey, dist: alt });
      }
    }
  }

  if (distances[endKey] === Infinity) return null;

  const path = [];
  let curr = endKey;
  while (previous[curr]) {
    const prevNode = previous[curr];
    path.unshift(prevNode.road);
    curr = prevNode.key;
  }

  return { path, startVertexCoord: vertices.get(startKey).coord, endVertexCoord: vertices.get(endKey).coord };
}

/**
 * Compute a hybrid shortest-path route between two coordinates.
 * Returns the same structure used by the /api/directions endpoint.
 */
export async function computeRoute({ startLng, startLat, endLng, endLat, transportMode = 'walk' }) {
  const config = TRANSPORT_CONFIGS[transportMode] || TRANSPORT_CONFIGS.walk;

  // 1. Fetch all roads with their respective biome and altitude layers
  const roadsQuery = `
    SELECT 
      r.id, 
      r.name, 
      r.terrain_type, 
      r.difficulty, 
      r.cost_factor,
      ST_AsGeoJSON(r.geom)::json as geometry,
      ST_Length(r.geom::geography) as segment_length,
      COALESCE(b.type, 'plain') as biome_type,
      COALESCE(al.altitude_type, 'plain') as altitude_type
    FROM roads r
    LEFT JOIN LATERAL (
      SELECT type 
      FROM biomes 
      WHERE ST_Intersects(r.geom, geom) 
      LIMIT 1
    ) b ON true
    LEFT JOIN LATERAL (
      SELECT altitude_type 
      FROM altitude_layers 
      WHERE ST_Intersects(r.geom, geom) 
      ORDER BY priority DESC 
      LIMIT 1
    ) al ON true;
  `;
  const roadsRes = await pool.query(roadsQuery);
  const roads = roadsRes.rows;

  // 2. Find shortest path on road network
  const routeResult = findShortestPath(roads, [startLng, startLat], [endLng, endLat], config);

  if (!routeResult) {
    return null;
  }

  const { path, startVertexCoord, endVertexCoord } = routeResult;

  // 3. Calculate spatial distances using PostGIS for precise geography lengths, biomes and altitudes
  const geoinfoQuery = `
    WITH start_pt AS (SELECT ST_SetSRID(ST_MakePoint($1, $2), 4326) as geom),
         end_pt AS (SELECT ST_SetSRID(ST_MakePoint($5, $6), 4326) as geom)
    SELECT 
      ST_AsGeoJSON(ST_MakeLine((SELECT geom FROM start_pt), ST_SetSRID(ST_MakePoint($3, $4), 4326)))::json as off_road_start_geom,
      ST_Length(ST_MakeLine((SELECT geom FROM start_pt), ST_SetSRID(ST_MakePoint($3, $4), 4326))::geography) as off_road_start_length,
      
      ST_AsGeoJSON(ST_MakeLine(ST_SetSRID(ST_MakePoint($7, $8), 4326), (SELECT geom FROM end_pt)))::json as off_road_end_geom,
      ST_Length(ST_MakeLine(ST_SetSRID(ST_MakePoint($7, $8), 4326), (SELECT geom FROM end_pt))::geography) as off_road_end_length,
      
      COALESCE((SELECT type FROM biomes WHERE ST_Intersects((SELECT geom FROM start_pt), geom) LIMIT 1), 'plain') as start_biome,
      COALESCE((SELECT altitude_type FROM altitude_layers WHERE ST_Intersects((SELECT geom FROM start_pt), geom) ORDER BY priority DESC LIMIT 1), 'plain') as start_altitude,
      
      COALESCE((SELECT type FROM biomes WHERE ST_Intersects((SELECT geom FROM end_pt), geom) LIMIT 1), 'plain') as end_biome,
      COALESCE((SELECT altitude_type FROM altitude_layers WHERE ST_Intersects((SELECT geom FROM end_pt), geom) ORDER BY priority DESC LIMIT 1), 'plain') as end_altitude;
  `;
  const distRes = await pool.query(geoinfoQuery, [
    startLng, startLat, startVertexCoord[0], startVertexCoord[1],
    endLng, endLat, endVertexCoord[0], endVertexCoord[1]
  ]);
  const geoData = distRes.rows[0];

  const offRoadStartDistance = parseFloat(geoData.off_road_start_length) || 0;
  const offRoadEndDistance = parseFloat(geoData.off_road_end_length) || 0;
  const onRoadDistance = path
    .filter((segment) => !segment.is_off_road)
    .reduce((sum, segment) => sum + (parseFloat(segment.segment_length) || 0), 0);
  const internalOffRoadDistance = path
    .filter((segment) => segment.is_off_road)
    .reduce((sum, segment) => sum + (parseFloat(segment.segment_length) || 0), 0);
  const totalDistance = offRoadStartDistance + onRoadDistance + internalOffRoadDistance + offRoadEndDistance;

  // 4. Estimate travel times
  const offRoadStartMult = config.roadMultipliers['off_road'] || 0.6;
  const startBiomeMult = config.biomeMultipliers[geoData.start_biome] || 1.0;
  const startElevMult = config.elevationMultipliers[geoData.start_altitude] || 1.0;
  const startSpeed = config.baseSpeed * offRoadStartMult * startBiomeMult * startElevMult;
  const offRoadStartTime = offRoadStartDistance / startSpeed;

  const offRoadEndMult = config.roadMultipliers['off_road'] || 0.6;
  const endBiomeMult = config.biomeMultipliers[geoData.end_biome] || 1.0;
  const endElevMult = config.elevationMultipliers[geoData.end_altitude] || 1.0;
  const endSpeed = config.baseSpeed * offRoadEndMult * endBiomeMult * endElevMult;
  const offRoadEndTime = offRoadEndDistance / endSpeed;

  const onRoadTime = path.reduce((sum, r) => sum + (parseFloat(r.travel_time_seconds) || 0), 0);
  const totalTimeSeconds = offRoadStartTime + onRoadTime + offRoadEndTime;

  // 5. Structure GeoJSON output
  const featureForSegment = (segment, index, type) => ({
    type: 'Feature',
    geometry: segment.geometry,
    properties: {
      id: segment.id,
      seq: index + 1,
      type,
      name: segment.name || (type === 'off_road' ? 'Cross-country' : 'Unnamed Road'),
      terrain_type: segment.terrain_type,
      difficulty: segment.difficulty,
      cost_factor: segment.cost_factor,
      segment_length: parseFloat(segment.segment_length) || 0,
      distance_m: parseFloat(segment.segment_length) || 0,
      biome_type: segment.biome_type,
      altitude_type: segment.altitude_type,
      effective_speed: segment.effective_speed,
      travel_time_seconds: segment.travel_time_seconds
    }
  });
  const onRoadFeatures = {
    type: 'FeatureCollection',
    features: path
      .filter((segment) => !segment.is_off_road)
      .map((segment, index) => featureForSegment(segment, index, 'on_road'))
  };
  const internalOffRoadFeatures = {
    type: 'FeatureCollection',
    features: path
      .filter((segment) => segment.is_off_road)
      .map((segment, index) => featureForSegment(segment, index, 'off_road'))
  };

  // 6. Build cumulative coordinate/time/distance arrays and compute daily checkpoints
  const { coords: routeCoords, dists: cumulativeDist, times: cumulativeTime } = buildCumulativeRouteData(
    path,
    startLng,
    startLat,
    offRoadStartDistance,
    offRoadStartTime,
    offRoadEndDistance,
    offRoadEndTime,
    geoData
  );

  const totalRouteDist = cumulativeDist[cumulativeDist.length - 1] || 0;
  const totalRouteTime = cumulativeTime[cumulativeTime.length - 1] || 0;
  const routeWKT = routeLineWKT(routeCoords);
  let candidates = [];
  if (routeWKT) {
    candidates = await fetchLocationsAlongRoute(routeWKT, totalRouteDist);
  }

  const checkpoints = computeDailyCheckpoints(
    totalRouteTime,
    totalRouteDist,
    candidates,
    routeCoords,
    cumulativeDist,
    cumulativeTime,
    endLng,
    endLat
  );

  return {
    summary: {
      total_distance_m: totalDistance,
      total_distance_km: totalDistance / 1000,
      on_road_distance_km: onRoadDistance / 1000,
      off_road_distance_km: (offRoadStartDistance + internalOffRoadDistance + offRoadEndDistance) / 1000,
      total_time_seconds: totalTimeSeconds,
      total_time_hours: totalTimeSeconds / 3600,
      estimated_days: checkpoints.length
    },
    geometry: {
      off_road_start: offRoadStartDistance > 1 ? {
        type: 'Feature',
        geometry: geoData.off_road_start_geom,
        properties: {
          type: 'off_road',
          distance_m: offRoadStartDistance,
          biome_type: geoData.start_biome,
          altitude_type: geoData.start_altitude,
          travel_time_seconds: offRoadStartTime
        }
      } : null,
      on_road: onRoadFeatures,
      off_road: internalOffRoadFeatures,
      route: {
        type: 'FeatureCollection',
        features: path.map((segment, index) => featureForSegment(segment, index, segment.is_off_road ? 'off_road' : 'on_road'))
      },
      off_road_end: offRoadEndDistance > 1 ? {
        type: 'Feature',
        geometry: geoData.off_road_end_geom,
        properties: {
          type: 'off_road',
          distance_m: offRoadEndDistance,
          biome_type: geoData.end_biome,
          altitude_type: geoData.end_altitude,
          travel_time_seconds: offRoadEndTime
        }
      } : null
    },
    checkpoints
  };
}
