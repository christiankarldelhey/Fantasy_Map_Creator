-- Migration: Seed locations data with point geometries
-- Date: 2026-06-29
-- Description: Load locations master data with point geometries from SQL seed file

-- This migration loads the locations.sql file which contains INSERT statements
-- with proper PostGIS geometry functions for point data

-- Execute the locations seed file
\i /Users/christiankarldelhey/Documents/Middle Earth Map/database/seeds/data/sql/locations.sql

-- Verification
SELECT 'locations' AS table_name, COUNT(*) AS rows_loaded FROM locations WHERE geom IS NOT NULL;
