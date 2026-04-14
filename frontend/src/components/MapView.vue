<template>
  <div class="relative w-full h-screen" style="background: #f0f0f0;">
    <div ref="mapDiv" class="w-full h-full" style="min-height: 100vh;"></div>
    
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
  console.log('🚀 onMounted called')
  
  if (!mapDiv.value) {
    console.error('❌ mapDiv.value is null')
    return
  }
  
  console.log('✅ mapDiv exists')

  try {
    // Crear capa de tiles de Mapbox
    console.log('📍 Creating WebTileLayer...')
    const mapboxLayer = new WebTileLayer({
      urlTemplate: MAPBOX_CONFIG.getTileUrl(),
      copyright: MAPBOX_CONFIG.copyright
    })
    console.log('✅ WebTileLayer created')

    // Crear basemap personalizado
    console.log('🗺️ Creating Basemap...')
    const customBasemap = new Basemap({
      baseLayers: [mapboxLayer],
      title: 'Middle Earth',
      id: 'middle-earth-basemap'
    })
    console.log('✅ Basemap created')

    // Crear mapa
    console.log('🌍 Creating Map...')
    const map = new Map({
      basemap: customBasemap
    })
    console.log('✅ Map created')

    // Crear vista del mapa
    console.log('👁️ Creating MapView...')
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
    console.log('✅ MapView created')

    // Escuchar errores de tiles
    mapboxLayer.on('layerview-create-error', (event: any) => {
      console.error('❌ LayerView create error:', event.error)
    })

    // No esperar a view.when() - dejar que el mapa se cargue de forma asíncrona
    view.when().then(() => {
      console.log('✅ MapView ready')
      console.log('Center:', view.center.longitude, view.center.latitude)
      console.log('Zoom:', view.zoom)
    }).catch((err) => {
      console.error('❌ MapView initialization error:', err)
    })

    // Cargar datos del backend
    try {
      await loadAll()
      console.log('✅ Data loaded:')
      console.log('  Locations:', locations.value?.features.length)
      console.log('  Regions:', regions.value?.features.length)
    } catch (err) {
      console.error('❌ Failed to load data:', err)
    }
  } catch (error) {
    console.error('❌ Error initializing map:', error)
  }
})

onUnmounted(() => {
  if (view) {
    view.destroy()
  }
})
</script>
