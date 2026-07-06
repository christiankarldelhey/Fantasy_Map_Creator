# Middle Earth Wandering Simulator

**Mapa geoespacial interactivo de Tierra Media**

`QGIS` · `PostGIS` · `PostgreSQL` · `Vue 3 + TypeScript` · `Node.js / Express` · `MapLibre GL` · `Gemini + Groq`

---

Siempre me fascinaron los mapas de fantasía, especialmente los que tienen rigor geográfico. El mapa de **Pete Fenlon** para *MERP* (Middle Earth Role Playing) — el sistema de rol que ICE derivó de Rolemaster y publicó durante los años 80 y 90 — es uno de los trabajos cartográficos más detallados y hermosos de la historia de los juegos de rol. Quería explorar qué pasaba si ese mapa dejaba de ser decorativo y se convertía en un sistema vivo.

El resultado es el **Middle Earth Wandering Simulator**: Tierra Media georreferenciada sobre Europa mediante QGIS, heredando coordenadas geográficas reales (EPSG:4326 / WGS84) para poder medir distancias, calcular rutas, simular climas históricos y narrar historias generadas por IA ancladas en los datos del mapa.

---

## Índice

- [Visión general](#visión-general)
- [El punto de partida](#el-punto-de-partida)
- [Datos geográficos](#datos-geográficos)
- [Sistema de clima](#sistema-de-clima)
- [Cálculo de rutas](#cálculo-de-rutas)
- [Personajes y narrativa](#personajes-y-narrativa)
- [Exploración y usuarios](#exploración-y-usuarios)
- [Arquitectura técnica](#arquitectura-técnica)
  - [Frontend](#frontend)
  - [Backend](#backend)
  - [Base de datos](#base-de-datos)
- [Stack tecnológico](#stack-tecnológico)
- [Puesta en marcha](#puesta-en-marcha)
- [Orden de construcción del proyecto](#orden-de-construcción-del-proyecto)
- [Objetivos del proyecto](#objetivos-del-proyecto)

---

## Visión general

El sistema modela Tierra Media en **capas geoespaciales reales** sobre PostGIS y las expone a través de una API REST en Node.js. El frontend (Vue 3) renderiza esas capas sobre un mapa vectorial y permite calcular rutas, simular el paso del tiempo y del clima, y generar una narración diaria por IA para un viaje concreto.

El proyecto creció por capas: primero los datos geográficos estáticos, luego el clima dinámico, luego las entidades y regiones, y finalmente el sistema de narración.

## El punto de partida

El primer desafío fue conseguir el mapa de Pete Fenlon en alta resolución y **georreferenciarlo sobre Europa** usando QGIS con tiles y coordenadas reales. Una vez anclado geográficamente, el proyecto tomó su forma natural: si tengo coordenadas reales, puedo tener datos reales — clima real, elevación real, distancias calculables.

---

## Datos geográficos

Todas las capas se almacenan como geometrías en PostGIS con SRID **4326** e índices espaciales **GIST**.

### Sistema de biomas

Segmentación asistida por IA para marcar los polígonos de bosques, marismas y desiertos directamente sobre el mapa escaneado. Se almacenan en la tabla `biomes` como `GEOMETRY(Polygon, 4326)` y se renderizan en el frontend como *overlays*.

- **Bosques** — coberturas arboladas de distintas densidades
- **Marismas** — zonas pantanosas y tierras bajas inundables
- **Desiertos** — regiones áridas y estepas
- *(En desarrollo: glaciares)*

### Sistema de agua

Los cursos de agua fueron trazados a mano en QGIS siguiendo la lógica del mapa original de Fenlon. Se guardan en la tabla `water` con una columna `geom` de tipo `GEOMETRY` genérico, que admite tanto **LINESTRING** (ríos y arroyos) como **POLYGON** (mares y lagos), discriminados por el campo `water_type`.

### Sistema de elevación

Capas de polígonos (`altitude_layers`) para distintos rangos de altitud — llanuras, colinas, montañas bajas, medias y altas — con un campo `priority` que resuelve solapamientos. Sobre esas capas se construyó una **DEM (Digital Elevation Model) como raster PostGIS** (`dem_elevation`), sintetizada a partir de los picos marcados como puntos.

La altitud de cualquier coordenada se consulta con la función SQL `get_elevation_at_point(lon, lat)`, y la API expone además perfiles de elevación (`/api/dem/profile`) que interpolan puntos cada 100 m y calculan desnivel positivo/negativo. Esto impacta directamente en el coste de las rutas y en las condiciones de viaje.

### Localizaciones y regiones

- **`locations`** — puntos (`POINT`): nombre, tipo (ciudad, fortaleza, ruina, paso de montaña, etc.), población, habitantes y descripción narrativa.
- **`regions`** — polígonos políticos generados con `polygonize` en PostGIS a partir de líneas de borde. Incluyen reino asociado (`kingdoms`), zona climática (`climate_zones`), descripción geográfica/histórica y métricas de encuentro.
- **`entities`** — criaturas y personajes (clave primaria UUID). Cada entidad guarda un array de regiones y biomas donde aparece y un campo JSONB `probability_by_region` con la probabilidad de encuentro por región.

---

## Sistema de clima

El clima se basa en **datos climáticos reales de Europa de 1950**, antes del boom industrial y urbano, usando como referencia las coordenadas europeas sobre las que se superpone el mapa. Esto da un clima coherente con una Tierra Media de Tercera Edad: sin efecto isla de calor ni contaminación moderna.

Técnicamente:

- Cada región apunta a una `climate_zone`, que guarda su clasificación **Köppen** y una **localización análoga del mundo real** (`analog_location`, `analog_lat`, `analog_lon`).
- Los datos meteorológicos horarios de 1950 viven en la tabla `climate_data` (temperatura a 2 m, humedad relativa, precipitación, nieve, cobertura nubosa, viento, presión, humedad del suelo, radiación, etc.), en el estilo de series ERA5 / Open-Meteo.
- La fecha "en vivo" se **mapea al año 1950** conservando mes, día y hora, tanto en el cliente (`useGlobalClimateTime`) como en el backend, para consultar el registro horario correspondiente.

### Regiones y su análogo climático real

Para cada región se eligió una localización del mundo real cuyo clima (clasificación **Köppen**) sirve de fuente para las series horarias de 1950. Algunos ejemplos representativos:

| Región de Tierra Media | Köppen | Análogo del mundo real | Coordenadas |
| --- | --- | --- | --- |
| **La Comarca** (The Shire) | `Cfb` — oceánico templado | Cotswolds, Gloucestershire (Inglaterra) | 51.83, -1.82 |
| **Lórien** | `Cfb` — oceánico templado | Bosque de Białowieża (Polonia) | 52.70, 23.86 |
| **Rivendell** | `Cfb` — oceánico de montaña | Valle de Engadina (Suiza) | 46.50, 9.83 |
| **Rohan** | `Dfb` — continental húmedo | Hortobágy (Hungría) | 47.60, 21.00 |
| **Mordor** | `BWh` — desértico cálido | Doğubayazıt, Anatolia Oriental (Turquía) | 39.55, 44.08 |

El sistema incluye:

- **Calendario dinámico** de Tierra Media (Cuenta de los Años / Shire Reckoning) con clima en vivo.
- **Temperatura, precipitación y condiciones** por estación y región.
- Posibilidad de **adelantar o atrasar el calendario** para explorar otros momentos del año.
- Impacto directo del clima en el coste de viaje y en la narración por IA.

---

## Cálculo de rutas

> **Corrección importante respecto de versiones anteriores del texto:** el motor de rutas **no usa la extensión pgRouting**. Se implementó un **algoritmo de Dijkstra propio en JavaScript** que opera sobre la red de caminos traída desde PostGIS.

El flujo (`backend/services/routing.js`) es:

1. Se traen todos los `roads` desde PostGIS y, mediante *LATERAL joins* con `ST_Intersects`, se les adjunta el **bioma** (`biomes`) y el **tipo de altitud** (`altitude_layers`) que atraviesan.
2. Se construye un grafo con cada par de vértices consecutivos de cada camino. El **coste de cada arista es el tiempo de viaje** (`distancia / velocidad`), donde:

   ```
   velocidad = velocidad_base × mult_camino × mult_bioma × mult_altitud
   ```

3. Se resuelve el camino más corto con Dijkstra. Los tramos *off-road* (del origen/destino al vértice de camino más cercano) se penalizan y se miden con `ST_Length` sobre `geography` para obtener distancias precisas.

Los multiplicadores dependen del **medio de transporte**. Actualmente están implementados:

- **A pie** — velocidad base 5 km/h
- **A caballo** — velocidad base 12 km/h

Factores que afectan al coste: **tipo de camino** (Royal Road, Main Road, Regular Road, Trail, off-road), **bioma** (llanura, bosque, desierto, marisma), **altitud** (llanura, colinas, montañas baja/media/alta) y, aguas arriba, el **clima**. El resultado se devuelve como GeoJSON con distancia total, distancia on-road/off-road y tiempo estimado, lo que permite estimar cuántos días tarda un personaje en llegar de un punto a otro.

---

## Personajes y narrativa

### Los dos personajes

Dos personajes seleccionables, cada uno con estadísticas, descripción y **voz narrativa propia** (guardada en `character_state.system_prompt`):

- **La Elfa Noldo** — Inmortal, de las casas antiguas; camina el mundo como rebelde desde antes de la caída de Beleriand. Su perspectiva es la del tiempo largo.
- **El Dúnedain Rastreador** — Mortal, heredero de Númenor; recorre Tierra Media en busca de un camino antiguo. Su perspectiva es la del esfuerzo y el peligro cotidiano.

### Sistema de narración con IA

> **Corrección importante:** la narración no depende de un único proveedor. Usa una **cascada de proveedores con fallback automático**: **Gemini 2.0 Flash como proveedor principal** y **Groq (`llama-3.3-70b-versatile`) como respaldo** ante límites de tasa, con soporte para dos claves de Groq. Ver `backend/services/ai.js`.

El sistema genera una **historia única por cada día de viaje** (un capítulo = un día). Cada capítulo se construye a partir de:

- Los datos de **elevación, bioma y clima** del tramo recorrido.
- Las **regiones y localizaciones** atravesadas.
- Las **entidades con probabilidad de encuentro** en esa región.
- El **carácter, voz y backstory** del personaje elegido.

El resultado es una narración con descripciones ambientales, pensamientos internos y **encuentros generados proceduralmente**, siempre anclados en los datos geográficos del mapa. La lógica de resolución de encuentros e interacciones vive en los servicios `encounters.js`, `interactionResolver.js`, `prompt.js` y `tripDay.js`.

### Sistema de energía

- Un personaje puede recibir hasta **dos golpes** en un encuentro.
- Un golpe reduce la energía a la mitad; **dos golpes son mortales**.
- La recuperación completa requiere **cinco días de descanso**.

---

## Exploración y usuarios

El mapa es explorable **con y sin login**:

- **Sin autenticar:** regiones, localizaciones, biomas, clima y altitud.
- **Autenticado:** acceso completo a rutas, personajes, narración e historial de viajes.

La autenticación usa **JWT** (`jsonwebtoken`, tokens de 7 días) con contraseñas *hasheadas* con **bcrypt**. Tablas de usuario:

- **`users`** — cuenta, ajustes (`settings` JSONB), personaje y viaje activos.
- **`trips`** — historial de rutas generadas por el usuario.
- **Días de viaje** — registro día a día con el capítulo narrativo correspondiente.

---

## Arquitectura técnica

### Frontend

- **Vue 3 (Composition API) + TypeScript + Vite.**
- **Arquitectura Feature-Sliced Design (FSD)**, organizada por capas de responsabilidad creciente:
  - `app/` — bootstrap, router (`vue-router`), estilos y tema.
  - `pages/` — vistas de ruta.
  - `widgets/` — bloques compuestos de UI (visor de mapa, sidebar de localizaciones, selector de calendario, input de direcciones, buscador).
  - `features/` — casos de uso por dominio (gestión de biomas, clima, altitud, rutas, prompts, etc.).
  - `entities/` — modelos y lógica por dominio (mapa, región, bioma, agua, altitud, ruta, localización…).
  - `shared/` — API client, config, tipos y utilidades transversales.
- **Mapa:** [MapLibre GL](https://maplibre.org/) (mapa vectorial, *no* Leaflet), con [Turf.js](https://turfjs.org/) para geometría (medición de longitud, interpolación de puntos a lo largo de la ruta para animar al personaje).
- **UI:** TailwindCSS + [Reka UI](https://reka-ui.com/) (componentes headless estilo shadcn) + iconos Lucide.
- **Estado:** no se usa Vuex/Pinia; el estado compartido se maneja con **composables** (`useAuth`, `useDirections`, `useMapRoutes`, `useCharacter`, `useGlobalClimateTime`, `useUserSettings`, …), varios con estado a nivel de módulo (singletons).
- **Comunicación:** `axios` contra la API REST.

### Backend

- **Node.js + Express (ESM)**, arquitectura **modular por dominio / feature slices**:
  - `routes/` — un router Express por recurso (`locations`, `regions`, `biomes`, `altitude`, `roads`, `water`, `peaks`, `dem`, `climate`, `directions`, `character`, `trips`, `auth`, `users`, `search`), montados bajo `/api/*`.
  - `services/` — la lógica de negocio pesada, desacoplada de las rutas: `routing.js` (Dijkstra + costes de terreno), `ai.js` (cascada Gemini→Groq), `tripDay.js` / `tripGeometry.js` (construcción del viaje día a día), `encounters.js`, `interactionResolver.js`, `prompt.js`, `naturalLanguage.js`, `terrainPhrases.js`, `thoughts.js`.
  - `middleware/auth.js` — verificación de JWT.
- **Base de datos:** acceso vía `pg` (pool de conexiones en `db.js`); toda la lógica geoespacial se delega a **PostGIS** con SQL parametrizado.
- **Auth:** JWT + bcrypt.
- Endpoint de salud en `/api/health`.

### Base de datos

- **PostgreSQL + PostGIS.** Modelo relacional normalizado, todas las geometrías en **EPSG:4326** con índices espaciales **GIST** e índices B-tree/GIN según el patrón de consulta.
- **Tablas geoespaciales:** `locations` (POINT), `roads` (LINESTRING), `water` (GEOMETRY river/lake), `regions` (POLYGON), `biomes` (POLYGON), `altitude_layers` (POLYGON) y el raster `dem_elevation`.
- **Datos de dominio:** `kingdoms`, `climate_zones`, `climate_data` (series horarias de 1950), `entities` (UUID, arrays de regiones/biomas, probabilidades JSONB), `character_state`, `users`, `trips` y sus días.
- **Funciones SQL** para lógica geoespacial reutilizable, como `get_elevation_at_point(lon, lat)` sobre el raster DEM.
- **Constraints de integridad geométrica:** `ST_IsValid`, verificación de SRID y de polígonos cerrados.
- Las migraciones y seeds viven en `database/migrations/` y `database/seeds/`.

---

## Stack tecnológico

| Herramienta | Uso |
| --- | --- |
| **QGIS** | Georreferenciación del mapa y creación de capas vectoriales |
| **PostGIS** | Almacenamiento y consulta de datos geoespaciales (vector + raster) |
| **PostgreSQL** | Base de datos relacional normalizada |
| **Vue 3 + TypeScript + Vite** | Frontend interactivo (Feature-Sliced Design) |
| **MapLibre GL + Turf.js** | Renderizado del mapa vectorial y geometría en cliente |
| **TailwindCSS + Reka UI** | Sistema de estilos y componentes de UI |
| **Node.js + Express** | Backend y API REST |
| **`pg`** | Cliente PostgreSQL / pool de conexiones |
| **Dijkstra propio (JS)** | Cálculo de rutas con coste variable por terreno *(no pgRouting)* |
| **Google Gemini 2.0 Flash** | Proveedor principal de narración por IA |
| **Groq (`llama-3.3-70b-versatile`)** | Proveedor de respaldo (fallback) para la IA |
| **JWT + bcrypt** | Autenticación y hashing de contraseñas |
| **Docker + Railway** | Contenedorización y despliegue en producción |

---

## Puesta en marcha

Requisitos: **Node.js ≥ 22**, **PostgreSQL con PostGIS**.

```bash
# 1. Base de datos: crear la BD y aplicar el esquema
psql -d middle_earth -f database/schema.sql
# (opcional) migraciones y seeds
cd database/seeds && npm install && npm run ...   # ver database/seeds/README.md

# 2. Backend
cd backend
npm install
# configurar variables de entorno (ver más abajo)
npm run dev            # http://localhost:5000

# 3. Frontend
cd frontend
npm install
npm run dev            # http://localhost:5173
```

**Variables de entorno del backend** (parciales):

| Variable | Descripción |
| --- | --- |
| `DATABASE_URL` / config `pg` | Conexión a PostgreSQL/PostGIS |
| `JWT_SECRET` | Secreto para firmar tokens JWT |
| `CORS_ORIGIN` | Origen permitido (por defecto `http://localhost:5173`) |
| `GEMINI_API_KEY` | Clave de Google Gemini (proveedor principal de IA) |
| `GROQ_API_KEY` / `GROQ_API_KEY_2` | Claves de Groq (fallback) |
| `PORT` | Puerto del servidor (por defecto `5000`) |

> **Nota de seguridad:** las claves de API nunca deben *hardcodearse*; se leen desde variables de entorno vía `dotenv`.

**Despliegue:** el proyecto se empaqueta con Docker (`Dockerfile`) y se despliega en **Railway** (`railway.json`), que ejecuta migraciones/seeds en `preDeployCommand` (`npm run postdeploy`).

---

## Orden de construcción del proyecto

1. Georreferenciar el mapa de Pete Fenlon sobre Europa con tiles y coordenadas reales en QGIS.
2. Conseguir y limpiar un dataset de localizaciones de Tierra Media.
3. Segmentar biomas (bosques, marismas, desiertos, lagos) con IA sobre el mapa escaneado.
4. Trazar a mano cursos de agua (ríos, arroyos) y caminos (avenidas, rutas, senderos).
5. Crear las capas de polígonos de elevación (llanuras, colinas, montañas) y marcar sus picos.
6. Construir la DEM (raster PostGIS) sintetizada a partir de los picos de elevación.
7. Crear los polígonos de regiones políticas usando líneas de borde y `polygonize` en PostGIS.
8. Diseñar y normalizar la base de datos PostgreSQL/PostGIS con todas las capas.
9. Construir el frontend en Vue 3 (Feature-Sliced Design) sobre MapLibre GL.
10. Implementar el sistema de clima basado en datos europeos de 1950.
11. Crear el calendario dinámico de Tierra Media con clima en vivo.
12. Construir la tabla de entidades por región con probabilidades de encuentro.
13. Construir la tabla de regiones con referencias a climas y reinos.
14. Implementar el cálculo de distancias entre dos puntos.
15. Implementar el motor de rutas (Dijkstra propio) con coste por bioma, altitud y clima.
16. Añadir personajes, sistema de energía y narración diaria con IA (Gemini + Groq).

---

## Objetivos del proyecto

- Georreferenciar el mapa de Pete Fenlon sobre Europa con coordenadas reales y mediciones precisas.
- Construir un sistema de clima históricamente coherente basado en datos reales de 1950.
- Modelar la geografía de Tierra Media en capas PostGIS (biomas, agua, elevación, regiones).
- Calcular rutas realistas considerando bioma, altitud, clima y medio de transporte.
- Generar narrativas únicas por viaje usando IA anclada en los datos del mapa.
- Crear una experiencia de exploración interactiva accesible con y sin login.
