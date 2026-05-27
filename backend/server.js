import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pool from './db.js';
import locationsRouter from './routes/locations.js';
import regionsRouter from './routes/regions.js';
import biomesRouter from './routes/biomes.js';
import altitudeRouter from './routes/altitude.js';
import pathsRouter from './routes/paths.js';
import demRouter from './routes/dem.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());

// Routes
app.use('/api/locations', locationsRouter);
app.use('/api/regions', regionsRouter);
app.use('/api/biomes', biomesRouter);
app.use('/api/altitude', altitudeRouter);
app.use('/api/paths', pathsRouter);
app.use('/api/dem', demRouter);

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
      paths: '/api/paths',
      dem: '/api/dem'
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
  console.log(`🛣️  Paths: http://localhost:${PORT}/api/paths`);
  console.log(`🏔️  DEM: http://localhost:${PORT}/api/dem`);
});
