# Climate Transition Zones API

## Overview

The climate transition zones system provides smooth climate data blending when querying points near region boundaries (within 50km). This creates more realistic climate transitions for game/simulation systems and point-based climate queries.

## How It Works

1. **Point Query**: When you query climate at a specific coordinate (lon, lat)
2. **Region Detection**: The system identifies which region contains the point
3. **Distance Calculation**: Calculates distance from the point to the region boundary
4. **Transition Zone Check**: If distance < 50km, it's a transition zone
5. **Neighbor Detection**: Finds neighboring regions within 50km buffer
6. **Data Blending**: Uses Inverse Distance Weighting (IDW) to blend climate values
   - Closer regions have higher weight
   - Weights are normalized to sum to 1.0
   - Wind direction uses vector averaging

## API Endpoint

### GET `/api/climate/point`

Get climate data at a specific point with transition zone blending.

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `lon` | number | Yes | Longitude (-180 to 180) |
| `lat` | number | Yes | Latitude (-90 to 90) |
| `timestamp` | string | No | ISO timestamp (defaults to current time mapped to 1950) |

#### Response Format

**Non-transition zone (point far from boundary):**
```json
{
  "region_id": 19,
  "region_name": "Lamedon",
  "is_transition_zone": false,
  "transition_distance_km": 116.1,
  "climate": {
    "time": "1950-06-10T18:00:00",
    "temperature_2m": 19.5,
    "precipitation": 0,
    "wind_speed_10m": 5.4,
    "wind_direction_10m": 307,
    "relative_humidity_2m": 53,
    "cloud_cover": 0
  }
}
```

**Transition zone (point near boundary):**
```json
{
  "region_id": 19,
  "region_name": "Lamedon",
  "is_transition_zone": true,
  "transition_distance_km": 2.0,
  "neighboring_regions": [
    {
      "region_id": 19,
      "region_name": "Lamedon",
      "distance_km": 2.0,
      "weight": 0.981
    },
    {
      "region_id": 20,
      "region_name": "Dor-en-Emyl",
      "distance_km": 106.0,
      "weight": 0.019
    }
  ],
  "climate": {
    "time": "1950-06-10T18:00:00",
    "temperature_2m": 19.47,
    "precipitation": 0.004,
    "wind_speed_10m": 5.50,
    "wind_direction_10m": 304.84,
    "relative_humidity_2m": 53.43,
    "cloud_cover": 0.56
  }
}
```

## Usage Examples

### Basic query (current time)
```bash
curl "http://localhost:5000/api/climate/point?lon=11.0&lat=42.5"
```

### Query with specific timestamp
```bash
curl "http://localhost:5000/api/climate/point?lon=11.0&lat=42.5&timestamp=1950-06-15T12:00:00"
```

### JavaScript/TypeScript example
```typescript
async function getClimateAtPoint(lon: number, lat: number, timestamp?: string) {
  const url = new URL('http://localhost:5000/api/climate/point');
  url.searchParams.append('lon', lon.toString());
  url.searchParams.append('lat', lat.toString());
  if (timestamp) {
    url.searchParams.append('timestamp', timestamp);
  }
  
  const response = await fetch(url);
  const data = await response.json();
  
  if (data.error) {
    console.error('Error:', data.error);
    return null;
  }
  
  return data;
}

// Usage
const climate = await getClimateAtPoint(11.0, 42.5);
if (climate.is_transition_zone) {
  console.log(`Transition zone: ${climate.transition_distance_km}km from boundary`);
  console.log(`Blended from ${climate.neighboring_regions.length} regions`);
} else {
  console.log('Not in transition zone - using original region data');
}
```

## Technical Details

### Transition Zone Distance
- **50 km** from region boundary
- Configurable in `get_climate_at_point_with_transition` function

### Blending Algorithm
- **Inverse Distance Weighting (IDW)**
- Weight = 1 / distance (with minimum of 1km to avoid division by zero)
- Weights normalized to sum to 1.0
- Formula: `blended_value = Σ(value_i × weight_i) / Σ(weight_i)`

### Wind Direction Handling
- Wind direction uses **vector averaging** (not simple arithmetic mean)
- Converts degrees to radians, calculates sin/cos components
- Blends components, then converts back to degrees
- Normalized to 0-360° range

### Climate Variables Blended
- `temperature_2m` (°C)
- `precipitation` (mm)
- `wind_speed_10m` (km/h)
- `wind_direction_10m` (degrees)
- `relative_humidity_2m` (%)
- `cloud_cover` (%)

## Performance

- Uses PostGIS GIST indexes on `regions.geom`
- Buffer query limited to 50km radius
- Average query time: < 100ms
- Suitable for on-demand queries in game/simulation systems

## Database Function

The core logic is implemented in the PostGIS function:
`get_climate_at_point_with_transition(lon, lat, timestamp)`

Location: `database/queries/create_climate_transition_function.sql`

## Error Handling

- **400**: Invalid coordinates (out of range or not numbers)
- **404**: Point not found in any region
- **404**: No climate data available for the timestamp

## Future Enhancements

- [ ] Configurable transition distance per region
- [ ] Altitude-based blending (when DEM is implemented)
- [ ] Additional climate variables
- [ ] Caching layer for frequently queried points
- [ ] Batch query support for multiple points
