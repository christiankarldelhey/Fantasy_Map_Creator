# DEM (Digital Elevation Model) Setup Guide

Complete guide to set up and generate the DEM system with peak detection.

## Prerequisites

### System Requirements
- **Python 3.8+** with pip
- **Node.js 16+** with npm
- **PostgreSQL 14+** with PostGIS and PostGIS Raster extensions
- **GDAL** library installed

### Install GDAL (macOS)
```bash
brew install gdal
```

### Install Python Dependencies
```bash
cd scripts
pip3 install -r requirements.txt
```

If you encounter issues with GDAL Python bindings:
```bash
pip3 install gdal==$(gdal-config --version)
```

### Install Node.js Dependencies
```bash
# In project root
npm install

# In backend
cd backend
npm install
```

## Step-by-Step Setup

### Step 1: Database Setup

Run the SQL scripts to create necessary tables:

```bash
# 1. Clean up deprecated altitude data from biomes table
psql -d middle_earth -f database/queries/cleanup_deprecated_altitude_biomes.sql

# 2. Create detected_peaks table
psql -d middle_earth -f database/queries/create_detected_peaks_table.sql

# 3. Create dem_elevation table and helper functions
psql -d middle_earth -f database/queries/create_dem_table.sql
```

Verify tables were created:
```sql
\dt detected_peaks
\dt dem_elevation
\df get_elevation_at_point
```

### Step 2: Detect Mountain Peaks from Map Image

This script uses computer vision to detect mountain symbols from your GeoTIFF map:

```bash
cd scripts
python3 detect_mountain_peaks.py
```

**Output**: `data/detected_peaks.geojson`

**What it does**:
- Loads `Maps/middle-earth-map.tif`
- Detects mountain symbols using contour detection
- Georeferences pixel coordinates to lat/lon
- Exports detected peaks as GeoJSON

**Expected output**:
```
Loading GeoTIFF: /path/to/Maps/middle-earth-map.tif
Image loaded: (height, width, 3)
Detecting mountain symbols...
Found 15234 contours
Detected 3847 potential mountain peaks
Exported 3847 peaks to /path/to/data/detected_peaks.geojson

✅ Peak detection complete!
```

### Step 3: Classify Peaks by Altitude Layer

This script assigns each detected peak to its corresponding altitude layer:

```bash
cd scripts
node classify_peaks.js
```

**What it does**:
- Loads `data/detected_peaks.geojson`
- For each peak, queries which `altitude_layer` contains it
- Assigns base elevation based on altitude type
- Inserts into `detected_peaks` table

**Expected output**:
```
Starting peak classification...
Loaded 3847 peaks from GeoJSON
Cleared existing peaks from database

Processed 100/3847 peaks...
Processed 200/3847 peaks...
...

✅ Peak classification complete!

Statistics:
  Total peaks: 3847
  Classified: 3621
  Unclassified: 226

By altitude type:
  hills: 1523
  mountains_low: 1342
  mountains_med: 542
  mountains_high: 214
```

### Step 4: Generate DEM

This is the main DEM generation script that combines everything:

```bash
cd scripts
python3 generate_dem.py
```

**What it does**:
1. Queries map bounds from `altitude_layers`
2. Creates base elevation grid (250m resolution)
3. Applies peak influence (1km radius around each peak)
4. Adds Perlin noise for natural variation
5. Applies Gaussian blur for smooth transitions
6. Exports to `data/dem_elevation.tif`

**Expected output**:
```
============================================================
DEM GENERATION PIPELINE
============================================================
✅ Connected to database
Map bounds: {'min_lon': -10.5, 'min_lat': 35.2, 'max_lon': 42.3, 'max_lat': 65.8}
Grid dimensions: 8000 x 6000 pixels
Resolution: 250m per pixel

Generating base elevation grid...
  Processing hills (priority 1)...
    Row 0/6000
    Row 100/6000
    ...
  Processing mountains_low (priority 2)...
  Processing mountains_med (priority 3)...
  Processing mountains_high (priority 4)...
✅ Base grid created

Applying peak influence...
  Processing 3621 peaks...
    Peak 0/3621
    Peak 100/3621
    ...
✅ Peak influence applied

Applying Perlin noise...
  Row 0/6000
  Row 100/6000
  ...
✅ Perlin noise applied

Applying Gaussian blur (kernel size 5)...
✅ Gaussian blur applied

Exporting to GeoTIFF: /path/to/data/dem_elevation.tif
✅ Exported to /path/to/data/dem_elevation.tif

============================================================
✅ DEM GENERATION COMPLETE!
============================================================
```

**Note**: This step can take 10-30 minutes depending on map size and resolution.

### Step 5: Import DEM to PostgreSQL

Import the generated GeoTIFF into the database:

```bash
raster2pgsql -s 4326 -I -C -M -t 100x100 data/dem_elevation.tif dem_elevation | psql -d middle_earth
```

