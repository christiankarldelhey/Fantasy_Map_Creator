<template>
  <div class="map-container">
    <div ref="mapDiv" class="map-view"></div>
    
    <!-- Loading indicator -->
    <div v-if="loading" class="loading-overlay">
      <div class="loading-content">
        <div class="spinner"></div>
        <p>Loading map data...</p>
      </div>
    </div>
    
    <!-- Error message -->
    <div v-if="error" class="error-message">
      <strong>Error: </strong>
      <span>{{ error }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import Map from '@arcgis/core/Map'
import MapView from '@arcgis/core/views/MapView'
import WebTileLayer from '@arcgis/core/layers/WebTileLayer'
import Basemap from '@arcgis/core/Basemap'

// Widgets
import Zoom from '@arcgis/core/widgets/Zoom'
import Compass from '@arcgis/core/widgets/Compass'
import ScaleBar from '@arcgis/core/widgets/ScaleBar'
import Locate from '@arcgis/core/widgets/Locate'

// Composable
import { useMapData } from '@/composables/useMapData'

const mapDiv = ref<HTMLDivElement | null>(null)
let view: MapView | null = null

// Usar composable
const { locations, regions, loading, error, loadAll } = useMapData()

// Configuración de Mapbox desde variables de entorno
const MAPBOX_ACCESS_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN
const MAPBOX_STYLE_ID = import.meta.env.VITE_MAPBOX_STYLE_ID

onMounted(async () => {
  if (!mapDiv.value) return

  // Crear capa de tiles de Mapbox
  const mapboxLayer = new WebTileLayer({
    urlTemplate: `https://api.mapbox.com/styles/v1/${MAPBOX_STYLE_ID}/tiles/256/{z}/{x}/{y}@2x?access_token=${MAPBOX_ACCESS_TOKEN}`,
    copyright: 'Mapbox, OpenStreetMap'
  })

  // Crear basemap con la capa de Mapbox
  const customBasemap = new Basemap({
    baseLayers: [mapboxLayer],
    title: 'Middle Earth',
    id: 'middle-earth-basemap'
  })

  // Crear mapa
  const map = new Map({
    basemap: customBasemap
  })

  // Crear vista 2D centrada en Middle Earth
  view = new MapView({
    container: mapDiv.value,
    map: map,
    center: [6.432063, 47.021704], // Centro de Tierra Media
    zoom: 4.5,
    constraints: {
      minZoom: 3,
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
  view.ui.add(new Zoom({ view }), 'top-left')
  view.ui.add(new Compass({ view }), 'top-left')
  view.ui.add(new ScaleBar({ view, unit: 'metric' }), 'bottom-left')
  view.ui.add(new Locate({ view }), 'top-left')

  // Esperar a que el mapa esté listo
  await view.when()
  console.log('✅ MapView ready')
  console.log('Center:', view.center.longitude, view.center.latitude)
  console.log('Zoom:', view.zoom)

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
  background: rgba(255, 255, 255, 0.95);
  padding: 2rem;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.loading-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.spinner {
  width: 48px;
  height: 48px;
  border: 3px solid #e5e7eb;
  border-top-color: #2563eb;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.loading-content p {
  color: #374151;
  font-weight: 500;
  margin: 0;
}

.error-message {
  position: absolute;
  top: 1rem;
  right: 1rem;
  z-index: 1000;
  background: #fee2e2;
  border: 1px solid #ef4444;
  color: #991b1b;
  padding: 1rem;
  border-radius: 6px;
  max-width: 400px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.error-message strong {
  font-weight: 700;
}
</style>
