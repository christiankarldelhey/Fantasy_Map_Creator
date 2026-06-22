import express from 'express';
import { computeRoute } from '../services/routing.js';

const router = express.Router();

// GET /api/directions - Return hybrid shortest path routing
router.get('/', async (req, res, next) => {
  try {
    const { start_lng, start_lat, end_lng, end_lat, transport_mode } = req.query;

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

    const route = await computeRoute({
      startLng,
      startLat,
      endLng,
      endLat,
      transportMode: transport_mode || 'walk'
    });

    if (!route) {
      return res.status(404).json({ error: 'No route found between coordinates' });
    }

    res.json(route);
  } catch (error) {
    next(error);
  }
});

export default router;
