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
    roadMultipliers: {
      'Royal Road': 1.2,
      'Main Road': 1.1,
      'Regular Road': 1.0,
      'Trail': 0.8,
      'off_road': 0.6
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

// Dijkstra's algorithm for shortest path routing in JavaScript
export function findShortestPath(roads, startCoord, endCoord, config) {
  const getKey = (coord) => `${coord[0].toFixed(5)},${coord[1].toFixed(5)}`;
  const graph = {};

  const addEdge = (p1, p2, road, segmentLength) => {
    const k1 = getKey(p1);
    const k2 = getKey(p2);
    if (!graph[k1]) graph[k1] = [];
    if (!graph[k2]) graph[k2] = [];

    // Calculate speed based on road, biome and altitude multipliers
    const roadName = road.name || 'Regular Road';
    const roadMult = config.roadMultipliers[roadName] || config.roadMultipliers['Regular Road'] || 1.0;
    const biomeMult = config.biomeMultipliers[road.biome_type] || config.biomeMultipliers['plain'] || 1.0;
    const elevMult = config.elevationMultipliers[road.altitude_type] || config.elevationMultipliers['plain'] || 1.0;

    const speed = config.baseSpeed * roadMult * biomeMult * elevMult;
    const cost = segmentLength / speed; // Cost is travel time in seconds

    // Store sub-segment geometry so we can reconstruct the exact path
    const segmentRoad = {
      ...road,
      geometry: {
        type: 'LineString',
        coordinates: [p1, p2]
      },
      segment_length: segmentLength,
      effective_speed: speed,
      travel_time_seconds: cost
    };

    graph[k1].push({ toKey: k2, roadId: road.id, cost, road: segmentRoad });
    graph[k2].push({ toKey: k1, roadId: road.id, cost, road: segmentRoad });
  };

  // Build graph with ALL consecutive coordinate pairs of each road
  roads.forEach(road => {
    const coords = road.geometry.coordinates;
    for (let i = 0; i < coords.length - 1; i++) {
      const p1 = coords[i];
      const p2 = coords[i + 1];
      const segmentLength = getDistance(p1, p2);
      addEdge(p1, p2, road, segmentLength);
    }
  });

  const getClosestVertex = (target) => {
    let closestKey = null;
    let minDist = Infinity;

    Object.keys(graph).forEach(key => {
      const [lng, lat] = key.split(',').map(Number);
      const dist = Math.sqrt(Math.pow(lng - target[0], 2) + Math.pow(lat - target[1], 2));
      if (dist < minDist) {
        minDist = dist;
        closestKey = key;
      }
    });

    return { key: closestKey, dist: minDist };
  };

  const startVertex = getClosestVertex(startCoord);
  const endVertex = getClosestVertex(endCoord);

  if (!startVertex.key || !endVertex.key) return null;

  const startKey = startVertex.key;
  const endKey = endVertex.key;

  if (startKey === endKey) {
    return {
      path: [],
      startVertexCoord: startKey.split(',').map(Number),
      endVertexCoord: endKey.split(',').map(Number),
    };
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

    const neighbors = graph[currentKey] || [];
    for (const edge of neighbors) {
      if (visited.has(edge.toKey)) continue;
      const alt = distances[currentKey] + edge.cost;
      if (alt < distances[edge.toKey]) {
        distances[edge.toKey] = alt;
        previous[edge.toKey] = { key: currentKey, road: edge.road };
        queue.push({ key: edge.toKey, dist: alt });
      }
    }
  }

  if (distances[endKey] === Infinity) {
    return null;
  }

  const path = [];
  let curr = endKey;
  while (previous[curr]) {
    const prevNode = previous[curr];
    path.unshift(prevNode.road);
    curr = prevNode.key;
  }

  return {
    path,
    startVertexCoord: startKey.split(',').map(Number),
    endVertexCoord: endKey.split(',').map(Number),
  };
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
  const onRoadDistance = path.reduce((sum, r) => sum + (parseFloat(r.segment_length) || 0), 0);
  const totalDistance = offRoadStartDistance + onRoadDistance + offRoadEndDistance;

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
  const onRoadFeatures = {
    type: 'FeatureCollection',
    features: path.map((r, index) => ({
      type: 'Feature',
      geometry: r.geometry,
      properties: {
        id: r.id,
        seq: index + 1,
        name: r.name || 'Unnamed Road',
        terrain_type: r.terrain_type,
        difficulty: r.difficulty,
        cost_factor: r.cost_factor,
        segment_length: parseFloat(r.segment_length) || 0,
        biome_type: r.biome_type,
        altitude_type: r.altitude_type,
        effective_speed: r.effective_speed,
        travel_time_seconds: r.travel_time_seconds
      }
    }))
  };

  return {
    summary: {
      total_distance_m: totalDistance,
      total_distance_km: totalDistance / 1000,
      on_road_distance_km: onRoadDistance / 1000,
      off_road_distance_km: (offRoadStartDistance + offRoadEndDistance) / 1000,
      total_time_seconds: totalTimeSeconds,
      total_time_hours: totalTimeSeconds / 3600,
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
    }
  };
}
