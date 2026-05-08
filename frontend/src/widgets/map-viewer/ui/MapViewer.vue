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
import { useRegionData } from '@/features/region-management'
import type { LocationCollection } from '@/entities/location'
import type { RegionCollection } from '@/entities/region'

const mapContainer = ref<HTMLDivElement | null>(null)
let map: maplibregl.Map | null = null

const { locations, loading: locationsLoading, error: locationsError, loadLocations } = useLocationData()
const { regions, loading: regionsLoading, error: regionsError, loadRegions } = useRegionData()

const loading = ref(false)
const error = ref<string | null>(null)

function addLocationsLayer(data: LocationCollection) {
  if (!map) return

  if (map.getSource('locations')) {
    (map.getSource('locations') as maplibregl.GeoJSONSource).setData(data as any)
  } else {
    map.addSource('locations', {
      type: 'geojson',
      data: data as any
    })

    map.addLayer({
      id: 'locations',
      type: 'circle',
      source: 'locations',
      paint: {
        'circle-radius': 6,
        'circle-color': '#3b82f6',
        'circle-stroke-width': 2,
        'circle-stroke-color': '#ffffff'
      }
    })

    map.on('click', 'locations', (e) => {
      if (!e.features || e.features.length === 0) return
      
      const feature = e.features[0]
      const coordinates = (feature.geometry as any).coordinates.slice()
      const properties = feature.properties

      new maplibregl.Popup()
        .setLngLat(coordinates)
        .setHTML(`
          <div class="p-2">
            <h3 class="font-bold text-lg">${properties?.name || 'Unknown'}</h3>
            ${properties?.type ? `<p class="text-sm text-gray-600">Type: ${properties.type}</p>` : ''}
            ${properties?.region ? `<p class="text-sm text-gray-600">Region: ${properties.region}</p>` : ''}
            ${properties?.description ? `<p class="text-sm mt-2">${properties.description}</p>` : ''}
          </div>
        `)
        .addTo(map!)
    })

    map.on('mouseenter', 'locations', () => {
      if (map) map.getCanvas().style.cursor = 'pointer'
    })

    map.on('mouseleave', 'locations', () => {
      if (map) map.getCanvas().style.cursor = ''
    })
  }
}

function addRegionsLayer(data: RegionCollection) {
  if (!map) return

  if (map.getSource('regions')) {
    (map.getSource('regions') as maplibregl.GeoJSONSource).setData(data as any)
  } else {
    map.addSource('regions', {
      type: 'geojson',
      data: data as any
    })

    map.addLayer({
      id: 'regions-fill',
      type: 'fill',
      source: 'regions',
      paint: {
        'fill-color': '#10b981',
        'fill-opacity': 0.2
      }
    })

    map.addLayer({
      id: 'regions-outline',
      type: 'line',
      source: 'regions',
      paint: {
        'line-color': '#059669',
        'line-width': 2
      }
    })

    map.on('click', 'regions-fill', (e) => {
      if (!e.features || e.features.length === 0) return
      
      const feature = e.features[0]
      const properties = feature.properties

      new maplibregl.Popup()
        .setLngLat(e.lngLat)
        .setHTML(`
          <div class="p-2">
            <h3 class="font-bold text-lg">${properties?.name || 'Unknown Region'}</h3>
            ${properties?.type ? `<p class="text-sm text-gray-600">Type: ${properties.type}</p>` : ''}
            ${properties?.description ? `<p class="text-sm mt-2">${properties.description}</p>` : ''}
          </div>
        `)
        .addTo(map!)
    })

    map.on('mouseenter', 'regions-fill', () => {
      if (map) map.getCanvas().style.cursor = 'pointer'
    })

    map.on('mouseleave', 'regions-fill', () => {
      if (map) map.getCanvas().style.cursor = ''
    })
  }
}

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
        await Promise.all([loadLocations(), loadRegions()])
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
  if (newLocations && map) {
    addLocationsLayer(newLocations)
  }
})

watch(regions, (newRegions) => {
  if (newRegions && map) {
    addRegionsLayer(newRegions)
  }
})

watch([locationsLoading, regionsLoading], ([locLoad, regLoad]) => {
  loading.value = locLoad || regLoad
})

watch([locationsError, regionsError], ([locErr, regErr]) => {
  error.value = locErr || regErr
})

onUnmounted(() => {
  if (map) {
    map.remove()
  }
})
</script>
