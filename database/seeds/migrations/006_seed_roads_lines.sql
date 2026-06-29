-- Migration: Seed roads data with line geometries
-- Date: 2026-06-29
-- Description: Load roads master data with line geometries from SQL seed file

-- This migration loads the roads.sql file which contains INSERT statements
-- with proper PostGIS geometry functions for line data

-- Execute the roads seed file
\i /Users/christiankarldelhey/Documents/Middle Earth Map/database/seeds/data/sql/roads.sql

-- Verification
SELECT 'roads' AS table_name, COUNT(*) AS rows_loaded FROM roads WHERE geom IS NOT NULL;
