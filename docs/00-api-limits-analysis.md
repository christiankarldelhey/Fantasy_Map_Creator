# Análisis de Límites de APIs y Estrategia de Implementación

Plan detallado para implementar el sistema de clima histórico y edición de features GIS dentro de los límites gratuitos de OpenWeather y ArcGIS Location Platform.

## Límites de APIs Confirmados

### 1. OpenWeather One Call API 3.0

**Plan Gratuito:**
- ✅ **2,000 llamadas/día** (gratis con suscripción "One Call by Call")
- ✅ **Datos históricos:** Últimos 5 días incluidos GRATIS
- ✅ **Datos históricos extendidos:** Desde 01-01-1979 hasta hoy (requiere timestamp específico)
- ⚠️ **Limitación crítica:** Solo 5 días históricos gratis, datos más antiguos requieren pago

**Costos adicionales:**
- Datos históricos >5 días: ~$0.0012 por llamada
- Para 365 días × ~100 ubicaciones = 36,500 llamadas = ~$43.80/año (si consultamos todo)

**Conclusión:** El plan gratuito NO soporta clima histórico de un año completo de forma viable.

### 2. ArcGIS Location Platform (Free Tier)

**Límites mensuales gratuitos:**
- ✅ **Feature Storage:** 250 MB gratis
- ✅ **Tiles/Files/Attachments:** 250 MB gratis
- ✅ **Feature Queries (bandwidth):** 125 MB/mes gratis
- ✅ **Feature Edits (bandwidth):** 125 MB/mes gratis
- ✅ **Basemap tiles:** 2,000,000 tiles/mes gratis
- ✅ **Basemap sessions:** 1,000 sessions/mes gratis

**Capacidad estimada para tu proyecto:**
- **Puntos:** ~10,000-50,000 features (con propiedades básicas)
- **Líneas:** ~1,000-5,000 caminos
- **Polígonos:** ~500-2,000 regiones/biomas
- **Usuarios concurrentes:** 5-20 usuarios = ~100-400 sessions/mes ✅ Dentro del límite

**Conclusión:** ArcGIS Free Tier es MÁS QUE SUFICIENTE para tu portfolio con 5-20 usuarios.

## Estrategias Recomendadas

### Estrategia A: Sistema de Clima Híbrido (RECOMENDADA)

**Implementación:**

1. **Base de datos local con promedios climáticos mensuales**
   - Crear tabla `climate_data` en PostgreSQL con datos históricos promedio
   - Fuente: Datos públicos de NOAA, Copernicus, o scraping de Wikipedia
   - Estructura: `(location_id, month, avg_temp, avg_precipitation, avg_wind, etc.)`
   - Costo: $0 (datos públicos)

2. **API de OpenWeather solo para consultas en tiempo real**
   - Usar las 2,000 llamadas/día para clima actual y forecast
   - Mostrar clima "actual" de la fecha de la aventura usando promedios históricos
   - Reservar API calls para features premium (clima dinámico en tiempo real)

3. **Modelo climático simulado basado en latitud**
   - Calcular temperatura base según latitud europea
   - Ajustar por bioma (bosque -2°C, montaña -5°C, desierto +8°C)
   - Variación estacional automática

**Ventajas:**
- ✅ Costo: $0
- ✅ Sin límites de consultas
- ✅ Realista para portfolio
- ✅ Demuestra habilidades de modelado de datos

### Estrategia B: Scraping de Datos Históricos (One-time)

**Implementación:**

1. **Recolección única de datos históricos**
   - Usar Open-Meteo API (100% gratuita, sin API key)
   - Endpoint: `https://archive-api.open-meteo.com/v1/archive`
   - Descargar datos de 2023 para ~100 ubicaciones europeas
   - Almacenar en PostgreSQL

2. **Estructura de datos:**
```sql
CREATE TABLE historical_weather (
    id SERIAL PRIMARY KEY,
    location_id INTEGER REFERENCES locations(id),
    date DATE NOT NULL,
    temp_max DECIMAL,
    temp_min DECIMAL,
    precipitation DECIMAL,
    wind_speed DECIMAL,
    weather_code INTEGER
);
```

