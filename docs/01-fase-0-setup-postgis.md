# FASE 0: Setup PostgreSQL + PostGIS y Normalización de Datos GIS

Plan pedagógico para configurar la base de datos espacial, entender conceptos fundamentales de GIS, normalizar tus GeoJSONs y cargar datos a PostGIS con explicaciones detalladas de cada paso.

---

## Objetivos de Aprendizaje

Al completar esta fase aprenderás:

1. **Conceptos GIS fundamentales:** Sistemas de coordenadas, geometrías espaciales, índices GIST
2. **PostGIS básico:** Tipos de datos espaciales, funciones ST_*, queries espaciales
3. **Estándar GeoJSON:** Estructura válida, FeatureCollection, propiedades
4. **Diseño de esquemas espaciales:** Cómo modelar datos geográficos en PostgreSQL
5. **ETL de datos geoespaciales:** Extraer, transformar y cargar datos GIS

---

## Estructura del Plan

### **Módulo 1: Fundamentos de Bases de Datos Espaciales** (Teoría 60% / Práctica 40%)
### **Módulo 2: Verificación y Configuración de PostGIS** (Teoría 30% / Práctica 70%)
### **Módulo 3: Conceptos de Sistemas de Coordenadas** (Teoría 70% / Práctica 30%)
### **Módulo 4: Normalización de GeoJSONs** (Teoría 40% / Práctica 60%)
### **Módulo 5: Diseño del Esquema de Base de Datos** (Teoría 50% / Práctica 50%)
### **Módulo 6: Carga de Datos a PostGIS** (Teoría 30% / Práctica 70%)
### **Módulo 7: Validación y Queries Espaciales Básicas** (Teoría 40% / Práctica 60%)

---

## MÓDULO 1: Fundamentos de Bases de Datos Espaciales

### 🎓 Conceptos Teóricos

#### ¿Qué es una Base de Datos Espacial?

Una base de datos espacial es una base de datos optimizada para almacenar y consultar datos que representan objetos definidos en un espacio geométrico.

**Diferencias clave con bases de datos tradicionales:**

| Aspecto | BD Tradicional | BD Espacial |
|---------|----------------|-------------|
| Tipos de datos | VARCHAR, INTEGER, DATE | GEOMETRY, GEOGRAPHY, POINT, POLYGON |
| Índices | B-Tree (ordenamiento) | GIST/BRIN (proximidad espacial) |
| Queries | `WHERE edad > 18` | `WHERE ST_Contains(polygon, point)` |
| Uso típico | Usuarios, productos, ventas | Mapas, rutas, zonas, ubicaciones |

**Ejemplo conceptual:**

```
Base de datos tradicional:
┌────────┬──────────┬─────────┐
│ nombre │ latitud  │ longitud│
├────────┼──────────┼─────────┤
│ Madrid │ 40.4168  │ -3.7038 │
└────────┴──────────┴─────────┘
Problema: No puedes hacer "dame todas las ciudades a 100km de Madrid"

Base de datos espacial:
┌────────┬─────────────────────────┐
│ nombre │ geom (POINT)            │
├────────┼─────────────────────────┤
│ Madrid │ POINT(-3.7038 40.4168)  │
└────────┴─────────────────────────┘
Solución: SELECT * FROM ciudades WHERE ST_DWithin(geom, madrid_geom, 100000)
```

#### ¿Qué es PostGIS?

PostGIS es una **extensión** de PostgreSQL que añade soporte para objetos geográficos.

**Capacidades de PostGIS:**
- 📍 Almacenar geometrías (puntos, líneas, polígonos)
- 📏 Calcular distancias, áreas, perímetros
- 🔍 Buscar objetos cercanos, dentro de zonas
- 🗺️ Transformar entre sistemas de coordenadas
- ✂️ Operaciones espaciales (intersección, unión, buffer)

**Por qué es importante para GIS profesional:**
- ✅ Estándar de facto en la industria GIS
- ✅ Usado por QGIS, ArcGIS, GeoServer
- ✅ Cumple con estándares OGC (Open Geospatial Consortium)
- ✅ Gratis y open source
- ✅ Escalable (millones de features)

#### Tipos de Geometrías en PostGIS

```
POINT           → Un solo punto (ciudad, castillo)
    • (lon, lat)
    
LINESTRING      → Secuencia de puntos conectados (camino, río)
    • (lon1, lat1), (lon2, lat2), (lon3, lat3)...
    
POLYGON         → Área cerrada (reino, bioma, región)
    • ((lon1, lat1), (lon2, lat2), ..., (lon1, lat1))
    • Primer y último punto deben ser iguales
    
MULTIPOINT      → Conjunto de puntos
MULTILINESTRING → Conjunto de líneas
MULTIPOLYGON    → Conjunto de polígonos (ej: archipiélago)
```

**En tu proyecto:**
- `mapLocations.json` → POINT (ciudades, castillos, pueblos)
- Caminos futuros → LINESTRING (rutas entre ciudades)
- `provincias.json` → POLYGON (reinos, biomas, regiones)

### 🛠️ Práctica: Verificar Conceptos

**Ejercicio mental:** Para cada dato de Tierra Media, identifica qué geometría usarías:

1. Minas Tirith (ciudad) → `POINT`
2. Camino de Rivendel a Moria → `LINESTRING`
3. Reino de Gondor → `POLYGON`
4. Montañas Nubladas (cadena montañosa) → `LINESTRING` o `POLYGON` (según representación)
5. Islas de Tolfalas → `MULTIPOLYGON`

---

## MÓDULO 2: Verificación y Configuración de PostGIS

