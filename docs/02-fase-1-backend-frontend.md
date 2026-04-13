# FASE 1: Stack Setup + Mapa Base con ArcGIS Maps SDK

Guía práctica para configurar un stack completo (Backend REST + Frontend Vue 3 + ArcGIS Maps SDK) y cargar un mapa base interactivo de Tierra Media. Enfocado en preparación para el examen **ArcGIS Maps SDK for JavaScript Associate 2024**.

---

## 📋 Índice

1. [Introducción](#introducción)
2. [Requisitos Previos](#requisitos-previos)
3. [Módulo 1: Setup del Backend](#módulo-1-setup-del-backend)
4. [Módulo 2: REST Endpoints para PostGIS](#módulo-2-rest-endpoints-para-postgis)
5. [Módulo 3: Setup del Frontend](#módulo-3-setup-del-frontend)
6. [Módulo 4: ArcGIS Maps SDK - Mapa Base](#módulo-4-arcgis-maps-sdk---mapa-base)
7. [Módulo 5: Conectar Frontend con Backend](#módulo-5-conectar-frontend-con-backend)
8. [Testing y Validación](#testing-y-validación)
9. [Comandos de Referencia](#comandos-de-referencia)
10. [Próximos Pasos](#próximos-pasos)

---

## Introducción

### ¿Qué vamos a construir?

En FASE 1 crearemos la **base técnica** de una aplicación web GIS profesional:

- ✅ **Backend REST API** que sirve datos de PostGIS como GeoJSON
- ✅ **Frontend Vue 3** con ArcGIS Maps SDK for JavaScript
- ✅ **Mapa base interactivo** de Tierra Media (zoom, pan, navegación 2D)
- ✅ **Calcite Design System** (componentes UI de Esri)
- ✅ **Conexión completa** entre todas las capas del stack

**Resultado final:** Un mapa base funcional listo para agregar capas, widgets y funcionalidades evaluadas en el examen de certificación.

### Relación con el Examen de Certificación

**ArcGIS Maps SDK for JavaScript Associate 2024** evalúa 4 áreas:

| Área | Peso | Cubierto en FASE 1 |
|------|------|---------------------|
| **Visualization** | 32% | ✅ Basemap, MapView |
| **Analysis** | 23% | ⏳ FASE 2+ |
| **Programming Patterns** | 31% | ✅ Async/await, eventos básicos |
| **UI/UX** | 14% | ✅ View.UI, Calcite, navegación 2D |

**FASE 1 establece las bases para:**
- Renderers y symbology (FASE 2)
- Queries y filtros espaciales (FASE 2)
- Widgets (LayerList, Search, Popup) (FASE 2)
- Edición de features (FASE 3)

### Stack Tecnológico

**Backend (REST API Simple):**
- **Node.js 18+**: Runtime JavaScript
- **Express 4.x**: Framework web minimalista
- **pg**: Cliente PostgreSQL para Node.js
- **cors**: Permitir peticiones cross-origin
- **dotenv**: Variables de entorno

**Frontend (Enfocado en Certificación):**
- **Vue 3**: Framework progresivo (Composition API)
- **Vite**: Build tool moderno y rápido
- **ArcGIS Maps SDK for JavaScript 4.30+**: SDK oficial de Esri
- **Calcite Design System**: Componentes UI de Esri (evaluado en examen)
- **Axios**: Cliente HTTP para consumir REST API

**Base de Datos:**
- **PostgreSQL 17 + PostGIS 3.6**: Ya configurado en FASE 0
  - 206 ubicaciones (puntos)
  - 39 regiones (polígonos)

### Arquitectura

```
┌─────────────────────────────────────────┐
│         Navegador Web                   │
│  ┌───────────────────────────────────┐  │
│  │  Vue 3 Frontend (localhost:5173)  │  │
│  │  ┌─────────────────────────────┐  │  │
│  │  │ ArcGIS Maps SDK 4.30        │  │  │
│  │  │ - MapView (2D)              │  │  │
│  │  │ - Basemap                   │  │  │
│  │  │ - View.UI                   │  │  │
│  │  └─────────────────────────────┘  │  │
│  │  ┌─────────────────────────────┐  │  │
│  │  │ Calcite Design System       │  │  │
│  │  │ - calcite-shell             │  │  │
│  │  │ - calcite-button            │  │  │
│  │  └─────────────────────────────┘  │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
              ↕ HTTP REST (Axios)
┌─────────────────────────────────────────┐
│   Node.js Backend (localhost:5000)      │
│  ┌───────────────────────────────────┐  │
│  │  Express Server                   │  │
│  │  ┌─────────────────────────────┐  │  │
│  │  │ REST Endpoints              │  │  │
│  │  │ GET /api/locations          │  │  │
│  │  │ GET /api/regions            │  │  │
│  │  │ GET /api/health             │  │  │
│  │  └─────────────────────────────┘  │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
              ↕ SQL (pg client)
┌─────────────────────────────────────────┐
│   PostgreSQL 17 + PostGIS 3.6           │
│  ┌───────────────────────────────────┐  │
│  │ locations (206 puntos)            │  │
│  │ regions (39 polígonos)            │  │
│  │ ST_AsGeoJSON(), ST_Transform()    │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

**Flujo de datos:**
1. Frontend Vue solicita datos: `axios.get('/api/locations')`
2. Backend Express consulta PostGIS: `SELECT ST_AsGeoJSON(...)`
3. Backend devuelve GeoJSON: `{ type: 'FeatureCollection', features: [...] }`
4. Frontend renderiza en ArcGIS MapView (FASE 2)

### ¿Por qué REST en lugar de GraphQL?

**Decisión:** Usamos REST API simple en lugar de PostGraphile (GraphQL).

**Razones:**
- ✅ **Simplicidad**: REST es más directo para este alcance
- ✅ **Enfoque en SDK**: El examen evalúa ArcGIS SDK, no GraphQL
- ✅ **Menos dependencias**: Sin PostGraphile, sin complejidad extra
- ✅ **Estándar GIS**: GeoJSON sobre REST es el estándar de facto
- ✅ **Debugging fácil**: Endpoints REST son más fáciles de probar

**GraphQL es excelente para:**
- Aplicaciones con queries complejas y anidadas
- Evitar over-fetching en apps grandes
- Subscriptions en tiempo real

**Para este proyecto:**
- Solo necesitamos 2 endpoints simples
- GeoJSON es el formato estándar
- REST es suficiente y más pedagógico

---

## Requisitos Previos

### ✅ Completado en FASE 0:

- PostgreSQL 17 + PostGIS 3.6 instalado
- Base de datos `middle_earth` creada
- 206 ubicaciones cargadas en tabla `locations`
- 39 regiones cargadas en tabla `regions`
- Índices espaciales GIST creados

### 🔧 Verificar Herramientas:

```bash
# Verificar Node.js (debe ser 18+)
node --version  # v18.x.x o superior

# Verificar npm
npm --version  # 9.x.x o superior

# Verificar PostgreSQL
psql --version  # PostgreSQL 17.x
```

**Si no tienes Node.js 18+:**
```bash
brew install node@18
```

**Verificar conexión a PostgreSQL:**
```bash
psql -U postgres -d middle_earth -c "SELECT COUNT(*) FROM locations;"
# Debe devolver: 206
```

---

## Módulo 1: Setup del Backend

### 📚 Teoría: REST API y Express

**¿Qué es una REST API?**

REST (Representational State Transfer) es un estilo arquitectónico para APIs web que usa:
- **HTTP methods**: GET (leer), POST (crear), PUT (actualizar), DELETE (eliminar)
- **Endpoints**: URLs que representan recursos (`/api/locations`, `/api/regions`)
- **JSON**: Formato de intercambio de datos
- **Stateless**: Cada petición es independiente

**¿Qué es Express?**

Express es un framework minimalista para Node.js que facilita:
- Crear servidores HTTP
- Definir rutas y endpoints
- Manejar middleware (CORS, JSON parsing, etc.)
- Conectar con bases de datos

**Arquitectura de nuestro backend:**

```
Backend (localhost:5000)
├── server.js          # Punto de entrada, configura Express
├── db.js              # Pool de conexiones PostgreSQL
├── routes/
│   ├── locations.js   # GET /api/locations
│   └── regions.js     # GET /api/regions
├── .env               # Variables de entorno (DB credentials)
└── package.json       # Dependencias y scripts
```

**¿Por qué GeoJSON?**

GeoJSON es el formato estándar para datos geográficos en web:
- Basado en JSON (fácil de parsear en JavaScript)
- Soportado nativamente por ArcGIS Maps SDK
- Estructura clara: `FeatureCollection` → `features` → `geometry` + `properties`

**Ejemplo de GeoJSON:**
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
        "type": "city",
        "region": "Gondor"
      }
    }
  ]
}
```

### 🛠️ Práctica: Crear Servidor Express

#### Paso 1: Crear estructura del proyecto

```bash
# Desde la raíz del proyecto Middle Earth Map
mkdir backend
cd backend

# Inicializar proyecto Node.js
npm init -y
```

Esto crea `package.json` con configuración por defecto.

#### Paso 2: Instalar dependencias

```bash
# Dependencias principales
npm install express cors dotenv pg

# Dependencias de desarrollo
npm install --save-dev nodemon
```

**¿Qué hace cada paquete?**
- **express**: Framework web minimalista
- **cors**: Permite peticiones desde frontend (localhost:5173)
- **dotenv**: Carga variables de entorno desde `.env`
- **pg**: Cliente PostgreSQL oficial para Node.js
- **nodemon**: Reinicia servidor automáticamente al guardar cambios

#### Paso 3: Configurar package.json

Edita `backend/package.json` para agregar scripts:

```json
{
  "name": "middle-earth-backend",
  "version": "1.0.0",
  "description": "REST API for Middle Earth GIS",
  "main": "server.js",
  "type": "module",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js"
  },
  "keywords": ["gis", "postgis", "graphql"],
  "author": "",
  "license": "MIT",
  "dependencies": {
    "cors": "^2.8.5",
    "dotenv": "^16.0.3",
    "express": "^4.18.2",
    "pg": "^8.11.0"
  },
  "devDependencies": {
    "nodemon": "^3.0.1"
  }
}
```

#### Paso 4: Crear archivo de variables de entorno

**Archivo: `backend/.env`**

```bash
# Database connection
DATABASE_URL=postgres://christiankarldelhey@localhost:5432/middle_earth

# Server configuration
PORT=5000
NODE_ENV=development

# CORS
CORS_ORIGIN=http://localhost:5173
```

**Archivo: `backend/.env.example`** (template para otros desarrolladores)

```bash
# Database connection
DATABASE_URL=postgres://username@localhost:5432/middle_earth

# Server configuration
PORT=5000
NODE_ENV=development

# CORS
CORS_ORIGIN=http://localhost:5173
```

#### Paso 5: Crear configuración de base de datos

**Archivo: `backend/config/database.js`**

```javascript
const { Pool } = require('pg');
require('dotenv').config();

// Create PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Test connection
pool.on('connect', () => {
  console.log('✅ Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('❌ Unexpected error on idle client', err);
  process.exit(-1);
});

module.exports = pool;
```

**¿Qué aprendes aquí?**
- `Pool`: Mantiene múltiples conexiones abiertas para mejor rendimiento
- `max: 20`: Máximo 20 conexiones simultáneas
- `idleTimeoutMillis`: Cierra conexiones inactivas después de 30 segundos
- Event listeners para monitorear la conexión

#### Paso 6: Crear middleware de manejo de errores

**Archivo: `backend/middleware/errorHandler.js`**

```javascript
// Global error handler middleware
const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  // PostgreSQL errors
  if (err.code) {
    const pgErrors = {
      '23505': { status: 409, message: 'Duplicate entry' },
      '23503': { status: 400, message: 'Foreign key violation' },
      '23502': { status: 400, message: 'Not null violation' },
      '22P02': { status: 400, message: 'Invalid input syntax' },
    };

    const error = pgErrors[err.code];
    if (error) {
      return res.status(error.status).json({
        error: error.message,
        detail: err.detail || err.message
      });
    }
  }

  // Default error
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

module.exports = errorHandler;
```

**¿Qué aprendes aquí?**
- Manejo centralizado de errores
- Códigos de error PostgreSQL específicos
- Respuestas JSON consistentes
- Stack trace solo en desarrollo

#### Paso 7: Crear servidor Express básico

**Archivo: `backend/server.js`**

```javascript
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const pool = require('./config/database');
const errorHandler = require('./middleware/errorHandler');

// Create Express app
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({
      status: 'healthy',
      database: 'connected',
      timestamp: result.rows[0].now
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      database: 'disconnected',
      error: error.message
    });
  }
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Middle Earth GIS API',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      graphql: '/graphql',
      graphiql: '/graphiql'
    }
  });
});

// Error handler (must be last)
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
});
```

**¿Qué aprendes aquí?**
- `express()`: Crea la aplicación
- `cors()`: Permite peticiones desde el frontend
- `express.json()`: Parsea JSON en el body de las peticiones
- Health check: Verifica que el servidor y la BD funcionan
- Error handler al final: Captura todos los errores

#### Paso 8: Probar el servidor

```bash
# Iniciar servidor
npm run dev

# Deberías ver:
# 🚀 Server running on http://localhost:5000
# ✅ Connected to PostgreSQL database
# 📊 Health check: http://localhost:5000/api/health
```

**Probar en el navegador:**
```
http://localhost:5000/
http://localhost:5000/api/health
```

**Probar con curl:**
```bash
curl http://localhost:5000/api/health
```

### ✅ Lo que aprendiste en Módulo 1:

- ✅ Crear servidor Express desde cero
- ✅ Configurar variables de entorno
- ✅ Conectar a PostgreSQL con pool de conexiones
- ✅ Implementar CORS para desarrollo
- ✅ Crear middleware de manejo de errores
- ✅ Implementar health check endpoint
- ✅ Usar nodemon para desarrollo

---

## Módulo 2: REST Endpoints para PostGIS

## Módulo 2: REST Endpoints para PostGIS

### 📚 Teoría: Consultas Espaciales con PostGIS

**Funciones PostGIS clave para GeoJSON:**

- **ST_AsGeoJSON()**: Convierte geometría PostGIS a formato GeoJSON
- **ST_Transform()**: Transforma entre sistemas de coordenadas
- **ST_X(), ST_Y()**: Extrae coordenadas de un punto
- **json_build_object()**: Construye objetos JSON en PostgreSQL

**Estructura de una query para GeoJSON:**

```sql
SELECT json_build_object(
  'type', 'FeatureCollection',
  'features', json_agg(
    json_build_object(
      'type', 'Feature',
      'geometry', ST_AsGeoJSON(geom)::json,
      'properties', json_build_object(
        'id', id,
        'name', name,
        'type', location_type
      )
    )
  )
) as geojson
FROM locations;
```

**¿Por qué esta estructura?**
- Compatible con ArcGIS Maps SDK
- Estándar GeoJSON (RFC 7946)
- Una sola query devuelve todo el FeatureCollection
- Geometrías ya en formato JSON

### 🛠️ Práctica: Crear Endpoints REST

#### Paso 1: Crear módulo de base de datos

**Archivo: `backend/db.js`**

```javascript
import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('connect', () => {
  console.log('✅ Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('❌ Unexpected error on idle client', err);
  process.exit(-1);
});

export default pool;
```

#### Paso 2: Crear endpoint de ubicaciones

**Archivo: `backend/routes/locations.js`**

```javascript
import express from 'express';
import pool from '../db.js';

const router = express.Router();

// GET /api/locations - Devolver todas las ubicaciones como GeoJSON
router.get('/', async (req, res, next) => {
  try {
    const query = `
      SELECT json_build_object(
        'type', 'FeatureCollection',
        'features', COALESCE(json_agg(
          json_build_object(
            'type', 'Feature',
            'id', id,
            'geometry', ST_AsGeoJSON(geom)::json,
            'properties', json_build_object(
              'id', id,
              'name', name,
              'type', location_type,
              'region', region,
              'description', description
            )
          )
        ), '[]'::json)
      ) as geojson
      FROM locations
      WHERE geom IS NOT NULL;
    `;

    const result = await pool.query(query);
    res.json(result.rows[0].geojson);
  } catch (error) {
    next(error);
  }
});

// GET /api/locations/:id - Obtener una ubicación específica
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const query = `
      SELECT json_build_object(
        'type', 'Feature',
        'id', id,
        'geometry', ST_AsGeoJSON(geom)::json,
        'properties', json_build_object(
          'id', id,
          'name', name,
          'type', location_type,
          'region', region,
          'description', description
        )
      ) as feature
      FROM locations
      WHERE id = $1;
    `;

    const result = await pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Location not found' });
    }
    
    res.json(result.rows[0].feature);
  } catch (error) {
    next(error);
  }
});

export default router;
```

#### Paso 3: Crear endpoint de regiones

**Archivo: `backend/routes/regions.js`**

```javascript
import express from 'express';
import pool from '../db.js';

const router = express.Router();

// GET /api/regions - Devolver todas las regiones como GeoJSON
router.get('/', async (req, res, next) => {
  try {
    const query = `
      SELECT json_build_object(
        'type', 'FeatureCollection',
        'features', COALESCE(json_agg(
          json_build_object(
            'type', 'Feature',
            'id', id,
            'geometry', ST_AsGeoJSON(geom)::json,
            'properties', json_build_object(
              'id', id,
              'name', name,
              'description', description
            )
          )
        ), '[]'::json)
      ) as geojson
      FROM regions
      WHERE geom IS NOT NULL;
    `;

    const result = await pool.query(query);
    res.json(result.rows[0].geojson);
  } catch (error) {
    next(error);
  }
});

export default router;
```

#### Paso 4: Actualizar server.js

**Archivo: `backend/server.js`**

```javascript
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pool from './db.js';
import locationsRouter from './routes/locations.js';
import regionsRouter from './routes/regions.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());

// Routes
app.use('/api/locations', locationsRouter);
app.use('/api/regions', regionsRouter);

// Health check
app.get('/api/health', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW(), COUNT(*) as locations FROM locations');
    res.json({
      status: 'healthy',
      database: 'connected',
      timestamp: result.rows[0].now,
      locations: result.rows[0].locations
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      database: 'disconnected',
      error: error.message
    });
  }
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Middle Earth GIS API',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      locations: '/api/locations',
      regions: '/api/regions'
    }
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  console.log(`📍 Locations: http://localhost:${PORT}/api/locations`);
  console.log(`🗺️  Regions: http://localhost:${PORT}/api/regions`);
});
```

#### Paso 5: Probar los endpoints

```bash
# Iniciar servidor
cd backend
npm run dev

# En otra terminal, probar endpoints
curl http://localhost:5000/api/health
curl http://localhost:5000/api/locations | jq '.features | length'
curl http://localhost:5000/api/regions | jq '.features | length'

# Probar ubicación específica
curl http://localhost:5000/api/locations/1 | jq '.'
```

**Resultado esperado:**
```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "id": 1,
      "geometry": {
        "type": "Point",
        "coordinates": [14.5, 42.8]
      },
      "properties": {
        "id": 1,
        "name": "Minas Tirith",
        "type": "city",
        "region": "Gondor"
      }
    }
  ]
}
```

### ✅ Lo que aprendiste en Módulo 2:

- ✅ Consultas PostGIS con ST_AsGeoJSON()
- ✅ Construir GeoJSON con json_build_object()
- ✅ Crear rutas REST con Express Router
- ✅ Manejar parámetros de ruta (:id)
- ✅ Devolver FeatureCollections válidas
- ✅ Manejo de errores con next()

---

## Módulo 3: Setup del Frontend

### 📚 Teoría: Vue 3 y Vite

**¿Qué es Vue 3?**

Vue 3 es un framework JavaScript progresivo para construir interfaces de usuario:
- **Composition API**: Forma moderna de organizar lógica (vs Options API)
- **Reactivo**: Los datos se actualizan automáticamente en la UI
- **Componentes**: Piezas reutilizables de UI
- **Single File Components**: HTML, CSS y JS en un solo archivo `.vue`

**¿Qué es Vite?**

Vite es un build tool moderno:
- **Rápido**: Hot Module Replacement (HMR) instantáneo
- **ESM nativo**: Usa módulos ES6 nativos del navegador
- **Optimizado**: Build de producción con Rollup
- **Simple**: Configuración mínima

**Estructura de proyecto Vue 3:**

```
frontend/
├── public/              # Archivos estáticos
├── src/
│   ├── assets/          # Imágenes, estilos globales
│   ├── components/      # Componentes reutilizables
│   ├── views/           # Vistas/páginas
│   ├── services/        # Servicios (API calls)
│   ├── composables/     # Lógica reutilizable
│   ├── App.vue          # Componente raíz
│   └── main.js          # Punto de entrada
├── index.html           # HTML principal
├── vite.config.js       # Configuración de Vite
└── package.json         # Dependencias
```

### 🛠️ Práctica: Crear Proyecto Vue 3

#### Paso 1: Crear proyecto con Vite

```bash
# Desde la raíz del proyecto
npm create vite@latest frontend -- --template vue

# Entrar al directorio
cd frontend

# Instalar dependencias
npm install
```

#### Paso 2: Instalar dependencias adicionales

```bash
# ArcGIS Maps SDK
npm install @arcgis/core

# Calcite Design System
npm install @esri/calcite-components

# Axios para HTTP requests
npm install axios

# Probar que funciona
npm run dev
```

Deberías ver el proyecto corriendo en `http://localhost:5173`

#### Paso 3: Configurar Vite

**Archivo: `frontend/vite.config.js`**

```javascript
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true
      }
    }
  }
})
```

**¿Qué hace esto?**
- **alias '@'**: Permite importar con `@/components/...` en lugar de `../../components/...`
- **proxy '/api'**: Redirige peticiones `/api/*` al backend (evita problemas de CORS)

#### Paso 4: Limpiar proyecto

```bash
# Eliminar archivos de ejemplo
rm src/components/HelloWorld.vue
rm src/assets/vue.svg
```

**Actualizar `src/App.vue`:**

```vue
<template>
  <div id="app">
    <h1>Middle Earth GIS</h1>
    <p>Mapa interactivo de Tierra Media</p>
  </div>
</template>

<script setup>
// Aquí agregaremos componentes después
</script>

<style scoped>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  text-align: center;
  color: #2c3e50;
  margin-top: 60px;
}
</style>
```

#### Paso 5: Crear estructura de carpetas

```bash
# Desde frontend/src/
mkdir components views services composables
```

#### Paso 6: Crear servicio de API

**Archivo: `frontend/src/services/api.js`**

```javascript
import axios from 'axios';

const api = axios.create({
  baseURL: '/api',  // Usa el proxy de Vite
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Interceptor para logging (desarrollo)
api.interceptors.request.use(
  config => {
    console.log(`📡 ${config.method.toUpperCase()} ${config.url}`);
    return config;
  },
  error => {
    console.error('❌ Request error:', error);
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  response => {
    console.log(`✅ Response from ${response.config.url}`);
    return response;
  },
  error => {
    console.error('❌ Response error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

// Funciones de API
export const getLocations = () => api.get('/locations');
export const getLocation = (id) => api.get(`/locations/${id}`);
export const getRegions = () => api.get('/regions');
export const healthCheck = () => api.get('/health');

export default api;
```

#### Paso 7: Probar conexión con backend

**Actualizar `src/App.vue` para probar:**

```vue
<template>
  <div id="app">
    <h1>Middle Earth GIS</h1>
    <button @click="testAPI">Test API Connection</button>
    <div v-if="status">
      <p>Status: {{ status.status }}</p>
      <p>Locations: {{ status.locations }}</p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { healthCheck } from '@/services/api';

const status = ref(null);

async function testAPI() {
  try {
    const response = await healthCheck();
    status.value = response.data;
    console.log('✅ API connected:', response.data);
  } catch (error) {
    console.error('❌ API error:', error);
  }
}
</script>
```

**Probar:**
1. Asegúrate de que el backend esté corriendo (`npm run dev` en backend/)
2. Inicia el frontend (`npm run dev` en frontend/)
3. Abre `http://localhost:5173`
4. Haz clic en "Test API Connection"
5. Deberías ver el status y número de ubicaciones

### ✅ Lo que aprendiste en Módulo 3:

- ✅ Crear proyecto Vue 3 con Vite
- ✅ Configurar proxy para evitar CORS
- ✅ Instalar ArcGIS Maps SDK y Calcite
- ✅ Crear servicio de API con Axios
- ✅ Usar interceptors para logging
- ✅ Probar conexión frontend-backend

---

## Módulo 4: ArcGIS Maps SDK - Mapa Base

### 📚 Teoría: ArcGIS Maps SDK for JavaScript

**¿Qué es ArcGIS Maps SDK?**

Es el SDK oficial de Esri para crear aplicaciones de mapas web. Versión 4.x (moderna):
- **2D y 3D**: MapView (2D) y SceneView (3D)
- **Widgets**: Componentes UI listos para usar
- **Layers**: Soporte para múltiples tipos de capas
- **Analysis**: Herramientas de análisis espacial
- **Calcite**: Sistema de diseño integrado

**Conceptos clave evaluados en el examen:**

| Concepto | Descripción | Peso en Examen |
|----------|-------------|----------------|
| **MapView** | Vista 2D del mapa | UI/UX 14% |
| **SceneView** | Vista 3D del mapa | UI/UX 14% |
| **Basemap** | Mapa de fondo | Visualization 32% |
| **View.UI** | Layout de widgets | UI/UX 14% |
| **Widgets** | Componentes interactivos | Programming Patterns 31% |
| **Layers** | Capas de datos | Visualization 32% |

**Arquitectura básica:**

```
Map (modelo de datos)
  └── Basemap (mapa de fondo)
  └── Layers (capas de datos)

MapView (vista 2D)
  └── Map
  └── UI (widgets)
  └── Popup
```

**Diferencia entre Map y View:**
- **Map**: Contiene los datos (basemap, layers)
- **View**: Renderiza el mapa en el DOM (MapView 2D o SceneView 3D)

### 🛠️ Práctica: Crear Mapa Base

#### Paso 1: Configurar CSS de ArcGIS

**Archivo: `frontend/src/main.js`**

```javascript
import { createApp } from 'vue'
import App from './App.vue'

// Importar CSS de ArcGIS Maps SDK
import '@arcgis/core/assets/esri/themes/light/main.css'

// Importar CSS de Calcite
import '@esri/calcite-components/dist/calcite/calcite.css'

// Definir custom elements de Calcite
import { defineCustomElements } from '@esri/calcite-components/dist/loader'
defineCustomElements(window)

createApp(App).mount('#app')
```

#### Paso 2: Crear componente MapView

**Archivo: `frontend/src/components/MapView.vue`**

```vue
<template>
  <div class="map-container">
    <div ref="mapDiv" class="map-view"></div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import Map from '@arcgis/core/Map'
import MapView from '@arcgis/core/views/MapView'

// Widgets
import Zoom from '@arcgis/core/widgets/Zoom'
import Compass from '@arcgis/core/widgets/Compass'
import ScaleBar from '@arcgis/core/widgets/ScaleBar'
import Locate from '@arcgis/core/widgets/Locate'

const mapDiv = ref(null)
let view = null

onMounted(async () => {
  // Crear mapa con basemap
  const map = new Map({
    basemap: 'topo-vector'  // Topographic basemap
  })

  // Crear vista 2D centrada en Middle Earth (Europa)
  view = new MapView({
    container: mapDiv.value,
    map: map,
    center: [14.5, 42.8],  // [longitud, latitud] - Minas Tirith
    zoom: 6,
    constraints: {
      minZoom: 4,
      maxZoom: 18
    },
    popup: {
      dockEnabled: true,
      dockOptions: {
        position: 'bottom-right',
        breakpoint: false
      }
    }
  })

  // Agregar widgets
  const zoom = new Zoom({ view })
  view.ui.add(zoom, 'top-left')

  const compass = new Compass({ view })
  view.ui.add(compass, 'top-left')

  const scaleBar = new ScaleBar({
    view,
    unit: 'metric'
  })
  view.ui.add(scaleBar, 'bottom-left')

  const locate = new Locate({ view })
  view.ui.add(locate, 'top-left')

  // Log cuando el mapa esté listo
  await view.when()
  console.log('✅ MapView ready')
  console.log('Center:', view.center.longitude, view.center.latitude)
  console.log('Zoom:', view.zoom)
})

onUnmounted(() => {
  if (view) {
    view.destroy()
  }
})
</script>

<style scoped>
.map-container {
  width: 100%;
  height: 100vh;
  position: relative;
}

.map-view {
  width: 100%;
  height: 100%;
}
</style>
```

**¿Qué aprendes aquí? (Evaluado en examen)**

- ✅ **MapView vs SceneView**: MapView para 2D (UI/UX 14%)
- ✅ **Basemap**: Configurar mapa de fondo (Visualization 32%)
- ✅ **center y zoom**: Navegación programática (UI/UX 14%)
- ✅ **constraints**: Límites de zoom (UI/UX 14%)
- ✅ **View.UI**: Agregar widgets con `view.ui.add()` (UI/UX 14%)
- ✅ **Widgets**: Zoom, Compass, ScaleBar, Locate (Programming Patterns 31%)
- ✅ **Lifecycle**: onMounted, onUnmounted (Programming Patterns 31%)
- ✅ **view.when()**: Async/await pattern (Programming Patterns 31%)

#### Paso 3: Integrar en App.vue

**Archivo: `frontend/src/App.vue`**

```vue
<template>
  <div id="app">
    <MapView />
  </div>
</template>

<script setup>
import MapView from '@/components/MapView.vue'
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

#app {
  width: 100%;
  height: 100vh;
  font-family: Avenir, Helvetica, Arial, sans-serif;
}
</style>
```

#### Paso 4: Probar el mapa

```bash
# Asegúrate de que el backend esté corriendo
cd backend
npm run dev

# En otra terminal, inicia el frontend
cd frontend
npm run dev
```

Abre `http://localhost:5173/` y deberías ver:
- ✅ Mapa topográfico centrado en Europa (aprox. Minas Tirith)
- ✅ Controles de zoom (+ -)
- ✅ Brújula
- ✅ Barra de escala
- ✅ Botón de geolocalización

### ✅ Lo que aprendiste en Módulo 4:

- ✅ Integrar ArcGIS Maps SDK en Vue 3
- ✅ Crear Map y MapView (evaluado en examen)
- ✅ Configurar basemap (evaluado en examen)
- ✅ Establecer centro y zoom (evaluado en examen)
- ✅ Agregar widgets con View.UI (evaluado en examen)
- ✅ Usar async/await con view.when() (evaluado en examen)
- ✅ Limpiar recursos con onUnmounted

---

## Módulo 5: Conectar Frontend con Backend

### 📚 Teoría: Composables en Vue 3

**¿Qué es un Composable?**

Un composable es una función que encapsula lógica reutilizable usando Composition API:
- Prefijo `use` por convención (ej: `useMapData`)
- Retorna estado reactivo y funciones
- Puede ser usado en múltiples componentes
- Similar a React Hooks

**Ejemplo básico:**

```javascript
// composables/useCounter.js
import { ref } from 'vue'

export function useCounter() {
  const count = ref(0)
  const increment = () => count.value++
  
  return { count, increment }
}

// En componente:
const { count, increment } = useCounter()
```

### 🛠️ Práctica: Cargar Datos del Backend

#### Paso 1: Crear composable para datos del mapa

**Archivo: `frontend/src/composables/useMapData.js`**

```javascript
import { ref } from 'vue'
import { getLocations, getRegions } from '@/services/api'

export function useMapData() {
  const locations = ref(null)
  const regions = ref(null)
  const loading = ref(false)
  const error = ref(null)

  async function loadLocations() {
    loading.value = true
    error.value = null
    
    try {
      const response = await getLocations()
      locations.value = response.data
      console.log(`✅ Loaded ${response.data.features.length} locations`)
      return response.data
    } catch (err) {
      error.value = err.message
      console.error('❌ Error loading locations:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  async function loadRegions() {
    loading.value = true
    error.value = null
    
    try {
      const response = await getRegions()
      regions.value = response.data
      console.log(`✅ Loaded ${response.data.features.length} regions`)
      return response.data
    } catch (err) {
      error.value = err.message
      console.error('❌ Error loading regions:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  async function loadAll() {
    await Promise.all([
      loadLocations(),
      loadRegions()
    ])
  }

  return {
    locations,
    regions,
    loading,
    error,
    loadLocations,
    loadRegions,
    loadAll
  }
}
```

**¿Qué aprendes aquí? (Evaluado en examen)**

- ✅ **Async/await**: Pattern evaluado en Programming Patterns 31%
- ✅ **Estado reactivo**: ref() para datos reactivos
- ✅ **Error handling**: try/catch pattern
- ✅ **Promise.all**: Cargar múltiples recursos en paralelo

#### Paso 2: Actualizar MapView para cargar datos

**Archivo: `frontend/src/components/MapView.vue`**

```vue
<template>
  <div class="map-container">
    <div ref="mapDiv" class="map-view"></div>
    
    <!-- Loading indicator -->
    <div v-if="loading" class="loading-overlay">
      <calcite-loader scale="l" text="Loading map data..."></calcite-loader>
    </div>
    
    <!-- Error message -->
    <calcite-alert
      v-if="error"
      kind="danger"
      icon="exclamation-mark-triangle"
      open
      auto-close
      auto-close-duration="medium"
    >
      <div slot="title">Error</div>
      <div slot="message">{{ error }}</div>
    </calcite-alert>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import Map from '@arcgis/core/Map'
import MapView from '@arcgis/core/views/MapView'

// Widgets
import Zoom from '@arcgis/core/widgets/Zoom'
import Compass from '@arcgis/core/widgets/Compass'
import ScaleBar from '@arcgis/core/widgets/ScaleBar'
import Locate from '@arcgis/core/widgets/Locate'

// Composable
import { useMapData } from '@/composables/useMapData'

const mapDiv = ref(null)
let view = null

// Usar composable
const { locations, regions, loading, error, loadAll } = useMapData()

onMounted(async () => {
  // Crear mapa
  const map = new Map({
    basemap: 'topo-vector'
  })

  // Crear vista
  view = new MapView({
    container: mapDiv.value,
    map: map,
    center: [14.5, 42.8],
    zoom: 6,
    constraints: {
      minZoom: 4,
      maxZoom: 18
    }
  })

  // Agregar widgets
  view.ui.add(new Zoom({ view }), 'top-left')
  view.ui.add(new Compass({ view }), 'top-left')
  view.ui.add(new ScaleBar({ view, unit: 'metric' }), 'bottom-left')
  view.ui.add(new Locate({ view }), 'top-left')

  // Esperar a que el mapa esté listo
  await view.when()
  console.log('✅ MapView ready')

  // Cargar datos del backend
  try {
    await loadAll()
    console.log('✅ Data loaded:')
    console.log('  Locations:', locations.value?.features.length)
    console.log('  Regions:', regions.value?.features.length)
  } catch (err) {
    console.error('❌ Failed to load data:', err)
  }
})

onUnmounted(() => {
  if (view) {
    view.destroy()
  }
})
</script>

<style scoped>
.map-container {
  width: 100%;
  height: 100vh;
  position: relative;
}

.map-view {
  width: 100%;
  height: 100%;
}

.loading-overlay {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 1000;
  background: rgba(255, 255, 255, 0.9);
  padding: 2rem;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}
</style>
```

#### Paso 3: Verificar en consola

Abre las DevTools del navegador (F12) y deberías ver:

```
✅ MapView ready
📡 GET /api/locations
📡 GET /api/regions
✅ Response from /api/locations
✅ Response from /api/regions
✅ Loaded 206 locations
✅ Loaded 39 regions
✅ Data loaded:
  Locations: 206
  Regions: 39
```

### ✅ Lo que aprendiste en Módulo 5:

- ✅ Crear composables reutilizables
- ✅ Usar async/await (evaluado en examen)
- ✅ Cargar datos del backend
- ✅ Manejar loading y errores
- ✅ Integrar Calcite components (evaluado en examen)
- ✅ Promise.all para cargas paralelas

---

## Testing y Validación

### Checklist de Verificación

**Backend:**
- [ ] Servidor corriendo en `http://localhost:5000`
- [ ] Health check responde: `curl http://localhost:5000/api/health`
- [ ] Locations endpoint devuelve 206 features: `curl http://localhost:5000/api/locations | jq '.features | length'`
- [ ] Regions endpoint devuelve 39 features: `curl http://localhost:5000/api/regions | jq '.features | length'`
- [ ] GeoJSON válido (type: FeatureCollection)

**Frontend:**
- [ ] App corriendo en `http://localhost:5173`
- [ ] Mapa se visualiza correctamente
- [ ] Widgets funcionan (zoom, compass, scale, locate)
- [ ] Datos se cargan desde backend (ver consola)
- [ ] No hay errores en consola del navegador
- [ ] Calcite components se renderizan

**Integración:**
- [ ] Frontend puede hacer peticiones al backend
- [ ] CORS configurado correctamente
- [ ] Proxy de Vite funciona
- [ ] Loading indicator aparece durante carga
- [ ] Mensajes de error se muestran si falla

### Troubleshooting Común

**Error: "Cannot GET /api/locations"**
- ✅ Verifica que el backend esté corriendo
- ✅ Verifica la URL del proxy en `vite.config.js`
- ✅ Verifica que las rutas estén registradas en `server.js`

**Error: "CORS policy"**
- ✅ Verifica CORS_ORIGIN en `.env`
- ✅ Verifica configuración de cors() en `server.js`
- ✅ Usa el proxy de Vite en lugar de llamadas directas

**Error: "Module not found: @arcgis/core"**
- ✅ Ejecuta `npm install @arcgis/core` en frontend/
- ✅ Reinicia el dev server

**Mapa no se visualiza:**
- ✅ Verifica que el CSS de ArcGIS esté importado en `main.js`
- ✅ Verifica que el contenedor tenga altura (`height: 100vh`)
- ✅ Abre DevTools y busca errores en consola

**Datos no se cargan:**
- ✅ Verifica que el backend tenga datos en PostgreSQL
- ✅ Verifica las queries SQL en las rutas
- ✅ Revisa la consola del navegador para errores de red

---

## Comandos de Referencia

### Backend:

```bash
# Iniciar servidor de desarrollo
cd backend
npm run dev

# Probar endpoints
curl http://localhost:5000/api/health
curl http://localhost:5000/api/locations
curl http://localhost:5000/api/regions

# Ver logs
# Los logs aparecen en la terminal donde corre npm run dev
```

### Frontend:

```bash
# Iniciar dev server
cd frontend
npm run dev

# Build para producción
npm run build

# Preview de build
npm run preview
```

### PostgreSQL:

```bash
# Conectar a base de datos
psql -U postgres -d middle_earth

# Contar ubicaciones
SELECT COUNT(*) FROM locations;

# Ver tipos de ubicaciones
SELECT location_type, COUNT(*) 
FROM locations 
GROUP BY location_type;

# Ver regiones
SELECT name FROM regions;
```

---

## Próximos Pasos

### FASE 2: Funcionalidades del Examen

**Módulo 6: Capas y Renderers** (Visualization 32%)
- Agregar FeatureLayer desde GeoJSON
- Configurar SimpleRenderer
- Configurar UniqueValueRenderer por tipo
- Símbolos personalizados

**Módulo 7: Popups** (Programming Patterns 31%)
- Configurar PopupTemplate
- Acciones personalizadas
- Contenido dinámico

**Módulo 8: Widgets** (Programming Patterns 31%)
- LayerList widget
- BasemapGallery widget
- Search widget
- Legend widget

**Módulo 9: Queries y Filtros** (Analysis 23%)
- Query por atributos
- Query espacial
- FeatureFilter
- Diferencia entre Layer.query() y LayerView.query()

**Módulo 10: Edición** (Visualization 32%)
- Editor widget
- FeatureForm
- Crear, editar, eliminar features

### Recursos para el Examen

**Documentación oficial:**
- https://developers.arcgis.com/javascript/latest/
- https://developers.arcgis.com/javascript/latest/api-reference/

**Esri Academy:**
- ArcGIS Maps SDK for JavaScript Associate Learning Plan
- https://www.esri.com/training/

**Práctica:**
- Sandbox: https://developers.arcgis.com/javascript/latest/sample-code/
- Tutoriales: https://developers.arcgis.com/javascript/latest/tutorials/

---

## 🎉 Resumen de FASE 1

### ✅ Completado:

**Backend:**
- ✅ Servidor Express configurado
- ✅ REST API con endpoints `/api/locations` y `/api/regions`
- ✅ Consultas PostGIS con ST_AsGeoJSON()
- ✅ GeoJSON válido como respuesta
- ✅ Health check endpoint
- ✅ Manejo de errores

**Frontend:**
- ✅ Proyecto Vue 3 con Vite
- ✅ ArcGIS Maps SDK integrado
- ✅ Mapa base interactivo (MapView)
- ✅ Widgets (Zoom, Compass, ScaleBar, Locate)
- ✅ Calcite Design System
- ✅ Composable para cargar datos
- ✅ Conexión con backend funcionando

**Skills del Examen Cubiertos:**
- ✅ UI/UX (14%): View.UI, Calcite, navegación 2D
- ✅ Programming Patterns (31%): Async/await, composables, event handling
- ✅ Visualization (32%): Basemap, MapView básico

### 🔜 Próxima Fase:

FASE 2 cubrirá las funcionalidades restantes evaluadas en el examen:
- Layers y Renderers
- Popups
- Widgets avanzados
- Queries y filtros
- Edición de features

---

**¡Felicitaciones!** Has completado FASE 1 y tienes una base sólida para el examen de certificación ArcGIS Maps SDK for JavaScript Associate 2024.