3. **Consulta en la aplicación:**
   - Usuario selecciona fecha de aventura
   - Query: `SELECT * FROM historical_weather WHERE location_id = X AND date = '2023-MM-DD'`
   - Mostrar clima "real" de ese día del año pasado

**Ventajas:**
- ✅ Costo: $0
- ✅ Datos reales históricos
- ✅ Sin dependencia de APIs en producción
- ✅ Aprenderás ETL y data pipelines

### Estrategia C: Combinación Óptima

**Para Portfolio (Fase 1-3):**
- Usar Estrategia A (promedios mensuales + modelo simulado)
- Implementar en PostgreSQL con PostGIS
- Demostrar queries espaciales complejas

**Para Negocio Futuro (Fase 6):**
- Migrar a Estrategia B (datos históricos reales)
- Implementar cache inteligente
- Considerar plan de pago de OpenWeather solo si escala

## Arquitectura Propuesta para Clima

### Base de Datos PostgreSQL

```sql
-- Tabla de promedios climáticos por región europea
CREATE TABLE climate_zones (
    id SERIAL PRIMARY KEY,
    region_name VARCHAR(255),
    latitude_min DECIMAL,
    latitude_max DECIMAL,
    longitude_min DECIMAL,
    longitude_max DECIMAL,
    climate_type VARCHAR(50), -- 'mediterranean', 'continental', 'oceanic', 'alpine'
    geom GEOMETRY(Polygon, 4326)
);

-- Tabla de promedios mensuales
CREATE TABLE monthly_climate_averages (
    id SERIAL PRIMARY KEY,
    climate_zone_id INTEGER REFERENCES climate_zones(id),
    month INTEGER CHECK (month BETWEEN 1 AND 12),
    avg_temp_max DECIMAL,
    avg_temp_min DECIMAL,
    avg_precipitation DECIMAL,
    avg_humidity INTEGER,
    avg_wind_speed DECIMAL,
    typical_weather VARCHAR(100)
);

-- Modificadores por bioma de Tierra Media
CREATE TABLE biome_climate_modifiers (
    id SERIAL PRIMARY KEY,
    biome_type VARCHAR(50), -- 'forest', 'mountain', 'plains', 'swamp', 'desert'
    temp_modifier DECIMAL, -- +/- grados
    precipitation_modifier DECIMAL, -- multiplicador
    description TEXT
);
```

### API Backend (Node.js/Express)

```javascript
// Endpoint para obtener clima de una ubicación en una fecha
GET /api/weather/:locationId/:date

// Lógica:
// 1. Obtener coordenadas de location desde PostGIS
// 2. Determinar zona climática europea (ST_Contains)
// 3. Extraer mes de la fecha
// 4. Query a monthly_climate_averages
// 5. Obtener bioma de la región (ST_Contains con regions table)
// 6. Aplicar modificadores de bioma
// 7. Agregar variación aleatoria ±2°C para realismo
// 8. Retornar JSON con clima calculado
```

### Frontend Vue 3

```javascript
// Componente WeatherWidget.vue
// - Mostrar clima al hacer hover en ubicación
// - Icono dinámico según condiciones
// - Temperatura, precipitación, viento
// - Descripción narrativa ("Día frío y lluvioso en el Bosque Negro")
```

## Arquitectura para Edición de Features (ArcGIS)

### Límites y Optimizaciones

**Consumo estimado para 5-20 usuarios:**

| Métrica | Uso Mensual | Límite Free | Estado |
|---------|-------------|-------------|--------|
| Feature Storage | ~50 MB | 250 MB | ✅ 20% |
| Feature Edits | ~10 MB | 125 MB | ✅ 8% |
| Feature Queries | ~30 MB | 125 MB | ✅ 24% |
| Basemap Tiles | ~500K tiles | 2M tiles | ✅ 25% |

**Conclusión:** Muy holgado para portfolio.

### Implementación con ArcGIS Maps SDK

**1. Feature Layers desde PostGIS**

