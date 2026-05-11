# Biomes Table Implementation

## Summary

Implemented a complete biomes table and loading system for environmental/geographic features that can overlap with political regions.

## What Was Created

### 1. Database Schema (database/schema.sql)
- **Table**: `biomes`
  - `id` - Primary key
  - `name` VARCHAR(255) - Biome name (standard type like "Forest" or specific like "Fangorn")
  - `type` VARCHAR(50) - Biome category (forest, hills, marsh, mountains, river, lake, plateau, barrow)
  - `description` TEXT - NULL for standard biomes, text for specific named locations
  - `area_km2` DECIMAL - Calculated area
  - `created_at` TIMESTAMP
  - `geom` GEOMETRY(Polygon, 4326) - Geographic polygon
- **Indexes**:
  - Spatial index on `geom` (GIST)
  - Index on `type` for filtering

### 2. Loading Script (scripts/load_to_postgis.js)
- Added `loadBiomes()` function
- Reads from `data/normalized/biomes.geojson`
- Extracts name, type, description, geometry from GeoJSON features
- Inserts into biomes table with ST_GeomFromGeoJSON
- Handles missing file gracefully (skips if biomes.geojson doesn't exist)
- Updated `calculateAreas()` to calculate biome areas
- Updated `displayStatistics()` to show biome counts and types
- Updated `main()` to call `loadBiomes()`

### 3. Backend API (backend/routes/biomes.js)
- **GET /api/biomes** - Returns all biomes as GeoJSON
- **Query parameter**: `?type=forest` to filter by type
- Returns properties: id, name, type, description, area_km2

### 4. Server Configuration (backend/server.js)
- Registered `/api/biomes` route
- Updated root endpoint to include biomes
- Updated console logs to show biomes endpoint

## How to Use

### Loading Biomes from QGIS

1. Export your biome layers from QGIS as GeoJSON
2. Save to `data/normalized/biomes.geojson`
3. Ensure each feature has properties:
   - `name` - Biome name (e.g., "Forest" or "Fangorn")
   - `type` - Biome category (forest, hills, marsh, mountains, river, lake, plateau, barrow)
   - `description` - Optional description (NULL for standard biomes)
4. Run the loading script:
   ```bash
   node scripts/load_to_postgis.js
   ```

### API Usage

Get all biomes:
```bash
curl http://localhost:5000/api/biomes
```

Filter by type:
```bash
curl http://localhost:5000/api/biomes?type=forest
```

### Direct SQL

Insert a biome manually:
```sql
INSERT INTO biomes (name, type, description, geom)
VALUES (
  'Forest',
  'forest',
  NULL,
  ST_SetSRID(ST_GeomFromGeoJSON('{"type":"Polygon","coordinates":[[...]]}'), 4326)
);
```

## Biome Types

Currently supported types (flexible, can be extended):
- `forest` - Forests and woodlands
- `hills` - Hills and elevated terrain
- `marsh` - Swamps and wetlands
- `mountains` - Mountain ranges
- `river` - River courses
- `lake` - Lakes and bodies of water
- `plateau` - Plateaus and highlands
- `barrow` - Burial mounds and ancient sites

## Design Decisions

1. **Flexible types**: VARCHAR(50) instead of ENUM for easy future extension
2. **Mixed naming strategy**: name field supports both standard types and specific names
3. **NULL descriptions**: Standard biomes have NULL description, specific ones have text
4. **Overlap allowed**: No spatial constraints with regions table (environmental vs political)
5. **QGIS integration**: GeoJSON format compatible with QGIS exports
6. **Graceful loading**: Script skips biomes load if file doesn't exist (doesn't break existing workflow)

## Future Enhancements

Possible future migrations:
- Add relationship between regions and biomes (many-to-many)
- Add biome-specific attributes (elevation, vegetation density, etc.)
- Add temporal data (seasonal biome changes)
- Add biome classification system (hierarchical types)
