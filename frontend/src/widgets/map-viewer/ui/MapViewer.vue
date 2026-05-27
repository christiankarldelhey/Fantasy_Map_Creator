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
import { usePathData } from '@/features/path-management'
import { getElevation } from '@/entities/altitude'
import type { LocationCollection } from '@/entities/location'
import type { BiomeCollection } from '@/entities/biome'
import type { RegionCollection } from '@/entities/region'
import type { PathCollection } from '@/entities/path'

const mapContainer = ref<HTMLDivElement | null>(null)
let map: maplibregl.Map | null = null

const { locations, loading: locationsLoading, error: locationsError, loadLocations } = useLocationData()
const { biomes, loading: biomesLoading, error: biomesError, loadBiomes } = useBiomeData()
const { regions, loading: regionsLoading, error: regionsError, loadRegions } = useRegionData()
const { paths, loading: pathsLoading, error: pathsError, loadPaths } = usePathData()

const loading = ref(false)
const error = ref<string | null>(null)
const layersInitialized = ref(false)

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
        'circle-color': '#e11d48', // beautiful rose red for locations
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
          <div class="p-2 min-w-[200px]">
            <h3 class="font-bold text-lg border-b border-gray-100 pb-1 text-gray-900">${properties?.name || 'Unknown'}</h3>
            ${properties?.type ? `<p class="text-sm text-rose-600 font-semibold mt-1">Type: ${properties.type}</p>` : ''}
            ${properties?.region ? `<p class="text-xs text-gray-500">Region: ${properties.region}</p>` : ''}
            ${properties?.description ? `<p class="text-sm mt-2 text-gray-700 leading-relaxed">${properties.description}</p>` : ''}
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


function addBiomesLayer(data: BiomeCollection) {
  if (!map) return

  if (map.getSource('biomes')) {
    (map.getSource('biomes') as maplibregl.GeoJSONSource).setData(data as any)
  } else {
    map.addSource('biomes', {
      type: 'geojson',
      data: data as any
    })

    map.addLayer({
      id: 'biomes-fill',
      type: 'fill',
      source: 'biomes',
      paint: {
        'fill-color': [
          'match',
          ['get', 'type'],
          'forest', '#166534',
          'desert', '#fef08a',
          'marsh', '#14532d',
          'lake', '#3b82f6',
          '#22c55e'
        ],
        'fill-opacity': [
          'match',
          ['get', 'type'],
          'lake', 0.7,
          'forest', 0.25,
          'desert', 0.35,
          'marsh', 0.35,
          0.2
        ]
      }
    })

    map.addLayer({
      id: 'biomes-outline',
      type: 'line',
      source: 'biomes',
      paint: {
        'line-color': [
          'match',
          ['get', 'type'],
          'forest', '#14532d',
          'desert', '#ca8a04',
          'marsh', '#052e16',
          'lake', '#1d4ed8',
          '#16a34a'
        ],
        'line-width': [
          'match',
          ['get', 'type'],
          'lake', 1.5,
          1.0
        ]
      }
    })

    map.on('click', 'biomes-fill', (e) => {
      if (!e.features || e.features.length === 0) return
      
      const feature = e.features[0]
      const properties = feature.properties

      new maplibregl.Popup()
        .setLngLat(e.lngLat)
        .setHTML(`
          <div class="p-2 min-w-[200px]">
            <h3 class="font-bold text-lg border-b border-gray-100 pb-1 text-gray-900">${properties?.name || 'Unknown Feature'}</h3>
            ${properties?.type ? `<p class="text-sm text-emerald-600 font-semibold mt-1">Category: ${properties.type.replace('_', ' ')}</p>` : ''}
            ${properties?.area_km2 ? `<p class="text-xs text-gray-500">Calculated Area: ${Math.round(properties.area_km2).toLocaleString()} km²</p>` : ''}
            ${properties?.description ? `<p class="text-sm mt-2 text-gray-700 leading-relaxed">${properties.description}</p>` : ''}
          </div>
        `)
        .addTo(map!)
    })

    map.on('mouseenter', 'biomes-fill', () => {
      if (map) map.getCanvas().style.cursor = 'pointer'
    })

    map.on('mouseleave', 'biomes-fill', () => {
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
        'fill-color': '#0d9488', // Teal for political realms
        'fill-opacity': 0.08
      }
    })

    map.addLayer({
      id: 'regions-outline',
      type: 'line',
      source: 'regions',
      paint: {
        'line-color': '#0d9488',
        'line-width': 1.5,
        'line-dasharray': [4, 4] // Dashed boundary for realms
      }
    })

    map.on('click', 'regions-fill', async (e) => {
      if (!e.features || e.features.length === 0) return
      
      const feature = e.features[0]
      const properties = feature.properties
      const { lng, lat } = e.lngLat

      let elevationHTML = '<p class="text-xs text-gray-500 mt-1">Elevation: Loading...</p>'
      
      const popup = new maplibregl.Popup()
        .setLngLat(e.lngLat)
        .setHTML(`
          <div class="p-2 min-w-[200px]">
            <h3 class="font-bold text-lg border-b border-gray-100 pb-1 text-gray-900">${properties?.name || 'Unknown Realm'}</h3>
            <p class="text-sm text-teal-600 font-semibold mt-1">Political Region / Province</p>
            ${elevationHTML}
            ${properties?.description ? `<p class="text-sm mt-2 text-gray-700 leading-relaxed">${properties.description}</p>` : ''}
          </div>
        `)
        .addTo(map!)

      try {
        const response = await getElevation(lng, lat)
        const elevation = Math.round(response.data.elevation)
        popup.setHTML(`
          <div class="p-2 min-w-[200px]">
            <h3 class="font-bold text-lg border-b border-gray-100 pb-1 text-gray-900">${properties?.name || 'Unknown Realm'}</h3>
            <p class="text-sm text-teal-600 font-semibold mt-1">Political Region / Province</p>
            <p class="text-xs text-gray-500 mt-1">Elevation: <span class="font-semibold">${elevation} meters</span></p>
            ${properties?.description ? `<p class="text-sm mt-2 text-gray-700 leading-relaxed">${properties.description}</p>` : ''}
          </div>
        `)
      } catch (err) {
        console.error('Failed to load elevation:', err)
        popup.setHTML(`
          <div class="p-2 min-w-[200px]">
            <h3 class="font-bold text-lg border-b border-gray-100 pb-1 text-gray-900">${properties?.name || 'Unknown Realm'}</h3>
            <p class="text-sm text-teal-600 font-semibold mt-1">Political Region / Province</p>
            <p class="text-xs text-red-500 mt-1">Elevation: N/A</p>
            ${properties?.description ? `<p class="text-sm mt-2 text-gray-700 leading-relaxed">${properties.description}</p>` : ''}
          </div>
        `)
      }
    })

    map.on('mouseenter', 'regions-fill', () => {
      if (map) map.getCanvas().style.cursor = 'pointer'
    })

    map.on('mouseleave', 'regions-fill', () => {
      if (map) map.getCanvas().style.cursor = ''
    })
  }
}