### 🎓 Conceptos Teóricos

#### Arquitectura PostgreSQL + PostGIS

```
┌─────────────────────────────────────┐
│  PostgreSQL (Motor de BD)           │
│  ├── Base de datos: postgres        │
│  ├── Base de datos: middle_earth    │ ← Crearemos esta
│  │   ├── Extensión: PostGIS         │ ← Activaremos esta
│  │   ├── Tabla: locations (POINT)   │
│  │   ├── Tabla: paths (LINESTRING)  │
│  │   └── Tabla: regions (POLYGON)   │
└─────────────────────────────────────┘
```

**Conceptos clave:**
- **Cluster:** Instancia de PostgreSQL (ya tienes uno)
- **Base de datos:** Contenedor de tablas (crearemos `middle_earth`)
- **Extensión:** Módulo que añade funcionalidad (activaremos `postgis`)
- **Schema:** Namespace dentro de una BD (usaremos `public` por defecto)

### 🛠️ Práctica: Verificar y Configurar

#### Paso 1: Verificar que PostgreSQL está corriendo

**Comando:**
```bash
psql --version
```

**Qué hace:** Muestra la versión de PostgreSQL instalada.

**Resultado esperado:** `psql (PostgreSQL) 15.x` o similar.

**Por qué es importante:** Confirma que tienes el cliente `psql` instalado y accesible.

---

#### Paso 2: Conectar a PostgreSQL

**Comando:**
```bash
psql postgres
```

**Qué hace:** Conecta a la base de datos por defecto `postgres` como tu usuario de sistema.

**Resultado esperado:** Prompt `postgres=#` o `postgres=>`

**Diferencia de prompts:**
- `postgres=#` → Eres superusuario (puede hacer todo)
- `postgres=>` → Usuario normal (limitado)

**Por qué es importante:** Necesitas acceso para crear bases de datos.

---

#### Paso 3: Verificar que PostGIS está disponible

**Comando SQL (dentro de psql):**
```sql
SELECT name, default_version, installed_version 
FROM pg_available_extensions 
WHERE name = 'postgis';
```

**Qué hace:** Lista extensiones disponibles y su estado de instalación.

**Resultado esperado:**
```
   name   | default_version | installed_version 
----------+-----------------+-------------------
 postgis  | 3.4.0           | 
```

**Por qué es importante:** Confirma que PostGIS está instalado en el sistema (aunque no activado aún).

---

#### Paso 4: Crear base de datos para el proyecto

**Comando SQL:**
```sql
CREATE DATABASE middle_earth
    WITH 
    ENCODING = 'UTF8'
    LC_COLLATE = 'en_US.UTF-8'
    LC_CTYPE = 'en_US.UTF-8'
    TEMPLATE = template0;
```

**Qué hace cada parámetro:**
- `ENCODING = 'UTF8'` → Soporta caracteres especiales (é, ñ, ö)
- `LC_COLLATE` → Reglas de ordenamiento de texto
- `LC_CTYPE` → Clasificación de caracteres
- `TEMPLATE = template0` → Base de datos limpia sin extensiones previas

**Por qué UTF8:** Tus datos tienen nombres como "Lothlórien", "Eriador" que requieren UTF8.

**Resultado esperado:** `CREATE DATABASE`

---

#### Paso 5: Conectar a la nueva base de datos

**Comando:**
```sql
\c middle_earth
```

**Qué hace:** Cambia la conexión de `postgres` a `middle_earth`.

**Resultado esperado:** `You are now connected to database "middle_earth" as user "tu_usuario".`

**Por qué es importante:** Las siguientes operaciones se ejecutarán en esta BD.

---

#### Paso 6: Activar extensión PostGIS

**Comando SQL:**
```sql
CREATE EXTENSION postgis;
```

**Qué hace:** Activa PostGIS en la base de datos `middle_earth`, añadiendo:
- Tipos de datos espaciales (GEOMETRY, GEOGRAPHY)
- ~300 funciones espaciales (ST_*)
- Tablas de metadatos (spatial_ref_sys)

**Resultado esperado:** `CREATE EXTENSION`

**Por qué es importante:** Sin esto, no puedes usar tipos GEOMETRY ni funciones espaciales.

---

#### Paso 7: Verificar instalación de PostGIS

**Comando SQL:**
```sql
SELECT PostGIS_Version();
```

**Resultado esperado:**
```
           postgis_version            
--------------------------------------
 3.4 USE_GEOS=1 USE_PROJ=1 USE_STATS=1
```

**Qué significan los flags:**
- `USE_GEOS=1` → Operaciones geométricas (intersección, buffer, etc.)
- `USE_PROJ=1` → Transformaciones de coordenadas (EPSG:4326 ↔ EPSG:3857)
- `USE_STATS=1` → Estadísticas para optimización de queries

**Por qué es importante:** Confirma que PostGIS está completamente funcional.

---

#### Paso 8: Explorar tabla de sistemas de coordenadas

**Comando SQL:**
```sql
SELECT srid, auth_name, auth_srid, srtext 
FROM spatial_ref_sys 
WHERE srid IN (4326, 3857);
```

**Qué hace:** Muestra información de los sistemas de coordenadas más comunes.

**Resultado esperado:** 2 filas con EPSG:4326 (WGS84) y EPSG:3857 (Web Mercator).

**Por qué es importante:** Estos son los sistemas que usarás en el proyecto.

---

## MÓDULO 3: Conceptos de Sistemas de Coordenadas

### 🎓 Conceptos Teóricos

#### ¿Qué es un Sistema de Referencia de Coordenadas (CRS)?

