-- ============================================================================
-- Climate Data Migration
-- Purpose: Add climate metadata to regions table and create climate_data table
-- ============================================================================

-- Step 1: Add climate metadata columns to regions table
ALTER TABLE regions
    ADD COLUMN IF NOT EXISTS koppen VARCHAR(20),
    ADD COLUMN IF NOT EXISTS analog_location VARCHAR(255),
    ADD COLUMN IF NOT EXISTS analog_lat NUMERIC,
    ADD COLUMN IF NOT EXISTS analog_lon NUMERIC;

-- Add comments for documentation
COMMENT ON COLUMN regions.koppen IS 'Köppen climate classification code (e.g., Cfb, Csa, Dfc)';
COMMENT ON COLUMN regions.analog_location IS 'Real-world location with similar climate';
COMMENT ON COLUMN regions.analog_lat IS 'Latitude of the analog location';
COMMENT ON COLUMN regions.analog_lon IS 'Longitude of the analog location';

-- Step 2: Create climate_data table for hourly historical data
CREATE TABLE IF NOT EXISTS climate_data (
    id SERIAL PRIMARY KEY,
    region_id INTEGER NOT NULL REFERENCES regions(id) ON DELETE CASCADE,
    time TIMESTAMP NOT NULL,
    
    -- Hourly climate variables from ERA5/Open-Meteo
    temperature_2m NUMERIC,              -- Temperature at 2m above ground (°C)
    relative_humidity_2m NUMERIC,        -- Relative humidity at 2m (%)
    precipitation NUMERIC,                -- Total precipitation (mm)
    snowfall NUMERIC,                    -- Snowfall (mm)
    cloud_cover NUMERIC,                 -- Total cloud cover (%)
    wind_speed_10m NUMERIC,              -- Wind speed at 10m (km/h)
    wind_direction_10m NUMERIC,         -- Wind direction at 10m (degrees)
    surface_pressure NUMERIC,            -- Surface pressure (hPa)
    soil_moisture_0_to_7cm NUMERIC,      -- Soil moisture 0-7cm depth (m³/m³)
    et0_fao_evapotranspiration NUMERIC,  -- ET0 FAO Penman-Monteith (mm)
    shortwave_radiation NUMERIC,         -- Shortwave radiation (W/m²)
    
    -- Metadata
    created_at TIMESTAMP DEFAULT NOW()
);

-- Step 3: Create critical indexes for performance
-- Composite index for region_id + time - most common query pattern
CREATE INDEX IF NOT EXISTS idx_climate_data_region_time 
    ON climate_data(region_id, time);

-- Index for time-based queries across all regions
CREATE INDEX IF NOT EXISTS idx_climate_data_time 
    ON climate_data(time);

-- Index for individual region queries
CREATE INDEX IF NOT EXISTS idx_climate_data_region_id 
    ON climate_data(region_id);

-- Add comments for documentation
COMMENT ON TABLE climate_data IS 'Hourly historical climate data (ERA5) for Middle Earth regions';
COMMENT ON COLUMN climate_data.region_id IS 'Foreign key to regions table';
COMMENT ON COLUMN climate_data.time IS 'Timestamp of the hourly measurement';
COMMENT ON COLUMN climate_data.temperature_2m IS 'Temperature at 2 meters above ground (°C)';
COMMENT ON COLUMN climate_data.relative_humidity_2m IS 'Relative humidity at 2 meters (%)';
COMMENT ON COLUMN climate_data.precipitation IS 'Total precipitation (mm)';
COMMENT ON COLUMN climate_data.snowfall IS 'Snowfall amount (mm)';
COMMENT ON COLUMN climate_data.cloud_cover IS 'Total cloud coverage (%)';
COMMENT ON COLUMN climate_data.wind_speed_10m IS 'Wind speed at 10 meters (km/h)';
COMMENT ON COLUMN climate_data.wind_direction_10m IS 'Wind direction at 10 meters (degrees)';
COMMENT ON COLUMN climate_data.surface_pressure IS 'Surface pressure (hPa)';
COMMENT ON COLUMN climate_data.soil_moisture_0_to_7cm IS 'Soil moisture content at 0-7cm depth (m³/m³)';
COMMENT ON COLUMN climate_data.et0_fao_evapotranspiration IS 'Reference evapotranspiration (mm)';
COMMENT ON COLUMN climate_data.shortwave_radiation IS 'Shortwave solar radiation (W/m²)';

-- Step 4: Verification queries
-- Check if columns were added successfully
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns
WHERE table_name = 'regions' 
  AND column_name IN ('koppen', 'analog_location', 'analog_lat', 'analog_lon')
ORDER BY column_name;

-- Check if climate_data table was created
SELECT 
    table_name,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_name = 'climate_data'
ORDER BY ordinal_position;

-- Check if indexes were created
SELECT 
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'climate_data'
ORDER BY indexname;
