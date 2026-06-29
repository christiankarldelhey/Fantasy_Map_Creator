# Middle Earth Database Seed Data System

Sistema completo para manejar datos maestros (seed data) de la base de datos Middle Earth.

## 📁 Estructura de Archivos

```
database/seeds/
├── data/
│   ├── csv/          # Datos tabulares (kingdoms, entities, etc.)
│   ├── geojson/      # Datos geoespaciales (regions, biomes, water)
│   └── sql/          # Datos complejos (locations, roads)
├── scripts/
│   ├── load-seeds.js        # Cargar todos los seeds
│   ├── validate-seeds.js    # Validar integridad de datos
│   ├── export-current-data.js # Exportar datos actuales
│   └── test-migrations.js   # Probar migraciones
├── migrations/           # Migraciones de seed data
└── README.md            # Este archivo
```

## 🚀 Comandos Disponibles

Desde el directorio `backend/`:

```bash
# Cargar todos los datos seed
npm run db:seed

# Validar integridad de los datos cargados
npm run db:seed:validate

# Exportar datos actuales de la base de datos a archivos seed
npm run db:seed:export
```

## 📊 Tablas Manejadas

### Datos Maestros (Seed Data)
- **kingdoms** (37 registros) - Reinos de Middle Earth
- **climate_zones** (87 registros) - Zonas climáticas
- **entities** (507 registros) - Criaturas, personajes, etc.
- **conversation_topics** (28 registros) - Tópicos de conversación
- **locations** (512 registros) - Ubicaciones con puntos geográficos
- **roads** (4,119 registros) - Caminos con líneas geográficas
- **regions** (87 registros) - Regiones con polígonos
- **biomes** (1,190 registros) - Biomas con polígonos
- **water** (792 registros) - Masas de agua con geometrías mixtas

### Datos de Usuario (No son seed data)
- **users** - Cuentas de usuario
- **character_state** - Estado de personajes activos
- **trips** - Viajes de usuarios
- **trip_days** - Días de viaje

## 🔧 Flujo de Trabajo

### 1. Exportar Datos Actuales
```bash
cd backend
npm run db:seed:export
```
Exporta los datos actuales de la base de datos a archivos seed.

### 2. Modificar Datos (si es necesario)
Editar los archivos en `database/seeds/data/` según necesites:
- **CSV**: Editar con Excel, Google Sheets, o editor de texto
- **GeoJSON**: Editar con QGIS, GeoJSON.io, o editor de texto
- **SQL**: Editar con editor de SQL o editor de texto

### 3. Validar Datos
```bash
npm run db:seed:validate
```
Verifica integridad de datos, geometrías válidas, y foreign keys.

### 4. Cargar Datos
```bash
npm run db:seed
```
Carga todos los datos seed en la base de datos.

## 🗺️ Manejo de Geometrías

### Formatos Soportados
- **Puntos**: WKT en CSV, GeoJSON, o SQL con `ST_GeomFromText()`
- **Líneas**: WKT en CSV, GeoJSON, o SQL con `ST_GeomFromText()`
- **Polígonos**: GeoJSON (recomendado) o SQL con `ST_GeomFromText()`

### SRID
Todas las geometrías usan **SRID 4326** (WGS84).

## ⚠️ Consideraciones Importantes

### Base de Datos vs CSV
- **SIEMPRE** consultar la base de datos real para datos de entities
- **NUNCA** usar los CSV en `data_public/` (están desactualizados)
- Los seed files se generan desde la base de datos real

### UUIDs y Arrays
- Los UUIDs vacíos se generan automáticamente
- Los arrays (como `biomes`) se manejan como PostgreSQL arrays
- Los timestamps vacíos usan la fecha actual

### Conflictos
- Las migraciones usan `ON CONFLICT DO UPDATE` para idempotencia
- Se pueden ejecutar múltiples veces sin problemas
- Los datos existentes se actualizan con los valores más recientes

## 🐛 Solución de Problemas

### Errores Comunes
1. **"invalid input syntax for type uuid"**
   - Solución: Los UUIDs vacíos se manejan automáticamente

2. **"column X is of type text[] but expression is of type text"**
   - Solución: Los arrays se convierten automáticamente

3. **"invalid input syntax for type timestamp"**
   - Solución: Los timestamps vacíos usan NOW()

### Debug
```bash
# Probar migraciones individuales
node database/seeds/scripts/test-migrations.js

# Ver reporte de validación
cat database/seeds/validation-report-*.txt
```

## 📝 Mantenimiento

### Actualizar Seed Data
1. Modifica los datos en la base de datos
2. Ejecuta `npm run db:seed:export`
3. Revisa los archivos generados
4. Ejecuta `npm run db:seed:validate`
5. Commit los cambios

### Agregar Nueva Tabla
1. Agrega la tabla a `export-current-data.js`
2. Crea migración en `migrations/`
3. Actualiza `load-seeds.js`
4. Actualiza `validate-seeds.js`
5. Prueba con `test-migrations.js`

## 🎯 Mejoras Futuras

- [ ] Automatizar exportación periódica
- [ ] Integrar con CI/CD
- [ ] Agregar más validaciones
- [ ] Soporte para datos de imágenes
- [ ] Sistema de versionado de seed data

---

**Creado:** 2026-06-29  
**Última actualización:** 2026-06-29  
**Versión:** 1.0.0
