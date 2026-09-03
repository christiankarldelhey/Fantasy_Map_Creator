import express from 'express';
import pool from '../../../db.js';

const router = express.Router();

// Bounds for /profile: the endpoint is public, so a single request must not be
// able to fan out into an unbounded number of database queries.
const MAX_PATH_COORDINATES = 500;
const MAX_PROFILE_POINTS = 200;
const MIN_PROFILE_INTERVAL_METERS = 100;

// GET /api/dem/elevation?lon=X&lat=Y
// Get elevation at a specific point
router.get('/elevation', async (req, res, next) => {
  try {
    const { lon, lat } = req.query;
    
    if (!lon || !lat) {
      return res.status(400).json({ 
        error: 'Missing required parameters: lon and lat' 
      });
    }
    
    const query = `
      SELECT get_elevation_at_point($1, $2) as elevation;
    `;
    
    const result = await pool.query(query, [parseFloat(lon), parseFloat(lat)]);
    
    // Get terrain type from altitude_layers
    const terrainQuery = `
      SELECT altitude_type
      FROM altitude_layers
      WHERE ST_Contains(geom, ST_SetSRID(ST_MakePoint($1, $2), 4326))
      ORDER BY priority DESC
      LIMIT 1;
    `;
    
    const terrainResult = await pool.query(terrainQuery, [parseFloat(lon), parseFloat(lat)]);
    const terrainType = terrainResult.rows.length > 0 ? terrainResult.rows[0].altitude_type : null;
    
    res.json({ 
      lon: parseFloat(lon),
      lat: parseFloat(lat),
      elevation: result.rows[0].elevation || 0,
      unit: 'meters',
      terrain_type: terrainType
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/dem/profile?path=[[lon,lat],[lon,lat],...]
// Get elevation profile along a path
router.get('/profile', async (req, res, next) => {
  try {
    const { path } = req.query;
    
    if (!path) {
      return res.status(400).json({ 
        error: 'Missing required parameter: path' 
      });
    }
    
    let coordinates;
    try {
      coordinates = JSON.parse(path);
    } catch {
      return res.status(400).json({ error: 'Path must be valid JSON' });
    }
    
    if (!Array.isArray(coordinates) || coordinates.length < 2) {
      return res.status(400).json({ 
        error: 'Path must be an array of at least 2 coordinate pairs' 
      });
    }
    
    if (coordinates.length > MAX_PATH_COORDINATES) {
      return res.status(400).json({
        error: `Path cannot exceed ${MAX_PATH_COORDINATES} coordinate pairs`
      });
    }
    
    if (!coordinates.every(isValidCoordinate)) {
      return res.status(400).json({
        error: 'Path must contain [lon, lat] pairs of numbers within valid ranges'
      });
    }
    
    // Sample at 100m, but widen the interval on long paths so the number of
    // points stays bounded. A cross-map route would otherwise interpolate tens
    // of thousands of points and hold a pool connection for minutes.
    const pathLength = totalPathLength(coordinates);
    const interval = Math.max(MIN_PROFILE_INTERVAL_METERS, pathLength / MAX_PROFILE_POINTS);
    const interpolatedPoints = interpolatePath(coordinates, interval);
    
    // One round trip for every point instead of one per point
    const elevationResult = await pool.query(
      `SELECT get_elevation_at_point(p.lon, p.lat) as elevation
       FROM unnest($1::double precision[], $2::double precision[]) AS p(lon, lat);`,
      [interpolatedPoints.map(p => p[0]), interpolatedPoints.map(p => p[1])]
    );
    
    const profile = [];
    let cumulativeDistance = 0;
    
    for (let i = 0; i < interpolatedPoints.length; i++) {
      const [lon, lat] = interpolatedPoints[i];
      
      if (i > 0) {
        const [prevLon, prevLat] = interpolatedPoints[i - 1];
        cumulativeDistance += haversineDistance(prevLon, prevLat, lon, lat);
      }
      
      profile.push({
        lon,
        lat,
        elevation: elevationResult.rows[i]?.elevation || 0,
        distance: Math.round(cumulativeDistance)
      });
    }
    
    // Calculate statistics
    const elevations = profile.map(p => p.elevation);
    const elevationGain = calculateElevationGain(elevations);
    const elevationLoss = calculateElevationLoss(elevations);
    
    res.json({
      profile,
      statistics: {
        totalDistance: Math.round(cumulativeDistance),
        minElevation: Math.min(...elevations),
        maxElevation: Math.max(...elevations),
        elevationGain,
        elevationLoss,
        sampleInterval: Math.round(interval),
        unit: 'meters'
      }
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/dem/stats
// Get DEM statistics
router.get('/stats', async (req, res, next) => {
  try {
    const query = `
      SELECT 
        (ST_SummaryStats(rast)).*,
        ST_Width(rast) as width,
        ST_Height(rast) as height,
        ST_ScaleX(rast) as pixel_width,
        ST_ScaleY(rast) as pixel_height
      FROM dem_elevation
      LIMIT 1;
    `;
    
    const result = await pool.query(query);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ 
        error: 'DEM not found. Please generate the DEM first.' 
      });
    }
    
    const stats = result.rows[0];
    
    res.json({
      count: stats.count,
      sum: stats.sum,
      mean: Math.round(stats.mean),
      stddev: Math.round(stats.stddev),
      min: Math.round(stats.min),
      max: Math.round(stats.max),
      dimensions: {
        width: stats.width,
        height: stats.height,
        pixelWidth: stats.pixel_width,
        pixelHeight: stats.pixel_height
      },
      unit: 'meters'
    });
  } catch (error) {
    next(error);
  }
});

// Helper functions

function isValidCoordinate(coordinate) {
  if (!Array.isArray(coordinate) || coordinate.length < 2) return false;
  const [lon, lat] = coordinate;
  // typeof checks matter: Number(null) and Number('') are 0, which would let
  // junk coordinates through as [0, 0].
  return typeof lon === 'number' && Number.isFinite(lon) && lon >= -180 && lon <= 180
    && typeof lat === 'number' && Number.isFinite(lat) && lat >= -90 && lat <= 90;
}

function totalPathLength(coordinates) {
  let length = 0;
  for (let i = 0; i < coordinates.length - 1; i++) {
    const [lon1, lat1] = coordinates[i];
    const [lon2, lat2] = coordinates[i + 1];
    length += haversineDistance(lon1, lat1, lon2, lat2);
  }
  return length;
}

function interpolatePath(coordinates, intervalMeters = 100) {
  const interpolated = [coordinates[0]];
  
  for (let i = 0; i < coordinates.length - 1; i++) {
    const [lon1, lat1] = coordinates[i];
    const [lon2, lat2] = coordinates[i + 1];
    
    const segmentDistance = haversineDistance(lon1, lat1, lon2, lat2);
    const numPoints = Math.ceil(segmentDistance / intervalMeters);
    
    for (let j = 1; j <= numPoints; j++) {
      const t = j / numPoints;
      const lon = lon1 + (lon2 - lon1) * t;
      const lat = lat1 + (lat2 - lat1) * t;
      interpolated.push([lon, lat]);
    }
  }
  
  return interpolated;
}

function haversineDistance(lon1, lat1, lon2, lat2) {
  const R = 6371000; // Earth radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;
  
  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  return R * c;
}

function calculateElevationGain(elevations) {
  let gain = 0;
  for (let i = 1; i < elevations.length; i++) {
    const diff = elevations[i] - elevations[i - 1];
    if (diff > 0) gain += diff;
  }
  return Math.round(gain);
}

function calculateElevationLoss(elevations) {
  let loss = 0;
  for (let i = 1; i < elevations.length; i++) {
    const diff = elevations[i] - elevations[i - 1];
    if (diff < 0) loss += Math.abs(diff);
  }
  return Math.round(loss);
}

export default router;
