# Features Roadmap

## Current Features (Implemented)

### ✅ Map Viewer
- Interactive map display using MapLibre GL JS
- Mapbox style tiles for Middle Earth fantasy map
- Map bounds restriction (prevents viewing outside Middle Earth area)
- Navigation controls (zoom, pan)
- Scale control

### ✅ Location Management
- Display locations as points on the map
- Interactive location markers (click for details)
- Location popups with name, type, region, and description
- Load locations from backend API

### ✅ Region Management
- Display regions as polygons on the map
- Interactive region polygons (click for details)
- Region popups with name, type, and description
- Load regions from backend API

## Planned Features

### 🚧 Distance Calculator
**Priority**: High  
**Dependencies**: None

Calculate distances between locations on the map.

**Functionality**:
- Straight-line distance calculation
- Path distance following routes
- Multiple measurement units (miles, leagues, km)
- Display distance on map

**Technical Approach**:
- Use Turf.js for geospatial calculations
- Create distance measurement tool in map
- Store calculation history

---

### 🚧 Route Planner
**Priority**: High  
**Dependencies**: Distance Calculator, Biome System

Plan routes between locations considering terrain and transportation.

**Functionality**:
- Multi-waypoint route planning
- Different vehicle types (walking, horse, cart, ship)
- Terrain-aware routing
- Travel time estimation
- Route visualization

**Technical Approach**:
- Implement pathfinding algorithm (A* or Dijkstra)
- Weight edges based on terrain and biome
- Use MapLibre for route visualization
- Create route editor UI

---

### 🚧 Biome System
**Priority**: Medium  
**Dependencies**: None

Manage and visualize different biome types.

**Functionality**:
- Define biome types (forest, mountain, plains, desert, etc.)
- Biome layer visualization
- Biome-based styling
- Impact on travel speed
- Biome CRUD operations

**Technical Approach**:
- Extend region entity with biome type
- Create biome layer in MapLibre
- Define biome properties (travel speed multiplier, etc.)
- Create biome management UI

---

### 🚧 Elevation System
**Priority**: Medium  
**Dependencies**: None

Integrate elevation data for realistic terrain.

**Functionality**:
- Elevation data display
- Hillshading visualization
- Contour lines
- Elevation profiles for routes
- Optional 3D terrain

**Technical Approach**:
- Integrate DEM/GeoTIFF elevation data
- Use MapLibre terrain features
- Calculate slope for travel impact
- Create elevation profile component

---

### 🚧 Climate System
**Priority**: Low  
**Dependencies**: Elevation System, Biome System

Simulate realistic climate patterns.

**Functionality**:
- Climate zone classification
- Temperature patterns (seasonal)
- Precipitation patterns
- Climate impact on travel
- Climate visualization

**Technical Approach**:
- Use latitude and elevation for climate modeling
- Reference real-world climate data for Europe
- Create climate calculation algorithms
- Visualize climate zones on map

---

### 🚧 Travel Estimator
**Priority**: High  
**Dependencies**: Route Planner, Biome System, Elevation System, Climate System

Estimate realistic daily travel distances.

**Functionality**:
- Daily travel distance calculation
- Factors: transportation, terrain, biome, weather, party size
- Travel time estimates on routes
- Scenario comparison

**Technical Approach**:
- Create travel speed calculation engine
- Factor in all environmental conditions
- Create travel estimation UI
- Store travel scenarios

---

## Future Enhancements

### 📋 Additional Features (Long-term)

- **Authentication & User Accounts** - Save personal maps and routes
- **Collaborative Editing** - Multiple users editing same map
- **Custom Markers & Icons** - User-defined location markers
- **Path History** - Track character journeys over time
- **Event Timeline** - Map events to specific dates/times
- **Weather Simulation** - Dynamic weather affecting travel
- **Resource Management** - Track supplies during travel
- **Battle Simulator** - Simulate battles at locations
- **Export/Import** - Export maps and data in various formats

## Implementation Priority

1. **Phase 1** (Current) - Core map functionality ✅
2. **Phase 2** - Distance Calculator + Route Planner
3. **Phase 3** - Biome System + Elevation System
4. **Phase 4** - Travel Estimator (integrating all systems)
5. **Phase 5** - Climate System
6. **Phase 6** - Additional enhancements

## Technical Considerations

### Performance
- Lazy load features as needed
- Optimize map rendering for large datasets
- Use web workers for heavy calculations

### Data Management
- Extend backend API for new features
- Consider caching strategies
- Plan for data migration

### User Experience
- Progressive disclosure of features
- Intuitive UI for complex calculations
- Mobile responsiveness

### Testing
- Unit tests for calculation logic
- Integration tests for feature interactions
- E2E tests for critical user flows
