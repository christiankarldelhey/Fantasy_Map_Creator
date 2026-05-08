# Frontend Architecture

## Overview
This project uses **Feature-Sliced Design (FSD)**, a modern architectural methodology for frontend applications that promotes scalability, maintainability, and clear separation of concerns.

## FSD Structure

```
src/
├── app/                    # Application initialization layer
│   ├── providers/         # Global providers (future: router, store, etc.)
│   └── styles/           # Global styles
├── pages/                 # Pages/Routes layer
│   └── map/              # Main map page
├── widgets/              # Complex UI blocks (widgets)
│   └── map-viewer/       # Interactive map widget
├── features/             # Business features
│   ├── location-management/    # Location CRUD operations
│   ├── region-management/      # Region CRUD operations
│   ├── distance-calculator/    # Calculate distances (planned)
│   ├── route-planner/          # Plan routes (planned)
│   ├── biome-system/           # Biome management (planned)
│   ├── elevation-system/       # Elevation data (planned)
│   ├── climate-system/         # Climate simulation (planned)
│   └── travel-estimator/       # Travel time estimation (planned)
├── entities/             # Business entities
│   ├── location/         # Location entity (model + API)
│   ├── region/           # Region entity (model + API)
│   └── map/              # Map entity (future)
└── shared/               # Reusable code
    ├── api/              # API client configuration
    ├── config/           # App configuration (MapLibre, etc.)
    ├── lib/              # Utility functions
    ├── types/            # Shared TypeScript types
    └── ui/               # Reusable UI components (future)
```

## Layer Responsibilities

### 1. App Layer
- Application initialization
- Global providers and configuration
- Global styles
- Entry point (`main.ts`)

### 2. Pages Layer
- Route components
- Page composition from widgets and features
- Page-level layout

### 3. Widgets Layer
- Complex, self-contained UI blocks
- Composed from features and entities
- Example: MapViewer (map display + interactions)

### 4. Features Layer
- Business logic features
- User-facing functionality
- Can use entities and shared code
- Examples: location-management, route-planner

### 5. Entities Layer
- Business domain models
- Data structures and types
- API interactions for specific entities
- Examples: location, region, map

### 6. Shared Layer
- Reusable utilities
- Common types
- API client
- Configuration
- UI components used across features

## Import Rules

FSD enforces strict import rules to maintain architecture integrity:

- **App** can import from: pages, widgets, features, entities, shared
- **Pages** can import from: widgets, features, entities, shared
- **Widgets** can import from: features, entities, shared
- **Features** can import from: entities, shared
- **Entities** can import from: shared
- **Shared** cannot import from any other layer

## Technology Stack

- **Vue 3** with Composition API (`<script setup>`)
- **TypeScript** for type safety
- **MapLibre GL JS** for map rendering
- **Axios** for API calls
- **Tailwind CSS** for styling
- **Vite** for build tooling

## Path Aliases

The project uses TypeScript path aliases for clean imports:

```typescript
import { MapViewer } from '@/widgets/map-viewer'
import { useLocationData } from '@/features/location-management'
import { getLocations } from '@/entities/location'
import api from '@/shared/api/client'
import { MAPLIBRE_CONFIG } from '@/shared/config/maplibre'
```

## Adding New Features

To add a new feature:

1. Create feature directory: `src/features/my-feature/`
2. Add model layer: `model/useMyFeature.ts` (composables)
3. Add UI layer: `ui/MyFeatureComponent.vue` (components)
4. Export public API: `index.ts`
5. Use in widgets or pages

Example structure:
```
src/features/my-feature/
├── model/
│   └── useMyFeature.ts
├── ui/
│   └── MyFeatureComponent.vue
└── index.ts
```

## Best Practices

1. **Keep features isolated** - Features should not depend on other features
2. **Use composables** - Extract logic into reusable composables
3. **Type everything** - Use TypeScript for all code
4. **Follow Vue 3 patterns** - Use Composition API with `<script setup>`
5. **Public API exports** - Each layer exposes a public API via `index.ts`
6. **Single responsibility** - Each module should have one clear purpose

## Migration Notes

This project was migrated from:
- **ArcGIS JS API** → **MapLibre GL JS**
- **Flat structure** → **FSD architecture**

The migration maintains all existing functionality while preparing for future features.
