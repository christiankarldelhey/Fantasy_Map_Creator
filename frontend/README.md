# Middle Earth Map - Frontend

An interactive fantasy map application for exploring Middle Earth, built with Vue 3, TypeScript, and MapLibre GL JS.

## Overview

This project maps key locations from The Lord of the Rings onto a fantasy map overlaid on Europe. It includes features for exploring locations, regions, and planning routes with medieval transportation methods.

## Technology Stack

- **Vue 3** with Composition API (`<script setup>`)
- **TypeScript** for type safety
- **MapLibre GL JS** for map rendering
- **Axios** for API communication
- **Tailwind CSS** for styling
- **Vite** for build tooling

## Architecture

This project uses **Feature-Sliced Design (FSD)**, a modern architectural methodology that promotes scalability and maintainability.

```
src/
├── app/          # Application initialization
├── pages/        # Route pages
├── widgets/      # Complex UI widgets
├── features/     # Business features
├── entities/     # Domain entities
└── shared/       # Shared code
```

See [docs/architecture.md](./docs/architecture.md) for detailed architecture documentation.

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Backend API running on `http://localhost:5000`

### Installation

```bash
npm install
```

### Environment Variables

Create a `.env` file in the frontend directory:

```env
VITE_MAPBOX_ACCESS_TOKEN=your_mapbox_token
VITE_MAPBOX_STYLE_ID=your_style_id
```

### Development

```bash
npm run dev
```

The application will be available at `http://localhost:5173`

### Build

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

## Features

### Current Features ✅

- **Interactive Map**: MapLibre-powered map with custom Middle Earth styling
- **Location Management**: Display and interact with locations (cities, landmarks, etc.)
- **Region Management**: Display and interact with regions (kingdoms, territories)
- **Map Bounds**: Restricted view to Middle Earth area (no black background)

### Planned Features 🚧

- **Distance Calculator**: Calculate distances between locations
- **Route Planner**: Plan routes with different medieval vehicles
- **Biome System**: Forest, mountain, plains, and other biomes
- **Elevation System**: Terrain elevation and hillshading
- **Climate System**: Temperature and precipitation patterns
- **Travel Estimator**: Realistic daily travel distance calculations

See [docs/features-roadmap.md](./docs/features-roadmap.md) for the complete roadmap.

## Project Structure

```
frontend/
├── docs/                    # Documentation
│   ├── architecture.md     # Architecture details
│   └── features-roadmap.md # Feature roadmap
├── src/
│   ├── app/                # App initialization
│   ├── pages/              # Page components
│   ├── widgets/            # Widget components
│   ├── features/           # Business features
│   ├── entities/           # Domain entities
│   └── shared/             # Shared utilities
├── package.json
├── vite.config.ts
└── tsconfig.json
```

## Development Guidelines

### Adding a New Feature

1. Create feature directory: `src/features/my-feature/`
2. Add model layer: `model/useMyFeature.ts`
3. Add UI layer: `ui/MyFeatureComponent.vue`
4. Export public API: `index.ts`

### Import Rules

Follow FSD import rules:
- Features can import from: entities, shared
- Entities can import from: shared
- Shared cannot import from other layers

### Code Style

- Use Vue 3 Composition API with `<script setup>`
- Use TypeScript for all code
- Follow existing naming conventions
- Use path aliases (`@/features`, `@/entities`, etc.)

## API Integration

The frontend communicates with a backend API at `/api`:

- `GET /api/locations` - Get all locations
- `GET /api/regions` - Get all regions
- `GET /api/health` - Health check

## Contributing

1. Follow the FSD architecture
2. Write TypeScript with proper types
3. Use Vue 3 Composition API
4. Test your changes locally
5. Update documentation as needed

## License

[Add your license here]