Un CRS define **cómo se mapean coordenadas numéricas a posiciones en la Tierra**.

**Problema:** La Tierra es una esfera (geoide), pero los mapas son planos.

**Solución:** Proyecciones cartográficas que "aplastan" la esfera en un plano.

#### EPSG:4326 (WGS84) - Sistema Geográfico

**Características:**
- Coordenadas en **grados** (latitud, longitud)
- Latitud: -90° (Polo Sur) a +90° (Polo Norte)
- Longitud: -180° (oeste) a +180° (este)
- **NO proyectado** (coordenadas esféricas)
- Usado por GPS, Google Earth, tus GeoJSONs

**Ejemplo:**
```
Madrid: POINT(-3.7038 40.4168)
         longitud  latitud
```

**Ventajas:**
- ✅ Preciso globalmente
- ✅ Estándar para intercambio de datos
- ✅ Compatible con GPS

**Desventajas:**
- ❌ Distancias en grados (no en metros)
- ❌ Áreas distorsionadas en latitudes altas
- ❌ No se puede medir distancia directamente

#### EPSG:3857 (Web Mercator) - Sistema Proyectado

**Características:**
- Coordenadas en **metros** desde el ecuador/meridiano 0
- Proyección Mercator (cilíndrica)
- Usado por Google Maps, OpenStreetMap, ArcGIS Online
- Distorsiona áreas en latitudes altas (Groenlandia parece enorme)

**Ejemplo:**
```
Madrid: POINT(-412358.45 4926356.89)
         metros X   metros Y
```

**Ventajas:**
- ✅ Distancias en metros
- ✅ Compatible con mapas web
- ✅ Cálculos geométricos más simples

**Desventajas:**
- ❌ Distorsión de áreas
- ❌ No válido en polos (>85° latitud)

#### ¿Cuál usar en tu proyecto?

**Para almacenamiento en PostGIS:** EPSG:4326
- Tus datos ya están en este sistema
- Preciso y sin distorsión
- Fácil de transformar a otros sistemas

**Para visualización en ArcGIS:** EPSG:3857
- ArcGIS Online usa Web Mercator
- PostGIS puede transformar on-the-fly

**Para cálculos de distancia:** GEOGRAPHY o ST_Transform
- `GEOGRAPHY` usa distancias esféricas (precisas)
- `ST_Transform` convierte entre sistemas

### 🛠️ Práctica: Entender Coordenadas

#### Ejercicio 1: Identificar coordenadas en tus datos

**Tu dato de `mapLocations.json`:**
```json
{
  "geometry": {
    "coordinates": [-2.10898, 52.659012],
    "type": "Point"
  },
  "properties": {
    "name": "Tarmabar"
  }
}
```

**Análisis:**
- Longitud: `-2.10898°` (oeste de Greenwich)
- Latitud: `52.659012°` (norte del ecuador)
- Sistema: EPSG:4326 (WGS84)
- Ubicación real: Inglaterra (cerca de Leeds)
- Representa: Tarmabar en Eriador

**Por qué este orden:** GeoJSON usa `[longitud, latitud]` (X, Y), no lat/lon.

---

#### Ejercicio 2: Calcular distancia entre dos puntos

**Comando SQL (después de cargar datos):**
```sql
-- Distancia en grados (INCORRECTO para distancia real)
SELECT ST_Distance(
    ST_SetSRID(ST_MakePoint(-2.10898, 52.659012), 4326),  -- Tarmabar
    ST_SetSRID(ST_MakePoint(-0.338526, 47.295549), 4326)  -- Sunthra Unsar
);
-- Resultado: ~5.4 (grados, no útil)

-- Distancia en metros (CORRECTO usando GEOGRAPHY)
SELECT ST_Distance(
    ST_SetSRID(ST_MakePoint(-2.10898, 52.659012), 4326)::geography,
    ST_SetSRID(ST_MakePoint(-0.338526, 47.295549), 4326)::geography
);
-- Resultado: ~612,000 (metros = 612 km)
```

**Qué aprendes:**
- `ST_MakePoint(lon, lat)` → Crea geometría POINT
- `ST_SetSRID(geom, 4326)` → Asigna sistema de coordenadas
- `::geography` → Convierte a tipo GEOGRAPHY (cálculos esféricos)
- `ST_Distance` → Calcula distancia (en unidades del CRS)

---

## MÓDULO 4: Normalización de GeoJSONs

### 🎓 Conceptos Teóricos

#### Estándar GeoJSON (RFC 7946)

GeoJSON es un formato para codificar estructuras de datos geográficos usando JSON.

**Estructura básica:**
```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "geometry": {
        "type": "Point",
        "coordinates": [lon, lat]
      },
      "properties": {
        "name": "Valor",
        "otherProp": "Otro valor"
      }
    }
  ]
}
```

**Componentes:**
- `FeatureCollection` → Contenedor de features
- `Feature` → Un objeto geográfico individual
- `geometry` → Forma espacial (Point, LineString, Polygon)
- `properties` → Atributos descriptivos (nombre, población, etc.)

#### Análisis de tus archivos actuales

**`mapLocations.json`** ✅ Casi válido
```json
{
  "features": [...]  // ❌ Falta "type": "FeatureCollection"
}
```

**Problema:** Falta `"type": "FeatureCollection"` en el nivel raíz.

**Solución:** Agregar wrapper con tipo correcto.

