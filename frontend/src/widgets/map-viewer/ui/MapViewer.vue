<template>
  <div class="relative w-full h-screen bg-white">
    <div ref="mapContainer" class="w-full h-full" style="min-height: 100vh;"></div>
    
    <div 
      v-if="loading" 
      class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[1000] bg-white/95 p-8 rounded-lg shadow-lg"
    >
      <div class="flex flex-col items-center gap-4">
        <div class="w-12 h-12 border-3 border-gray-200 border-t-primary-600 rounded-full animate-spin"></div>
        <p class="text-gray-700 font-medium">Loading map data...</p>
      </div>
    </div>
    
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
import { ref, onMounted, onUnmounted, watch } from 'vue'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { MAPLIBRE_CONFIG } from '@/shared/config/maplibre'
import { useLocationData } from '@/features/location-management'
import { useBiomeData } from '@/features/biome-management'
import { useRegionData } from '@/features/region-management'
import { useRoadData } from '@/features/road-management'
import { useWaterData } from '@/features/water-management'
import { useAltitudeData } from '@/features/altitude-management'
import { useMapLayers } from '../model/useMapLayers'
import { useMapEvents } from '../model/useMapEvents'

const mapContainer = ref<HTMLDivElement | null>(null)
let map: maplibregl.Map | null = null

// Data composables
const { locations, loading: locationsLoading, error: locationsError, loadLocations } = useLocationData()
const { biomes, loading: biomesLoading, error: biomesError, loadBiomes } = useBiomeData()
const { altitude, loading: altitudeLoading, error: altitudeError, loadAltitude } = useAltitudeData()
const { regions, loading: regionsLoading, error: regionsError, loadRegions } = useRegionData()
const { roads, loading: roadsLoading, error: roadsError, loadRoads } = useRoadData()
const { water, loading: waterLoading, error: waterError, loadWater } = useWaterData()

// Map composables
const { initializeLayers, removeLayers, locationLayer, biomeLayer, regionLayer, roadLayer, waterLayer, altitudeLayer } = useMapLayers()
const { setupClickHandler } = useMapEvents()

const loading = ref(false)
const error = ref<string | null>(null)
const layersInitialized = ref(false)

onMounted(async () => {
  if (!mapContainer.value) return

  try {
    map = new maplibregl.Map({
      container: mapContainer.value,
      ...MAPLIBRE_CONFIG
    })

    map.addControl(new maplibregl.NavigationControl(), 'top-right')
    map.addControl(new maplibregl.ScaleControl(), 'bottom-left')

    map.on('load', async () => {
      console.log('✅ MapLibre ready')
      
      loading.value = true
      try {
        await Promise.all([
          loadLocations(),
          loadRegions(),
          loadBiomes(),
          loadAltitude(),
          loadRoads(),
          loadWater()
        ])

        // Inicializar todas las capas
        initializeLayers(map!, {
          regions: regions.value,
          biomes: biomes.value,
          water: water.value,
          roads: roads.value,
          locations: locations.value
        })

        // Configurar eventos
        setupClickHandler(map!)

        layersInitialized.value = true
      } catch (err) {
        console.error('Failed to load map data:', err)
        error.value = 'Failed to load map data'
      } finally {
        loading.value = false
      }
    })

    map.on('error', (e) => {
      console.error('MapLibre error:', e)
      error.value = 'Map initialization error'
    })
  } catch (err) {
    console.error('Error initializing map:', err)
    error.value = 'Failed to initialize map'
  }
})

watch(locations, (newLocations) => {
  if (newLocations && map && layersInitialized.value) {
    locationLayer.addLocationsLayer(map!, newLocations)
  }
})

watch(altitude, (newAltitude) => {
  if (newAltitude && map && layersInitialized.value) {
    altitudeLayer.addAltitudeLayer(map!, newAltitude)
  }
})

watch(biomes, (newBiomes) => {
  if (newBiomes && map && layersInitialized.value) {
    biomeLayer.addBiomesLayer(map!, newBiomes)
  }
})


watch(regions, (newRegions) => {
  if (newRegions && map && layersInitialized.value) {
    regionLayer.addRegionsLayer(map!, newRegions)
  }
})

watch(roads, (newRoads) => {
  if (newRoads && map && layersInitialized.value) {
    roadLayer.addRoadsLayer(map!, newRoads)
  }
})

watch(water, (newWater) => {
  if (newWater && map && layersInitialized.value) {
    waterLayer.addWaterLayer(map!, newWater)
  }
})

watch(
  [locationsLoading, regionsLoading, biomesLoading, altitudeLoading, roadsLoading, waterLoading],
  ([locLoad, regLoad, bioLoad, altLoad, roadLoad, waterLoad]) => {
    loading.value = locLoad || regLoad || bioLoad || altLoad || roadLoad || waterLoad
  }
)

watch(
  [locationsError, regionsError, biomesError, altitudeError, roadsError, waterError],
  ([locErr, regErr, bioErr, altErr, roadErr, waterErr]) => {
    error.value = locErr || regErr || bioErr || altErr || roadErr || waterErr
  }
)

onUnmounted(() => {
  if (map) {
    removeLayers(map)
    map.remove()
    map = null
  }
})
</script>
