<template>
  <div class="relative w-full h-screen">
    <div ref="mapDiv" class="w-full h-full"></div>
    
    <!-- Loading indicator -->
    <div 
      v-if="loading" 
      class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[1000] bg-white/95 p-8 rounded-lg shadow-lg"
    >
      <div class="flex flex-col items-center gap-4">
        <div class="w-12 h-12 border-3 border-gray-200 border-t-primary-600 rounded-full animate-spin"></div>
        <p class="text-gray-700 font-medium">Loading map data...</p>
      </div>
    </div>
    
    <!-- Error message -->
    <div 
      v-if="error" 
      class="absolute top-4 right-4 z-[1000] bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md max-w-md shadow-md"
    >
      <strong class="font-bold">Error: </strong>
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
import { useMapData } from '@/composables/useMapData'
import MAPBOX_CONFIG from '@/config/mapbox'

const mapDiv = ref<HTMLDivElement | null>(null)
let view: MapView | null = null

const { locations, regions, loading, error, loadAll } = useMapData()

onMounted(async () => {
  if (!mapDiv.value) return

  try {
    // Crear capa de tiles de Mapbox
    const mapboxLayer = new WebTileLayer({
      urlTemplate: MAPBOX_CONFIG.getTileUrl(),
      copyright: MAPBOX_CONFIG.copyright
    })

    // Crear basemap personalizado
    const customBasemap = new Basemap({
      baseLayers: [mapboxLayer],
      title: 'Middle Earth',
      id: 'middle-earth-basemap'
    })

    // Crear mapa
    const map = new Map({
      basemap: customBasemap
    })

    // Crear vista del mapa
    view = new MapView({
      container: mapDiv.value,
      map: map,
      center: MAPBOX_CONFIG.defaultCenter,
      zoom: MAPBOX_CONFIG.defaultZoom,
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

    // Cargar datos del backend cuando el mapa esté listo
    view.when().then(async () => {
      try {
        await loadAll()
      } catch (err) {
        console.error('Failed to load map data:', err)
      }
    })
  } catch (error) {
    console.error('Error initializing map:', error)
  }
})

onUnmounted(() => {
  if (view) {
    view.destroy()
  }
})
</script>
