import express from 'express';
import pool from '../db.js';

const router = express.Router();

// GET /api/climate/current - Obtiene datos del clima de la fecha/hora actual (mapeado a 1950)
router.get('/current', async (req, res, next) => {
  try {
    const { region_id, timestamp } = req.query;
    if (!region_id) {
      return res.status(400).json({ error: 'region_id is required' });
    }

    // Calcular timestamp: usar el proporcionado o mapear fecha actual a 1950
    let timestamp1950;
    if (timestamp) {
      const customDate = new Date(timestamp);
      if (isNaN(customDate.getTime())) {
        return res.status(400).json({ error: 'Invalid timestamp format' });
      }
      const month = String(customDate.getUTCMonth() + 1).padStart(2, '0');
      const day = String(customDate.getUTCDate()).padStart(2, '0');
      const hour = String(customDate.getUTCHours()).padStart(2, '0');
      timestamp1950 = `1950-${month}-${day} ${hour}:00:00`;
    } else {
      // Calcular la fecha y hora actuales pero en el año 1950 (UTC para alinearse con los datos descargados)
      const now = new Date();
      const month = String(now.getUTCMonth() + 1).padStart(2, '0');
      const day = String(now.getUTCDate()).padStart(2, '0');
      const hour = String(now.getUTCHours()).padStart(2, '0');
      timestamp1950 = `1950-${month}-${day} ${hour}:00:00`;
    }

    // Consulta para obtener los datos climáticos de 1950 y metadatos de la región
    const query = `
      SELECT 
        r.id as region_id,
        r.name as region_name,
        cz.koppen,
        cz.analog_location,
        cz.analog_lat,
        cz.analog_lon,
        cz."desc" as climate_description,
        cz.temperature as temperature_pattern,
        cz.precipitation as precipitation_pattern,
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
      LEFT JOIN climate_zones cz ON r.climate_zone_id = cz.id
      LEFT JOIN climate_data cd ON r.climate_zone_id = cd.climate_zone_id AND cd.time = $1
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
      SELECT
        r.id as region_id,
        r.name as region_name,
        cz.koppen,
        cz.analog_location,
        cz.analog_lat,
        cz.analog_lon,
        cz."desc" as climate_description,
        cz.temperature as temperature_pattern,
        cz.precipitation as precipitation_pattern
      FROM regions r
      LEFT JOIN climate_zones cz ON r.climate_zone_id = cz.id
      WHERE r.id = $1
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
      WHERE climate_zone_id = (SELECT climate_zone_id FROM regions WHERE id = $1)
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

// GET /api/climate/point - Obtiene datos climáticos en un punto con zonas de transición
router.get('/point', async (req, res, next) => {
  try {
    const { lon, lat, timestamp } = req.query;

    // Validar parámetros requeridos
    if (!lon || !lat) {
      return res.status(400).json({ error: 'lon and lat are required' });
    }

    const lonNum = parseFloat(lon);
    const latNum = parseFloat(lat);

    if (isNaN(lonNum) || isNaN(latNum)) {
      return res.status(400).json({ error: 'lon and lat must be valid numbers' });
    }

    if (lonNum < -180 || lonNum > 180 || latNum < -90 || latNum > 90) {
      return res.status(400).json({ error: 'lon must be between -180 and 180, lat between -90 and 90' });
    }

    // Calcular timestamp: usar el proporcionado o mapear fecha actual a 1950
    let queryTimestamp;
    if (timestamp) {
      queryTimestamp = new Date(timestamp);
      if (isNaN(queryTimestamp.getTime())) {
        return res.status(400).json({ error: 'Invalid timestamp format' });
      }
      // Formatear a YYYY-MM-DD HH:00:00
      const year = queryTimestamp.getUTCFullYear();
      const month = String(queryTimestamp.getUTCMonth() + 1).padStart(2, '0');
      const day = String(queryTimestamp.getUTCDate()).padStart(2, '0');
      const hour = String(queryTimestamp.getUTCHours()).padStart(2, '0');
      queryTimestamp = `${year}-${month}-${day} ${hour}:00:00`;
    } else {
      // Mapear fecha/hora actual a 1950
      const now = new Date();
      const month = String(now.getUTCMonth() + 1).padStart(2, '0');
      const day = String(now.getUTCDate()).padStart(2, '0');
      const hour = String(now.getUTCHours()).padStart(2, '0');
      queryTimestamp = `1950-${month}-${day} ${hour}:00:00`;
    }

    // Llamar a la función PostGIS de transición
    const query = `
      SELECT get_climate_at_point_with_transition($1, $2, $3) as result
    `;

    const result = await pool.query(query, [lonNum, latNum, queryTimestamp]);

    if (result.rows.length === 0 || !result.rows[0].result) {
      return res.status(404).json({ error: 'No climate data found for this point' });
    }

    const climateResult = result.rows[0].result;

    // Verificar si hay error en el resultado
    if (climateResult.error) {
      return res.status(404).json(climateResult);
    }

    res.json(climateResult);
  } catch (error) {
    next(error);
  }
});

// GET /api/climate/all-regions - Obtiene datos climáticos de todas las regiones para un timestamp específico
router.get('/all-regions', async (req, res, next) => {
  try {
    const { timestamp } = req.query;

    // Calcular timestamp: usar el proporcionado o mapear fecha actual a 1950
    let timestamp1950;
    if (timestamp) {
      const customDate = new Date(timestamp);
      if (isNaN(customDate.getTime())) {
        return res.status(400).json({ error: 'Invalid timestamp format' });
      }
      const month = String(customDate.getUTCMonth() + 1).padStart(2, '0');
      const day = String(customDate.getUTCDate()).padStart(2, '0');
      const hour = String(customDate.getUTCHours()).padStart(2, '0');
      timestamp1950 = `1950-${month}-${day} ${hour}:00:00`;
    } else {
      // Calcular la fecha y hora actuales pero en el año 1950
      const now = new Date();
      const month = String(now.getUTCMonth() + 1).padStart(2, '0');
      const day = String(now.getUTCDate()).padStart(2, '0');
      const hour = String(now.getUTCHours()).padStart(2, '0');
      timestamp1950 = `1950-${month}-${day} ${hour}:00:00`;
    }

    // Consulta para obtener datos climáticos de todas las regiones
    const query = `
      SELECT 
        r.id as region_id,
        r.name as region_name,
        cd.time,
        cd.temperature_2m,
        cd.relative_humidity_2m,
        cd.precipitation,
        cd.wind_speed_10m,
        cd.cloud_cover
      FROM regions r
      LEFT JOIN climate_zones cz ON r.climate_zone_id = cz.id
      LEFT JOIN climate_data cd ON cz.id = cd.climate_zone_id AND cd.time = $1
      WHERE r.climate_zone_id IS NOT NULL
      ORDER BY r.id
    `;

    const result = await pool.query(query, [timestamp1950]);
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

export default router;