**Contenido de datos:** ~600+ features de puntos (ciudades, castillos, pueblos, fortalezas) con propiedades:
- `name`: Nombre de la ubicación
- `tipo`: Tipo (ciudad, castillo, pueblo, mansion, fortaleza, ruinas)
- `pop`: Población
- `desc`: Descripción (algunas features)
- `raza`: Raza/etnia (Hobbits, Dunledinos, Norteño, etc.)

---

**`provincias.json`** ✅ Válido pero anidado
```json
[{
  "type": "FeatureCollection",  // ✅ Correcto
  "features": [...]
}]
```

**Problema:** Es un array de FeatureCollections (probablemente solo 1 elemento).

**Solución:** Extraer el primer elemento o combinar features.

**Contenido de datos:** Features de polígonos representando regiones/provincias de Tierra Media.

### 🛠️ Práctica: Normalizar Datos

**Importante:** Trabajaremos solo con `mapLocations.json` (puntos) y `provincias.json` (polígonos). El archivo `locations.json` se usará en una fase futura.

**Flujo de Datos:**
```
Archivos Originales     Archivos Normalizados   Base de Datos PostgreSQL
───────────────────     ─────────────────────   ────────────────────────
mapLocations.json  →    points.geojson      →   tabla locations
provincias.json    →    polygons.geojson    →   tabla regions
```

---

#### Tarea 1: Corregir `mapLocations.json`

**Archivo actual:**
```json
{
  "features": [...]
}
```

**Archivo corregido:**
```json
{
  "type": "FeatureCollection",
  "features": [...]
}
```

**Script de normalización (Node.js):**
```javascript
const fs = require('fs');

// Read file
const data = JSON.parse(fs.readFileSync('mapLocations.json', 'utf8'));

// Add type if missing
if (!data.type) {
  data.type = 'FeatureCollection';
}

// Validate each feature
data.features = data.features.map(feature => {
  // Ensure all required fields exist
  if (!feature.type) feature.type = 'Feature';
  if (!feature.geometry) throw new Error(`Feature without geometry: ${feature.id}`);
  if (!feature.properties) feature.properties = {};
  
  return feature;
});

// Save normalized file
fs.writeFileSync('normalized/points.geojson', JSON.stringify(data, null, 2));
console.log(`✅ Normalized: ${data.features.length} points`);
```

**Qué aprendes:**
- Leer y parsear archivos JSON
- Validar estructura GeoJSON
- Agregar campos requeridos faltantes
- Escribir output JSON formateado

---

#### Tarea 2: Extraer polígonos de `provincias.json`

**Script de normalización:**
```javascript
const fs = require('fs');

// Read file
const data = JSON.parse(fs.readFileSync('provincias.json', 'utf8'));

// Extract FeatureCollection (it's an array with 1 element)
const featureCollection = Array.isArray(data) ? data[0] : data;

// Validate structure
if (featureCollection.type !== 'FeatureCollection') {
  throw new Error('Not a valid FeatureCollection');
}

// Add properties to features if missing
featureCollection.features = featureCollection.features.map((feature, index) => {
  if (!feature.properties) {
    feature.properties = {};
  }
  
  // Add ID if missing
  if (!feature.properties.id && !feature.id) {
    feature.id = `region_${index}`;
  }
  
  return feature;
});

// Save normalized file
fs.writeFileSync('normalized/polygons.geojson', JSON.stringify(featureCollection, null, 2));
console.log(`✅ Normalized: ${featureCollection.features.length} polygons`);
```

**Qué aprendes:**
- Manejar estructuras de datos anidadas
- Extraer datos de arrays
- Agregar IDs auto-generados
- Validación de features de polígonos

---

## MÓDULO 5: Diseño del Esquema de Base de Datos

### 🎓 Conceptos Teóricos

#### Principios de Diseño de Esquemas Espaciales

**1. Separar por tipo de geometría**
- Una tabla para POINT (locations)
- Una tabla para LINESTRING (paths)
- Una tabla para POLYGON (regions)

**Por qué:** PostGIS optimiza mejor queries cuando las geometrías son homogéneas.

**2. Usar SRID consistente**
- Todas las geometrías en EPSG:4326
- Transformar solo cuando sea necesario

**Por qué:** Evita errores de transformación y mejora performance.

**3. Índices espaciales obligatorios**
- Crear índice GIST en columna geometry
- Acelera queries espaciales 100-1000x

**Por qué:** Sin índice, PostGIS hace scan completo de tabla.

**4. Constraints para validación**
- `CHECK (ST_IsValid(geom))` → Geometrías válidas
- `CHECK (ST_SRID(geom) = 4326)` → SRID correcto
- `NOT NULL` en geometría → Siempre tiene valor

**Por qué:** Previene datos corruptos que rompen queries.

### 🛠️ Práctica: Diseñar Esquema

#### Tabla 1: `locations` (Puntos)

**Propósito:** Almacenar ciudades, castillos, pueblos, mansiones, ruinas.