**Flags explained**:
- `-s 4326`: Set SRID to WGS84
- `-I`: Create spatial index
- `-C`: Apply raster constraints
- `-M`: Vacuum analyze after import
- `-t 100x100`: Tile size (breaks large raster into tiles)

Verify import:
```sql
SELECT 
    COUNT(*) as tile_count,
    ST_Width(rast) as width,
    ST_Height(rast) as height
FROM dem_elevation;
```

### Step 6: Test API Endpoints

Start the backend server:
```bash
cd backend
npm run dev
```

Test the DEM endpoints:

**Get elevation at a point**:
```bash
curl "http://localhost:5000/api/dem/elevation?lon=-5.5&lat=50.2"
```

Response:
```json
{
  "lon": -5.5,
  "lat": 50.2,
  "elevation": 1247,
  "unit": "meters"
}
```

**Get elevation profile along a path**:
```bash
curl "http://localhost:5000/api/dem/profile?path=[[-5.5,50.2],[-4.8,51.1]]"
```

Response:
```json
{
  "profile": [
    {"lon": -5.5, "lat": 50.2, "elevation": 1247, "distance": 0},
    {"lon": -5.49, "lat": 50.21, "elevation": 1253, "distance": 100},
    ...
  ],
  "statistics": {
    "totalDistance": 125000,
    "minElevation": 234,
    "maxElevation": 2156,
    "elevationGain": 1922,
    "elevationLoss": 1013,
    "unit": "meters"
  }
}
```

**Get DEM statistics**:
```bash
curl "http://localhost:5000/api/dem/stats"
```

Response:
```json
{
  "count": 48000000,
  "sum": 45678912345,
  "mean": 952,
  "stddev": 487,
  "min": 0,
  "max": 4387,
  "dimensions": {
    "width": 8000,
    "height": 6000,
    "pixelWidth": 0.00225,
    "pixelHeight": -0.00225
  },
  "unit": "meters"
}
```

## Troubleshooting

### Python GDAL Import Error
```
ImportError: No module named 'osgeo'
```

**Solution**:
```bash
pip3 install gdal==$(gdal-config --version)
```

### Peak Detection Finds Too Many/Few Peaks

Adjust parameters in `detect_mountain_peaks.py`:

```python
# Line ~120
peaks = detector.detect_mountain_symbols(
    min_area=50,    # Increase to filter out small noise
    max_area=5000   # Decrease to filter out large regions
)
```

### DEM Generation is Too Slow

Reduce resolution in `generate_dem.py`:

```python
# Line ~280
generator = DEMGenerator(resolution=500)  # Use 500m instead of 250m
```

### PostGIS Raster Extension Not Found

```sql
CREATE EXTENSION IF NOT EXISTS postgis_raster;
```

If error persists, install PostGIS Raster:
```bash
# macOS
brew install postgis

# Then in psql
CREATE EXTENSION postgis_raster;
```

## File Structure

```
Middle Earth Map/
├── Maps/
│   └── middle-earth-map.tif          # Source GeoTIFF (gitignored)
├── data/
│   ├── detected_peaks.geojson        # Detected peaks from CV
│   └── dem_elevation.tif             # Generated DEM
├── database/queries/
│   ├── cleanup_deprecated_altitude_biomes.sql
│   ├── create_detected_peaks_table.sql
│   └── create_dem_table.sql
├── scripts/
│   ├── detect_mountain_peaks.py      # Step 2: CV peak detection
│   ├── classify_peaks.js             # Step 3: Peak classification
│   ├── generate_dem.py               # Step 4: DEM generation
│   └── requirements.txt              # Python dependencies
└── backend/routes/
    └── dem.js                        # API endpoints
```

## Next Steps: Routing with Elevation

Once the DEM is set up, you can use it for realistic distance calculations:

### Calculate Travel Cost

```javascript
// Example: Calculate cost considering elevation
const route = {
  path: [[lon1, lat1], [lon2, lat2]],
  vehicle: 'horse'
};

// Get elevation profile
const profile = await fetch(`/api/dem/profile?path=${JSON.stringify(route.path)}`);
const { elevationGain, totalDistance } = profile.statistics;

// Apply penalties
const baseCost = totalDistance; // meters
const elevationPenalty = elevationGain * 0.3; // 30% penalty per 100m for horse
const totalCost = baseCost + elevationPenalty;

console.log(`Estimated travel time: ${totalCost / 10000} hours`); // 10km/h average
```

### Future Enhancements

1. **Pathfinding with elevation**: Implement Dijkstra/A* considering elevation costs
2. **Hillshade visualization**: Generate hillshade layer for frontend
3. **Slope analysis**: Calculate slope percentages for difficulty ratings
4. **Viewshed analysis**: Determine line-of-sight from locations

## References

- [PostGIS Raster Documentation](https://postgis.net/docs/RT_reference.html)
- [GDAL Python API](https://gdal.org/python/)
- [OpenCV Contour Detection](https://docs.opencv.org/4.x/d4/d73/tutorial_py_contours_begin.html)