```javascript
// Opción A: Feature Service en ArcGIS Online (consume storage)
const featureLayer = new FeatureLayer({
  url: "https://services.arcgis.com/your-org/arcgis/rest/services/middle_earth_locations/FeatureServer/0"
});

// Opción B: GeoJSON desde tu API (NO consume ArcGIS storage)
const geojsonLayer = new GeoJSONLayer({
  url: "https://your-api.com/api/locations/geojson"
});
```

**Recomendación:** Usar Opción B (GeoJSON desde tu API) para:
- ✅ No consumir storage de ArcGIS
- ✅ Control total de los datos
- ✅ Demostrar integración PostGIS → API → Frontend

**2. Editor Widget para Crear/Editar Features**

```javascript
import Editor from "@arcgis/core/widgets/Editor";
import FeatureLayer from "@arcgis/core/layers/FeatureLayer";

// Configurar Editor
const editor = new Editor({
  view: mapView,
  layerInfos: [{
    layer: locationsLayer,
    formTemplate: {
      elements: [
        { type: "field", fieldName: "name", label: "Nombre" },
        { type: "field", fieldName: "tipo", label: "Tipo" },
        { type: "field", fieldName: "population", label: "Población" },
        { type: "field", fieldName: "description", label: "Descripción" }
      ]
    },
    enabled: true,
    addEnabled: true,
    updateEnabled: true,
    deleteEnabled: true
  }]
});

mapView.ui.add(editor, "top-right");
```

**3. Sketch Widget para Dibujar Geometrías**

```javascript
import Sketch from "@arcgis/core/widgets/Sketch";
import GraphicsLayer from "@arcgis/core/layers/GraphicsLayer";

const sketchLayer = new GraphicsLayer();
map.add(sketchLayer);

const sketch = new Sketch({
  view: mapView,
  layer: sketchLayer,
  creationMode: "update", // "single" o "continuous"
  availableCreateTools: ["point", "polyline", "polygon", "circle", "rectangle"]
});

// Evento al completar dibujo
sketch.on("create", async (event) => {
  if (event.state === "complete") {
    const geometry = event.graphic.geometry;
    // Enviar a tu API para guardar en PostGIS
    await saveToPostGIS(geometry);
  }
});
```

**4. Optimizaciones para No Exceder Límites**

```javascript
// Cache de features en cliente
const featureCache = new Map();

// Lazy loading con paginación
const queryFeatures = async (extent) => {
  const query = {
    geometry: extent,
    spatialRelationship: "intersects",
    outFields: ["*"],
    returnGeometry: true,
    maxRecordCount: 100 // Limitar resultados
  };
  
  return await featureLayer.queryFeatures(query);
};

// Clustering para muchos puntos
locationsLayer.featureReduction = {
  type: "cluster",
  clusterRadius: "100px",
  clusterMinSize: "24px",
  clusterMaxSize: "60px"
};
```

## Plan de Implementación Revisado

### FASE 0: Setup (ACTUAL)
- ✅ PostgreSQL + PostGIS instalado
- ✅ Base de datos `middle_earth` creada
- ⏳ Normalizar GeoJSONs
- ⏳ Cargar datos a PostGIS

### FASE 1: Mapa Básico + Clima Simulado (3 semanas)
1. **Backend API (Node.js + Express)**
   - Endpoints REST para locations, paths, regions
   - Queries espaciales con PostGIS
   - Sistema de clima con promedios mensuales

2. **Frontend Vue 3 + ArcGIS SDK**
   - Integrar basemap desde ArcGIS Online
   - GeoJSONLayer consumiendo tu API
   - Popup con clima simulado
   - Sidebar con detalles

3. **Base de datos climática**
   - Scraping de datos climáticos públicos (Open-Meteo)
   - Tabla `climate_zones` con regiones europeas
   - Tabla `monthly_climate_averages`
   - Tabla `biome_climate_modifiers`

### FASE 2: Edición de Features (3 semanas)
1. **Editor Widget de ArcGIS**
   - Crear puntos (ciudades, castillos)
   - Dibujar líneas (caminos)
   - Dibujar polígonos (reinos, biomas)