**Esquema SQL:**
```sql
CREATE TABLE locations (
    -- Identifiers
    id SERIAL PRIMARY KEY,
    external_id VARCHAR(255) UNIQUE,  -- ID from original GeoJSON
    
    -- Basic information
    name VARCHAR(255) NOT NULL,
    location_type VARCHAR(100),  -- 'city', 'castle', 'town', 'mansion', 'fortress', 'ruins'
    
    -- Demographics
    population INTEGER,
    race VARCHAR(100),  -- 'Hobbits', 'Dunedain', 'Northmen', etc.
    
    -- Description
    description TEXT,
    
    -- Geographic location
    region VARCHAR(100),  -- 'Eriador', 'Gondor', 'Rohan', etc.
    
    -- Multimedia
    image_url TEXT,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- GEOMETRY (most important)
    geom GEOMETRY(Point, 4326) NOT NULL,
    
    -- Constraints
    CONSTRAINT valid_geometry CHECK (ST_IsValid(geom)),
    CONSTRAINT valid_srid CHECK (ST_SRID(geom) = 4326)
);

-- Spatial index (CRITICAL for performance)
CREATE INDEX idx_locations_geom ON locations USING GIST(geom);

-- Indexes for common searches
CREATE INDEX idx_locations_name ON locations(name);
CREATE INDEX idx_locations_type ON locations(location_type);
CREATE INDEX idx_locations_region ON locations(region);

-- Comments for documentation
COMMENT ON TABLE locations IS 'Point locations in Middle Earth (cities, castles, towns)';
COMMENT ON COLUMN locations.geom IS 'POINT geometry in EPSG:4326 (WGS84)';
COMMENT ON COLUMN locations.location_type IS 'Settlement type: city, castle, town, mansion, fortress, ruins';
```

**Qué aprendes:**
- `GEOMETRY(Point, 4326)` → Tipo espacial específico
- `USING GIST` → Índice espacial (Generalized Search Tree)
- `CHECK` constraints → Validación a nivel de BD
- `COMMENT` → Documentación integrada

---

#### Tabla 2: `paths` (Líneas)

**Propósito:** Almacenar caminos, ríos, rutas, fronteras lineales.

**Esquema SQL:**
```sql
CREATE TABLE paths (
    -- Identifiers
    id SERIAL PRIMARY KEY,
    
    -- Basic information
    name VARCHAR(255),
    path_type VARCHAR(50),  -- 'road', 'river', 'border', 'route'
    
    -- Terrain characteristics
    terrain_type VARCHAR(50),  -- 'mountain', 'forest', 'plains', 'swamp'
    difficulty INTEGER CHECK (difficulty BETWEEN 1 AND 5),  -- 1=easy, 5=hard
    
    -- For future routing
    cost_factor DECIMAL DEFAULT 1.0,  -- Cost multiplier (1.0 = normal)
    
    -- Description
    description TEXT,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),
    
    -- GEOMETRY
    geom GEOMETRY(LineString, 4326) NOT NULL,
    
    -- Constraints
    CONSTRAINT valid_path_geometry CHECK (ST_IsValid(geom)),
    CONSTRAINT valid_path_srid CHECK (ST_SRID(geom) = 4326),
    CONSTRAINT min_two_points CHECK (ST_NPoints(geom) >= 2)
);

-- Spatial index
CREATE INDEX idx_paths_geom ON paths USING GIST(geom);

-- Additional indexes
CREATE INDEX idx_paths_type ON paths(path_type);
CREATE INDEX idx_paths_terrain ON paths(terrain_type);

COMMENT ON TABLE paths IS 'Roads, rivers and routes in Middle Earth';
COMMENT ON COLUMN paths.cost_factor IS 'Cost factor for routing algorithms (1.0 = normal speed)';
```

**Qué aprendes:**
- `GEOMETRY(LineString, 4326)` → Tipo específico para líneas
- `ST_NPoints(geom) >= 2` → Validación geométrica (línea necesita ≥2 puntos)
- `cost_factor` → Preparación para routing futuro (Fase 4)

---

#### Tabla 3: `regions` (Polígonos)

**Propósito:** Almacenar reinos, biomas, provincias, zonas climáticas.

**Esquema SQL:**
```sql
CREATE TABLE regions (
    -- Identifiers
    id SERIAL PRIMARY KEY,
    
    -- Basic information
    name VARCHAR(255) NOT NULL,
    region_type VARCHAR(50),  -- 'kingdom', 'biome', 'province', 'climate_zone'
    
    -- Political information
    ruler VARCHAR(255),  -- King, lord, governor
    allegiance VARCHAR(100),  -- 'Free Peoples', 'Mordor', 'Neutral'
    
    -- Geographic information
    biome VARCHAR(50),  -- 'forest', 'plains', 'mountain', 'swamp', 'desert'
    climate VARCHAR(50),  -- 'temperate', 'cold', 'warm', 'mediterranean'
    
    -- Description
    description TEXT,
    
    -- Statistics
    area_km2 DECIMAL,  -- Will be calculated with ST_Area
    
    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),
    
    -- GEOMETRY
    geom GEOMETRY(Polygon, 4326) NOT NULL,
    
    -- Constraints
    CONSTRAINT valid_region_geometry CHECK (ST_IsValid(geom)),
    CONSTRAINT valid_region_srid CHECK (ST_SRID(geom) = 4326),
    CONSTRAINT closed_polygon CHECK (ST_IsClosed(ST_ExteriorRing(geom)))
);

-- Spatial index
CREATE INDEX idx_regions_geom ON regions USING GIST(geom);

-- Additional indexes
CREATE INDEX idx_regions_type ON regions(region_type);
CREATE INDEX idx_regions_biome ON regions(biome);

COMMENT ON TABLE regions IS 'Regions, kingdoms and biomes of Middle Earth';
COMMENT ON COLUMN regions.area_km2 IS 'Area in square kilometers (calculated with ST_Area)';
```

**Qué aprendes:**
- `GEOMETRY(Polygon, 4326)` → Tipo para áreas
- `ST_IsClosed` → Validación de polígono cerrado
- `ST_ExteriorRing` → Acceso al anillo exterior del polígono

---

#### Tabla 4: `climate_zones` (Para sistema de clima)

**Propósito:** Zonas climáticas europeas para mapear a Tierra Media.

