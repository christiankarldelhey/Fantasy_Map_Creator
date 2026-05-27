# Altitude Layers Processing - Implementation Summary

## Overview

Successfully processed altitude layers from the `biomes` table into a new `altitude_layers` table with merged polygons and resolved overlaps following the altitude hierarchy.

## Results

### New Table: `altitude_layers`

Created a dedicated table with 4 processed altitude layers:

| Altitude Type    | Priority | Area (km²)  | Geometry Parts | Original Count |
|------------------|----------|-------------|----------------|----------------|
| hills            | 1 (lowest)  | 831,074.88  | 60 parts       | 54 polygons    |
| mountains_low    | 2        | 550,370.21  | 24 parts       | 16 polygons    |
| mountains_med    | 3        | 58,666.61   | 9 parts        | 9 polygons     |
| mountains_high   | 4 (highest) | 33,650.10   | 7 parts        | 4 polygons     |

**Total area covered:** ~1,473,761 km²

### Processing Steps Completed

1. ✅ **Merged overlapping polygons of same type** using `ST_Union()`
   - All hills merged into single geometry collection
   - All mountains_low merged into single geometry collection
   - All mountains_med merged into single geometry collection
   - All mountains_high merged into single geometry collection

2. ✅ **Resolved overlaps between different altitude types**
   - Applied hierarchy: hills < mountains_low < mountains_med < mountains_high
   - Used `ST_Difference()` to cut lower altitude areas where higher altitudes exist
   - Result: No overlaps between different altitude types (concentric rings)

3. ✅ **Geometry validation and repair**
   - Applied `ST_MakeValid()` to fix topology errors
   - All geometries validated with `ST_IsValid()`
   - No invalid geometries in final table

4. ✅ **Created spatial indexes**
   - GIST index on geometry column for spatial queries
   - B-tree indexes on altitude_type and priority for filtering

## Altitude Hierarchy

The following priority system ensures higher altitudes always take precedence:

```
Priority 4: mountains_high (highest)
    ↓
Priority 3: mountains_med
    ↓
Priority 2: mountains_low
    ↓
Priority 1: hills (lowest)
```

When layers overlap, only the higher priority layer is kept in that area.

## Technical Details

### SQL Script Location
`database/queries/process_altitude_layers.sql`

### Key PostGIS Functions Used
- `ST_Union()` - Merge overlapping polygons of same type
- `ST_Difference()` - Remove overlapping areas from lower priority layers
- `ST_MakeValid()` - Fix invalid geometries before processing
- `ST_Intersects()` - Detect overlaps between layers
- `ST_Area()` - Calculate areas in km²

### Table Schema

```sql
CREATE TABLE altitude_layers (
    id SERIAL PRIMARY KEY,
    altitude_type VARCHAR(50) NOT NULL,
    priority INTEGER NOT NULL,
    geom GEOMETRY(Geometry, 4326) NOT NULL,
    area_km2 DECIMAL,
    created_at TIMESTAMP DEFAULT NOW()
);
```

## Validation Results

- ✅ **No invalid geometries** - All geometries pass `ST_IsValid()`
- ✅ **No overlaps between altitude types** - Verified with spatial intersection queries
- ✅ **All areas calculated** - Areas computed using geography type for accuracy
- ✅ **Spatial indexes created** - GIST indexes for efficient spatial queries

## Notes

- The generic 'mountains' type (16 polygons) was excluded as requested
- Original `biomes` table remains unchanged
- Geometry types vary (MultiPolygon, GeometryCollection) due to merging operations
- All geometries use SRID 4326 (WGS84)

## Usage

To query the processed altitude layers:

```sql
-- Get all altitude layers
SELECT * FROM altitude_layers ORDER BY priority;

-- Get specific altitude type
SELECT * FROM altitude_layers WHERE altitude_type = 'mountains_high';

-- Find altitude at a specific point
SELECT altitude_type, priority 
FROM altitude_layers 
WHERE ST_Contains(geom, ST_SetSRID(ST_MakePoint(lon, lat), 4326))
ORDER BY priority DESC 
LIMIT 1;
```

## Re-running the Process

To reprocess the altitude layers (e.g., if source data changes):

```bash
psql -d middle_earth -f database/queries/process_altitude_layers.sql
```

The script will:
1. Drop the existing `altitude_layers` table
2. Recreate it with fresh data from `biomes`
3. Apply all merging and overlap resolution
4. Validate and display statistics
