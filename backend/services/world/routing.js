import pool from '../../db.js';

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
// Roads query (module scope so it can be cached)
// ---------------------------------------------------------------------------
const ROADS_QUERY = `
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

// ---------------------------------------------------------------------------
// Cached road network graph
// The graph is expensive to build, so we build it once and reuse it for every
// route request. This removes the repeated DB query + JS graph construction.
// ---------------------------------------------------------------------------
let roadNetworkCache = null;
let roadNetworkLoading = null;

export function resetRoadNetworkCache() {
  roadNetworkCache = null;
  roadNetworkLoading = null;
}

export async function getRoadNetwork() {
  if (roadNetworkCache) return roadNetworkCache;
  if (roadNetworkLoading) return roadNetworkLoading;

  roadNetworkLoading = (async () => {
    console.time('build-road-network');
    const roadsRes = await pool.query(ROADS_QUERY);
    const network = buildRoadNetwork(roadsRes.rows, TRANSPORT_CONFIGS.walk);
    roadNetworkCache = network;
    console.timeEnd('build-road-network');
    console.log(
      `Road network loaded: ${network.vertexCount} vertices, ${network.edgeCount} edges`
    );
    return network;
  })();

  try {
    return await roadNetworkLoading;
  } finally {
    roadNetworkLoading = null;
  }
}

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

// ---------------------------------------------------------------------------
// Binary min-heap priority queue for Dijkstra
// ---------------------------------------------------------------------------
class BinaryHeap {
  constructor() {
    this.nodes = [];
  }

  push(key, dist) {
    this.nodes.push({ key, dist });
    let i = this.nodes.length - 1;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (this.nodes[parent].dist <= this.nodes[i].dist) break;
      [this.nodes[parent], this.nodes[i]] = [this.nodes[i], this.nodes[parent]];
      i = parent;
    }
  }

  pop() {
    if (this.nodes.length === 0) return null;
    const top = this.nodes[0];
    const last = this.nodes.pop();
    if (this.nodes.length > 0) {
      this.nodes[0] = last;
      this.sink(0);
    }
    return top;
  }

  isEmpty() {
    return this.nodes.length === 0;
  }

  sink(i) {
    const n = this.nodes.length;
    while (true) {
      let smallest = i;
      const left = 2 * i + 1;
      const right = 2 * i + 2;
      if (left < n && this.nodes[left].dist < this.nodes[smallest].dist) smallest = left;
      if (right < n && this.nodes[right].dist < this.nodes[smallest].dist) smallest = right;
      if (smallest === i) break;
      [this.nodes[i], this.nodes[smallest]] = [this.nodes[smallest], this.nodes[i]];
      i = smallest;
    }
  }
}

// ---------------------------------------------------------------------------
// Graph construction
// Builds a mode-agnostic graph: edges store the raw road attributes, costs are
// computed later for the requested transport mode. Shortcut (off-road) edges are
// added once using the walk config so they are available when walking.
// ---------------------------------------------------------------------------
export function buildRoadNetwork(roads, shortcutConfig = TRANSPORT_CONFIGS.walk) {
  const getKey = (coord) => `${coord[0].toFixed(5)},${coord[1].toFixed(5)}`;
  const vertices = new Map();
  const graph = {};
  const connectedPairs = new Set();

  const getMultiplier = (multipliers, type) => multipliers[type] || multipliers.plain || 1.0;

  const addVertex = (key, coord, road) => {
    if (!vertices.has(key)) vertices.set(key, { coord, roads: [] });
    vertices.get(key).roads.push(road);
  };

  const addEdge = (k1, k2, raw) => {
    if (!graph[k1]) graph[k1] = [];
    if (!graph[k2]) graph[k2] = [];
    graph[k1].push({ toKey: k2, raw });
    graph[k2].push({ toKey: k1, raw });
  };

  // Build base road edges from the road geometries
  for (const road of roads) {
    const coords = road.geometry.coordinates;
    for (let i = 0; i < coords.length - 1; i++) {
      const p1 = coords[i];
      const p2 = coords[i + 1];
      const k1 = getKey(p1);
      const k2 = getKey(p2);
      addVertex(k1, p1, road);
      addVertex(k2, p2, road);
      const dist = getDistance(p1, p2);
      const raw = {
        ...road,
        name: road.name || 'Unnamed Road',
        is_off_road: false,
        geometry: { type: 'LineString', coordinates: [p1, p2] },
        segment_length: dist
      };
      addEdge(k1, k2, raw);
      connectedPairs.add([k1, k2].sort().join('|'));
    }
  }

  // Add limited cross-country shortcuts for walking
  if (shortcutConfig && shortcutConfig.useDirectnessRouting) {
    const grid = new Map();
    const gridKey = ([lng, lat]) =>
      `${Math.floor(lng / WALK_SHORTCUT_GRID_DEGREES)},${Math.floor(lat / WALK_SHORTCUT_GRID_DEGREES)}`;

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
            if (distance <= WALK_SHORTCUT_MAX_DISTANCE_M && distance > 0) {
              candidates.push({ candidateKey, distance });
            }
          }
        }
      }

      candidates.sort((a, b) => a.distance - b.distance);
      for (const { candidateKey, distance } of candidates.slice(0, WALK_SHORTCUTS_PER_VERTEX)) {
        const pairKey = [key, candidateKey].sort().join('|');
        if (shortcutPairs.has(pairKey)) continue;
        const candidate = vertices.get(candidateKey);
        const localRoads = [...vertex.roads, ...candidate.roads];
        const biomeRoad = localRoads.reduce(
          (slowest, road) =>
            getMultiplier(shortcutConfig.biomeMultipliers, road.biome_type) <
            getMultiplier(shortcutConfig.biomeMultipliers, slowest.biome_type)
              ? road
              : slowest,
          localRoads[0]
        );
        const elevationRoad = localRoads.reduce(
          (slowest, road) =>
            getMultiplier(shortcutConfig.elevationMultipliers, road.altitude_type) <
            getMultiplier(shortcutConfig.elevationMultipliers, slowest.altitude_type)
              ? road
              : slowest,
          localRoads[0]
        );
        const raw = {
          id: null,
          name: 'Cross-country',
          terrain_type: 'off_road',
          is_off_road: true,
          biome_type: biomeRoad.biome_type,
          altitude_type: elevationRoad.altitude_type,
          geometry: { type: 'LineString', coordinates: [vertex.coord, candidate.coord] },
          segment_length: distance
        };
        addEdge(key, candidateKey, raw);
        shortcutPairs.add(pairKey);
      }
    }
  }

  let edgeCount = 0;
  for (const key in graph) edgeCount += graph[key].length;

  return { vertices, graph, getKey, vertexCount: vertices.size, edgeCount };
}

// ---------------------------------------------------------------------------
// Dijkstra on the cached graph, with per-mode cost calculation
// ---------------------------------------------------------------------------
function getEdgeCost(raw, config) {
  if (raw.is_off_road && !config.useDirectnessRouting) return Infinity;

  const roadName = raw.is_off_road ? 'off_road' : (raw.name || 'Regular Road');
  const roadMult =
    config.roadMultipliers[roadName] || config.roadMultipliers['Regular Road'] || 1.0;
  const biomeMult =
    config.biomeMultipliers[raw.biome_type] || config.biomeMultipliers.plain || 1.0;
  const elevMult =
    config.elevationMultipliers[raw.altitude_type] ||
    config.elevationMultipliers.plain ||
    1.0;

  if (config.useDirectnessRouting) {
    return raw.segment_length / (roadMult * biomeMult * elevMult);
  }
  return raw.segment_length / (config.baseSpeed * roadMult * biomeMult * elevMult);
}

function runDijkstra(roadNetwork, startCoord, endCoord, config) {
  const { vertices, graph } = roadNetwork;

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
    return { key: closestKey, coord: closestKey ? vertices.get(closestKey).coord : null };
  };

  const startVertex = getClosestVertex(startCoord);
  const endVertex = getClosestVertex(endCoord);
  if (!startVertex.key || !endVertex.key) return null;

  const startKey = startVertex.key;
  const endKey = endVertex.key;
  if (startKey === endKey) {
    return {
      path: [],
      startVertexCoord: startVertex.coord,
      endVertexCoord: endVertex.coord
    };
  }

  const distances = {};
  const previous = {};
  const heap = new BinaryHeap();

  for (const key of vertices.keys()) distances[key] = Infinity;
  distances[startKey] = 0;
  heap.push(startKey, 0);

  while (!heap.isEmpty()) {
    const { key: currentKey, dist: currentDist } = heap.pop();
    if (currentDist > distances[currentKey]) continue;
    if (currentKey === endKey) break;

    for (const edge of graph[currentKey] || []) {
      if (!config.useDirectnessRouting && edge.raw.is_off_road) continue;
      const cost = getEdgeCost(edge.raw, config);
      if (!isFinite(cost)) continue;
      const alt = currentDist + cost;
      if (alt < distances[edge.toKey]) {
        distances[edge.toKey] = alt;
        previous[edge.toKey] = { key: currentKey, raw: edge.raw };
        heap.push(edge.toKey, alt);
      }
    }
  }

  if (distances[endKey] === Infinity) return null;

  const path = [];
  let curr = endKey;
  while (previous[curr]) {
    const prevNode = previous[curr];
    const raw = prevNode.raw;
    const roadName = raw.is_off_road ? 'Cross-country' : (raw.name || 'Unnamed Road');
    const roadMult =
      config.roadMultipliers[raw.is_off_road ? 'off_road' : (raw.name || 'Regular Road')] ||
      config.roadMultipliers['Regular Road'] ||
      1.0;
    const biomeMult =
      config.biomeMultipliers[raw.biome_type] || config.biomeMultipliers.plain || 1.0;
    const elevMult =
      config.elevationMultipliers[raw.altitude_type] ||
      config.elevationMultipliers.plain ||
      1.0;
    const effectiveSpeed = config.baseSpeed * roadMult * biomeMult * elevMult;

    path.unshift({
      ...raw,
      name: roadName,
      segment_length: raw.segment_length,
      effective_speed: effectiveSpeed,
      travel_time_seconds: raw.segment_length / effectiveSpeed
    });
    curr = prevNode.key;
  }

  return {
    path,
    startVertexCoord: startVertex.coord,
    endVertexCoord: endVertex.coord
  };
}

// Convenience wrapper used by tests / one-off callers
export function findShortestPath(roads, startCoord, endCoord, config) {
  const network = buildRoadNetwork(roads, config);
  return runDijkstra(network, startCoord, endCoord, config);
}

/**
 * Compute a hybrid shortest-path route between two coordinates.
 * Returns the same structure used by the /api/directions endpoint.
 */
export async function computeRoute({ startLng, startLat, endLng, endLat, transportMode = 'walk' }) {
  const config = TRANSPORT_CONFIGS[transportMode] || TRANSPORT_CONFIGS.walk;

  // 1. Use the cached road network (built once, reused by all requests)
  const roadNetwork = await getRoadNetwork();

  // 2. Find shortest path on the road network
  const routeResult = runDijkstra(roadNetwork, [startLng, startLat], [endLng, endLat], config);

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