**Esquema SQL:**
```sql
CREATE TABLE climate_zones (
    id SERIAL PRIMARY KEY,
    
    -- Información geográfica
    region_name VARCHAR(255),  -- 'Northern Europe', 'Mediterranean', etc.
    climate_type VARCHAR(50),  -- 'oceanic', 'continental', 'mediterranean', 'alpine'
    
    -- Rango de coordenadas
    latitude_min DECIMAL,
    latitude_max DECIMAL,
    longitude_min DECIMAL,
    longitude_max DECIMAL,
    
    -- Geometría (polígono de la zona)
    geom GEOMETRY(Polygon, 4326),
    
    CONSTRAINT valid_climate_geom CHECK (ST_IsValid(geom))
);

CREATE INDEX idx_climate_zones_geom ON climate_zones USING GIST(geom);
```

---

#### Tabla 5: `monthly_climate_averages` (Datos climáticos)

**Esquema SQL:**
```sql
CREATE TABLE monthly_climate_averages (
    id SERIAL PRIMARY KEY,
    climate_zone_id INTEGER REFERENCES climate_zones(id),
    
    -- Mes (1-12)
    month INTEGER CHECK (month BETWEEN 1 AND 12),
    
    -- Promedios climáticos
    avg_temp_max DECIMAL,  -- °C
    avg_temp_min DECIMAL,  -- °C
    avg_precipitation DECIMAL,  -- mm
    avg_humidity INTEGER,  -- %
    avg_wind_speed DECIMAL,  -- km/h
    
    -- Descripción típica
    typical_weather VARCHAR(100),  -- 'Sunny', 'Rainy', 'Cloudy', 'Snowy'
    
    UNIQUE(climate_zone_id, month)
);

CREATE INDEX idx_climate_month ON monthly_climate_averages(climate_zone_id, month);
```

**Por qué esta tabla:** Almacenar datos climáticos sin depender de APIs externas.

---

## MÓDULO 6: Carga de Datos a PostGIS

### 🎓 Conceptos Teóricos

#### Métodos de Carga de Datos Espaciales

**Método 1: SQL directo con ST_GeomFromGeoJSON**
```sql
INSERT INTO locations (name, tipo, population, geom)
VALUES (
    'Minas Tirith',
    'ciudad',
    50000,
    ST_SetSRID(ST_GeomFromGeoJSON('{"type":"Point","coordinates":[14.26812,40.85177]}'), 4326)
);
```

**Ventajas:** Simple, directo
**Desventajas:** Tedioso para muchos registros

---

**Método 2: Script Node.js con pg-promise**
```javascript
const pgp = require('pg-promise')();
const db = pgp('postgres://user:pass@localhost:5432/middle_earth');

async function loadPoints(geojson) {
    const values = geojson.features.map(f => ({
        external_id: f.id,
        name: f.properties.name,
        location_type: f.properties.tipo,
        population: f.properties.pop,
        description: f.properties.desc,
        race: f.properties.raza,
        geom: `SRID=4326;POINT(${f.geometry.coordinates[0]} ${f.geometry.coordinates[1]})`
    }));
    
    const cs = new pgp.helpers.ColumnSet([
        'external_id', 'name', 'location_type', 'population', 'description', 'race',
        { name: 'geom', mod: ':raw' }
    ], { table: 'locations' });
    
    const query = pgp.helpers.insert(values, cs);
    await db.none(query);
}
```

**Ventajas:** Programático, reutilizable, maneja errores
**Desventajas:** Requiere dependencias Node.js

---

**Método 3: ogr2ogr (herramienta GDAL)**
```bash
ogr2ogr -f "PostgreSQL" \
    PG:"dbname=middle_earth user=postgres" \
    points.geojson \
    -nln locations \
    -append
```

**Ventajas:** Herramienta estándar GIS, muy rápida
**Desventajas:** Menos control sobre esquema

---

**Método 4: COPY con CSV + WKT**
```sql
COPY locations(name, tipo, geom) FROM STDIN WITH CSV;
Minas Tirith,ciudad,"SRID=4326;POINT(14.26812 40.85177)"
Edoras,ciudad,"SRID=4326;POINT(11.25581 43.76956)"
\.
```

**Ventajas:** Muy rápido para bulk inserts
**Desventajas:** Formato específico

**Recomendación para tu proyecto:** Método 2 (Node.js) para aprender y tener control total.

### 🛠️ Práctica: Cargar Datos

#### Script de Carga Completo

**Archivo: `scripts/load_to_postgis.js`**

