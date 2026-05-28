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
import { useAltitudeData } from '@/features/altitude-management'
import { usePeakData } from '@/features/peak-management'
import { getElevation } from '@/entities/altitude'
import type { LocationCollection } from '@/entities/location'
import type { BiomeCollection } from '@/entities/biome'
import type { RegionCollection } from '@/entities/region'
import type { PathCollection } from '@/entities/path'
import type { AltitudeCollection } from '@/entities/altitude'
import type { PeakCollection } from '@/features/peak-management'

const mapContainer = ref<HTMLDivElement | null>(null)
let map: maplibregl.Map | null = null

const { locations, loading: locationsLoading, error: locationsError, loadLocations } = useLocationData()
const { biomes, loading: biomesLoading, error: biomesError, loadBiomes } = useBiomeData()
const { altitude, loading: altitudeLoading, error: altitudeError, loadAltitude } = useAltitudeData()
const { regions, loading: regionsLoading, error: regionsError, loadRegions } = useRegionData()
const { paths, loading: pathsLoading, error: pathsError, loadPaths } = usePathData()
const { peaks, loading: peaksLoading, error: peaksError, loadPeaks } = usePeakData()

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

    map.on('mouseenter', 'locations', () => {
      if (map) map.getCanvas().style.cursor = 'pointer'
    })

    map.on('mouseleave', 'locations', () => {
      if (map) map.getCanvas().style.cursor = ''
    })
  }
}


