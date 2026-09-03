import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import pool from './db.js';
import locationsRouter from './domains/map/routes/locations.js';
import regionsRouter from './domains/map/routes/regions.js';
import biomesRouter from './domains/map/routes/biomes.js';
import altitudeRouter from './domains/map/routes/altitude.js';
import roadsRouter from './domains/map/routes/roads.js';
import waterRouter from './domains/map/routes/water.js';
import peaksRouter from './domains/map/routes/peaks.js';
import demRouter from './domains/map/routes/dem.js';
import climateRouter from './domains/map/routes/climate.js';
import searchRouter from './domains/map/routes/search.js';
import directionsRouter from './domains/map/routes/directions.js';
import { getRoadNetwork } from './domains/map/services/world/routing.js';
import characterRouter from './domains/game/routes/character.js';
import tripsRouter from './domains/game/routes/trips.js';
import usersRouter from './domains/game/routes/users.js';
import authRouter from './domains/game/routes/auth.js';

dotenv.config();

// Fail fast if critical secrets are missing — don't let JWT sign with
// an undefined secret that anyone can forge.
if (!process.env.JWT_SECRET) {
  console.error('FATAL: JWT_SECRET is not set. Refusing to start.');
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 5000;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());

// Rate limiting for auth endpoints — prevent brute-force and account spam
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,                    // 5 registrations per hour per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many registration attempts. Please try again later.' },
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 10,                   // 10 login attempts per 15 min per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Please try again later.' },
});

// Routes
app.use('/api/locations', locationsRouter);
app.use('/api/regions', regionsRouter);
app.use('/api/biomes', biomesRouter);
app.use('/api/altitude', altitudeRouter);
app.use('/api/roads', roadsRouter);
app.use('/api/water', waterRouter);
app.use('/api/peaks', peaksRouter);
app.use('/api/dem', demRouter);
app.use('/api/climate', climateRouter);
app.use('/api/search', searchRouter);
app.use('/api/directions', directionsRouter);
app.use('/api/character', characterRouter);
app.use('/api/trips', tripsRouter);
// Auth rate limiting — applied before the router so it covers the path prefix
app.use('/api/auth/register', registerLimiter);
app.use('/api/auth/login', loginLimiter);
app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW(), COUNT(*) as locations FROM locations');
    res.json({
      status: 'healthy',
      database: 'connected',
      timestamp: result.rows[0].now,
      locations: result.rows[0].locations
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      database: 'disconnected',
      error: error.message
    });
  }
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Middle Earth GIS API',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      locations: '/api/locations',
      regions: '/api/regions',
      biomes: '/api/biomes',
      altitude: '/api/altitude',
      roads: '/api/roads',
      water: '/api/water',
      peaks: '/api/peaks',
      dem: '/api/dem',
      climate: '/api/climate',
      search: '/api/search'
    }
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  console.log(`📍 Locations: http://localhost:${PORT}/api/locations`);
  console.log(`🗺️  Regions: http://localhost:${PORT}/api/regions`);
  console.log(`🌿 Biomes: http://localhost:${PORT}/api/biomes`);
  console.log(`⛰️  Altitude: http://localhost:${PORT}/api/altitude`);
  console.log(`🛣️  Roads: http://localhost:${PORT}/api/roads`);
  console.log(`💧 Water: http://localhost:${PORT}/api/water`);
  console.log(`🔺 Peaks: http://localhost:${PORT}/api/peaks`);
  console.log(`🏔️  DEM: http://localhost:${PORT}/api/dem`);

  // Preload the route graph in the background so /api/directions doesn't have to
  // pay the build cost on the first request.
  getRoadNetwork().catch((err) => {
    console.error('Failed to preload road network:', err);
  });
});
