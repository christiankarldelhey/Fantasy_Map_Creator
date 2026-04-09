# Documentación del Proyecto Middle Earth GIS

Documentación completa del proyecto de portfolio GIS basado en el mapa de Tierra Media.

## 📚 Índice de Documentación

### Análisis y Planificación

- **[00 - Análisis de Límites de APIs](./00-api-limits-analysis.md)**
  - Límites de OpenWeather API (clima histórico)
  - Límites de ArcGIS Location Platform (free tier)
  - Estrategias para trabajar dentro de los límites gratuitos
  - Arquitectura propuesta para clima y edición de features

- **[01 - FASE 0: Setup PostgreSQL + PostGIS](./01-fase-0-setup-postgis.md)**
  - Fundamentos de bases de datos espaciales
  - Configuración de PostgreSQL y PostGIS
  - Sistemas de coordenadas (EPSG:4326 vs EPSG:3857)
  - Normalización de GeoJSONs
  - Diseño del esquema de base de datos
  - Carga de datos a PostGIS
  - Queries espaciales básicas

### Fases Futuras (Pendientes)

- **FASE 1:** Backend API + Frontend Vue 3 + ArcGIS SDK
- **FASE 2:** Edición de Features (puntos, líneas, polígonos)
- **FASE 3:** GraphQL + Análisis Espacial Avanzado
- **FASE 4:** Sistema de Routing con pgRouting
- **FASE 5:** Features Avanzados (clima, biomas, análisis temporal)
- **FASE 6:** Plataforma Multi-Usuario

## 🎯 Objetivo del Proyecto

Crear un portfolio GIS profesional que demuestre:
- Dominio de tecnologías GIS (ArcGIS, PostGIS, QGIS)
- Desarrollo full-stack con datos espaciales
- Análisis geoespacial y routing
- Integración de APIs externas (clima, geocoding)
- Diseño de sistemas escalables

## 🛠️ Stack Tecnológico

### Backend
- Node.js + Express
- PostgreSQL 15 + PostGIS 3.4
- PostGraphile (GraphQL)
- pgRouting (análisis de redes)

### Frontend
- Vue 3 (Composition API)
- ArcGIS Maps SDK for JavaScript 4.29+
- Tailwind CSS
- Pinia (state management)

### APIs Externas
- ArcGIS Location Platform (basemaps, geocoding)
- Open-Meteo API (clima histórico - gratis)
- OpenWeather (opcional, clima en tiempo real)

### DevOps
- Docker (PostgreSQL + PostGIS)
- GitHub Actions (CI/CD)
- Netlify/Vercel (frontend)
- Railway/Render (backend + DB)

## 📊 Estado del Proyecto

### ✅ Completado
- Análisis de límites de APIs
- Planificación de arquitectura

### 🔄 En Progreso
- FASE 0: Setup PostgreSQL + PostGIS

### ⏳ Pendiente
- FASE 1-6

## 📁 Estructura del Proyecto

```
Middle Earth Map/
├── docs/                           # Documentación (estás aquí)
│   ├── README.md
│   ├── 00-api-limits-analysis.md
│   └── 01-fase-0-setup-postgis.md
├── Geojson/                        # Datos originales
│   ├── locations.json
│   ├── mapLocations.json
│   └── provincias.json
├── Maps/                           # Mapas TIF georeferenciados
│   └── Middle-earth_modificado.tif
├── data/                           # (A crear)
│   └── normalized/
│       ├── points.geojson
│       ├── polygons.geojson
│       └── regions.geojson
├── database/                       # (A crear)
│   ├── schema.sql
│   └── queries/
├── scripts/                        # (A crear)
│   ├── normalize_geojson.js
│   └── load_to_postgis.js
├── backend/                        # (A crear - FASE 1)
└── frontend/                       # (A crear - FASE 1)
```

## 🚀 Cómo Empezar

1. **Lee el análisis de APIs:** [00-api-limits-analysis.md](./00-api-limits-analysis.md)
2. **Sigue la FASE 0:** [01-fase-0-setup-postgis.md](./01-fase-0-setup-postgis.md)
3. **Ejecuta los scripts de normalización y carga**
4. **Verifica los datos con queries espaciales**
5. **Continúa con FASE 1**

## 📖 Recursos de Aprendizaje

- [PostGIS Documentation](https://postgis.net/docs/)
- [ArcGIS Maps SDK for JavaScript](https://developers.arcgis.com/javascript/latest/)
- [GeoJSON Specification](https://geojson.org/)
- [PostgreSQL Tutorial](https://www.postgresqltutorial.com/)
- [EPSG.io](https://epsg.io/) - Sistemas de coordenadas
- [GeoJSON.io](http://geojson.io/) - Visualizar/editar GeoJSON

## 💡 Conceptos Clave Aprendidos

- Bases de datos espaciales vs tradicionales
- PostGIS como extensión de PostgreSQL
- Sistemas de referencia de coordenadas (CRS)
- Tipos de geometrías (POINT, LINESTRING, POLYGON)
- Índices espaciales (GIST)
- Funciones espaciales (ST_*)
- Estándar GeoJSON
- ETL de datos geoespaciales
- Queries espaciales (distancia, contención, intersección)

## 🎓 Objetivos de Aprendizaje GIS

Este proyecto está diseñado para aprender tecnologías GIS profesionales:

1. **PostGIS** - Base de datos espacial estándar industrial
2. **ArcGIS SDK** - Plataforma GIS líder en la industria
3. **Análisis espacial** - Queries geoespaciales complejas
4. **Routing** - Algoritmos de caminos óptimos (pgRouting)
5. **Sistemas de coordenadas** - Proyecciones y transformaciones
6. **Servicios web GIS** - WMS, WFS, Feature Services
7. **Visualización de datos** - Mapas interactivos y simbología

## 📝 Notas

- Todos los costos están optimizados para free tiers ($0-10/mes)
- El proyecto es escalable para uso profesional futuro
- La documentación se actualiza con cada fase completada
- Los scripts son reutilizables para otros proyectos GIS

---

**Última actualización:** Abril 2026  
**Autor:** Christian Karl Delhey  
**Propósito:** Portfolio GIS profesional