function addPathsLayer(data: PathCollection) {
  if (!map) return

  if (map.getSource('paths')) {
    (map.getSource('paths') as maplibregl.GeoJSONSource).setData(data as any)
  } else {
    map.addSource('paths', {
      type: 'geojson',
      data: data as any
    })

    map.addLayer({
      id: 'paths-line',
      type: 'line',
      source: 'paths',
      layout: {
        'line-cap': 'round',
        'line-join': 'round'
      },
      paint: {
        'line-color': [
          'match',
          ['get', 'path_type'],
          'road', '#b45309',   // Darker warm amber/brown for roads
          'river', '#1d4ed8',  // Strong blue for rivers
          'stream', '#3b82f6', // Bright blue for streams
          '#4b5563'
        ],
        'line-width': [
          'match',
          ['get', 'path_type'],
          'road', 1.8,
          'river', 2.5,
          'stream', 1.0,
          1.5
        ]
      }
    })

    map.on('click', 'paths-line', (e) => {
      if (!e.features || e.features.length === 0) return
      
      const feature = e.features[0]
      const properties = feature.properties

      new maplibregl.Popup()
        .setLngLat(e.lngLat)
        .setHTML(`
          <div class="p-2 min-w-[180px]">
            <h3 class="font-bold text-lg border-b border-gray-100 pb-1 text-gray-900">${properties?.name || 'Unnamed Path'}</h3>
            <p class="text-sm font-semibold mt-1 ${properties?.path_type === 'road' ? 'text-amber-600' : 'text-blue-600'}">
              Type: ${properties?.path_type ? properties.path_type.toUpperCase() : 'Unknown'}
            </p>
            ${properties?.terrain_type ? `<p class="text-xs text-gray-500 mt-1">Terrain: ${properties.terrain_type}</p>` : ''}
            ${properties?.difficulty ? `<p class="text-xs text-gray-500">Difficulty: ${properties.difficulty}/5</p>` : ''}
          </div>
        `)
        .addTo(map!)
    })

    map.on('mouseenter', 'paths-line', () => {
      if (map) map.getCanvas().style.cursor = 'pointer'
    })

    map.on('mouseleave', 'paths-line', () => {
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
        await Promise.all([
          loadLocations(),
          loadRegions(),
          loadBiomes(),
          loadPaths()
        ])

        // Add layers in a strict, deterministic bottom-to-top stacking order:
        // 1. Polygons at the bottom (Regions, then Biomes)
        if (regions.value) addRegionsLayer(regions.value)
        if (biomes.value) addBiomesLayer(biomes.value)
        
        // 2. Line features in the middle (Paths: roads, rivers, streams)
        if (paths.value) addPathsLayer(paths.value)
        
        // 3. Point features on top (Locations)
        if (locations.value) addLocationsLayer(locations.value)

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
    addLocationsLayer(newLocations)
  }
})

watch(biomes, (newBiomes) => {
  if (newBiomes && map && layersInitialized.value) {
    addBiomesLayer(newBiomes)
  }
})


watch(regions, (newRegions) => {
  if (newRegions && map && layersInitialized.value) {
    addRegionsLayer(newRegions)
  }
})

watch(paths, (newPaths) => {
  if (newPaths && map && layersInitialized.value) {
    addPathsLayer(newPaths)
  }
})

watch(
  [locationsLoading, regionsLoading, biomesLoading, pathsLoading],
  ([locLoad, regLoad, bioLoad, pathLoad]) => {
    loading.value = locLoad || regLoad || bioLoad || pathLoad
  }
)

watch(
  [locationsError, regionsError, biomesError, pathsError],
  ([locErr, regErr, bioErr, pathErr]) => {
    error.value = locErr || regErr || bioErr || pathErr
  }
)

onUnmounted(() => {
  if (map) {
    map.remove()
  }
})
</script>