```javascript
const fs = require('fs');
const pgp = require('pg-promise')();

// Database connection configuration
const db = pgp({
    host: 'localhost',
    port: 5432,
    database: 'middle_earth',
    user: 'postgres',  // Adjust according to your user
    password: ''  // Adjust if you have password
});

// Function to load points
async function loadPoints() {
    console.log('📍 Loading points...');
    
    const geojson = JSON.parse(fs.readFileSync('normalized/points.geojson', 'utf8'));
    
    const values = geojson.features.map(f => {
        const [lon, lat] = f.geometry.coordinates;
        
        return {
            external_id: f.id,
            name: f.properties.name,
            location_type: f.properties.tipo,
            population: f.properties.pop || null,
            description: f.properties.desc || null,
            race: f.properties.raza || null,
            region: f.properties.region || null,
            geom: `SRID=4326;POINT(${lon} ${lat})`
        };
    });
    
    const cs = new pgp.helpers.ColumnSet([
        'external_id', 'name', 'location_type', 'population', 
        'description', 'race', 'region',
        { name: 'geom', mod: ':raw' }
    ], { table: 'locations' });
    
    const query = pgp.helpers.insert(values, cs);
    
    await db.none(query);
    console.log(`✅ Loaded ${values.length} points`);
}

// Function to load polygons
async function loadPolygons() {
    console.log('🗺️  Loading polygons...');
    
    const geojson = JSON.parse(fs.readFileSync('normalized/polygons.geojson', 'utf8'));
    
    for (const feature of geojson.features) {
        const geomGeoJSON = JSON.stringify(feature.geometry);
        
        await db.none(`
            INSERT INTO regions (name, region_type, geom)
            VALUES ($1, $2, ST_SetSRID(ST_GeomFromGeoJSON($3), 4326))
        `, [
            feature.properties.name || 'Unnamed',
            feature.properties.type || 'province',
            geomGeoJSON
        ]);
    }
    
    console.log(`✅ Loaded ${geojson.features.length} polygons`);
}

// Function to calculate areas
async function calculateAreas() {
    console.log('📏 Calculating areas...');
    
    await db.none(`
        UPDATE regions
        SET area_km2 = ST_Area(geom::geography) / 1000000
        WHERE area_km2 IS NULL
    `);
    
    console.log('✅ Areas calculated');
}

// Execute all
async function main() {
    try {
        await loadPoints();
        await loadPolygons();
        await calculateAreas();
        
        console.log('\n🎉 Load completed successfully');
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        pgp.end();
    }
}

main();
```

**Qué aprendes:**
- Conexión a PostgreSQL desde Node.js
- Bulk insert con pg-promise
- Conversión de GeoJSON a WKT (Well-Known Text)
- Cálculo de áreas con `ST_Area(geom::geography)`

---

## MÓDULO 7: Validación y Queries Espaciales Básicas

### 🎓 Conceptos Teóricos

#### Funciones PostGIS Fundamentales

**Funciones de información:**
- `ST_GeometryType(geom)` → Tipo de geometría
- `ST_SRID(geom)` → Sistema de coordenadas
- `ST_NPoints(geom)` → Número de puntos
- `ST_Area(geom)` → Área (en unidades del CRS)
- `ST_Length(geom)` → Longitud de línea

**Funciones de relación espacial:**
- `ST_Contains(geom1, geom2)` → geom1 contiene geom2
- `ST_Within(geom1, geom2)` → geom1 está dentro de geom2
- `ST_Intersects(geom1, geom2)` → Se intersectan
- `ST_Distance(geom1, geom2)` → Distancia entre geometrías

**Funciones de medición:**
- `ST_Distance(geom1::geography, geom2::geography)` → Distancia en metros
- `ST_Area(geom::geography)` → Área en m²
- `ST_Length(geom::geography)` → Longitud en metros

### 🛠️ Práctica: Queries de Validación

#### Query 1: Verificar carga de datos

```sql
-- Contar registros por tabla
SELECT 'locations' AS tabla, COUNT(*) AS total FROM locations
UNION ALL
SELECT 'paths', COUNT(*) FROM paths
UNION ALL
SELECT 'regions', COUNT(*) FROM regions;
```

**Resultado esperado:**
```
   tabla    | total 
------------+-------
 locations  |   XXX
 paths      |     0
 regions    |   XXX
```

---

#### Query 2: Validar geometrías

```sql
-- Verificar que todas las geometrías son válidas
SELECT 
    'locations' AS tabla,
    COUNT(*) AS total,
    COUNT(*) FILTER (WHERE ST_IsValid(geom)) AS validas,
    COUNT(*) FILTER (WHERE NOT ST_IsValid(geom)) AS invalidas
FROM locations
UNION ALL
SELECT 
    'regions',
    COUNT(*),
    COUNT(*) FILTER (WHERE ST_IsValid(geom)),
    COUNT(*) FILTER (WHERE NOT ST_IsValid(geom))
FROM regions;
```

**Resultado esperado:** `invalidas = 0` en todas las tablas.

---

#### Query 3: Explorar datos cargados

```sql
-- Ver primeros 10 puntos con sus coordenadas
SELECT 
    name,
    tipo,
    population,
    ST_X(geom) AS longitude,
    ST_Y(geom) AS latitude,
    ST_AsText(geom) AS wkt
FROM locations
ORDER BY population DESC NULLS LAST
LIMIT 10;
```

**Qué aprendes:**
- `ST_X(geom)` → Extraer longitud
- `ST_Y(geom)` → Extraer latitud
- `ST_AsText(geom)` → Convertir a WKT (formato legible)

---

#### Query 4: Calcular distancias

```sql
-- Distancia entre dos ciudades específicas
SELECT 
    l1.name AS desde,
    l2.name AS hasta,
    ROUND(ST_Distance(l1.geom::geography, l2.geom::geography) / 1000, 2) AS distancia_km
FROM locations l1, locations l2
WHERE l1.name = 'Tarmabar'
  AND l2.name = 'Oatbarton';
```

**Qué aprendes:**
- `::geography` → Conversión para distancias esféricas
- `/1000` → Convertir metros a kilómetros
- `ROUND(..., 2)` → Redondear a 2 decimales

---

#### Query 5: Encontrar ciudades cercanas

```sql
-- Ciudades a menos de 100km de un punto
SELECT 
    name,
    tipo,
    population,
    ROUND(ST_Distance(
        geom::geography,
        ST_SetSRID(ST_MakePoint(-2.10898, 52.659012), 4326)::geography
    ) / 1000, 2) AS distancia_km
FROM locations
WHERE ST_DWithin(
    geom::geography,
    ST_SetSRID(ST_MakePoint(-2.10898, 52.659012), 4326)::geography,
    100000  -- 100km en metros
)
ORDER BY distancia_km;
```

