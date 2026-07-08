# Middle Earth Wandering Simulator

**Interactive geospatial map of Middle-earth**

`QGIS` · `PostGIS` · `PostgreSQL` · `Vue 3 + TypeScript` · `Node.js / Express` · `MapLibre GL` · `Gemini + Groq`

---

I have always been fascinated by fantasy maps, especially those with real geographic rigor. **Pete Fenlon's** map for *MERP* (Middle Earth Role Playing) — the tabletop RPG that ICE derived from Rolemaster and published throughout the 80s and 90s — is one of the most detailed and beautiful cartographic works in the history of role-playing games. I wanted to explore what would happen if that map stopped being decorative and became a living system.

The result is the **Middle Earth Wandering Simulator**: Middle-earth georeferenced onto Europe with QGIS, inheriting real geographic coordinates (EPSG:4326 / WGS84) so it can measure distances, compute routes, simulate historical climates, and narrate AI-generated stories anchored in the map's data.

---

## Table of contents

- [Overview](#overview)
- [The starting point](#the-starting-point)
- [Geographic data](#geographic-data)
- [Climate system](#climate-system)
- [Route calculation](#route-calculation)
- [Characters and narrative](#characters-and-narrative)
- [Exploration and users](#exploration-and-users)
- [Technical architecture](#technical-architecture)
  - [Frontend](#frontend)
  - [Backend](#backend)
  - [Database](#database)
- [Tech stack](#tech-stack)
- [Getting started](#getting-started)
- [Project build order](#project-build-order)
- [Project goals](#project-goals)

---

## Overview

The system models Middle-earth as **real geospatial layers** on top of PostGIS and exposes them through a Node.js REST API. The frontend (Vue 3) renders those layers over a vector map and lets you compute routes, simulate the passage of time and weather, and generate a daily AI narrative for a given journey.

The project grew in layers: first the static geographic data, then the dynamic climate, then entities and regions, and finally the narration system.

## The starting point

The first challenge was getting Pete Fenlon's map in high resolution and **georeferencing it onto Europe** using QGIS with real tiles and coordinates. Once it was geographically anchored, the project took its natural shape: if I have real coordinates, I can have real data — real climate, real elevation, computable distances.

---

## Geographic data

All layers are stored as PostGIS geometries with SRID **4326** and **GIST** spatial indexes.

### Biome system

AI-assisted segmentation was used to trace the polygons of forests, marshes, and deserts directly over the scanned map. They are stored in the `biomes` table as `GEOMETRY(Polygon, 4326)` and rendered on the frontend as *overlays*.

- **Forests** — wooded cover of varying densities
- **Marshes** — swampy areas and floodable lowlands
- **Deserts** — arid regions and steppes

### Water system

Water features were traced by hand in QGIS following the logic of Fenlon's original map. They live in the `water` table with a generic `GEOMETRY` column that supports both **LINESTRING** (rivers and streams) and **POLYGON** (seas and lakes), discriminated by the `water_type` field.

### Elevation system

Polygon layers (`altitude_layers`) for different altitude ranges — plains, hills, low/mid/high mountains — with a `priority` field that resolves overlaps. On top of those layers a **DEM (Digital Elevation Model) as a PostGIS raster** (`dem_elevation`) was built, synthesized from the peaks marked as points.

The elevation of any coordinate is queried with the SQL function `get_elevation_at_point(lon, lat)`, and the API also exposes elevation profiles (`/api/dem/profile`) that interpolate points every 100 m and compute positive/negative gain. This directly affects route cost and travel conditions.

### Locations and regions

- **`locations`** — points (`POINT`): name, type (city, fortress, ruin, mountain pass, etc.), population, inhabitants, and narrative description.
- **`regions`** — political polygons generated with `polygonize` in PostGIS from border lines. They include the associated kingdom (`kingdoms`), climate zone (`climate_zones`), geographic/historical description, and encounter metrics.
- **`entities`** — creatures and characters (UUID primary key). Each entity stores an array of the regions and biomes where it appears and a JSONB `probability_by_region` field with the encounter probability per region.

---

## Climate system

The climate is based on **real 1950 European climate data**, before the industrial and urban boom, using as a reference the European coordinates the map is superimposed on. This produces a climate coherent with a Third-Age Middle-earth: no urban heat-island effect and no modern pollution.

Technically:

- Each region points to a `climate_zone`, which stores its **Köppen** classification and a **real-world analog location** (`analog_location`, `analog_lat`, `analog_lon`).
- The 1950 hourly weather data lives in the `climate_data` table (2 m temperature, relative humidity, precipitation, snowfall, cloud cover, wind, pressure, soil moisture, radiation, etc.), in the style of ERA5 / Open-Meteo series.
- The "live" date is **mapped to the year 1950** while keeping month, day, and hour, both on the client (`useGlobalClimateTime`) and the backend, in order to query the matching hourly record.

### Regions and their real climate analog

For each region, a real-world location was chosen whose climate (**Köppen** classification) serves as the source for the 1950 hourly series. Some representative examples:

| Middle-earth region | Köppen | Real-world analog | Coordinates |
| --- | --- | --- | --- |
| **The Shire** | `Cfb` — temperate oceanic | Cotswolds, Gloucestershire (England) | 51.83, -1.82 |
| **Lórien** | `Cfb` — temperate oceanic | Białowieża Forest (Poland) | 52.70, 23.86 |
| **Rivendell** | `Cfb` — mountain oceanic | Engadine Valley (Switzerland) | 46.50, 9.83 |
| **Rohan** | `Dfb` — humid continental | Hortobágy (Hungary) | 47.60, 21.00 |
| **Mordor** | `BWh` — hot desert | Doğubayazıt, Eastern Anatolia (Turkey) | 39.55, 44.08 |

The system includes:

- A **dynamic Middle-earth calendar** with live weather automatically updated for all regions.
- **Temperature, precipitation, and conditions** per season and region.
- The ability to **move the calendar forward or backward** to explore other times of the year.
- A direct impact of weather on travel cost and on the AI narration.

---

## Route calculation

The flow (`backend/services/routing.js`) is:

1. All `roads` are fetched from PostGIS and, through *LATERAL joins* with `ST_Intersects`, each one is enriched with the **biome** (`biomes`) and **altitude type** (`altitude_layers`) it crosses.
2. A graph is built from every pair of consecutive vertices of each road. The **cost of each edge is the travel time** (`distance / speed`), where:

   ```
   speed = base_speed × road_mult × biome_mult × altitude_mult
   ```

3. The shortest path is solved with Dijkstra. The *off-road* legs (from the origin/destination to the nearest road vertex) are penalized and measured with `ST_Length` over `geography` for precise distances.

### The road network

The roads were traced by hand in QGIS following Fenlon's map and stored in the `roads` table as `GEOMETRY(LineString, 4326)`. The network currently holds **4,119 road segments**, classified into four categories (the `name` field) that reflect the medieval road hierarchy, each with its own speed effect:

| Road type | Segments | Meaning | Speed effect |
| --- | --- | --- | --- |
| **Royal Road** | 90 | Main imperial highways | *Fastest* (up to +20% walking, +40% mounted) |
| **Main Road** | 667 | Primary inter-regional routes | Faster than baseline |
| **Regular Road** | 1,059 | Standard connecting roads | Baseline (×1.0) |
| **Trail** | 2,303 | Paths and tracks | Slower |
| *off-road* | — | Cross-country (no road) | Slowest (heavy penalty) |

Each segment also carries a `terrain_type` (`hills` for 2,303 segments, `plains` for 1,816) and a `difficulty` from 1 to 3, so the same road category can cost more or less depending on the ground it crosses.

The multipliers depend on the **mode of transport**. Currently implemented:

- **On foot** — base speed 5 km/h
- **On horseback** — base speed 12 km/h

Factors affecting cost: **road type** (Royal Road, Main Road, Regular Road, Trail, off-road), **biome** (plain, forest, desert, marsh), **altitude** (plain, hills, low/mid/high mountains) and, upstream, the **weather**. The result is returned as GeoJSON with total distance, on-road/off-road distance, and estimated time, which makes it possible to estimate how many days a character takes to travel from one point to another.

---

## Characters and narrative

### The two characters

Two selectable characters, each with their own stats, description, and **narrative voice** (stored in `character_state.system_prompt`):

- **The Noldo Elf** — Immortal, of the ancient houses; she has walked the world as a rebel for generations, since before the fall of Beleriand. Hers is the perspective of the long ages.
- **The Dúnedain Ranger** — Mortal, heir of Númenor; he roams Middle-earth in search of an ancient road. His is the perspective of everyday effort and danger.

### AI narration system

The system generates a **unique story for each day of travel** (one chapter = one day). Each chapter is built from:

- The **elevation, biome, and weather** data of the traversed leg.
- The **regions and locations** crossed.
- The **entities with encounter probability** in that region.
- The **character, voice, and backstory** of the chosen character.

The result is a narrative enriched with environmental descriptions, inner thoughts, and **procedurally generated encounters**, always anchored in the map's geographic data. The encounter and interaction resolution logic lives in the `encounters.js`, `interactionResolver.js`, `prompt.js`, and `tripDay.js` services.

The narration uses a **provider cascade with automatic fallback**: **Gemini 2.0 Flash as the primary provider** and **Groq (`llama-3.3-70b-versatile`) as a fallback** when rate limits are hit, with support for two Groq keys. See `backend/services/ai.js`.

### Energy system

- A character can take up to **two hits** in an encounter.
- One hit halves the energy; **two hits are fatal**.
- Full recovery requires **five days of rest**.

---

## Exploration and users

The map is explorable **with and without login**:

- **Unauthenticated:** regions, locations, biomes, climate, and altitude.
- **Authenticated:** full access to routes, characters, narration, and travel history.

Authentication uses **JWT** (`jsonwebtoken`, 7-day tokens) with passwords *hashed* using **bcrypt**. User tables:

- **`users`** — account, settings (`settings` JSONB), active character and trip.
- **`trips`** — history of routes generated by the user.
- **Trip days** — a day-by-day log with the corresponding narrative chapter.

---

## Technical architecture

### Frontend

- **Vue 3 (Composition API) + TypeScript + Vite.**
- **Feature-Sliced Design (FSD) architecture**, organized in layers of increasing responsibility:
  - `app/` — bootstrap, router (`vue-router`), styles, and theme.
  - `pages/` — route views.
  - `widgets/` — composite UI blocks (map viewer, location sidebar, calendar picker, directions input, search).
  - `features/` — per-domain use cases (biome, climate, altitude, route, prompt management, etc.).
  - `entities/` — per-domain models and logic (map, region, biome, water, altitude, route, location…).
  - `shared/` — API client, config, types, and cross-cutting utilities.
- **Map:** [MapLibre GL](https://maplibre.org/) (vector map, *not* Leaflet), with [Turf.js](https://turfjs.org/) for geometry (length measurement, interpolating points along the route to animate the character).
- **UI:** TailwindCSS + [Reka UI](https://reka-ui.com/) (shadcn-style headless components) + Lucide icons.
- **State:** no Vuex/Pinia; shared state is handled with **composables** (`useAuth`, `useDirections`, `useMapRoutes`, `useCharacter`, `useGlobalClimateTime`, `useUserSettings`, …), several with module-level (singleton) state.
- **Communication:** `axios` against the REST API.

### Backend

- **Node.js + Express (ESM)**, **domain-modular / feature-slice** architecture:
  - `routes/` — one Express router per resource (`locations`, `regions`, `biomes`, `altitude`, `roads`, `water`, `peaks`, `dem`, `climate`, `directions`, `character`, `trips`, `auth`, `users`, `search`), mounted under `/api/*`.
  - `services/` — the heavy business logic, decoupled from the routes: `routing.js` (Dijkstra + terrain costs), `ai.js` (Gemini→Groq cascade), `tripDay.js` / `tripGeometry.js` (day-by-day trip construction), `encounters.js`, `interactionResolver.js`, `prompt.js`, `naturalLanguage.js`, `terrainPhrases.js`, `thoughts.js`.
  - `middleware/auth.js` — JWT verification.
- **Database:** accessed via `pg` (connection pool in `db.js`); all geospatial logic is delegated to **PostGIS** with parameterized SQL.
- **Auth:** JWT + bcrypt.
- Health endpoint at `/api/health`.

### Database

- **PostgreSQL + PostGIS.** Normalized relational model, all geometries in **EPSG:4326** with **GIST** spatial indexes and B-tree/GIN indexes depending on the query pattern.
- **Geospatial tables:** `locations` (POINT), `roads` (LINESTRING), `water` (GEOMETRY river/lake), `regions` (POLYGON), `biomes` (POLYGON), `altitude_layers` (POLYGON), and the `dem_elevation` raster.
- **Domain data:** `kingdoms`, `climate_zones`, `climate_data` (1950 hourly series), `entities` (UUID, region/biome arrays, JSONB probabilities), `character_state`, `users`, `trips`, and their days.
- **SQL functions** for reusable geospatial logic, such as `get_elevation_at_point(lon, lat)` over the DEM raster.
- **Geometric integrity constraints:** `ST_IsValid`, SRID verification, and closed-polygon checks.
- Migrations and seeds live in `database/migrations/` and `database/seeds/`.

---

## Tech stack

| Tool | Use |
| --- | --- |
| **QGIS** | Map georeferencing and vector-layer creation |
| **PostGIS** | Storage and querying of geospatial data (vector + raster) |
| **PostgreSQL** | Normalized relational database |
| **Vue 3 + TypeScript + Vite** | Interactive frontend (Feature-Sliced Design) |
| **MapLibre GL + Turf.js** | Vector map rendering and client-side geometry |
| **TailwindCSS + Reka UI** | Styling system and UI components |
| **Node.js + Express** | Backend and REST API |
| **`pg`** | PostgreSQL client / connection pool |
| **Custom Dijkstra (JS)** | Route calculation with variable terrain cost *(not pgRouting)* |
| **Google Gemini 2.0 Flash** | Primary AI narration provider |
| **Groq (`llama-3.3-70b-versatile`)** | Fallback AI provider |
| **JWT + bcrypt** | Authentication and password hashing |
| **Docker + Railway** | Containerization and production deployment |

---

## Getting started

Requirements: **Node.js ≥ 22**, **PostgreSQL with PostGIS**.

```bash
# 1. Database: create the DB and apply the schema
psql -d middle_earth -f database/schema.sql
# (optional) migrations and seeds
cd database/seeds && npm install && npm run ...   # see database/seeds/README.md

# 2. Backend
cd backend
npm install
# configure environment variables (see below)
npm run dev            # http://localhost:5000

# 3. Frontend
cd frontend
npm install
npm run dev            # http://localhost:5173
```

**Backend environment variables** (partial):

| Variable | Description |
| --- | --- |
| `DATABASE_URL` / `pg` config | PostgreSQL/PostGIS connection |
| `JWT_SECRET` | Secret used to sign JWT tokens |
| `CORS_ORIGIN` | Allowed origin (defaults to `http://localhost:5173`) |
| `GEMINI_API_KEY` | Google Gemini key (primary AI provider) |
| `GROQ_API_KEY` / `GROQ_API_KEY_2` | Groq keys (fallback) |
| `PORT` | Server port (defaults to `5000`) |

> **Security note:** API keys must never be *hardcoded*; they are read from environment variables via `dotenv`.

**Deployment:** the project is packaged with Docker (`Dockerfile`) and deployed on **Railway** (`railway.json`), which runs migrations/seeds in `preDeployCommand` (`npm run postdeploy`).

---

## Project build order

1. Georeference Pete Fenlon's map onto Europe with real tiles and coordinates in QGIS.
2. Source and clean a dataset of Middle-earth locations.
3. Segment biomes (forests, marshes, deserts, lakes, rivers, etc.) with AI over the scanned map and trace water features (rivers, streams) and roads (highways, routes, trails) by hand. Design and normalize the PostgreSQL/PostGIS database with all layers.
4. Create the elevation polygon layers (plains, hills, mountains), mark their peaks, and build the DEM (PostGIS raster) synthesized from the elevation peaks.
5. Create the political region polygons using border lines and `polygonize` in PostGIS.
6. Implement the regional climate system based on 1950 European data.
7. Build the Vue 3 frontend (Feature-Sliced Design) on top of MapLibre GL.
8. Implement the routing engine (custom Dijkstra) with cost by biome, altitude, and weather.
9. Build the entities table per region with encounter probabilities.
10. Add characters, the energy system, and daily AI narration (Gemini + Groq).

---

## Project goals

- Georeference Pete Fenlon's map onto Europe with real coordinates and precise measurements.
- Build a historically coherent climate system based on real 1950 data.
- Model Middle-earth's geography in PostGIS layers (biomes, water, elevation, regions).
- Compute realistic routes considering biome, altitude, weather, and mode of transport.
- Generate unique per-trip narratives using AI anchored in the map's data.
- Create an interactive exploration experience accessible with and without login.
