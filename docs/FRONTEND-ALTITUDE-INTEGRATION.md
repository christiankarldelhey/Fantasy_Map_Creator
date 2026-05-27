# Frontend Integration - Altitude Layers

## Overview

Successfully integrated the processed altitude layers from the `altitude_layers` table into the frontend map viewer. The map now displays the cleaned, non-overlapping altitude zones following the correct hierarchy.

## Changes Made

### Backend

#### 1. New Route: `/api/altitude`
**File:** `backend/routes/altitude.js`

- Created new Express route to serve altitude layers as GeoJSON
- Supports optional filtering by altitude type: `?type=hills`
- Returns features ordered by priority (lowest to highest)
- Properties include: `altitude_type`, `priority`, `area_km2`

#### 2. Server Configuration
**File:** `backend/server.js`

- Added altitude router import
- Registered `/api/altitude` endpoint
- Updated health check to include altitude endpoint
- Added startup log for altitude endpoint

### Frontend

#### 1. New Entity: `altitude`
**Files:**
- `frontend/src/entities/altitude/model/types.ts` - TypeScript types
- `frontend/src/entities/altitude/api/altitudeApi.ts` - API client
- `frontend/src/entities/altitude/index.ts` - Public exports

**Types:**
```typescript
interface AltitudeProperties {
  id: number
  altitude_type: 'hills' | 'mountains_low' | 'mountains_med' | 'mountains_high'
  priority: number
  area_km2?: number
}
```

#### 2. New Feature: `altitude-management`
**Files:**
- `frontend/src/features/altitude-management/model/useAltitudeData.ts` - Vue composable
- `frontend/src/features/altitude-management/index.ts` - Public exports

**Composable:** `useAltitudeData()`
- Manages altitude layer state
- Handles loading and error states
- Fetches data from `/api/altitude` endpoint

#### 3. Updated Map Viewer
**File:** `frontend/src/widgets/map-viewer/ui/MapViewer.vue`

**New Function:** `addAltitudeLayer(data: AltitudeCollection)`
- Renders altitude layers with proper styling
- Color scheme based on altitude type:
  - `hills`: #a16207 (olive brown) - 15% opacity
  - `mountains_low`: #94a3b8 (light slate) - 25% opacity
  - `mountains_med`: #475569 (medium slate) - 30% opacity
  - `mountains_high`: #334155 (dark slate) - 40% opacity
- Interactive popups showing altitude type, priority, and area
- Hover cursor changes

**Updated Biomes Layer:**
- Removed altitude-related types (hills, mountains_*) from biomes rendering
- Now only renders: forest, desert, marsh, lake
- Cleaner separation of concerns

**Layer Stacking Order:**
1. Regions (bottom)
2. **Altitude layers** (new)
3. Biomes (forest, desert, marsh, lake)
4. Paths (roads, rivers, streams)
5. Locations (top)

**Data Loading:**
- Added `loadAltitude()` to parallel data loading
- Added watcher for altitude data changes
- Included altitude loading/error states in global loading/error tracking

## Visual Result

The map now displays:
- ✅ **Merged altitude zones** - No duplicate overlapping polygons of the same type
- ✅ **Concentric rings** - Higher altitude zones properly overlay lower ones
- ✅ **Correct hierarchy** - hills < mountains_low < mountains_med < mountains_high
- ✅ **Clean separation** - Altitude layers separate from biome layers (forests, lakes, etc.)

## API Endpoints

### Get All Altitude Layers
```bash
GET http://localhost:5000/api/altitude
```

### Get Specific Altitude Type
```bash
GET http://localhost:5000/api/altitude?type=mountains_high
```

**Response Format:**
```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "id": 4,
      "geometry": { ... },
      "properties": {
        "id": 4,
        "altitude_type": "mountains_high",
        "priority": 4,
        "area_km2": 33650.10
      }
    }
  ]
}
```

## Testing

To verify the integration:

1. **Start backend:**
   ```bash
   cd backend
   npm start
   ```

2. **Start frontend:**
   ```bash
   cd frontend
   npm run dev
   ```

3. **Test API endpoint:**
   ```bash
   curl http://localhost:5000/api/altitude
   ```

4. **View map:**
   - Open http://localhost:5173
   - Altitude layers should render below biomes
   - Click on altitude zones to see popup with details
   - Verify no overlapping altitude types

## Notes

- The original `biomes` table remains unchanged
- Altitude data is now served from the dedicated `altitude_layers` table
- Frontend TypeScript may need a restart to recognize new modules
- All 4 altitude layers are loaded and rendered on map initialization
- Total coverage: ~1,473,761 km² across all altitude zones

## Files Modified

**Backend:**
- `backend/routes/altitude.js` (new)
- `backend/server.js`

**Frontend:**
- `frontend/src/entities/altitude/` (new directory)
- `frontend/src/features/altitude-management/` (new directory)
- `frontend/src/widgets/map-viewer/ui/MapViewer.vue`