2. **Backend para ediciones**
   - POST/PUT/DELETE endpoints
   - Validación de geometrías con PostGIS
   - Transacciones atómicas

3. **Autenticación básica**
   - Login simple (JWT)
   - Roles: viewer vs editor

### FASE 3: GraphQL + Análisis Espacial (4 semanas)
1. **GraphQL con PostGraphile**
   - Schema automático desde PostGIS
   - Queries anidadas
   - Filtros espaciales

2. **Queries espaciales avanzadas**
   - Ciudades cercanas (`ST_Distance`)
   - Regiones que contienen punto (`ST_Contains`)
   - Intersección de caminos con biomas

### FASE 4-6: Features Avanzados
- Routing con pgRouting
- Datos históricos reales (si escala)
- Plataforma multi-usuario

## Respuestas a tus Preguntas

### 1. ¿Límites de OpenWeather para clima histórico?

**Respuesta:** El free tier solo incluye 5 días históricos. Para un año completo necesitarías:
- **Plan de pago:** $43.80/año aproximadamente
- **Alternativa GRATIS:** Open-Meteo API (sin límites, sin API key)
- **Recomendación:** Usar promedios mensuales + modelo simulado para portfolio

### 2. ¿ArcGIS Developer se banca dibujar puntos/líneas/polígonos?

**Respuesta:** ✅ **SÍ, absolutamente.** El free tier es MUY generoso:
- 250 MB de storage = ~50,000 features con propiedades
- 125 MB de edits/mes = ~25,000 operaciones de edición
- Para 5-20 usuarios: usarás ~10-20% de los límites

**No va a morir en la mitad.** De hecho, podrías tener cientos de usuarios antes de necesitar pagar.

## Tecnologías Finales Recomendadas

### Stack Completo

**Backend:**
- Node.js + Express
- PostgreSQL 15 + PostGIS 3.4
- PostGraphile (GraphQL automático)
- pg-promise (conexión a DB)

**Frontend:**
- Vue 3 (Composition API)
- Vite (build tool)
- ArcGIS Maps SDK for JavaScript 4.29+
- Tailwind CSS
- Pinia (state management)

**APIs Externas:**
- ArcGIS Location Platform (basemaps, geocoding)
- Open-Meteo API (clima histórico gratis)
- OpenWeather (opcional, para clima en tiempo real)

**DevOps:**
- Docker (PostgreSQL + PostGIS)
- GitHub Actions (CI/CD)
- Netlify/Vercel (frontend)
- Railway/Render (backend + DB)

## Próximos Pasos Inmediatos

1. ✅ **Confirmar que tienes PostgreSQL + PostGIS instalado**
2. ⏳ **Crear esquema de base de datos con tablas espaciales**
3. ⏳ **Normalizar tus GeoJSONs a formato estándar**
4. ⏳ **Cargar datos a PostGIS**
5. ⏳ **Crear script para scraping de datos climáticos de Open-Meteo**
6. ⏳ **Setup proyecto Vue 3 + ArcGIS SDK**

## Estimación de Costos

| Servicio | Costo Mensual | Notas |
|----------|---------------|-------|
| ArcGIS Location Platform | $0 | Free tier suficiente |
| OpenWeather | $0 | Solo usar free tier |
| Open-Meteo | $0 | Completamente gratis |
| PostgreSQL (local) | $0 | Desarrollo local |
| PostgreSQL (producción) | $0-5 | Railway free tier o Supabase |
| Hosting Frontend | $0 | Netlify/Vercel free tier |
| Hosting Backend | $0-5 | Railway/Render free tier |
| **TOTAL** | **$0-10/mes** | Portfolio completamente viable |

## Conclusión

Tu proyecto es **100% viable con free tiers**. Las limitaciones de OpenWeather se resuelven usando Open-Meteo o datos promedio. ArcGIS Location Platform tiene límites muy generosos que no alcanzarás con 5-20 usuarios.

**Recomendación final:** Proceder con Estrategia A (clima simulado) para Fases 1-3, y considerar Estrategia B (datos históricos reales) solo si el proyecto escala o lo requiere un empleador.