function addAltitudeLayer(data: AltitudeCollection) {
  if (!map) return

  if (map.getSource('altitude')) {
    (map.getSource('altitude') as maplibregl.GeoJSONSource).setData(data as any)
  } else {
    map.addSource('altitude', {
      type: 'geojson',
      data: data as any
    })

    map.addLayer({
      id: 'altitude-fill',
      type: 'fill',
      source: 'altitude',
      paint: {
        'fill-color': [
          'match',
          ['get', 'altitude_type'],
          'hills', '#a16207',
          'mountains_low', '#94a3b8',
          'mountains_med', '#475569',
          'mountains_high', '#334155',
          '#64748b'
        ],
        'fill-opacity': [
          'match',
          ['get', 'altitude_type'],
          'hills', 0.15,
          'mountains_low', 0.25,
          'mountains_med', 0.3,
          'mountains_high', 0.4,
          0.2
        ]
      }
    })

    map.addLayer({
      id: 'altitude-outline',
      type: 'line',
      source: 'altitude',
      paint: {
        'line-color': [
          'match',
          ['get', 'altitude_type'],
          'hills', '#713f12',
          'mountains_low', '#475569',
          'mountains_med', '#1e293b',
          'mountains_high', '#0f172a',
          '#334155'
        ],
        'line-width': [
          'match',
          ['get', 'altitude_type'],
          'mountains_high', 2.0,
          1.0
        ]
      }
    })

    map.on('mouseenter', 'altitude-fill', () => {
      if (map) map.getCanvas().style.cursor = 'pointer'
    })

    map.on('mouseleave', 'altitude-fill', () => {
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

    map.on('mouseenter', 'paths-line', () => {
      if (map) map.getCanvas().style.cursor = 'pointer'
    })

    map.on('mouseleave', 'paths-line', () => {
      if (map) map.getCanvas().style.cursor = ''
    })
  }
}

function generateInfluenceCircles(peaks: PeakCollection) {
  const circles: any[] = []
  
  peaks.features.forEach(peak => {
    const [lon, lat] = peak.geometry.coordinates
    const type = peak.properties.altitude_type
    
    // Determinar radio según tipo (en km)
    let radius_km: number
    if (type === 'plain' || type === 'hills') {
      radius_km = 1.5  // 3 km de diámetro
    } else if (type === 'mountains_low') {
      radius_km = 7.5  // 15 km de diámetro
    } else if (type === 'mountains_med') {
      radius_km = 10.0  // 20 km de diámetro
    } else {  // mountains_high
      radius_km = 12.5  // 25 km de diámetro
    }
    
    // Convertir km a grados (aproximado: 1 grado ≈ 111 km)
    const radius_deg = radius_km / 111
    
    // Generar círculo como polígono de 64 puntos
    const circle_points: [number, number][] = []
    const num_points = 64
    for (let i = 0; i <= num_points; i++) {
      const angle = (i / num_points) * 2 * Math.PI
      const circle_lon = lon + radius_deg * Math.cos(angle)
      const circle_lat = lat + radius_deg * Math.sin(angle)
      circle_points.push([circle_lon, circle_lat])
    }
    
    const circle = {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [circle_points]
      },
      properties: {
        peak_id: peak.properties.id,
        altitude_type: type,
        elevation: peak.properties.elevation_final,
        radius_km: radius_km
      }
    }
    
    circles.push(circle)
  })
  
  return {
    type: 'FeatureCollection',
    features: circles
  }
}

function addInfluenceCirclesLayer(circlesData: any) {
  if (!map) return

  if (map.getSource('influence-circles')) {
    (map.getSource('influence-circles') as maplibregl.GeoJSONSource).setData(circlesData)
  } else {
    map.addSource('influence-circles', {
      type: 'geojson',
      data: circlesData
    })

    // Capa de relleno semi-transparente
    map.addLayer({
      id: 'influence-circles-fill',
      type: 'fill',
      source: 'influence-circles',
      paint: {
        'fill-color': [
          'match',
          ['get', 'altitude_type'],
          'plain', '#22c55e',
          'hills', '#eab308',
          'mountains_low', '#f97316',
          'mountains_med', '#ef4444',
          'mountains_high', '#a855f7',
          '#64748b'
        ],
        'fill-opacity': 0.15
      }
    }, 'peaks-points')

    // Capa de borde
    map.addLayer({
      id: 'influence-circles-outline',
      type: 'line',
      source: 'influence-circles',
      paint: {
        'line-color': [
          'match',
          ['get', 'altitude_type'],
          'plain', '#16a34a',
          'hills', '#ca8a04',
          'mountains_low', '#ea580c',
          'mountains_med', '#dc2626',
          'mountains_high', '#9333ea',
          '#475569'
        ],
        'line-width': 1,
        'line-opacity': 0.5
      }
    }, 'peaks-points')
  }
}

function addPeaksLayer(data: PeakCollection) {
  if (!map) return

  if (map.getSource('peaks')) {
    (map.getSource('peaks') as maplibregl.GeoJSONSource).setData(data as any)
  } else {
    map.addSource('peaks', {
      type: 'geojson',
      data: data as any
    })

    map.addLayer({
      id: 'peaks-points',
      type: 'circle',
      source: 'peaks',
      paint: {
        'circle-radius': 2.5,
        'circle-color': [
          'match',
          ['get', 'altitude_type'],
          'plain', '#22c55e',        // Verde para plain
          'hills', '#eab308',        // Amarillo para hills
          'mountains_low', '#f97316',   // Naranja para mountains_low
          'mountains_med', '#ef4444',   // Rojo para mountains_med
          'mountains_high', '#a855f7',  // Morado para mountains_high
          '#64748b'  // Gris por defecto
        ],
        'circle-stroke-width': 0.5,
        'circle-stroke-color': '#ffffff'
      }
    })

    map.on('mouseenter', 'peaks-points', () => {
      if (map) map.getCanvas().style.cursor = 'pointer'
    })

    map.on('mouseleave', 'peaks-points', () => {
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
          loadAltitude(),
          loadPaths(),
          loadPeaks()
        ])

        // Add layers in a strict, deterministic bottom-to-top stacking order:
        // 1. Polygons at the bottom (Regions, then Altitude, then Biomes)
        if (regions.value) addRegionsLayer(regions.value)
        // if (altitude.value) addAltitudeLayer(altitude.value)  // Desactivado temporalmente
        if (biomes.value) addBiomesLayer(biomes.value)
        
        // 2. Line features in the middle (Paths: roads, rivers, streams)
        if (paths.value) addPathsLayer(paths.value)
        
        // 3. Peak influence circles and points (above paths, below locations)
        if (peaks.value) {
          const circles = generateInfluenceCircles(peaks.value)
          addInfluenceCirclesLayer(circles)
          // addPeaksLayer(peaks.value)  // Desactivado temporalmente
        }
        
        // 4. Location points on top
        if (locations.value) addLocationsLayer(locations.value)

        // Evento de Click Único y Consolidador
        const currentMap = map
        if (currentMap) {
          currentMap.on('click', async (e) => {
            // Query features under the click point including altitude layers
            const features = currentMap.queryRenderedFeatures(e.point, {
              layers: ['locations', 'biomes-fill', 'regions-fill', 'altitude-fill']
            })

            const locationFeature = features.find(f => f.layer.id === 'locations')
            const biomeFeature = features.find(f => f.layer.id === 'biomes-fill')
            const regionFeature = features.find(f => f.layer.id === 'regions-fill')
            const altitudeFeature = features.find(f => f.layer.id === 'altitude-fill')

            const { lng, lat } = e.lngLat

            // 1. Location Details
            let locationHTML = ''
            if (locationFeature) {
              const locProps = locationFeature.properties
              const imgHTML = locProps?.image || locProps?.image_url 
                ? `<img src="${locProps.image || locProps.image_url}" class="w-full h-28 object-cover rounded-md mt-2 mb-1 shadow-sm border border-gray-100" alt="${locProps.name}" />`
                : ''
              locationHTML = `
                <div class="mb-3 pb-3 border-b border-gray-100">
                  <h3 class="font-bold text-lg text-rose-600 leading-tight">${locProps?.name || 'Unknown Location'}</h3>
                  <p class="text-xs text-rose-500 font-semibold mt-0.5">${locProps?.type ? locProps.type.replace('_', ' ') : 'point'}</p>
                  ${imgHTML}
                  ${locProps?.description ? `<p class="text-xs mt-1 text-gray-600 leading-normal">${locProps.description}</p>` : ''}
                </div>
              `
            }

            // 2. Biome Details
            const biomeName = biomeFeature?.properties?.name || 'prairie'
            const biomeType = biomeFeature?.properties?.type || 'grassland'
            const biomeHTML = `
              <div class="flex items-center gap-1.5 mt-1">
                <span class="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
                <span class="text-xs font-semibold text-gray-700">Biome:</span>
                <span class="text-xs text-emerald-700 font-medium">${biomeName.replace('_', ' ')} (${biomeType})</span>
              </div>
            `

            // Determine visible altitude classification based on the layer actually clicked
            let elevClass = 'plain'
            if (altitudeFeature) {
              const type = altitudeFeature.properties?.altitude_type
              if (type === 'hills') elevClass = 'hills'
              else if (type === 'mountains_low') elevClass = 'mountain low'
              else if (type === 'mountains_med') elevClass = 'mountain med'
              else if (type === 'mountains_high') elevClass = 'mountain high'
            }

            // 3. Elevation Placeholder (updated asynchronously with real meters, keeping classification)
            let elevationHTML = `
              <div id="popup-elevation-container" class="flex items-center gap-1.5 mt-1">
                <span class="inline-block w-2 h-2 rounded-full bg-amber-500"></span>
                <span class="text-xs font-semibold text-gray-700">Elevation:</span>
                <span class="text-xs text-amber-700 font-bold capitalize">${elevClass}</span>
                <span class="text-xs text-amber-600 italic ml-1">Loading meters...</span>
              </div>
            `

            // 4. Region Details
            let regionHTML = ''
            if (regionFeature) {
              const regProps = regionFeature.properties
              const kingdomLabel = regProps?.kingdom ? ` (${regProps.kingdom})` : ''
              regionHTML = `
                <div class="mt-3 pt-2.5 border-t border-gray-100">
                  <span class="text-[10px] uppercase tracking-wider text-gray-400 font-bold block">Political Region</span>
                  <p class="text-xs text-teal-700 font-semibold mt-0.5">${regProps?.name || 'Unknown Region'}<span class="text-gray-500 font-normal">${kingdomLabel}</span></p>
                  ${regProps?.description ? `<p class="text-[11px] mt-1 text-gray-500 leading-snug">${regProps.description}</p>` : ''}
                </div>
              `
            }

            // Initial Render of Popup
            new maplibregl.Popup({ className: 'fantasy-popup' })
              .setLngLat(e.lngLat)
              .setHTML(`
                <div class="p-3 min-w-[220px] max-w-[280px] font-sans">
                  ${locationHTML}
                  <div class="space-y-1">
                    ${biomeHTML}
                    ${elevationHTML}
                  </div>
                  ${regionHTML}
                </div>
              `)
              .addTo(currentMap)

            // Fetch elevation asynchronously and update popup contents
            try {
              const response = await getElevation(lng, lat)
              const elevMeters = Math.round(response.data.elevation)

              const updatedElevationHTML = `
                <span class="inline-block w-2 h-2 rounded-full bg-amber-500"></span>
                <span class="text-xs font-semibold text-gray-700">Elevation:</span>
                <span class="text-xs text-amber-700 font-bold capitalize">${elevClass}</span>
                <span class="text-xs text-gray-500">(${elevMeters} meters)</span>
              `
              
              const container = document.getElementById('popup-elevation-container')
              if (container) {
                container.innerHTML = updatedElevationHTML
              }
            } catch (err) {
              console.error('Failed to update popup elevation:', err)
              const container = document.getElementById('popup-elevation-container')
              if (container) {
                container.innerHTML = `
                  <span class="inline-block w-2 h-2 rounded-full bg-red-500"></span>
                  <span class="text-xs font-semibold text-gray-700">Elevation:</span>
                  <span class="text-xs text-amber-700 font-bold capitalize">${elevClass}</span>
                  <span class="text-xs text-red-500 ml-1">(N/A)</span>
                `
              }
            }
          })
        }

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

watch(altitude, (newAltitude) => {
  if (newAltitude && map && layersInitialized.value) {
    addAltitudeLayer(newAltitude)
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

watch(peaks, (newPeaks) => {
  if (newPeaks && map && layersInitialized.value) {
    addPeaksLayer(newPeaks)
  }
})

watch(
  [locationsLoading, regionsLoading, biomesLoading, altitudeLoading, pathsLoading, peaksLoading],
  ([locLoad, regLoad, bioLoad, altLoad, pathLoad, peakLoad]) => {
    loading.value = locLoad || regLoad || bioLoad || altLoad || pathLoad || peakLoad
  }
)

watch(
  [locationsError, regionsError, biomesError, altitudeError, pathsError, peaksError],
  ([locErr, regErr, bioErr, altErr, pathErr, peakErr]) => {
    error.value = locErr || regErr || bioErr || altErr || pathErr || peakErr
  }
)

onUnmounted(() => {
  if (map) {
    map.remove()
  }
})
</script>
