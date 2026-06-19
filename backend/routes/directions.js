import express from 'express';
import pool from '../db.js';

const router = express.Router();

// Haversine distance between two coordinates in meters
const getDistance = (c1, c2) => {
  const R = 6371000;
  const dLat = (c2[1] - c1[1]) * Math.PI / 180;
  const dLon = (c2[0] - c1[0]) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(c1[1] * Math.PI / 180) * Math.cos(c2[1] * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

// Dijkstra's algorithm for shortest path routing in JavaScript
function findShortestPath(roads, startCoord, endCoord) {
  const getKey = (coord) => `${coord[0].toFixed(5)},${coord[1].toFixed(5)}`;
  const graph = {};
  
  const addEdge = (p1, p2, road, segmentLength) => {
    const k1 = getKey(p1);
    const k2 = getKey(p2);
    if (!graph[k1]) graph[k1] = [];
    if (!graph[k2]) graph[k2] = [];
    
    const cost = segmentLength * (parseFloat(road.difficulty) || 1.0);
    
    // Store sub-segment geometry so we can reconstruct the exact path
    const segmentRoad = {
      ...road,
      geometry: {
        type: 'LineString',
        coordinates: [p1, p2]
      },
      segment_length: segmentLength
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
    
    // Since every vertex in every road is now a node in the graph,
    // we find the closest native node in the graph keys
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

// GET /api/directions - Return hybrid shortest path routing
router.get('/', async (req, res, next) => {
  try {
    const { start_lng, start_lat, end_lng, end_lat } = req.query;

    if (!start_lng || !start_lat || !end_lng || !end_lat) {
      return res.status(400).json({ error: 'Missing start or end coordinates' });
    }

    const startLng = parseFloat(start_lng);
    const startLat = parseFloat(start_lat);
    const endLng = parseFloat(end_lng);
    const endLat = parseFloat(end_lat);

    if (isNaN(startLng) || isNaN(startLat) || isNaN(endLng) || isNaN(endLat)) {
      return res.status(400).json({ error: 'Invalid coordinates' });
    }

    // 1. Fetch all roads from database
    const roadsQuery = `
      SELECT 
        id, 
        name, 
        terrain_type, 
        difficulty, 
        cost_factor,
        ST_AsGeoJSON(geom)::json as geometry,
        ST_Length(geom::geography) as segment_length
      FROM roads;
    `;
    const roadsRes = await pool.query(roadsQuery);
    const roads = roadsRes.rows;

    // 2. Find shortest path on road network
    const routeResult = findShortestPath(roads, [startLng, startLat], [endLng, endLat]);

    if (!routeResult) {
      return res.status(404).json({ error: 'No route found between coordinates' });
    }

    const { path, startVertexCoord, endVertexCoord } = routeResult;

    // 3. Calculate spatial distances using PostGIS for precise geography lengths
    const distancesQuery = `
      SELECT 
        ST_AsGeoJSON(ST_MakeLine(ST_SetSRID(ST_MakePoint($1, $2), 4326), ST_SetSRID(ST_MakePoint($3, $4), 4326)))::json as off_road_start_geom,
        ST_Length(ST_MakeLine(ST_SetSRID(ST_MakePoint($1, $2), 4326), ST_SetSRID(ST_MakePoint($3, $4), 4326))::geography) as off_road_start_length,
        
        ST_AsGeoJSON(ST_MakeLine(ST_SetSRID(ST_MakePoint($5, $6), 4326), ST_SetSRID(ST_MakePoint($7, $8), 4326)))::json as off_road_end_geom,
        ST_Length(ST_MakeLine(ST_SetSRID(ST_MakePoint($5, $6), 4326), ST_SetSRID(ST_MakePoint($7, $8), 4326))::geography) as off_road_end_length;
    `;
    const distRes = await pool.query(distancesQuery, [
      startLng, startLat, startVertexCoord[0], startVertexCoord[1],
      endVertexCoord[0], endVertexCoord[1], endLng, endLat
    ]);
    const geoData = distRes.rows[0];

    const offRoadStartDistance = parseFloat(geoData.off_road_start_length) || 0;
    const offRoadEndDistance = parseFloat(geoData.off_road_end_length) || 0;
    const onRoadDistance = path.reduce((sum, r) => sum + (parseFloat(r.segment_length) || 0), 0);
    const totalDistance = offRoadStartDistance + onRoadDistance + offRoadEndDistance;

    // 4. Estimate travel times
    const baseOnRoadSpeed = 1.39; // 5 km/h in m/s
    const baseOffRoadSpeed = 0.97; // 3.5 km/h in m/s

    const offRoadStartTime = offRoadStartDistance / baseOffRoadSpeed;
    const offRoadEndTime = offRoadEndDistance / baseOffRoadSpeed;
    
    let onRoadTime = 0;
    path.forEach(r => {
      const length = parseFloat(r.segment_length) || 0;
      const difficulty = parseFloat(r.difficulty) || 1;
      const speedModifier = Math.max(0.2, 1.2 - (difficulty * 0.2)); 
      onRoadTime += length / (baseOnRoadSpeed * speedModifier);
    });

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
          segment_length: parseFloat(r.segment_length) || 0
        }
      }))
    };

    res.json({
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
          properties: { type: 'off_road', distance_m: offRoadStartDistance }
        } : null,
        on_road: onRoadFeatures,
        off_road_end: offRoadEndDistance > 1 ? {
          type: 'Feature',
          geometry: geoData.off_road_end_geom,
          properties: { type: 'off_road', distance_m: offRoadEndDistance }
        } : null
      }
    });

  } catch (error) {
    next(error);
  }
});

export default router;