**Qué aprendes:**
- `ST_DWithin(geom1, geom2, distance)` → Filtro de distancia (más eficiente que ST_Distance)
- Uso de índice espacial para performance

---

#### Query 6: Puntos dentro de regiones

```sql
-- Contar ciudades por región
SELECT 
    r.name AS region,
    COUNT(l.id) AS num_ciudades,
    ROUND(r.area_km2, 2) AS area_km2
FROM regions r
LEFT JOIN locations l ON ST_Contains(r.geom, l.geom)
GROUP BY r.id, r.name, r.area_km2
ORDER BY num_ciudades DESC;
```

**Qué aprendes:**
- `ST_Contains(polygon, point)` → Relación espacial
- JOIN espacial (sin clave foránea tradicional)
- Agregación con datos espaciales

---

#### Query 7: Exportar a GeoJSON

```sql
-- Exportar puntos como GeoJSON
SELECT jsonb_build_object(
    'type', 'FeatureCollection',
    'features', jsonb_agg(
        jsonb_build_object(
            'type', 'Feature',
            'geometry', ST_AsGeoJSON(geom)::jsonb,
            'properties', jsonb_build_object(
                'name', name,
                'tipo', tipo,
                'population', population
            )
        )
    )
) AS geojson
FROM locations
WHERE tipo = 'ciudad';
```

**Qué aprendes:**
- `ST_AsGeoJSON(geom)` → Convertir geometría a GeoJSON
- `jsonb_build_object` → Construir JSON en PostgreSQL
- `jsonb_agg` → Agregar en array JSON

---

## Resumen de la FASE 0

### ✅ Checklist de Completitud

- [ ] PostgreSQL + PostGIS instalado y verificado
- [ ] Base de datos `middle_earth` creada
- [ ] Extensión PostGIS activada
- [ ] `mapLocations.json` normalizado a `points.geojson`
- [ ] `provincias.json` normalizado a `polygons.geojson`
- [ ] `locations.json` transformado a `regions.geojson`
- [ ] Tablas creadas: `locations`, `paths`, `regions`
- [ ] Índices espaciales creados
- [ ] Datos cargados desde GeoJSONs
- [ ] Geometrías validadas (todas válidas)
- [ ] Queries espaciales básicas ejecutadas exitosamente

### 📚 Conceptos Aprendidos

1. **Bases de datos espaciales** vs tradicionales
2. **PostGIS** como extensión de PostgreSQL
3. **Sistemas de coordenadas** (EPSG:4326 vs EPSG:3857)
4. **Tipos de geometrías** (POINT, LINESTRING, POLYGON)
5. **Estándar GeoJSON** y FeatureCollection
6. **Índices GIST** para queries espaciales
7. **Funciones ST_*** de PostGIS
8. **ETL de datos geoespaciales**
9. **Queries espaciales** (distancia, contención, intersección)
10. **Conversión entre formatos** (GeoJSON ↔ WKT ↔ SQL)

### 🎯 Próximos Pasos (FASE 1)

Con la base de datos lista, en FASE 1 crearás:
- Backend API REST (Node.js + Express)
- Endpoints para consultar locations, paths, regions
- Frontend Vue 3 + ArcGIS Maps SDK
- Visualización del mapa de Tierra Media
- Sistema de clima simulado

### 📁 Estructura de Archivos Creada

```
/Users/christiankarldelhey/Documents/Middle Earth Map/
├── Geojson/
│   ├── locations.json (original)
│   ├── mapLocations.json (original)
│   └── provincias.json (original)
├── data/
│   └── normalized/
│       ├── points.geojson (normalizado)
│       ├── polygons.geojson (normalizado)
│       └── regions.geojson (transformado)
├── database/
│   ├── schema.sql (esquema de tablas)
│   └── queries/
│       └── validation.sql (queries de validación)
└── scripts/
    ├── normalize_geojson.js (normalización)
    └── load_to_postgis.js (carga a BD)
```

### 🔧 Comandos de Referencia Rápida

```bash
# Conectar a PostgreSQL
psql middle_earth

# Verificar PostGIS
SELECT PostGIS_Version();

# Contar registros
SELECT COUNT(*) FROM locations;

# Ver índices
\di

# Describir tabla
\d locations

# Salir
\q
```

### 💡 Tips para Continuar

1. **Practica queries espaciales** antes de pasar a FASE 1
2. **Explora QGIS** para visualizar tus datos (conecta a PostgreSQL)
3. **Lee documentación de PostGIS:** https://postgis.net/docs/
4. **Experimenta con funciones ST_*** en psql
5. **Guarda queries útiles** en archivos .sql para reutilizar

---

## Tiempo Estimado

- **Módulo 1-3 (Teoría):** 2-3 horas
- **Módulo 4 (Normalización):** 2-3 horas
- **Módulo 5 (Esquema):** 1-2 horas
- **Módulo 6 (Carga):** 1-2 horas
- **Módulo 7 (Validación):** 1 hora

**Total:** 7-11 horas (distribuidas en 2-3 días)

---

## Recursos Adicionales

- [PostGIS Documentation](https://postgis.net/docs/)
- [GeoJSON Specification](https://geojson.org/)
- [PostgreSQL Tutorial](https://www.postgresqltutorial.com/)
- [EPSG.io](https://epsg.io/) - Buscar sistemas de coordenadas
- [GeoJSON.io](http://geojson.io/) - Visualizar/editar GeoJSON
