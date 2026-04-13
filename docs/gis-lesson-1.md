# GIS Lesson 1: Fundamentos Teóricos para Desarrolladores

**Guía de estudio teórica para desarrolladores GIS**  
*Con ejemplos del proyecto Middle Earth GIS*

---

## 📚 Índice

1. [¿Qué es GIS?](#qué-es-gis)
2. [Conceptos Fundamentales de GIS](#conceptos-fundamentales-de-gis)
3. [Estándares OGC: Interoperabilidad en GIS](#estándares-ogc-interoperabilidad-en-gis)
4. [GeoServer: Publicación de Servicios Espaciales](#geoserver-publicación-de-servicios-espaciales)
5. [Teselas y Optimización: GeoWebCache y MVT](#teselas-y-optimización-geocache-y-mvt)
6. [Librerías de Webmapping: Leaflet y OpenLayers](#librerías-de-webmapping-leaflet-y-openlayers)
7. [MapStore: Dashboards y Aplicaciones Profesionales](#mapstore-dashboards-y-aplicaciones-profesionales)
8. [ArcGIS: La Plataforma Líder](#arcgis-la-plataforma-líder)
9. [FME: Integración de Datos Espaciales](#fme-integración-de-datos-espaciales)
10. [SAP PM y GIS en Empresas](#sap-pm-y-gis-en-empresas)
11. [Fundamentos de Geografía para Desarrolladores](#fundamentos-de-geografía-para-desarrolladores)
12. [Certificaciones ArcGIS](#certificaciones-arcgis)
13. [Glosario de Términos](#glosario-de-términos)

---

## ¿Qué es GIS?

### Definición

**GIS (Geographic Information System)** o **SIG (Sistema de Información Geográfica)** es un sistema diseñado para capturar, almacenar, manipular, analizar, gestionar y presentar datos espaciales o geográficos.

### Los 5 Componentes de un GIS

1. **Hardware**: Computadoras, servidores, GPS, drones
2. **Software**: ArcGIS, QGIS, PostGIS, etc.
3. **Datos**: Información geográfica (ubicaciones, mapas, imágenes satelitales)
4. **Personas**: Usuarios, desarrolladores, analistas GIS
5. **Métodos**: Procedimientos y técnicas de análisis espacial

### ¿Por qué es importante GIS?

**En el mundo real:**
- 80% de los datos empresariales tienen componente geográfico
- Optimización de rutas de entrega (logística)
- Gestión de redes de servicios (electricidad, agua, telecomunicaciones)
- Planificación urbana y catastro
- Gestión de activos industriales
- Análisis de mercado y ubicación de tiendas
- Respuesta a emergencias y desastres

**En tu proyecto Middle Earth:**
- Visualizar 206 ubicaciones en un mapa interactivo
- Analizar distancias entre ciudades (ej: ¿cuánto hay de Minas Tirith a Rivendell?)
- Identificar qué ubicaciones están dentro de cada región
- Planificar rutas óptimas entre puntos
- Simular clima basado en coordenadas geográficas

---

## Conceptos Fundamentales de GIS

### 1. Datos Espaciales vs Datos Tradicionales

**Datos Tradicionales (Base de datos normal):**
```
id | nombre        | población
1  | Minas Tirith  | 50000
2  | Rivendell     | 5000
```

**Datos Espaciales (Base de datos GIS):**
```
id | nombre        | población | geometría (coordenadas)
1  | Minas Tirith  | 50000     | POINT(14.5, 42.8)
2  | Rivendell     | 5000      | POINT(6.5, 45.5)
```

La diferencia: **los datos espaciales incluyen la ubicación geográfica**.

### 2. Tipos de Geometrías

**POINT (Punto):**
- Representa una ubicación específica
- Ejemplo en Middle Earth: ciudades, castillos, torres
- Coordenadas: `POINT(longitud, latitud)`

```
Minas Tirith: POINT(14.5, 42.8)
Rivendell: POINT(6.5, 45.5)
Helm's Deep: POINT(8.2, 47.3)
```

**LINESTRING (Línea):**
- Representa caminos, ríos, fronteras
- Ejemplo en Middle Earth: caminos entre ciudades, ríos como el Anduin
- Coordenadas: `LINESTRING(lon1 lat1, lon2 lat2, lon3 lat3)`

```
Camino de Minas Tirith a Edoras:
LINESTRING(14.5 42.8, 13.2 44.1, 12.0 45.5)
```

**POLYGON (Polígono):**
- Representa áreas, regiones, territorios
- Ejemplo en Middle Earth: Gondor, Rohan, Mordor
- Coordenadas: `POLYGON((lon1 lat1, lon2 lat2, ..., lon1 lat1))`

```
Región de Gondor:
POLYGON((14.0 42.0, 15.5 42.0, 15.5 44.0, 14.0 44.0, 14.0 42.0))
```

### 3. Sistemas de Coordenadas (CRS)

**¿Qué es un CRS?**

Un Sistema de Referencia de Coordenadas define cómo se mapean las coordenadas a ubicaciones en la Tierra.

**Los 2 CRS más importantes:**

**EPSG:4326 (WGS 84) - Coordenadas Geográficas:**
- Usa latitud y longitud
- Unidades: grados
- Usado por GPS, Google Maps, la mayoría de APIs
- **En Middle Earth:** Usamos EPSG:4326 porque mapeamos Tierra Media a Europa

```
Ejemplo:
Minas Tirith: lat=42.8°, lon=14.5°
(Equivalente a Roma, Italia en el mundo real)
```

**EPSG:3857 (Web Mercator) - Coordenadas Proyectadas:**
- Usado por mapas web (Google Maps, OpenStreetMap)
- Unidades: metros
- Mejor para medir distancias en mapas web

**¿Por qué importa?**

Si calculas distancias en EPSG:4326 (grados), obtienes resultados incorrectos. Debes usar EPSG:3857 o `geography` en PostGIS.

```sql
-- ❌ INCORRECTO (usa grados)
SELECT ST_Distance(
  ST_MakePoint(14.5, 42.8),
  ST_MakePoint(6.5, 45.5)
);
-- Resultado: ~9.5 (grados, sin sentido)

-- ✅ CORRECTO (usa metros)
SELECT ST_Distance(
  ST_MakePoint(14.5, 42.8)::geography,
  ST_MakePoint(6.5, 45.5)::geography
) / 1000 as distance_km;
-- Resultado: ~950 km (distancia real)
```

### 4. Análisis Espacial

**Operaciones espaciales comunes:**

**ST_Distance - Calcular distancia:**
```sql
-- ¿Cuántos km hay de Minas Tirith a Rivendell?
SELECT ST_Distance(
  (SELECT geom FROM locations WHERE name = 'Minas Tirith')::geography,
  (SELECT geom FROM locations WHERE name = 'Rivendell')::geography
) / 1000 as km;
```

**ST_DWithin - Encontrar ubicaciones cercanas:**
```sql
-- ¿Qué ciudades están a menos de 100km de Minas Tirith?
SELECT name, location_type
FROM locations
WHERE ST_DWithin(
  geom::geography,
  (SELECT geom FROM locations WHERE name = 'Minas Tirith')::geography,
  100000  -- 100km en metros
);
```

**ST_Contains - Contención espacial:**
```sql
-- ¿Qué ubicaciones están dentro de la región de Gondor?
SELECT l.name, l.location_type
FROM locations l
JOIN regions r ON ST_Contains(r.geom, l.geom)
WHERE r.name = 'Gondor';
```

**ST_Intersects - Intersección:**
```sql
-- ¿Qué regiones cruza este camino?
SELECT r.name
FROM regions r
WHERE ST_Intersects(r.geom, ST_MakeLine(...));
```

**ST_Buffer - Crear área de influencia:**
```sql
-- Crear un buffer de 50km alrededor de Minas Tirith
SELECT ST_Buffer(
  geom::geography,
  50000  -- 50km en metros
)::geometry
FROM locations
WHERE name = 'Minas Tirith';
```

### 5. Índices Espaciales

**¿Qué son?**

Estructuras de datos que aceleran las consultas espaciales.

**GIST (Generalized Search Tree):**
```sql
-- Crear índice espacial en la tabla locations
CREATE INDEX idx_locations_geom ON locations USING GIST(geom);
```

**¿Por qué son importantes?**

Sin índice espacial:
- Buscar ubicaciones cercanas: 5 segundos (revisa todas las filas)

Con índice espacial:
- Buscar ubicaciones cercanas: 0.05 segundos (100x más rápido)

**En Middle Earth:**
```sql
-- Índices creados en FASE 0
CREATE INDEX idx_locations_geom ON locations USING GIST(geom);
CREATE INDEX idx_regions_geom ON regions USING GIST(geom);
CREATE INDEX idx_paths_geom ON paths USING GIST(geom);
```

### 6. Formatos de Datos Espaciales

**GeoJSON:**
- Formato JSON estándar para datos geográficos
- Fácil de usar en web
- Usado en tu proyecto Middle Earth

```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "geometry": {
        "type": "Point",
        "coordinates": [14.5, 42.8]
      },
      "properties": {
        "name": "Minas Tirith",
        "population": 50000,
        "type": "city"
      }
    }
  ]
}
```

**Shapefile (.shp):**
- Formato estándar de Esri
- Usado en ArcGIS Desktop
- Consiste en múltiples archivos (.shp, .shx, .dbf, .prj)

**GeoTIFF:**
- Imágenes georeferenciadas
- Mapas raster con coordenadas
- Ejemplo: tu mapa `Middle-earth_modificado.tif`

**KML/KMZ:**
- Formato de Google Earth
- XML para datos geográficos

---

## Estándares OGC: Interoperabilidad en GIS

### ¿Qué es OGC?

**OGC (Open Geospatial Consortium)** es una organización internacional que desarrolla estándares abiertos para datos y servicios geoespaciales. Estos estándares permiten que diferentes sistemas GIS se comuniquen entre sí.

**¿Por qué son importantes?**
- **Interoperabilidad**: Un mapa de GeoServer puede visualizarse en ArcGIS, QGIS, Leaflet, etc.
- **Independencia de proveedor**: No quedas atado a una sola tecnología
- **Reutilización de datos**: Publica una vez, consume desde múltiples aplicaciones
- **Estándar de la industria**: Requerido en proyectos gubernamentales y empresariales

### Principales Estándares OGC

#### 1. WMS (Web Map Service)

**¿Qué es?**
- Servicio que devuelve **imágenes de mapas** (PNG, JPEG)
- El servidor renderiza el mapa y envía una imagen
- El cliente solo visualiza, no puede editar

**Petición WMS GetMap:**
```
http://localhost:8080/geoserver/middle_earth/wms?
  service=WMS
  &version=1.1.0
  &request=GetMap
  &layers=middle_earth:regions
  &bbox=0,35,25,55
  &width=800
  &height=600
  &srs=EPSG:4326
  &format=image/png
```

**Ejemplo Middle Earth:**
- Servir el mapa de regiones de Gondor, Rohan y Mordor como imagen
- El usuario ve el mapa pero no puede interactuar con los datos
- Útil para mapas base o capas de referencia

**Ventajas:**
- ✅ Rápido (solo imagen)
- ✅ Compatible con cualquier cliente
- ✅ Bueno para mapas complejos

**Desventajas:**
- ❌ No permite edición
- ❌ No acceso a atributos individuales
- ❌ Tamaño de archivo grande

#### 2. WFS (Web Feature Service)

**¿Qué es?**
- Servicio que devuelve **datos vectoriales** (GeoJSON, GML)
- El cliente recibe las geometrías y atributos
- Permite consultas, filtros y edición (WFS-T)

**Petición WFS GetFeature:**
```
http://localhost:8080/geoserver/middle_earth/wfs?
  service=WFS
  &version=2.0.0
  &request=GetFeature
  &typeName=middle_earth:locations
  &outputFormat=application/json
  &CQL_FILTER=region='Gondor'
```

**Ejemplo Middle Earth:**
- Obtener todas las ubicaciones de Gondor en formato GeoJSON
- El cliente puede mostrar popups con información
- Permite búsquedas y filtros dinámicos

**WFS-T (Transactional):**
- Permite **Insert**, **Update**, **Delete** de features
- Edición colaborativa de datos
- Ejemplo: Agregar una nueva ubicación "Torre de Ecthelion" en Minas Tirith

**Ventajas:**
- ✅ Acceso a datos completos
- ✅ Permite filtros y consultas
- ✅ Edición con WFS-T
- ✅ Formato GeoJSON (fácil de usar en web)

**Desventajas:**
- ❌ Más lento que WMS
- ❌ No óptimo para muchos features

#### 3. WCS (Web Coverage Service)

**¿Qué es?**
- Servicio para **datos raster** (imágenes georeferenciadas)
- Devuelve los valores de píxeles, no solo la imagen
- Útil para análisis de datos continuos

**Ejemplo Middle Earth:**
- Servir el modelo de elevación digital (DEM) de Tierra Media
- Obtener la elevación exacta de cada punto
- Análisis de pendientes y visibilidad desde torres

**Casos de uso:**
- Mapas de temperatura
- Modelos de elevación
- Imágenes satelitales
- Mapas de precipitación

#### 4. WPS (Web Processing Service)

**¿Qué es?**
- Servicio para **geoprocesamiento** en el servidor
- Ejecuta análisis espacial complejo
- El cliente envía parámetros, el servidor procesa y devuelve resultados

**Ejemplo Middle Earth:**

**Proceso: Calcular área de influencia (buffer)**
```
Entrada:
- Feature: Minas Tirith
- Distancia: 50 km

Proceso en servidor:
- ST_Buffer(geometry, 50000)

Salida:
- Polígono de 50 km alrededor de Minas Tirith
```

**Casos de uso:**
- Calcular rutas óptimas entre ciudades
- Análisis de visibilidad desde torres de vigilancia
- Identificar ubicaciones dentro de un radio
- Cálculo de áreas de influencia de reinos

#### 5. OGC API (Nueva Generación)

**¿Qué es?**
- Estándares modernos basados en **REST** y **JSON**
- Reemplazo de WMS/WFS/WCS con APIs más simples
- Mejor integración con desarrollo web moderno

**OGC API - Features:**
```
GET /collections/locations/items?region=Gondor
```

**Ventajas:**
- ✅ RESTful (más fácil de usar)
- ✅ JSON nativo
- ✅ Documentación automática (OpenAPI)
- ✅ Mejor para desarrollo web

### Comparación de Estándares

| Estándar | Tipo de Dato | Formato Salida | Edición | Uso Principal |
|----------|--------------|----------------|---------|---------------|
| **WMS** | Imagen | PNG, JPEG | ❌ | Visualización rápida |
| **WFS** | Vector | GeoJSON, GML | ✅ (WFS-T) | Datos interactivos |
| **WCS** | Raster | GeoTIFF | ❌ | Análisis raster |
| **WPS** | Procesamiento | Variable | N/A | Geoprocesamiento |
| **OGC API** | Vector | JSON | ✅ | Desarrollo moderno |

### Aplicación en Middle Earth

**Arquitectura típica:**

```
┌─────────────────────────────────────────┐
│  Frontend (Leaflet / OpenLayers)        │
│  - Visualiza mapas                      │
│  - Interacción con usuario              │
└─────────────┬───────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│  GeoServer (Servidor de mapas)          │
│  - WMS: Mapa base de regiones           │
│  - WFS: Ubicaciones interactivas        │
│  - WPS: Cálculo de rutas                │
└─────────────┬───────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│  PostGIS (Base de datos espacial)       │
│  - 206 ubicaciones                      │
│  - 39 regiones                          │
└─────────────────────────────────────────┘
```

**Flujo de trabajo:**
1. **PostGIS** almacena los datos de Middle Earth
2. **GeoServer** publica servicios WMS/WFS
3. **Frontend** consume los servicios y muestra el mapa
4. Usuario hace clic en Minas Tirith → WFS devuelve atributos
5. Usuario solicita ruta → WPS calcula la ruta óptima

### ¿Por qué se piden en trabajos GIS?

**Razones empresariales:**
- ✅ **Estándar de facto**: Todos los sistemas GIS los soportan
- ✅ **Interoperabilidad**: Integración con sistemas legacy
- ✅ **Cumplimiento normativo**: Requerido en proyectos gubernamentales
- ✅ **Arquitectura SOA**: Servicios reutilizables
- ✅ **Independencia tecnológica**: No vendor lock-in

**Ejemplos reales:**
- Municipalidades: Publicar catastro con WMS/WFS
- Empresas eléctricas: Visualizar redes con WMS, editar con WFS-T
- Empresas de agua: Análisis de cobertura con WPS
- Planificación urbana: Integración con múltiples sistemas

---

## GeoServer: Publicación de Servicios Espaciales

### ¿Qué es GeoServer?

**GeoServer** es un servidor de código abierto escrito en Java que permite publicar datos espaciales mediante estándares OGC (WMS, WFS, WCS, WPS).

**Características principales:**
- ✅ **Open Source**: Gratuito y con comunidad activa
- ✅ **Estándares OGC**: WMS, WFS, WCS, WPS, OGC API
- ✅ **Múltiples fuentes de datos**: PostGIS, Shapefile, GeoTIFF, Oracle Spatial
- ✅ **Estilos**: SLD (Styled Layer Descriptor) y CSS
- ✅ **Extensiones**: Teselas vectoriales, WPS, impresión
- ✅ **Interfaz web**: Administración completa desde el navegador

### Arquitectura de GeoServer

```
┌──────────────────────────────────────────────┐
│  Clientes (Leaflet, OpenLayers, QGIS)       │
└────────────┬─────────────────────────────────┘
             │ HTTP Requests (WMS, WFS, WCS)
             ▼
┌──────────────────────────────────────────────┐
│  GeoServer (Puerto 8080)                     │
│  ┌────────────────────────────────────────┐  │
│  │  Servicios OGC                         │  │
│  │  - WMS (imágenes)                      │  │
│  │  - WFS (vectores)                      │  │
│  │  - WCS (raster)                        │  │
│  └────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────┐  │
│  │  Motor de Estilos                      │  │
│  │  - SLD / CSS                           │  │
│  └────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────┐  │
│  │  Conectores de Datos                   │  │
│  │  - PostGIS, Shapefile, GeoTIFF         │  │
│  └────────────────────────────────────────┘  │
└────────────┬─────────────────────────────────┘
             │
             ▼
┌──────────────────────────────────────────────┐
│  Fuentes de Datos                            │
│  - PostGIS (middle_earth database)           │
│  - Shapefiles                                │
│  - GeoTIFF (mapas raster)                    │
└──────────────────────────────────────────────┘
```

### Conceptos Clave de GeoServer

#### 1. Workspace (Espacio de Trabajo)

**¿Qué es?**
- Contenedor lógico para organizar capas
- Similar a un namespace o esquema
- Permite organizar proyectos

**Ejemplo Middle Earth:**
```
Workspace: middle_earth
URI: http://middleearth.gis
```

#### 2. Data Store (Almacén de Datos)

**¿Qué es?**
- Conexión a una fuente de datos
- Puede ser PostGIS, Shapefile, GeoPackage, etc.

**Ejemplo Middle Earth - PostGIS:**
```
Nombre: middle_earth_postgis
Tipo: PostGIS
Host: localhost
Puerto: 5432
Base de datos: middle_earth
Usuario: postgres
```

#### 3. Layer (Capa)

**¿Qué es?**
- Representación publicable de una tabla o archivo
- Tiene geometría, atributos y estilo

**Ejemplo Middle Earth:**
```
Capa: middle_earth:locations
Fuente: tabla locations en PostGIS
Geometría: Point
Estilo: ciudades_style
```

#### 4. Style (Estilo)

**¿Qué es?**
- Define cómo se visualiza la capa
- SLD (XML) o CSS (más simple)

**Ejemplo Middle Earth - CSS:**
```css
/* Estilo para ubicaciones por tipo */
[@type='city'] {
  mark: symbol(circle);
  mark-size: 12px;
  mark-fill: #FFD700;
  mark-stroke: #8B4513;
  mark-stroke-width: 2px;
}

[@type='castle'] {
  mark: symbol(square);
  mark-size: 10px;
  mark-fill: #808080;
  mark-stroke: #000000;
}

[@type='tower'] {
  mark: symbol(triangle);
  mark-size: 8px;
  mark-fill: #FF4500;
}
```

#### 5. Layer Group (Grupo de Capas)

**¿Qué es?**
- Agrupa múltiples capas en una sola petición
- Útil para mapas complejos

**Ejemplo Middle Earth:**
```
Grupo: middle_earth_map
Capas:
  1. regions (polígonos de fondo)
  2. rivers (líneas de ríos)
  3. roads (caminos)
  4. locations (ciudades y castillos)
```

### Publicar Middle Earth en GeoServer

**Paso 1: Crear Workspace**
```
Nombre: middle_earth
URI: http://middleearth.gis
```

**Paso 2: Conectar PostGIS**
```
Store: middle_earth_db
Tipo: PostGIS
Conexión: localhost:5432/middle_earth
```

**Paso 3: Publicar Capas**

**Capa de Regiones:**
```
Nombre: regions
Título: Regiones de Tierra Media
Geometría: MultiPolygon
CRS: EPSG:4326
Estilo: regions_style.css
```

**Capa de Ubicaciones:**
```
Nombre: locations
Título: Ubicaciones de Tierra Media
Geometría: Point
CRS: EPSG:4326
Estilo: locations_style.css
```

**Paso 4: Configurar Estilos**

**regions_style.css:**
```css
/* Estilo basado en el nombre de la región */
[name='Gondor'] {
  fill: #4169E1;
  fill-opacity: 0.3;
  stroke: #000080;
  stroke-width: 2px;
}

[name='Rohan'] {
  fill: #228B22;
  fill-opacity: 0.3;
  stroke: #006400;
  stroke-width: 2px;
}

[name='Mordor'] {
  fill: #8B0000;
  fill-opacity: 0.3;
  stroke: #000000;
  stroke-width: 2px;
}
```

**Paso 5: Probar Servicios**

**WMS GetMap:**
```
http://localhost:8080/geoserver/middle_earth/wms?
  service=WMS&version=1.1.0&request=GetMap
  &layers=middle_earth:regions
  &bbox=0,35,25,55
  &width=800&height=600
  &srs=EPSG:4326
  &format=image/png
```

**WFS GetFeature:**
```
http://localhost:8080/geoserver/middle_earth/wfs?
  service=WFS&version=2.0.0&request=GetFeature
  &typeName=middle_earth:locations
  &outputFormat=application/json
```

### Filtros en GeoServer

**CQL (Common Query Language):**

**Filtrar por región:**
```
CQL_FILTER=region='Gondor'
```

**Filtrar por tipo:**
```
CQL_FILTER=type='city'
```

**Filtrar por distancia:**
```
CQL_FILTER=DWITHIN(geom, POINT(14.5 42.8), 50, kilometers)
```
*Ubicaciones a menos de 50 km de Minas Tirith*

**Filtros combinados:**
```
CQL_FILTER=region='Gondor' AND type='city'
```

### Extensiones Importantes

**1. CSS Styling:**
- Estilos más simples que SLD
- Sintaxis similar a CSS web

**2. Vector Tiles (MVT):**
- Teselas vectoriales Mapbox
- Mejor rendimiento que WFS

**3. WPS (Web Processing Service):**
- Geoprocesamiento en servidor
- Buffers, intersecciones, rutas

**4. Importer:**
- Importación masiva de datos
- Drag & drop de Shapefiles

### ¿Por qué GeoServer en trabajos GIS?

**Razones técnicas:**
- ✅ **Estándar de la industria**: Ampliamente adoptado
- ✅ **Open Source**: Sin costos de licencia
- ✅ **Escalable**: Soporta millones de features
- ✅ **Integración**: Funciona con cualquier base de datos espacial
- ✅ **Comunidad**: Soporte y documentación extensa

**Casos de uso reales:**
- **Municipalidades**: Publicar catastro y planos reguladores
- **Empresas de servicios**: Visualizar redes de agua, electricidad, gas
- **Agricultura**: Mapas de cultivos y análisis de suelo
- **Transporte**: Rutas de buses y tráfico en tiempo real
- **Medio ambiente**: Monitoreo de recursos naturales

**Alternativas:**
- **MapServer**: Más antiguo, menos features
- **QGIS Server**: Integrado con QGIS Desktop
- **ArcGIS Server**: Comercial, más caro pero más robusto

---

## Teselas y Optimización: GeoWebCache y MVT

### El Problema del Rendimiento

**Escenario:**
- Tienes 206 ubicaciones y 39 regiones en Middle Earth
- Cada vez que un usuario hace zoom o pan, se solicita todo el mapa
- Con WMS: Se renderiza la imagen completa cada vez
- Con WFS: Se descargan todos los features cada vez

**Resultado:**
- ❌ Lento
- ❌ Alto uso de CPU en servidor
- ❌ Alto consumo de ancho de banda
- ❌ Mala experiencia de usuario

**Solución: Teselas (Tiles)**

### ¿Qué son las Teselas?

**Concepto:**
- Dividir el mapa en una cuadrícula de imágenes pequeñas (256x256 px)
- Pre-renderizar y cachear estas imágenes
- El cliente solo descarga las teselas visibles

**Ventajas:**
- ✅ **Rápido**: Teselas pre-calculadas
- ✅ **Escalable**: Mismo rendimiento con 10 o 10,000 usuarios
- ✅ **Cacheable**: CDN y cache del navegador
- ✅ **Estándar**: Usado por Google Maps, OpenStreetMap, etc.

### Pirámide de Teselas

```
Nivel 0 (Zoom 0): 1 tesela (mundo completo)
         ┌─────┐
         │  0  │
         └─────┘

Nivel 1 (Zoom 1): 4 teselas
         ┌─────┬─────┐
         │  0  │  1  │
         ├─────┼─────┤
         │  2  │  3  │
         └─────┴─────┘

Nivel 2 (Zoom 2): 16 teselas
         ┌───┬───┬───┬───┐
         │ 0 │ 1 │ 2 │ 3 │
         ├───┼───┼───┼───┤
         │ 4 │ 5 │ 6 │ 7 │
         ├───┼───┼───┼───┤
         │ 8 │ 9 │10 │11 │
         ├───┼───┼───┼───┤
         │12 │13 │14 │15 │
         └───┴───┴───┴───┘

...

Nivel 18 (Zoom 18): 68,719,476,736 teselas
```

**Fórmula:**
```
Número de teselas en nivel Z = 4^Z
Nivel 0: 4^0 = 1
Nivel 1: 4^1 = 4
Nivel 10: 4^10 = 1,048,576
```

### GeoWebCache

**¿Qué es?**
- Sistema de caché de teselas integrado en GeoServer
- Pre-renderiza y almacena teselas
- Sirve teselas raster (PNG, JPEG)

**Funcionamiento:**

```
Primera petición:
Cliente → GeoWebCache → ¿Tesela en caché? → NO
                     → GeoServer renderiza
                     → Guarda en caché
                     → Devuelve al cliente

Siguientes peticiones:
Cliente → GeoWebCache → ¿Tesela en caché? → SÍ
                     → Devuelve directamente
```

**Configuración para Middle Earth:**

```
Capa: middle_earth:regions
Formatos: image/png, image/jpeg
Niveles de zoom: 0-18
CRS: EPSG:4326, EPSG:3857
Estrategia: Caché bajo demanda
```

**Tipos de caché:**

**1. Caché bajo demanda (On-demand):**
- Se genera cuando un usuario la solicita
- Ahorra espacio en disco
- Primera carga lenta, siguientes rápidas

**2. Pre-seeding (Pre-generación):**
- Se generan todas las teselas por adelantado
- Primera carga rápida
- Requiere mucho espacio en disco

**Ejemplo Middle Earth:**
```
Región: Gondor (bbox: 12,40,18,45)
Niveles: 0-12
Formato: PNG
Tiempo estimado: 2 horas
Espacio en disco: ~500 MB
```

### Teselas Vectoriales (MVT - Mapbox Vector Tiles)

**¿Qué son?**
- En lugar de imágenes, se envían **datos vectoriales** en teselas
- Formato binario compacto (Protocol Buffers)
- El cliente renderiza en el navegador

**Diferencias con teselas raster:**

| Característica | Raster (PNG) | Vector (MVT) |
|----------------|--------------|--------------|
| **Contenido** | Imagen | Geometrías + Atributos |
| **Tamaño** | ~20-50 KB | ~5-15 KB |
| **Escalado** | Pixelado | Suave |
| **Rotación** | No | Sí |
| **Interacción** | No | Sí (click, hover) |
| **Estilo dinámico** | No | Sí |
| **Etiquetas** | Fijas | Dinámicas |

**Ventajas de MVT:**
- ✅ **Menor tamaño**: ~70% más pequeñas
- ✅ **Estilo dinámico**: Cambiar colores sin re-descargar
- ✅ **Interactividad**: Click en features, popups
- ✅ **Rotación**: Mapas rotables sin distorsión
- ✅ **Etiquetas inteligentes**: No se superponen

**Ejemplo Middle Earth:**

**Tesela raster (PNG):**
```
Tamaño: 45 KB
Contenido: Imagen renderizada de Gondor
Interacción: No
```

**Tesela vectorial (MVT):**
```
Tamaño: 12 KB
Contenido: Geometrías de ciudades + atributos
Interacción: Sí (click en Minas Tirith → popup)
Estilo: Cambiar color de ciudades sin re-descargar
```

### Generar MVT con GeoServer

**Paso 1: Instalar extensión Vector Tiles**
```
Descargar: geoserver-vectortiles-plugin.zip
Copiar a: geoserver/webapps/geoserver/WEB-INF/lib/
Reiniciar GeoServer
```

**Paso 2: Configurar capa**
```
Capa: middle_earth:locations
Formato de salida: application/vnd.mapbox-vector-tile
```

**Paso 3: Solicitar teselas MVT**
```
http://localhost:8080/geoserver/gwc/service/wmts?
  REQUEST=GetTile
  &SERVICE=WMTS
  &VERSION=1.0.0
  &LAYER=middle_earth:locations
  &STYLE=
  &TILEMATRIX=EPSG:900913:{z}
  &TILEMATRIXSET=EPSG:900913
  &FORMAT=application/vnd.mapbox-vector-tile
  &TILECOL={x}
  &TILEROW={y}
```

**Paso 4: Consumir en Leaflet**
```javascript
// Usando plugin Leaflet.VectorGrid
L.vectorGrid.protobuf(
  'http://localhost:8080/geoserver/gwc/service/wmts?...',
  {
    vectorTileLayerStyles: {
      'middle_earth:locations': {
        color: '#FFD700',
        fillColor: '#FFD700',
        fillOpacity: 0.6,
        weight: 2
      }
    },
    interactive: true
  }
).addTo(map);
```

### Optimización de Rendimiento

**Estrategias:**

**1. Niveles de zoom apropiados:**
```
Mundo completo: Zoom 0-5 (teselas raster)
Regiones: Zoom 6-10 (teselas raster)
Ciudades: Zoom 11-18 (teselas vectoriales)
```

**2. Simplificación de geometrías:**
```sql
-- Simplificar polígonos complejos en zooms bajos
SELECT 
  name,
  ST_Simplify(geom, 0.01) as geom  -- Menos puntos
FROM regions
WHERE zoom_level < 8;
```

**3. Filtrado por zoom:**
```
Zoom 0-5: Solo mostrar capitales
Zoom 6-10: Mostrar ciudades grandes
Zoom 11-18: Mostrar todas las ubicaciones
```

**4. Compresión:**
```
PNG: Usar PNG8 (256 colores) en lugar de PNG24
JPEG: Calidad 75% en lugar de 100%
MVT: Ya está comprimido con gzip
```

### Aplicación en Middle Earth

**Configuración óptima:**

```
Capa: Regiones (polígonos grandes)
  → Teselas raster PNG
  → Zoom 0-12
  → Pre-seeding completo
  → Tamaño: ~300 MB

Capa: Ubicaciones (puntos)
  → Teselas vectoriales MVT
  → Zoom 0-18
  → Caché bajo demanda
  → Tamaño: ~50 MB

Capa: Caminos (líneas)
  → Teselas vectoriales MVT
  → Zoom 8-18
  → Caché bajo demanda
```

**Resultado:**
- ✅ Carga inicial: <2 segundos
- ✅ Navegación fluida: 60 FPS
- ✅ Uso de ancho de banda: ~100 KB por vista
- ✅ Escalable: Soporta 1000+ usuarios concurrentes

### ¿Por qué se piden en trabajos GIS?

**Razones empresariales:**
- ✅ **Rendimiento**: Aplicaciones rápidas y responsivas
- ✅ **Escalabilidad**: Soportar millones de usuarios
- ✅ **Costos**: Menor uso de servidor y ancho de banda
- ✅ **Experiencia de usuario**: Mapas fluidos como Google Maps
- ✅ **Estándar**: Usado por todas las grandes plataformas

**Casos de uso reales:**
- **Catastro municipal**: Millones de parcelas
- **Redes de servicios**: Kilómetros de tuberías y cables
- **Transporte público**: Rutas en tiempo real
- **Mapas base**: Calles, edificios, topografía

---

## Librerías de Webmapping: Leaflet y OpenLayers

### Introducción al Webmapping

**¿Qué es una aplicación webmapping?**
- Aplicación web que muestra mapas interactivos
- El usuario puede hacer zoom, pan, click en features
- Consume servicios WMS/WFS o teselas
- Se ejecuta en el navegador (HTML + CSS + JavaScript)

**Ventajas del webmapping vs SIG de escritorio:**
- ✅ **Accesible**: Cualquier dispositivo con navegador
- ✅ **Sin instalación**: No requiere software especial
- ✅ **Actualización en tiempo real**: Datos siempre actualizados
- ✅ **Colaborativo**: Múltiples usuarios simultáneos
- ✅ **Escalable**: Millones de usuarios
- ✅ **Multiplataforma**: Windows, Mac, Linux, móvil

**Desventajas:**
- ❌ Análisis limitado vs desktop GIS
- ❌ Depende de conexión a internet
- ❌ Rendimiento limitado por el navegador

### Leaflet: Simplicidad y Ligereza

#### ¿Qué es Leaflet?

**Leaflet** es la librería JavaScript de código abierto más popular para mapas interactivos móviles.

**Características:**
- ✅ **Ligera**: Solo 42 KB (comprimido)
- ✅ **Simple**: API fácil de aprender
- ✅ **Mobile-first**: Optimizada para móviles
- ✅ **Extensible**: Cientos de plugins
- ✅ **Open Source**: Licencia BSD

**Casos de uso:**
- Mapas simples e interactivos
- Aplicaciones móviles
- Visualización rápida de datos
- Proyectos con pocos requisitos

#### Crear un Mapa con Leaflet

**Ejemplo Middle Earth - Mapa Básico:**

```html
<!DOCTYPE html>
<html>
<head>
  <title>Middle Earth Map</title>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    #map { height: 600px; }
  </style>
</head>
<body>
  <div id="map"></div>
  
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    // Crear mapa centrado en Tierra Media
    const map = L.map('map').setView([42.8, 14.5], 6);
    
    // Agregar mapa base (OpenStreetMap)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 18
    }).addTo(map);
    
    // Agregar marcador en Minas Tirith
    const minasTirith = L.marker([42.8, 14.5])
      .bindPopup('<b>Minas Tirith</b><br>Capital de Gondor')
      .addTo(map);
  </script>
</body>
</html>
```

#### Capas en Leaflet

**1. Capas Teseladas (Tile Layers):**

```javascript
// OpenStreetMap
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

// WMS de GeoServer (regiones de Middle Earth)
L.tileLayer.wms('http://localhost:8080/geoserver/middle_earth/wms', {
  layers: 'middle_earth:regions',
  format: 'image/png',
  transparent: true
}).addTo(map);
```

**2. Marcadores (Markers):**

```javascript
// Marcador simple
L.marker([42.8, 14.5]).addTo(map);

// Marcador con popup
L.marker([42.8, 14.5])
  .bindPopup('<h3>Minas Tirith</h3><p>Population: 50,000</p>')
  .addTo(map);

// Marcador con icono personalizado
const castleIcon = L.icon({
  iconUrl: 'castle.png',
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32]
});

L.marker([42.8, 14.5], { icon: castleIcon }).addTo(map);
```

**3. Capas Vectoriales:**

```javascript
// Círculo (área de influencia)
L.circle([42.8, 14.5], {
  color: 'blue',
  fillColor: '#30f',
  fillOpacity: 0.2,
  radius: 50000  // 50 km en metros
}).addTo(map);

// Polígono (región de Gondor)
const gondor = L.polygon([
  [40.0, 12.0],
  [40.0, 18.0],
  [45.0, 18.0],
  [45.0, 12.0]
], {
  color: 'blue',
  fillColor: '#4169E1',
  fillOpacity: 0.3
}).bindPopup('Reino de Gondor').addTo(map);

// Línea (camino)
const road = L.polyline([
  [42.8, 14.5],  // Minas Tirith
  [44.1, 13.2],  // Punto intermedio
  [45.5, 12.0]   // Edoras
], {
  color: 'brown',
  weight: 3
}).bindPopup('Camino a Rohan').addTo(map);
```

**4. Capas GeoJSON:**

```javascript
// Cargar ubicaciones desde WFS
fetch('http://localhost:8080/geoserver/middle_earth/wfs?' +
      'service=WFS&version=2.0.0&request=GetFeature' +
      '&typeName=middle_earth:locations&outputFormat=application/json')
  .then(response => response.json())
  .then(data => {
    L.geoJSON(data, {
      pointToLayer: function(feature, latlng) {
        return L.circleMarker(latlng, {
          radius: 6,
          fillColor: getColor(feature.properties.type),
          color: '#000',
          weight: 1,
          opacity: 1,
          fillOpacity: 0.8
        });
      },
      onEachFeature: function(feature, layer) {
        layer.bindPopup(
          `<h3>${feature.properties.name}</h3>` +
          `<p>Type: ${feature.properties.type}</p>` +
          `<p>Region: ${feature.properties.region}</p>`
        );
      }
    }).addTo(map);
  });

function getColor(type) {
  switch(type) {
    case 'city': return '#FFD700';
    case 'castle': return '#808080';
    case 'tower': return '#FF4500';
    default: return '#CCCCCC';
  }
}
```

#### Controles en Leaflet

**1. Control de Capas:**

```javascript
// Mapas base
const osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png');
const satellite = L.tileLayer('https://server.arcgisonline.com/...');

// Capas superpuestas
const regions = L.tileLayer.wms('http://localhost:8080/geoserver/middle_earth/wms', {
  layers: 'middle_earth:regions',
  transparent: true
});

const locations = L.geoJSON(locationsData);

// Control de capas
const baseMaps = {
  "OpenStreetMap": osm,
  "Satellite": satellite
};

const overlayMaps = {
  "Regiones": regions,
  "Ubicaciones": locations
};

L.control.layers(baseMaps, overlayMaps).addTo(map);
```

**2. Control de Escala:**

```javascript
L.control.scale({
  imperial: false,
  metric: true
}).addTo(map);
```

**3. Control de Leyenda (Custom):**

```javascript
const legend = L.control({ position: 'bottomright' });

legend.onAdd = function(map) {
  const div = L.DomUtil.create('div', 'legend');
  div.innerHTML = `
    <h4>Tipos de Ubicaciones</h4>
    <i style="background: #FFD700"></i> Ciudades<br>
    <i style="background: #808080"></i> Castillos<br>
    <i style="background: #FF4500"></i> Torres
  `;
  return div;
};

legend.addTo(map);
```

#### Eventos en Leaflet

```javascript
// Click en el mapa
map.on('click', function(e) {
  console.log('Clicked at:', e.latlng);
  L.popup()
    .setLatLng(e.latlng)
    .setContent(`Coordinates: ${e.latlng.lat.toFixed(4)}, ${e.latlng.lng.toFixed(4)}`)
    .openOn(map);
});

// Zoom change
map.on('zoomend', function() {
  console.log('Current zoom:', map.getZoom());
});

// Click en feature
layer.on('click', function(e) {
  console.log('Feature clicked:', e.target.feature.properties);
});
```

#### Plugins de Leaflet

**Leaflet.markercluster** - Agrupar marcadores:
```javascript
const markers = L.markerClusterGroup();
locations.forEach(loc => {
  markers.addLayer(L.marker([loc.lat, loc.lng]));
});
map.addLayer(markers);
```

**Leaflet.draw** - Dibujar geometrías:
```javascript
const drawnItems = new L.FeatureGroup();
map.addLayer(drawnItems);

const drawControl = new L.Control.Draw({
  edit: {
    featureGroup: drawnItems
  }
});
map.addControl(drawControl);
```

**Leaflet.VectorGrid** - Teselas vectoriales MVT:
```javascript
L.vectorGrid.protobuf(
  'http://localhost:8080/geoserver/gwc/service/wmts?...',
  {
    vectorTileLayerStyles: {
      'middle_earth:locations': {
        color: '#FFD700',
        weight: 2
      }
    }
  }
).addTo(map);
```

### OpenLayers: Potencia y Flexibilidad

#### ¿Qué es OpenLayers?

**OpenLayers** es una librería JavaScript de código abierto para mapas web avanzados y profesionales.

**Características:**
- ✅ **Completa**: Soporte para todos los estándares OGC
- ✅ **Potente**: Análisis y geoprocesamiento en cliente
- ✅ **Flexible**: Arquitectura modular
- ✅ **Profesional**: Usado en aplicaciones enterprise
- ✅ **3D**: Soporte para mapas 3D

**Comparación con Leaflet:**

| Característica | Leaflet | OpenLayers |
|----------------|---------|------------|
| **Tamaño** | 42 KB | ~200 KB |
| **Curva de aprendizaje** | Fácil | Moderada |
| **Funcionalidades** | Básicas | Avanzadas |
| **Rendimiento** | Bueno | Excelente |
| **Estándares OGC** | Limitado | Completo |
| **Uso típico** | Mapas simples | Aplicaciones GIS |

#### Crear un Mapa con OpenLayers

**Instalación con Node.js:**

```bash
npm install ol
```

**Ejemplo Middle Earth - Mapa Básico:**

```javascript
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import OSM from 'ol/source/OSM';
import { fromLonLat } from 'ol/proj';

// Crear mapa
const map = new Map({
  target: 'map',
  layers: [
    new TileLayer({
      source: new OSM()
    })
  ],
  view: new View({
    center: fromLonLat([14.5, 42.8]),  // Minas Tirith
    zoom: 6
  })
});
```

#### Capas WMS en OpenLayers

```javascript
import TileLayer from 'ol/layer/Tile';
import TileWMS from 'ol/source/TileWMS';

// Capa WMS de regiones
const regionsLayer = new TileLayer({
  source: new TileWMS({
    url: 'http://localhost:8080/geoserver/middle_earth/wms',
    params: {
      'LAYERS': 'middle_earth:regions',
      'TILED': true
    },
    serverType: 'geoserver'
  })
});

map.addLayer(regionsLayer);
```

#### Capas WFS (Vectoriales) en OpenLayers

```javascript
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import GeoJSON from 'ol/format/GeoJSON';
import { Style, Circle, Fill, Stroke } from 'ol/style';

// Cargar ubicaciones desde WFS
const locationsLayer = new VectorLayer({
  source: new VectorSource({
    url: 'http://localhost:8080/geoserver/middle_earth/wfs?' +
         'service=WFS&version=2.0.0&request=GetFeature' +
         '&typeName=middle_earth:locations&outputFormat=application/json',
    format: new GeoJSON()
  }),
  style: function(feature) {
    return new Style({
      image: new Circle({
        radius: 6,
        fill: new Fill({
          color: getColorByType(feature.get('type'))
        }),
        stroke: new Stroke({
          color: '#000',
          width: 1
        })
      })
    });
  }
});

map.addLayer(locationsLayer);

function getColorByType(type) {
  const colors = {
    'city': '#FFD700',
    'castle': '#808080',
    'tower': '#FF4500'
  };
  return colors[type] || '#CCCCCC';
}
```

#### Filtros ECQL en OpenLayers

```javascript
// Filtrar solo ciudades de Gondor
const filteredLayer = new VectorLayer({
  source: new VectorSource({
    url: 'http://localhost:8080/geoserver/middle_earth/wfs?' +
         'service=WFS&version=2.0.0&request=GetFeature' +
         '&typeName=middle_earth:locations&outputFormat=application/json' +
         '&CQL_FILTER=region=\'Gondor\' AND type=\'city\'',
    format: new GeoJSON()
  })
});
```

#### Teselas Vectoriales MVT en OpenLayers

```javascript
import VectorTileLayer from 'ol/layer/VectorTile';
import VectorTileSource from 'ol/source/VectorTile';
import MVT from 'ol/format/MVT';

const mvtLayer = new VectorTileLayer({
  source: new VectorTileSource({
    format: new MVT(),
    url: 'http://localhost:8080/geoserver/gwc/service/wmts?' +
         'REQUEST=GetTile&SERVICE=WMTS&VERSION=1.0.0' +
         '&LAYER=middle_earth:locations' +
         '&TILEMATRIXSET=EPSG:900913' +
         '&TILEMATRIX=EPSG:900913:{z}' +
         '&TILECOL={x}&TILEROW={y}' +
         '&FORMAT=application/vnd.mapbox-vector-tile'
  }),
  style: new Style({
    image: new Circle({
      radius: 5,
      fill: new Fill({ color: '#FFD700' })
    })
  })
});

map.addLayer(mvtLayer);
```

#### Interacciones en OpenLayers

**Selección de Features:**

```javascript
import Select from 'ol/interaction/Select';
import { click } from 'ol/events/condition';

const select = new Select({
  condition: click,
  style: new Style({
    image: new Circle({
      radius: 8,
      fill: new Fill({ color: 'red' })
    })
  })
});

map.addInteraction(select);

select.on('select', function(e) {
  if (e.selected.length > 0) {
    const feature = e.selected[0];
    console.log('Selected:', feature.get('name'));
    
    // Mostrar popup
    const coords = feature.getGeometry().getCoordinates();
    popup.setPosition(coords);
    popupContent.innerHTML = `
      <h3>${feature.get('name')}</h3>
      <p>Type: ${feature.get('type')}</p>
      <p>Region: ${feature.get('region')}</p>
    `;
  }
});
```

**Dibujar Geometrías:**

```javascript
import Draw from 'ol/interaction/Draw';

const drawSource = new VectorSource();
const drawLayer = new VectorLayer({
  source: drawSource
});
map.addLayer(drawLayer);

const draw = new Draw({
  source: drawSource,
  type: 'Point'  // 'Point', 'LineString', 'Polygon', 'Circle'
});

map.addInteraction(draw);

draw.on('drawend', function(e) {
  const feature = e.feature;
  const coords = feature.getGeometry().getCoordinates();
  console.log('New feature at:', coords);
  
  // Guardar en GeoServer via WFS-T
  saveFeatureToGeoServer(feature);
});
```

#### Heatmaps (Mapas de Calor)

```javascript
import Heatmap from 'ol/layer/Heatmap';

const heatmapLayer = new Heatmap({
  source: new VectorSource({
    url: 'locations.geojson',
    format: new GeoJSON()
  }),
  blur: 15,
  radius: 10,
  weight: function(feature) {
    // Peso basado en población
    return feature.get('population') / 10000;
  }
});

map.addLayer(heatmapLayer);
```

### ¿Cuándo usar Leaflet vs OpenLayers?

**Usa Leaflet si:**
- ✅ Necesitas un mapa simple y rápido
- ✅ Proyecto pequeño o mediano
- ✅ Prioridad en simplicidad
- ✅ Aplicación móvil
- ✅ Equipo con poca experiencia en GIS

**Usa OpenLayers si:**
- ✅ Aplicación GIS profesional
- ✅ Necesitas estándares OGC completos
- ✅ Análisis espacial en cliente
- ✅ Integración con GeoServer/MapServer
- ✅ Rendimiento crítico con muchos features
- ✅ Mapas 3D

**Para Middle Earth:**
- **Leaflet**: Versión simple para mostrar ubicaciones
- **OpenLayers**: Versión profesional con análisis y edición

---

## MapStore: Dashboards y Aplicaciones Profesionales

### ¿Qué es MapStore?

**MapStore** es una plataforma de código abierto desarrollada por **GeoSolutions** para crear aplicaciones de webmapping profesionales, dashboards y StoryMaps.

**Características principales:**
- ✅ **Framework completo**: No solo librería, sino aplicación completa
- ✅ **Interfaz gráfica**: Crear mapas sin programar
- ✅ **Dashboards**: Paneles de control con widgets
- ✅ **StoryMaps**: Narrativas geográficas interactivas
- ✅ **Gestión de usuarios**: Roles y permisos
- ✅ **Integración GeoServer**: Conexión nativa
- ✅ **Basado en React**: Tecnología moderna

### Componentes de MapStore

**1. Visor de Mapas:**
- Visualización de capas WMS/WFS
- Herramientas de navegación
- Búsqueda de ubicaciones
- Medición de distancias y áreas

**2. Editor de Mapas:**
- Agregar capas desde GeoServer
- Configurar estilos
- Crear anotaciones
- Importar datos locales (Shapefile, GeoJSON)

**3. Widgets:**
- Gráficos (barras, líneas, pie)
- Tablas de atributos
- Contadores
- Texto y multimedia

**4. Dashboards:**
- Paneles de control personalizables
- Múltiples widgets sincronizados
- Filtros interactivos

**5. StoryMaps:**
- Narrativas con mapas
- Secciones con texto, imágenes y mapas
- Navegación guiada

### Aplicación Middle Earth en MapStore

#### Caso de Uso: Dashboard de Gondor

**Objetivo:** Crear un panel de control para visualizar y analizar las ubicaciones del reino de Gondor.

**Componentes:**

**1. Mapa Principal:**
- Capa base: OpenStreetMap
- Capa de regiones (WMS desde GeoServer)
- Capa de ubicaciones filtradas por Gondor (WFS)
- Estilo: Ciudades en dorado, castillos en gris

**2. Widget de Tabla:**
- Listar todas las ubicaciones de Gondor
- Columnas: Nombre, Tipo, Población
- Filtrable y ordenable
- Click en fila → zoom en mapa

**3. Widget de Gráfico:**
- Gráfico de barras: Cantidad de ubicaciones por tipo
- Gráfico de pie: Distribución de población

**4. Widget de Contador:**
- Total de ubicaciones en Gondor
- Población total
- Área del reino (km²)

**5. Filtros:**
- Por tipo de ubicación (ciudad, castillo, torre)
- Por rango de población
- Por distancia desde Minas Tirith

#### Configuración en MapStore

**Paso 1: Conectar GeoServer**

```
Configuración → Servicios Remotos
Nombre: Middle Earth GeoServer
URL: http://localhost:8080/geoserver
Tipo: WMS/WFS
```

**Paso 2: Crear Mapa**

```
Nuevo Mapa → Agregar Capas
1. Capa base: OpenStreetMap
2. WMS: middle_earth:regions
3. WFS: middle_earth:locations
   Filtro: region = 'Gondor'
```

**Paso 3: Configurar Estilos**

```
Capa: locations
Estilo: Por atributo 'type'
  - city: Círculo dorado, radio 8px
  - castle: Cuadrado gris, tamaño 10px
  - tower: Triángulo rojo, tamaño 6px
```

**Paso 4: Crear Dashboard**

```
Nuevo Dashboard → Agregar Widgets

Widget 1: Mapa
  - Mapa creado anteriormente
  - Tamaño: 60% ancho, 100% alto

Widget 2: Tabla
  - Fuente: WFS middle_earth:locations
  - Filtro: region = 'Gondor'
  - Columnas: name, type, population
  - Sincronizar con mapa

Widget 3: Gráfico de Barras
  - Eje X: type
  - Eje Y: COUNT(*)
  - Título: "Ubicaciones por Tipo"

Widget 4: Contador
  - Valor: COUNT(*)
  - Título: "Total Ubicaciones"
  - Color: Azul
```

**Paso 5: Configurar Interacciones**

```
Sincronización:
- Click en tabla → Zoom en mapa
- Selección en mapa → Highlight en tabla
- Filtro global → Actualiza todos los widgets
```

### StoryMap: La Historia de Gondor

**Estructura:**

**Sección 1: Introducción**
- Título: "El Reino de Gondor"
- Texto: Historia y geografía
- Mapa: Vista general de Gondor
- Imagen: Escudo de Gondor

**Sección 2: Minas Tirith**
- Título: "La Ciudad Blanca"
- Texto: Capital y fortaleza principal
- Mapa: Zoom en Minas Tirith
- Popup: Detalles de la ciudad

**Sección 3: Fortalezas**
- Título: "Las Defensas del Reino"
- Texto: Red de castillos y torres
- Mapa: Todas las fortalezas destacadas
- Animación: Recorrido por las fortalezas

**Sección 4: Análisis**
- Título: "Distribución Territorial"
- Mapa: Heatmap de población
- Gráficos: Estadísticas
- Widget: Distancias entre ciudades

### Gestión de Usuarios en MapStore

**Roles:**

**1. Administrador:**
- Crear y editar mapas
- Gestionar usuarios
- Configurar servicios
- Publicar dashboards

**2. Editor:**
- Crear y editar mapas propios
- Crear dashboards
- Compartir con su grupo

**3. Visor:**
- Solo visualizar mapas compartidos
- No puede editar

**Ejemplo Middle Earth:**
```
Usuario: gondor_admin
Rol: Administrador
Permisos: Todos los mapas de Gondor

Usuario: rohan_viewer
Rol: Visor
Permisos: Solo mapas públicos
```

### Plantillas y Contextos

**Plantillas (Templates):**
- Mapas pre-configurados reutilizables
- Ejemplo: "Plantilla Reino" con capas estándar

**Contextos:**
- Configuración completa de la aplicación
- Plugins habilitados
- Tema visual
- Servicios conectados

**Ejemplo:**
```
Contexto: Middle Earth App
Plugins:
  - Búsqueda de ubicaciones
  - Medición de distancias
  - Exportar a PDF
  - Geoprocesamiento (buffers)
Tema: Oscuro (estilo Mordor)
```

### Extensiones de MapStore

**1. Geoprocesamiento:**
- Buffers (áreas de influencia)
- Intersecciones
- Uniones
- Análisis de proximidad

**Ejemplo:** Calcular área de influencia de 50 km desde Minas Tirith

**2. Impresión:**
- Exportar mapa a PDF
- Incluir leyenda y escala
- Múltiples formatos (A4, A3, carta)

**3. Timeline:**
- Visualizar datos temporales
- Animaciones
- Ejemplo: Expansión de Gondor a través del tiempo

**4. Catálogo:**
- Buscar capas en múltiples GeoServers
- Metadatos
- Vista previa

### ¿Por qué MapStore en trabajos GIS?

**Razones empresariales:**
- ✅ **Solución completa**: No requiere desarrollo custom
- ✅ **Profesional**: Interfaz pulida y moderna
- ✅ **Gestión de usuarios**: Control de acceso integrado
- ✅ **Dashboards**: Visualización de KPIs geográficos
- ✅ **Open Source**: Sin costos de licencia
- ✅ **Mantenido**: GeoSolutions lo actualiza constantemente

**Casos de uso reales:**
- **Municipalidades**: Portal de mapas para ciudadanos
- **Empresas de servicios**: Dashboards operativos
- **Medio ambiente**: Monitoreo de recursos naturales
- **Planificación**: Análisis territorial
- **Educación**: StoryMaps educativos

**Alternativas:**
- **ArcGIS Experience Builder**: Comercial, más potente
- **QGIS Web Client**: Más simple, menos features
- **Custom con Leaflet/OpenLayers**: Más flexible pero requiere desarrollo

### Aplicación Completa Middle Earth

**Stack tecnológico:**

```
┌─────────────────────────────────────────┐
│  MapStore (Frontend)                    │
│  - Dashboards de reinos                │
│  - StoryMaps de batallas                │
│  - Gestión de usuarios                  │
└─────────────┬───────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│  GeoServer (Servidor de mapas)          │
│  - WMS: Regiones, caminos               │
│  - WFS: Ubicaciones (editable)          │
│  - WPS: Análisis de rutas               │
│  - MVT: Teselas vectoriales             │
└─────────────┬───────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│  PostGIS (Base de datos)                │
│  - 206 ubicaciones                      │
│  - 39 regiones                          │
│  - Análisis espacial                    │
└─────────────────────────────────────────┘
```

**Funcionalidades:**
1. ✅ Mapa interactivo de Tierra Media
2. ✅ Dashboard por reino (Gondor, Rohan, etc.)
3. ✅ Búsqueda de ubicaciones
4. ✅ Cálculo de rutas entre ciudades
5. ✅ Análisis de distancias
6. ✅ Edición colaborativa de ubicaciones
7. ✅ StoryMaps de eventos históricos
8. ✅ Exportar mapas a PDF
9. ✅ Gestión de usuarios por reino
10. ✅ Estadísticas y gráficos

---

## ArcGIS: La Plataforma Líder

### ¿Qué es ArcGIS?

**ArcGIS** es la plataforma GIS más usada en el mundo, desarrollada por **Esri** (Environmental Systems Research Institute).

### Componentes del Ecosistema ArcGIS

**1. ArcGIS Pro (Desktop):**
- Software de escritorio para análisis GIS profesional
- Reemplaza a ArcMap (versión antigua)
- Usado para:
  - Crear y editar mapas
  - Análisis espacial avanzado
  - Geoprocesamiento
  - Publicar servicios

**2. ArcGIS Online:**
- Plataforma cloud de Esri
- Crear y compartir mapas web
- Almacenar datos en la nube
- Colaboración entre equipos

**3. ArcGIS Enterprise:**
- Versión on-premise de ArcGIS Online
- Para empresas que necesitan control total
- Instalado en servidores propios

**4. ArcGIS Maps SDK for JavaScript:**
- Biblioteca JavaScript para crear mapas web
- **Usada en tu proyecto Middle Earth**
- Alternativa a Leaflet o Mapbox

```javascript
// Ejemplo de tu proyecto
import Map from '@arcgis/core/Map'
import MapView from '@arcgis/core/views/MapView'

const map = new Map({
  basemap: 'topo-vector'
})

const view = new MapView({
  container: 'mapDiv',
  map: map,
  center: [3.0, 50.0],  // Centro de Middle Earth
  zoom: 6
})
```

**5. ArcGIS REST Services:**
- APIs para acceder a datos y servicios
- Feature Services (datos vectoriales)
- Map Services (mapas renderizados)
- Geoprocessing Services (análisis)

### Conceptos Clave de ArcGIS

**Feature Layer:**
- Capa de datos vectoriales (puntos, líneas, polígonos)
- Editable
- Soporta queries y filtros

**En Middle Earth:**
```javascript
// Capa de ubicaciones
const locationsLayer = new FeatureLayer({
  url: 'http://localhost:5000/api/locations',
  title: 'Middle Earth Locations',
  renderer: {
    type: 'unique-value',
    field: 'locationType',
    uniqueValueInfos: [
      { value: 'city', symbol: { color: 'red' } },
      { value: 'castle', symbol: { color: 'blue' } }
    ]
  }
})
```

**Web Map:**
- Configuración de mapa guardada (capas, simbología, extent)
- Compartible vía URL
- Reutilizable en múltiples aplicaciones

**Geodatabase:**
- Base de datos espacial de Esri
- Formato: `.gdb` (file geodatabase) o Enterprise Geodatabase (PostgreSQL/SQL Server)
- Soporta topología, redes, relaciones

**Geoprocessing:**
- Herramientas de análisis espacial
- Ejemplos: Buffer, Clip, Intersect, Union
- Automatizable con Python (ArcPy)

### ArcGIS vs Alternativas Open Source

| Característica | ArcGIS | QGIS | PostGIS |
|----------------|--------|------|---------|
| Tipo | Comercial | Open Source | Open Source |
| Costo | $$$$ | Gratis | Gratis |
| Soporte | Oficial Esri | Comunidad | Comunidad |
| Facilidad de uso | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ |
| Análisis avanzado | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| Web mapping | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | N/A |
| Usado en empresas | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ |

**¿Por qué las empresas usan ArcGIS?**
- Soporte técnico oficial
- Integración con sistemas empresariales (SAP, Oracle)
- Herramientas especializadas por industria
- Estabilidad y confiabilidad
- Ecosistema completo (desktop, web, mobile)

---

## FME: Integración de Datos Espaciales

### ¿Qué es FME?

**FME (Feature Manipulation Engine)** es una plataforma de integración de datos espaciales desarrollada por **Safe Software**.

### FME Desktop (FME Form)

**¿Qué hace?**

Transforma datos entre diferentes formatos y sistemas.

**Ejemplo práctico:**

Imagina que recibes datos de Middle Earth en estos formatos:
- Ciudades en Excel (.xlsx)
- Regiones en Shapefile (.shp)
- Caminos en KML (Google Earth)
- Clima en CSV

**Sin FME:**
- Convertir manualmente cada archivo
- Escribir scripts personalizados
- Proceso lento y propenso a errores

**Con FME:**
- Crear un "workflow" visual
- Conectar lectores y escritores
- Transformar todo automáticamente

```
[Excel Reader] → [Transformer] → [PostGIS Writer]
[Shapefile Reader] → [Transformer] → [PostGIS Writer]
[KML Reader] → [Transformer] → [PostGIS Writer]
```

**Transformaciones comunes:**
- Cambiar sistemas de coordenadas (EPSG:4326 → EPSG:3857)
- Filtrar datos (solo ciudades con población > 1000)
- Agregar campos calculados
- Validar geometrías
- Limpiar datos duplicados

**Ejemplo de Middle Earth:**

```
Workflow FME para cargar datos:

1. [GeoJSON Reader] → Lee mapLocations.json
2. [AttributeRenamer] → Cambia "tipo" a "location_type"
3. [GeometryValidator] → Valida que las geometrías sean correctas
4. [Reprojector] → Asegura EPSG:4326
5. [PostgreSQL Writer] → Escribe a tabla locations
```

### FME Server (FME Flow)

**¿Qué hace?**

Automatiza y ejecuta workflows de FME en un servidor.

**Casos de uso:**

**1. Actualización automática de datos:**
```
Cada noche a las 2 AM:
- Descargar datos actualizados de una API
- Transformar con FME
- Actualizar base de datos PostgreSQL
- Enviar email de confirmación
```

**2. Servicios web de transformación:**
```
Usuario sube un Shapefile → FME Flow lo convierte a GeoJSON → Devuelve resultado
```

**3. Integración con sistemas empresariales:**
```
SAP genera reporte de activos → FME Flow extrae coordenadas → 
Actualiza mapa en ArcGIS Online
```

### ¿Por qué las empresas piden FME?

**Razones principales:**

1. **ETL Espacial:**
   - Extract, Transform, Load de datos geográficos
   - Empresas tienen datos en múltiples formatos
   - FME unifica todo

2. **Integración de Sistemas:**
   - Conectar GIS con ERP (SAP), CRM, bases de datos
   - Sincronizar datos entre sistemas

3. **Automatización:**
   - Procesos repetitivos sin intervención manual
   - Ahorro de tiempo y reducción de errores

4. **Validación de Datos:**
   - Asegurar calidad de datos geográficos
   - Detectar errores antes de cargar a producción

**Ejemplo empresarial real:**

Una empresa de telecomunicaciones:
- Tiene 10,000 torres de celular
- Datos en SAP (direcciones, IDs)
- Necesita visualizarlas en ArcGIS

**Solución con FME:**
```
SAP → FME Flow → Geocodificación → PostGIS → ArcGIS Online
```

FME Flow:
1. Se conecta a SAP cada hora
2. Extrae nuevas torres
3. Geocodifica direcciones (convierte dirección a coordenadas)
4. Valida geometrías
5. Actualiza PostGIS
6. Publica en ArcGIS Online

**En tu proyecto Middle Earth:**

Podrías usar FME para:
```
1. Leer locations.json (formato original)
2. Normalizar a GeoJSON estándar
3. Traducir campos de español a inglés
4. Validar geometrías
5. Cargar a PostgreSQL
6. Publicar en ArcGIS Online
```

Actualmente lo haces con Node.js scripts, pero FME lo haría visualmente sin código.

---

## SAP PM y GIS en Empresas

### ¿Qué es SAP?

**SAP (Systems, Applications, and Products)** es el sistema ERP (Enterprise Resource Planning) más usado en el mundo.

### ¿Qué es SAP PM?

**SAP PM (Plant Maintenance)** es el módulo de SAP para gestión de mantenimiento de activos.

**Gestiona:**
- Equipos industriales
- Infraestructura
- Vehículos
- Edificios
- Redes (electricidad, agua, gas)

### ¿Por qué SAP PM necesita GIS?

**Problema:**

SAP PM almacena activos con:
- ID del equipo
- Descripción
- Ubicación (texto): "Calle Principal 123"
- Estado
- Historial de mantenimiento

**Pero NO tiene:**
- Coordenadas geográficas
- Visualización en mapa
- Análisis espacial

**Solución: Integración SAP PM + GIS**

### Casos de Uso Reales

**1. Empresa Eléctrica:**

**Activos en SAP PM:**
- 50,000 postes de electricidad
- 10,000 transformadores
- 5,000 km de cables

**Necesidades:**
- Ver todos los activos en un mapa
- Planificar rutas de mantenimiento
- Analizar cobertura
- Responder a cortes de energía

**Integración:**
```
SAP PM → FME → PostGIS → ArcGIS Online

Flujo:
1. SAP PM tiene ID y dirección del poste
2. FME geocodifica la dirección (obtiene lat/lon)
3. FME carga a PostGIS con geometría
4. ArcGIS Online visualiza en mapa
5. Técnico ve mapa en tablet
6. Selecciona poste para mantenimiento
7. Actualización vuelve a SAP PM
```

**2. Empresa de Agua:**

**Activos en SAP PM:**
- Válvulas
- Tuberías
- Plantas de tratamiento
- Tanques de agua

**Workflow:**
```
1. Fuga reportada en calle X
2. GIS identifica válvulas cercanas
3. Técnico cierra válvulas desde el mapa
4. Actualiza estado en SAP PM
5. Genera orden de trabajo
```

**3. Municipalidad:**

**Activos en SAP PM:**
- Semáforos
- Luminarias
- Señales de tránsito
- Parques

**Análisis con GIS:**
- ¿Qué luminarias están a más de 5 años sin mantenimiento?
- ¿Qué parques están a más de 500m de escuelas?
- Optimizar rutas de recolección de basura

### Ejemplo con Middle Earth

**Imaginemos que Gondor usa SAP PM:**

**Activos en SAP PM:**
```
ID    | Descripción        | Ubicación
T001  | Torre de Guardia   | Minas Tirith, Sector Norte
T002  | Torre de Guardia   | Osgiliath, Puente
F001  | Fortaleza          | Helm's Deep
```

**Problema:** No sabemos dónde están exactamente en el mapa.

**Solución con GIS:**

```sql
-- Tabla en PostgreSQL con integración SAP
CREATE TABLE gondor_assets (
  sap_id VARCHAR(10) PRIMARY KEY,
  description TEXT,
  asset_type VARCHAR(50),
  location_text TEXT,
  geom GEOMETRY(Point, 4326),
  last_maintenance DATE,
  status VARCHAR(20)
);

-- Cargar datos desde SAP con FME
INSERT INTO gondor_assets VALUES
('T001', 'Torre de Guardia', 'tower', 'Minas Tirith, Sector Norte', 
 ST_SetSRID(ST_MakePoint(14.5, 42.8), 4326), '2024-01-15', 'active'),
('T002', 'Torre de Guardia', 'tower', 'Osgiliath, Puente',
 ST_SetSRID(ST_MakePoint(14.7, 42.9), 4326), '2023-11-20', 'damaged');
```

**Análisis espacial:**

```sql
-- ¿Qué torres necesitan mantenimiento urgente?
SELECT sap_id, description, 
       CURRENT_DATE - last_maintenance as days_since_maintenance
FROM gondor_assets
WHERE asset_type = 'tower'
  AND CURRENT_DATE - last_maintenance > 90
ORDER BY days_since_maintenance DESC;

-- ¿Qué activos están dentro de 10km de Minas Tirith?
SELECT a.sap_id, a.description,
       ST_Distance(
         a.geom::geography,
         (SELECT geom FROM locations WHERE name = 'Minas Tirith')::geography
       ) / 1000 as distance_km
FROM gondor_assets a
WHERE ST_DWithin(
  a.geom::geography,
  (SELECT geom FROM locations WHERE name = 'Minas Tirith')::geography,
  10000
);
```

### ¿Por qué las empresas piden SAP + GIS?

**Razones:**

1. **Visualización de Activos:**
   - Ver miles de equipos en un mapa
   - Mejor que listas en SAP

2. **Optimización de Rutas:**
   - Planificar mantenimiento preventivo
   - Reducir costos de transporte

3. **Análisis Espacial:**
   - Identificar patrones geográficos
   - Cobertura de servicios

4. **Respuesta a Emergencias:**
   - Encontrar activo más cercano
   - Coordinar equipos de campo

5. **Reportes Gerenciales:**
   - Dashboards con mapas
   - KPIs geográficos

**Perfil laboral típico:**

```
Requisitos:
- Conocimiento de SAP PM
- Experiencia con ArcGIS
- FME para integración
- SQL y bases de datos espaciales
- Python para automatización

Tareas:
- Integrar SAP con GIS
- Crear workflows de FME
- Desarrollar mapas web con ArcGIS
- Análisis espacial de activos
- Capacitar usuarios
```

---

## Fundamentos de Geografía para Desarrolladores

### 1. Coordenadas Geográficas

**Latitud:**
- Mide norte-sur
- Rango: -90° (Polo Sur) a +90° (Polo Norte)
- Ecuador: 0°
- Positivo = Norte, Negativo = Sur

**Longitud:**
- Mide este-oeste
- Rango: -180° a +180°
- Meridiano de Greenwich: 0°
- Positivo = Este, Negativo = Oeste

**Orden importante:**
- GeoJSON: `[longitud, latitud]`
- PostGIS: `ST_MakePoint(longitud, latitud)`
- Texto común: "latitud, longitud"

**Ejemplo Middle Earth:**
```
Minas Tirith:
- Latitud: 42.8° N (norte del ecuador)
- Longitud: 14.5° E (este de Greenwich)
- GeoJSON: [14.5, 42.8]
- PostGIS: ST_MakePoint(14.5, 42.8)
```

### 2. Proyecciones Cartográficas

**Problema:**

La Tierra es una esfera (geoide), los mapas son planos. No se puede aplanar una esfera sin distorsión.

**Tipos de distorsión:**
- Área (tamaños)
- Forma (ángulos)
- Distancia
- Dirección

**Proyecciones comunes:**

**Mercator (EPSG:3857):**
- Preserva ángulos (bueno para navegación)
- Distorsiona áreas (Groenlandia parece enorme)
- Usado en mapas web

**Equal Area (Albers, Lambert):**
- Preserva áreas
- Distorsiona formas
- Usado en análisis estadístico

**UTM (Universal Transverse Mercator):**
- Divide el mundo en zonas
- Bueno para áreas pequeñas
- Usado en topografía

**En tu proyecto:**
- Usas EPSG:4326 (sin proyección, coordenadas geográficas)
- ArcGIS Maps SDK proyecta automáticamente a Web Mercator para visualización

### 3. Escala

**Escala de mapa:**

```
Escala 1:1,000
= 1 cm en el mapa = 1,000 cm en la realidad (10 metros)

Escala 1:100,000
= 1 cm en el mapa = 100,000 cm en la realidad (1 km)
```

**Niveles de zoom en mapas web:**

```
Zoom 0  = Mundo completo
Zoom 5  = Continente
Zoom 10 = Ciudad
Zoom 15 = Barrio
Zoom 20 = Edificio
```

**En Middle Earth:**
```javascript
const view = new MapView({
  zoom: 6  // Nivel de región/país
})
```

### 4. Datum

**¿Qué es un Datum?**

Modelo matemático de la forma de la Tierra.

**Datums comunes:**
- **WGS 84**: Usado por GPS, estándar global
- **NAD 83**: Usado en Norteamérica
- **ETRS 89**: Usado en Europa

**Importante:**

Mismas coordenadas, diferentes datums = diferentes ubicaciones (hasta 200m de diferencia)

**En tu proyecto:**
- Usas WGS 84 (EPSG:4326)
- Es el estándar para web y GPS

### 5. Distancias y Áreas

**Calcular distancia:**

**Método 1: Fórmula de Haversine**
- Calcula distancia en esfera
- Precisa para distancias cortas (<1000 km)

**Método 2: PostGIS Geography**
- Usa elipsoide (más preciso)
- Recomendado

```sql
-- Distancia entre Minas Tirith y Rivendell
SELECT ST_Distance(
  ST_MakePoint(14.5, 42.8)::geography,
  ST_MakePoint(6.5, 45.5)::geography
) / 1000 as km;
-- Resultado: ~950 km
```

**Calcular área:**

```sql
-- Área de Gondor en km²
SELECT ST_Area(geom::geography) / 1000000 as area_km2
FROM regions
WHERE name = 'Gondor';
```

### 6. Topología

**¿Qué es topología?**

Relaciones espaciales entre geometrías.

**Relaciones topológicas:**

**Equals (Igual):**
```
A equals B si tienen exactamente las mismas coordenadas
```

**Disjoint (Separado):**
```
A disjoint B si no se tocan
```

**Intersects (Intersecta):**
```
A intersects B si comparten algún punto
```

**Touches (Toca):**
```
A touches B si comparten frontera pero no interior
```

**Within (Dentro):**
```
A within B si A está completamente dentro de B
```

**Contains (Contiene):**
```
A contains B si B está completamente dentro de A
```

**Overlaps (Superpone):**
```
A overlaps B si comparten área pero ninguno contiene al otro
```

**Ejemplo Middle Earth:**

```sql
-- ¿Minas Tirith está dentro de Gondor?
SELECT ST_Within(
  (SELECT geom FROM locations WHERE name = 'Minas Tirith'),
  (SELECT geom FROM regions WHERE name = 'Gondor')
) as is_within;
-- Resultado: true

-- ¿Gondor y Rohan comparten frontera?
SELECT ST_Touches(
  (SELECT geom FROM regions WHERE name = 'Gondor'),
  (SELECT geom FROM regions WHERE name = 'Rohan')
) as share_border;
```

### 7. Geocodificación

**Geocodificación:**
Convertir dirección → coordenadas

```
"Calle Principal 123, Madrid" → (40.4168, -3.7038)
```

**Geocodificación Inversa:**
Convertir coordenadas → dirección

```
(40.4168, -3.7038) → "Calle Principal 123, Madrid"
```

**APIs de geocodificación:**
- ArcGIS World Geocoding Service
- Google Maps Geocoding API
- Nominatim (OpenStreetMap, gratis)

**En Middle Earth:**

No necesitas geocodificación porque ya tienes coordenadas, pero podrías hacer geocodificación inversa:

```
(14.5, 42.8) → "Near Rome, Italy"
```

Y mapear a:
```
"Near Rome, Italy" → "Minas Tirith, Gondor"
```

### 8. Raster vs Vector

**Datos Vector:**
- Geometrías (puntos, líneas, polígonos)
- Precisos
- Escalables sin pérdida de calidad
- Ejemplos: ubicaciones, caminos, regiones

**Datos Raster:**
- Grilla de píxeles
- Cada píxel tiene un valor
- Ejemplos: imágenes satelitales, elevación, clima

**En Middle Earth:**
- Vector: tus ubicaciones y regiones (GeoJSON)
- Raster: tu mapa base `Middle-earth_modificado.tif`

**Operaciones raster:**
```sql
-- Obtener elevación en un punto
SELECT ST_Value(raster, geom) as elevation
FROM elevation_raster, locations
WHERE name = 'Minas Tirith';

-- Calcular pendiente
SELECT ST_Slope(raster) FROM elevation_raster;
```

---

## Certificaciones ArcGIS

### ¿Por qué certificarse?

**Beneficios:**
- Validar conocimientos oficialmente
- Mejorar CV y LinkedIn
- Aumentar salario (10-20% más)
- Requisito en muchas empresas
- Acceso a comunidad de profesionales certificados

### Certificaciones Disponibles

**1. ArcGIS Desktop Entry (Nivel Básico)**

**Para quién:**
- Principiantes en GIS
- Usuarios de ArcGIS Pro/ArcMap
- Analistas junior

**Temas:**
- Conceptos básicos de GIS
- Navegación en ArcGIS Pro
- Crear mapas
- Editar datos
- Análisis espacial básico
- Geoprocesamiento

**Formato:**
- 60 preguntas
- 90 minutos
- Opción múltiple
- Costo: ~$150 USD

**Preparación:**
- Curso oficial de Esri (40 horas)
- Práctica con ArcGIS Pro
- Tutoriales de Esri

**2. ArcGIS Desktop Professional (Nivel Intermedio)**

**Para quién:**
- Analistas GIS con experiencia
- Desarrolladores GIS
- Consultores

**Temas:**
- Análisis espacial avanzado
- Modelado de datos
- Python scripting (ArcPy)
- Geodatabases
- Topología
- Redes y routing

**Formato:**
- 90 preguntas
- 120 minutos
- Costo: ~$250 USD

**3. ArcGIS Desktop Associate (Nivel Avanzado)**

**Para quién:**
- GIS Managers
- Arquitectos de soluciones GIS
- Expertos en análisis espacial

**Temas:**
- Diseño de sistemas GIS
- Optimización de rendimiento
- Gestión de proyectos GIS
- Integración con otros sistemas

**4. Certificaciones de Desarrollador**

**ArcGIS API for JavaScript Developer:**

**Para quién:**
- Desarrolladores web
- **Esta es la que te corresponde para tu proyecto Middle Earth**

**Temas:**
- ArcGIS Maps SDK for JavaScript
- Crear aplicaciones web con mapas
- Widgets y UI
- Queries y análisis espacial en cliente
- Integración con servicios REST
- Optimización de rendimiento

**Formato:**
- Examen práctico
- Crear una aplicación funcional
- Costo: ~$200 USD

**Preparación:**
- Documentación oficial de ArcGIS Maps SDK
- Tutoriales de Esri
- **Tu proyecto Middle Earth es excelente preparación**

**ArcGIS API for Python Developer:**

**Para quién:**
- Desarrolladores Python
- Data scientists con GIS

**Temas:**
- ArcGIS API for Python
- Jupyter Notebooks
- Análisis espacial con Python
- Automatización
- Machine learning con datos espaciales

**5. Certificaciones Especializadas**

**ArcGIS for Server:**
- Administración de ArcGIS Enterprise
- Publicación de servicios
- Optimización de rendimiento

**ArcGIS Online:**
- Administración de ArcGIS Online
- Gestión de usuarios y contenido
- Configuración de aplicaciones

### ¿Cuál certificación te corresponde?

**Basado en tu proyecto Middle Earth:**

**Recomendación: ArcGIS API for JavaScript Developer**

**Razones:**
1. Usas ArcGIS Maps SDK for JavaScript
2. Desarrollas aplicaciones web con mapas
3. Integras con backend (Node.js + PostGIS)
4. Creas interfaces interactivas
5. Implementas análisis espacial en cliente

**Conocimientos que ya tienes (de tu proyecto):**

✅ Crear Map y MapView
✅ Agregar capas (FeatureLayer, GeoJSONLayer)
✅ Configurar popups
✅ Widgets (Zoom, Search, Editor)
✅ Simbología y renderers
✅ Queries espaciales
✅ Integración con APIs REST
✅ Manejo de eventos

**Conocimientos adicionales para certificación:**

📚 SceneView (mapas 3D)
📚 Análisis espacial avanzado (buffers, intersecciones)
📚 Geometría engine
📚 Sketch widget
📚 Optimización de rendimiento
📚 Seguridad y autenticación
📚 Deployment y producción

**Ruta de certificación recomendada:**

```
1. Completar tu proyecto Middle Earth (FASE 1-2)
   ↓
2. Estudiar documentación oficial de ArcGIS Maps SDK
   ↓
3. Hacer tutoriales avanzados de Esri
   ↓
4. Practicar con proyectos adicionales
   ↓
5. Tomar examen de certificación
   ↓
6. ¡Certificado ArcGIS API for JavaScript Developer!
```

**Alternativa (si prefieres backend):**

**ArcGIS for Server Administrator**

Si te interesa más el lado backend:
- Administrar ArcGIS Enterprise
- Publicar servicios desde PostGIS
- Optimizar rendimiento de servicios
- Integrar con SAP, FME, etc.

### Preparación para la Certificación

**Recursos oficiales:**

1. **Esri Training:**
   - Cursos online (algunos gratis)
   - Webinars
   - Documentación técnica

2. **ArcGIS Developers:**
   - https://developers.arcgis.com
   - Tutoriales paso a paso
   - Samples de código

3. **Esri Community:**
   - Foros
   - Blogs técnicos
   - Casos de uso

**Práctica:**

Proyectos sugeridos (además de Middle Earth):

1. **Mapa de COVID-19:**
   - Visualizar casos por región
   - Análisis de clusters
   - Timeslider para evolución temporal

2. **Buscador de Restaurantes:**
   - Geocodificación
   - Búsqueda por proximidad
   - Filtros y ratings

3. **Análisis de Rutas:**
   - Routing entre puntos
   - Optimización de rutas
   - Áreas de servicio

4. **Dashboard Empresarial:**
   - Integración con datos de negocio
   - KPIs geográficos
   - Reportes automáticos

**Tiempo de preparación:**

- Con tu proyecto Middle Earth: 2-3 meses
- Estudiando 10 horas/semana
- Practicando con proyectos adicionales

---

## Glosario de Términos

**API (Application Programming Interface):**
Conjunto de funciones y procedimientos que permiten a las aplicaciones comunicarse entre sí.

**Basemap:**
Mapa de fondo que proporciona contexto geográfico (calles, topografía, satélite).

**Cache (Caché):**
Almacenamiento temporal de teselas pre-renderizadas para mejorar rendimiento.

**CSS (Cascading Style Sheets):**
Lenguaje para definir estilos visuales. En GeoServer, se usa para estilizar capas.

**CQL (Common Query Language):**
Lenguaje de consulta usado en GeoServer para filtrar features.

**Dashboard:**
Panel de control con múltiples widgets sincronizados para visualizar KPIs.

**Buffer:**
Área de influencia alrededor de una geometría (ej: 500m alrededor de una ciudad).

**CRS (Coordinate Reference System):**
Sistema que define cómo se mapean coordenadas a ubicaciones en la Tierra.

**EPSG:**
Código numérico que identifica un CRS (ej: EPSG:4326 = WGS 84).

**ETL (Extract, Transform, Load):**
Proceso de extraer datos de una fuente, transformarlos y cargarlos en un destino.

**Feature:**
Objeto geográfico con geometría y atributos (ej: una ciudad con nombre y población).

**FeatureCollection:**
Conjunto de features en formato GeoJSON.

**Geocoding:**
Convertir dirección a coordenadas geográficas.

**Geodatabase:**
Base de datos diseñada para almacenar datos espaciales.

**GeoJSON:**
Formato JSON estándar para datos geográficos.

**GeoServer:**
Servidor de código abierto para publicar datos espaciales mediante estándares OGC.

**GeoWebCache:**
Sistema de caché de teselas integrado en GeoServer para mejorar rendimiento.

**Heatmap (Mapa de Calor):**
Visualización que muestra densidad o intensidad de datos mediante gradiente de colores.

**Leaflet:**
Librería JavaScript ligera (42 KB) para crear mapas interactivos móviles.

**MapStore:**
Plataforma de código abierto para crear aplicaciones webmapping, dashboards y StoryMaps.

**MVT (Mapbox Vector Tiles):**
Formato de teselas vectoriales compacto que permite interactividad y estilo dinámico.

**OGC (Open Geospatial Consortium):**
Organización que desarrolla estándares abiertos para datos geoespaciales.

**OGC API:**
Nueva generación de estándares OGC basados en REST y JSON.

**OpenLayers:**
Librería JavaScript completa para mapas web profesionales con soporte OGC completo.

**Plugin:**
Extensión que agrega funcionalidad adicional a una aplicación base.

**Pre-seeding:**
Generación anticipada de todas las teselas de un mapa para caché.

**SLD (Styled Layer Descriptor):**
Estándar XML de OGC para definir estilos de capas.

**Geometry:**
Representación matemática de una forma espacial (punto, línea, polígono).

**Geoprocessing:**
Análisis y manipulación de datos espaciales.

**GIST (Generalized Search Tree):**
Tipo de índice para acelerar consultas espaciales.

**Latitude (Latitud):**
Coordenada que mide norte-sur (-90° a +90°).

**Layer (Capa):**
Conjunto de datos geográficos visualizados en un mapa.

**Longitude (Longitud):**
Coordenada que mide este-oeste (-180° a +180°).

**PostGIS:**
Extensión de PostgreSQL para datos espaciales.

**Projection (Proyección):**
Transformación matemática de coordenadas esféricas a planas.

**Raster:**
Datos en formato de grilla de píxeles.

**Renderer:**
Define cómo se visualizan los features en el mapa (colores, símbolos).

**REST (Representational State Transfer):**
Arquitectura para servicios web (GET, POST, PUT, DELETE).

**Shapefile:**
Formato de archivo vectorial de Esri (.shp).

**Spatial Query:**
Consulta basada en relaciones espaciales (distancia, contención, intersección).

**SQL (Structured Query Language):**
Lenguaje para consultar bases de datos.

**StoryMap:**
Narrativa geográfica interactiva que combina mapas, texto, imágenes y multimedia.

**Tesela (Tile):**
Imagen pequeña (256x256 px) que forma parte de una cuadrícula de mapa.

**Topology (Topología):**
Relaciones espaciales entre geometrías.

**WCS (Web Coverage Service):**
Estándar OGC para servir datos raster con valores de píxeles.

**WFS (Web Feature Service):**
Estándar OGC para servir datos vectoriales (geometrías y atributos).

**WFS-T (Web Feature Service - Transactional):**
Extensión de WFS que permite insertar, actualizar y eliminar features.

**WMS (Web Map Service):**
Estándar OGC para servir imágenes de mapas renderizadas.

**WMTS (Web Map Tile Service):**
Estándar OGC para servir teselas de mapas pre-renderizadas.

**Workspace:**
Contenedor lógico en GeoServer para organizar capas y servicios.

**WPS (Web Processing Service):**
Estándar OGC para ejecutar geoprocesamiento en el servidor.

**Vector:**
Datos representados como geometrías (puntos, líneas, polígonos).

**WGS 84:**
Sistema de coordenadas usado por GPS (EPSG:4326).

**Widget:**
Componente de interfaz de usuario en un mapa (zoom, búsqueda, etc.).

---

## Resumen Final

### Conceptos Clave para Recordar

**1. GIS = Datos + Ubicación + Análisis**
- No es solo hacer mapas
- Es analizar patrones espaciales
- Es tomar decisiones basadas en geografía

**2. Todo tiene una ubicación**
- 80% de datos empresariales son geográficos
- GIS conecta datos con el mundo real

**3. Tecnologías principales:**
- **ArcGIS**: Plataforma líder comercial
- **PostGIS**: Base de datos espacial open source
- **FME**: Integración de datos espaciales
- **SAP**: Sistemas empresariales que necesitan GIS

**4. Habilidades clave:**
- Entender sistemas de coordenadas
- Análisis espacial (distancias, áreas, contención)
- Integración de sistemas
- Desarrollo web con mapas
- Automatización con scripts

**5. Tu proyecto Middle Earth demuestra:**
- ✅ Diseño de base de datos espacial (PostGIS)
- ✅ Desarrollo web con mapas (ArcGIS Maps SDK)
- ✅ API backend (Node.js + GraphQL)
- ✅ Análisis espacial (queries, distancias)
- ✅ Visualización de datos geográficos

### Próximos Pasos

**Después de tu viaje:**

1. **Completar FASE 1:**
   - Implementar backend con PostGraphile
   - Crear frontend con Vue 3 + ArcGIS SDK
   - Visualizar ubicaciones y regiones

2. **Estudiar para certificación:**
   - ArcGIS API for JavaScript Developer
   - Practicar con tutoriales de Esri
   - Crear proyectos adicionales

3. **Explorar tecnologías:**
   - Probar FME Desktop (trial gratuito)
   - Aprender Python para GIS (ArcPy)
   - Experimentar con análisis 3D (SceneView)

4. **Construir portfolio:**
   - Publicar Middle Earth en GitHub
   - Crear más proyectos GIS
   - Escribir blog posts técnicos

**¡Buen viaje y buen estudio!** 🚌📚🗺️

---

**Última actualización:** Abril 2026  
**Autor:** Christian Karl Delhey  
**Propósito:** Material de estudio teórico para desarrollador GIS
