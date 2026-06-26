-- Migration: Add route_completed column to trips table
-- Date: 2026-06-25
-- Description: Add route_completed column to track segments of the trip that have been traveled

ALTER TABLE trips ADD COLUMN IF NOT EXISTS route_completed JSONB DEFAULT NULL;

COMMENT ON COLUMN trips.route_completed IS 'GeoJSON LineString with coordinates of segments already traveled';

-- Verification
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'trips' AND column_name = 'route_completed';
