import express from 'express';
import pool from '../db.js';

const router = express.Router();

// GET /api/climate/current - Obtiene datos del clima de la fecha/hora actual (mapeado a 1950)
router.get('/current', async (req, res, next) => {
  try {
    const { region_id } = req.query;
    if (!region_id) {
      return res.status(400).json({ error: 'region_id is required' });
    }

    // Calcular la fecha y hora actuales pero en el año 1950 (UTC para alinearse con los datos descargados)
    const now = new Date();
    const month = String(now.getUTCMonth() + 1).padStart(2, '0');
    const day = String(now.getUTCDate()).padStart(2, '0');
    const hour = String(now.getUTCHours()).padStart(2, '0');
    const timestamp1950 = `1950-${month}-${day} ${hour}:00:00`;

    // Consulta para obtener los datos climáticos de 1950 y metadatos de la región
    const query = `
      SELECT 
        r.id as region_id,
        r.name as region_name,
        r.koppen,
        r.analog_location,
        r.analog_lat,
        r.analog_lon,
        cd.time,
        cd.temperature_2m,
        cd.relative_humidity_2m,
        cd.precipitation,
        cd.snowfall,
        cd.cloud_cover,
        cd.wind_speed_10m,
        cd.wind_direction_10m,
        cd.surface_pressure,
        cd.soil_moisture_0_to_7cm,
        cd.et0_fao_evapotranspiration,
        cd.shortwave_radiation
      FROM regions r
      LEFT JOIN climate_data cd ON r.id = cd.region_id AND cd.time = $1
      WHERE r.id = $2
    `;

    const result = await pool.query(query, [timestamp1950, region_id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Region not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// GET /api/climate/region/:regionId - Obtiene los metadatos y un resumen/promedio del clima de la región
router.get('/region/:regionId', async (req, res, next) => {
  try {
    const { regionId } = req.params;
    
    // Obtener metadatos y promedios anuales/mensuales simplificados
    const metadataQuery = `
      SELECT id as region_id, name as region_name, koppen, analog_location, analog_lat, analog_lon
      FROM regions
      WHERE id = $1
    `;
    
    const metadataResult = await pool.query(metadataQuery, [regionId]);
    if (metadataResult.rows.length === 0) {
      return res.status(404).json({ error: 'Region not found' });
    }

    const averagesQuery = `
      SELECT 
        ROUND(AVG(temperature_2m), 1) as avg_temp,
        ROUND(MAX(temperature_2m), 1) as max_temp,
        ROUND(MIN(temperature_2m), 1) as min_temp,
        ROUND(SUM(precipitation), 1) as total_precipitation,
        ROUND(AVG(relative_humidity_2m), 1) as avg_humidity
      FROM climate_data
      WHERE region_id = $1
    `;
    
    const averagesResult = await pool.query(averagesQuery, [regionId]);
    
    res.json({
      ...metadataResult.rows[0],
      stats: averagesResult.rows[0]
    });
  } catch (error) {
    next(error);
  }
});

export default router;
