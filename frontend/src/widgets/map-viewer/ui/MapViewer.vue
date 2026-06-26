<template>
  <div class="relative w-full h-screen bg-white overflow-visible">
    <div ref="mapContainer" class="w-full h-full" style="min-height: 100vh;"></div>

    <CharacterSelector v-if="mode === 'wander'" />

    <DirectionsInput
      v-if="isDirectionsMode"
      @select-destination="handleDirectionsDestinationSelect"
      @exit="handleExitDirections"
      @start-adventure="handleStartAdventure"
    />

    <ChapterViewer
      v-if="activeTripId"
      :trip-id="activeTripId"
      @close="activeTripId = null"
      @day-generated="handleDayGenerated"
    />

    <SearchInput
      v-else
      ref="searchInputRef"
      @select="handleSearchSelect"
      @clear="handleClearSearch"
    />

    <CalendarPicker />

    <LocationSidebar
      v-if="selectedLocation && !isDirectionsMode"
      :location="selectedLocation"
      @close="handleCloseSidebar"
      @directions="handleDirectionsClick"
    />

    <MapLoadingOverlay
      :loading="loading"
      :error="combinedError"
    />

    <Loader
      v-if="adventureLoading"
      variant="fullscreen"
      size="lg"
      :phrases="adventurePhrases"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed } from 'vue'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { MAPLIBRE_CONFIG, MAPLIBRE_CONFIG_WANDER } from '@/shared/config/maplibre'
import { useMapLayers, useMapEvents, useMapMarkers, useMapDataLoading } from '../model'
import type { MapMode } from '../model/useMapLayers'
import { fetchLocationDetailsAtPoint } from '../model/useLocationDetails'
import { SearchInput } from '@/widgets/search-input'
import { LocationSidebar } from '@/widgets/location-sidebar'
import { DirectionsInput } from '@/widgets/directions-input'
import { CalendarPicker } from '@/widgets/calendar-picker'
import { ChapterViewer, useTrips } from '@/features/prompt-management'
import { useDirections } from '@/composables/useDirections'
import { useGlobalClimateTime } from '@/composables/useGlobalClimateTime'
import { useCharacter } from '@/composables/useCharacter'
import { useUserSettings } from '@/composables/useUserSettings'
import { lineString } from '@turf/helpers'
import CharacterSelector from '@/components/CharacterSelector.vue'
import MapLoadingOverlay from './MapLoadingOverlay.vue'
import { Loader } from '@/components/ui/loader'
import type { SearchResult } from '@/entities/search'
import type { LocationDetails } from '@/widgets/location-sidebar'

const props = defineProps<{
  mode?: MapMode
}>()

const mapContainer = ref<HTMLDivElement | null>(null)
const searchInputRef = ref<InstanceType<typeof SearchInput> | null>(null)
const selectedLocation = ref<LocationDetails | null>(null)
let map: maplibregl.Map | null = null

const mapConfig = computed(() => {
  return props.mode === 'wander' ? MAPLIBRE_CONFIG_WANDER : MAPLIBRE_CONFIG
})

const { isDirectionsMode, startDirections, exitDirections, setDestination, routeData, initializeFromBackend: initializeDirections } = useDirections()

// Adventure / trip generation
const { createTrip, generateDay, getTrip } = useTrips()
const activeTripId = ref<string | null>(null)
const { currentClimateTime, timestampISO } = useGlobalClimateTime()
const lastSelectedCoordinates = ref<[number, number] | null>(null)
const pendingDestinationLocation = ref<LocationDetails | null>(null)
const adventureLoading = ref(false)

const adventurePhrases = [
  'Consulting the old maps and the older roads…',
  'Rousing the things that stir in the dark places…',
  'Asking the wind which way the weather turns…',
  'Waking sleeping dragons (quietly)…',
  'Setting your feet upon the road that goes ever on…'
]

// Character / Company state
const { characters, activeCharacter, fetchAllCharacters, setActiveCharacter, updateActiveCharacterPosition } = useCharacter()
const { user } = useUserSettings()
// Animation state
const isAnimating = ref(false)
let animationFrameId: number | null = null
let tripDayRouteSourceId = 'trip-day-route'
let tripDayRouteLayerId = 'trip-day-route-layer'
let fullTripRouteSourceId = 'full-trip-route'
let fullTripRouteLayerId = 'full-trip-route-layer'
let characterMarkers: Map<number, maplibregl.Marker> = new Map()

// Composables refactorizados
const { addMarker, removeMarker } = useMapMarkers()
const {
  locations,
  biomes,
  altitude,
  regions,
  roads,
  water,
  loading,
  error,
  loadAllData
} = useMapDataLoading()

// Map composables
const { initializeLayers, removeLayers, locationLayer, biomeLayer, regionLayer, roadLayer, waterLayer, altitudeLayer } = useMapLayers()
const { setupClickHandler } = useMapEvents()

const mapError = ref<string | null>(null)
const combinedError = computed(() => mapError.value || error.value)
const layersInitialized = ref(false)

function handleAddMarker(lng: number, lat: number) {
  if (map) {
    addMarker(map, lng, lat)
    lastSelectedCoordinates.value = [lng, lat]

    if (isDirectionsMode.value) {
      if (pendingDestinationLocation.value) {
        setDestination({
          name: pendingDestinationLocation.value.name,
          type: pendingDestinationLocation.value.type === 'Region' ? 'region' : 'location',
          coordinates: [lng, lat]
        })
        pendingDestinationLocation.value = null
      } else {
        setDestination({
          name: `Point [${lng.toFixed(2)}, ${lat.toFixed(2)}]`,
          type: 'custom',
          coordinates: [lng, lat]
        })
      }
    }
  }
}

function getCharacterImage(name: string): string {
  return new URL(`/src/assets/characters/${name}.png`, import.meta.url).href
}

function updateCharacterMarker() {
  if (!map) return

  // Remove all existing character markers
  characterMarkers.forEach((marker) => marker.remove())
  characterMarkers.clear()

  // Add markers for all characters
  characters.value.forEach((character) => {
    const [lng, lat] = [character.current_lng, character.current_lat]

    // Skip if coordinates are invalid
    if (lng == null || lat == null || isNaN(lng) || isNaN(lat)) {
      console.warn(`Invalid coordinates for character ${character.name}:`, { lng, lat })
      return
    }

    // Create custom HTML element for character marker
    const el = document.createElement('div')
    el.className = 'character-marker'
    el.style.width = '53px'
    el.style.height = '53px'
    el.style.borderRadius = '50%'
    el.style.backgroundImage = `url(${getCharacterImage(character.name)})`
    el.style.backgroundSize = 'cover'
    el.style.backgroundPosition = 'center'
    el.style.cursor = 'pointer'

    if (character.active) {
      el.style.border = '3px solid #d97706' // amber-600 golden border
      el.style.boxShadow = '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1), 0 0 10px rgba(217,119,6,0.5)' // Drop shadow + golden glow
      el.style.filter = 'none'
    } else {
      el.style.border = '3px solid rgba(128, 128, 128, 0.5)' // gray border
      el.style.boxShadow = '0 4px 6px -1px rgba(0,0,0,0.1)'
      el.style.filter = 'grayscale(100%) opacity(0.6)'
    }

    // Add tooltip on hover
    el.title = character.name

    // Add click handler to switch active character
    el.addEventListener('click', () => {
      if (!character.active) {
        setActiveCharacter(character.id)
      }
    })

    const marker = new maplibregl.Marker({ element: el })
      .setLngLat([lng, lat])
      .addTo(map!)

    characterMarkers.set(character.id, marker)
  })
}

function drawTripDayRoute(mapInstance: maplibregl.Map, geometry: any) {
  clearTripDayRoute(mapInstance)

  // Handle geometry that might be a JSON string
  let coords: any
  if (typeof geometry === 'string') {
    try {
      coords = JSON.parse(geometry)
    } catch (e) {
      console.error('❌ Failed to parse geometry string:', e)
      return
    }
  } else {
    coords = geometry
  }

  const coordinates = coords.coordinates
  if (!coordinates || coordinates.length < 2) {
    console.warn('⚠️ Route drawing skipped: invalid coordinates', coordinates)
    return
  }

  // Create LineString GeoJSON
  const routeLine = lineString(coordinates)

  mapInstance.addSource(tripDayRouteSourceId, {
    type: 'geojson',
    data: routeLine
  })

  mapInstance.addLayer({
    id: tripDayRouteLayerId,
    type: 'line',
    source: tripDayRouteSourceId,
    layout: {
      'line-join': 'round',
      'line-cap': 'round'
    },
    paint: {
      'line-color': '#d97706', // amber-600
      'line-width': 4,
      'line-opacity': 0.9
    }
  })

  // Move route layer to top
  mapInstance.moveLayer(tripDayRouteLayerId)

  // Fit bounds to show the entire route
  const bounds = new maplibregl.LngLatBounds()
  coordinates.forEach((coord: any) => bounds.extend(coord as [number, number]))
  mapInstance.fitBounds(bounds, {
    padding: { top: 100, bottom: 100, left: 500, right: 100 },
    duration: 1500
  })
}

function clearTripDayRoute(mapInstance: maplibregl.Map) {
  if (mapInstance.getLayer(tripDayRouteLayerId)) {
    mapInstance.removeLayer(tripDayRouteLayerId)
  }
  if (mapInstance.getSource(tripDayRouteSourceId)) {
    mapInstance.removeSource(tripDayRouteSourceId)
  }
}

function drawFullTripRoute(mapInstance: maplibregl.Map, routeData: any) {
  clearFullTripRoute(mapInstance)

  if (!routeData || !routeData.geometry) {
    console.warn('⚠️ Full trip route drawing skipped: invalid route data')
    return
  }

  // Collect all coordinates from the route geometry
  const coordinates: number[][] = []

  // Add off_road_start coordinates
  if (routeData.geometry.off_road_start?.geometry?.coordinates) {
    coordinates.push(...routeData.geometry.off_road_start.geometry.coordinates)
  }

  // Add on_road coordinates
  if (routeData.geometry.on_road?.features) {
    routeData.geometry.on_road.features.forEach((feature: any) => {
      if (feature.geometry?.coordinates) {
        coordinates.push(...feature.geometry.coordinates)
      }
    })
  }

  // Add off_road_end coordinates
  if (routeData.geometry.off_road_end?.geometry?.coordinates) {
    coordinates.push(...routeData.geometry.off_road_end.geometry.coordinates)
  }

  if (coordinates.length < 2) {
    console.warn('⚠️ Full trip route drawing skipped: not enough coordinates')
    return
  }

  // Create LineString GeoJSON
  const routeLine = lineString(coordinates)

  mapInstance.addSource(fullTripRouteSourceId, {
    type: 'geojson',
    data: routeLine
  })

  mapInstance.addLayer({
    id: fullTripRouteLayerId,
    type: 'line',
    source: fullTripRouteSourceId,
    layout: {
      'line-join': 'round',
      'line-cap': 'round'
    },
    paint: {
      'line-color': '#dc2626', // red-600
      'line-width': 3,
      'line-opacity': 0.8,
      'line-dasharray': [4, 4]
    }
  })

  // Move full route layer to top (above day route)
  mapInstance.moveLayer(fullTripRouteLayerId)
}

function clearFullTripRoute(mapInstance: maplibregl.Map) {
  if (mapInstance.getLayer(fullTripRouteLayerId)) {
    mapInstance.removeLayer(fullTripRouteLayerId)
  }
  if (mapInstance.getSource(fullTripRouteSourceId)) {
    mapInstance.removeSource(fullTripRouteSourceId)
  }
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3)
}

async function startCharacterTravelAnimation(day: any) {
  console.log('🎬 Starting character travel animation', { day, activeCharacter: activeCharacter.value?.id })
  
  if (!map || !activeCharacter.value) {
    console.warn('⚠️ Animation skipped: map or activeCharacter missing', { map: !!map, activeCharacter: !!activeCharacter.value })
    return
  }

  // Cancel any existing animation
  if (animationFrameId !== null) {
    console.log('🔄 Canceling existing animation')
    cancelAnimationFrame(animationFrameId)
    animationFrameId = null
  }

  const marker = characterMarkers.get(activeCharacter.value.id)
  console.log('📍 Marker found:', !!marker, 'for character:', activeCharacter.value.id)
  if (!marker) {
    console.warn('⚠️ Animation skipped: marker not found for character', activeCharacter.value.id)
    return
  }

  // Handle geometry that might be a JSON string
  let coords: any
  if (typeof day.geometry === 'string') {
    try {
      coords = JSON.parse(day.geometry)
      console.log('📐 Parsed geometry from string')
    } catch (e) {
      console.error('❌ Failed to parse geometry string:', e)
      return
    }
  } else {
    coords = day.geometry
    console.log('📐 Geometry is already an object')
  }

  const coordinates = coords.coordinates
  console.log('📍 Coordinates:', coordinates?.length, 'points')
  if (!coordinates || coordinates.length < 2) {
    console.warn('⚠️ Animation skipped: invalid coordinates', coordinates)
    return
  }

  // Validate all coordinates
  const validCoordinates = coordinates.filter((coord: any) => {
    const isValid = coord && 
                   coord.length === 2 && 
                   !isNaN(coord[0]) && 
                   !isNaN(coord[1]) &&
                   coord[0] !== null && 
                   coord[1] !== null
    if (!isValid) {
      console.warn('⚠️ Invalid coordinate found:', coord)
    }
    return isValid
  })

  if (validCoordinates.length < 2) {
    console.warn('⚠️ Animation skipped: not enough valid coordinates', validCoordinates.length)
    return
  }

  console.log('✅ Valid coordinates:', validCoordinates.length, 'points')

  // Calculate bounds for the route and fit map with padding to compensate for ChapterViewer
  const bounds = validCoordinates.reduce((bounds: any, coord: any) => {
    return bounds.extend(coord as [number, number])
  }, new maplibregl.LngLatBounds(validCoordinates[0] as [number, number], validCoordinates[0] as [number, number]))

  // Fit bounds with padding to account for ChapterViewer on the right (40% of screen width)
  map.fitBounds(bounds, {
    padding: { top: 50, bottom: 50, left: 50, right: window.innerWidth * 0.4 },
    maxZoom: 8, // More distant zoom
    duration: 1000
  })

  // Draw the route with valid coordinates
  const validGeometry = { ...coords, coordinates: validCoordinates }
  drawTripDayRoute(map, validGeometry)

  isAnimating.value = true
  const startTime = performance.now()
  const duration = 15000 // 15 seconds
  console.log('⏱️ Animation duration:', duration, 'ms')

  function animate(currentTime: number) {
    const elapsed = currentTime - startTime
    const progress = Math.min(elapsed / duration, 1)
    const easedProgress = easeOutCubic(progress)

    // Linear interpolation between coordinate points
    const totalSegments = validCoordinates.length - 1
    const segmentProgress = easedProgress * totalSegments
    const segmentIndex = Math.max(0, Math.min(Math.floor(segmentProgress), totalSegments - 1))
    const segmentT = segmentProgress - segmentIndex

    if (segmentIndex >= totalSegments) {
      // Animation complete, set to final position
      if (marker) marker.setLngLat(validCoordinates[validCoordinates.length - 1])
      isAnimating.value = false
      animationFrameId = null
      console.log('✅ Animation complete')

      // Update character position in database
      if (day.end_lng !== undefined && day.end_lat !== undefined) {
        updateActiveCharacterPosition(day.end_lng, day.end_lat)
          .then(() => {
            console.log('✅ Updated character position in database')
            // Refresh characters to get the new position
            return fetchAllCharacters()
          })
          .then(() => {
            // Clear the route after animation completes
            clearTripDayRoute(map!)
          })
          .catch((err: unknown) => {
            console.error('❌ Failed to update character position:', err)
          })
      }
      return
    }

    const start = validCoordinates[segmentIndex]
    const end = validCoordinates[segmentIndex + 1]

    // Validate coordinates before interpolation
    if (!start || !end || start.length < 2 || end.length < 2) {
      console.warn('⚠️ Invalid coordinates for interpolation:', { segmentIndex, start, end })
      return
    }

    // Linear interpolation
    const lng = start[0] + (end[0] - start[0]) * segmentT
    const lat = start[1] + (end[1] - start[1]) * segmentT

    if (marker) {
      marker.setLngLat([lng, lat])
    }

    if (progress < 1) {
      animationFrameId = requestAnimationFrame(animate)
    }
  }

  animationFrameId = requestAnimationFrame(animate)
  console.log('🚀 Animation started')
}

// Expose function for parent components
defineExpose({
  startCharacterTravelAnimation
})

function handleDayGenerated(day: any) {
  startCharacterTravelAnimation(day)
}

watch(characters, () => {
  // Don't recreate markers while animation is in progress
  if (!isAnimating.value) {
    updateCharacterMarker()
  }
}, { deep: true })

watch(activeTripId, (newTripId, oldTripId) => {
  if (map) {
    if (newTripId === null && oldTripId !== null) {
      // Trip was deactivated, clear the full route
      clearFullTripRoute(map)
    }
  }
})

onMounted(async () => {
  if (!mapContainer.value) return

  try {
    map = new maplibregl.Map({
      container: mapContainer.value,
      ...mapConfig.value
    })

    map.addControl(new maplibregl.NavigationControl(), 'bottom-right')
    map.addControl(new maplibregl.ScaleControl(), 'bottom-left')

    map.on('load', async () => {
      console.log('✅ MapLibre ready')

      try {
        await loadAllData()

        // Initialize all layers based on mode
        initializeLayers(map!, {
          regions: regions.value,
          biomes: biomes.value,
          water: water.value,
          roads: roads.value,
          locations: locations.value
        }, props.mode || 'explore')

        // Add region outline last to be on top of all layers (only in explore mode)
        if (props.mode !== 'wander') {
          const regionsData = regions.value
          if (regionsData) {
            regionLayer.addRegionsOutline(map!, regionsData)
          }
        }

        // Setup events
        setupClickHandler(map!, handleLocationClick, handleAddMarker, () => timestampISO.value, props.mode || 'explore')

        // Load and display character/company cursor (only in wander mode)
        if (props.mode === 'wander') {
          try {
            await fetchAllCharacters()
            updateCharacterMarker()
            // Restore active trip from user settings if the active character has one
            const savedTripId = user.value?.active_trip_id
            if (savedTripId && activeCharacter.value) {
              activeTripId.value = savedTripId
              console.log('✅ Restored active trip from user settings:', savedTripId)
              // Draw the full trip route
              if (user.value?.active_trip?.route) {
                drawFullTripRoute(map!, user.value.active_trip.route)
              }
            }
          } catch (err) {
            console.error('Failed to load character position:', err)
          }
        }

        // Initialize directions from backend settings if available
        initializeDirections()

        layersInitialized.value = true
      } catch (err) {
        console.error('Failed to load map data:', err)
        mapError.value = 'Failed to load map data'
      }
    })

    map.on('error', (e) => {
      console.error('MapLibre error:', e)
      mapError.value = 'Map initialization error'
    })
  } catch (err) {
    console.error('Error initializing map:', err)
    mapError.value = 'Failed to initialize map'
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

watch(currentClimateTime, () => {
  console.log('🕐 Climate time changed:', timestampISO.value)
  if (selectedLocation.value && lastSelectedCoordinates.value) {
    fetchLocationDetails(
      lastSelectedCoordinates.value[0],
      lastSelectedCoordinates.value[1]
    )
  }
})

function clearRoute(mapInstance: maplibregl.Map) {
  const layers = [
    'route-on-road-layer',
    'route-off-road-start-layer',
    'route-off-road-end-layer'
  ]
  const sources = [
    'route-on-road',
    'route-off-road-start',
    'route-off-road-end'
  ]

  layers.forEach(layer => {
    if (mapInstance.getLayer(layer)) {
      mapInstance.removeLayer(layer)
    }
  })

  sources.forEach(source => {
    if (mapInstance.getSource(source)) {
      mapInstance.removeSource(source)
    }
  })
}

function drawRoute(mapInstance: maplibregl.Map, data: any) {
  clearRoute(mapInstance)

  // 1. On-road route
  if (data.geometry.on_road && data.geometry.on_road.features && data.geometry.on_road.features.length > 0) {
    mapInstance.addSource('route-on-road', {
      type: 'geojson',
      data: data.geometry.on_road
    })

    mapInstance.addLayer({
      id: 'route-on-road-layer',
      type: 'line',
      source: 'route-on-road',
      layout: {
        'line-join': 'round',
        'line-cap': 'round'
      },
      paint: {
        'line-color': '#e11d48', // rose-600
        'line-width': 5,
        'line-opacity': 0.85
      }
    })
    
    // Move route layer to top of layer stack
    mapInstance.moveLayer('route-on-road-layer')
  }

  // 2. Off-road start
  if (data.geometry.off_road_start) {
    mapInstance.addSource('route-off-road-start', {
      type: 'geojson',
      data: data.geometry.off_road_start
    })

    mapInstance.addLayer({
      id: 'route-off-road-start-layer',
      type: 'line',
      source: 'route-off-road-start',
      layout: {
        'line-join': 'round',
        'line-cap': 'round'
      },
      paint: {
        'line-color': '#4b5563', // gray-600
        'line-width': 4,
        'line-opacity': 0.8,
        'line-dasharray': [2, 2]
      }
    })
    
    // Move off-road start layer to top
    mapInstance.moveLayer('route-off-road-start-layer')
  }

  // 3. Off-road end
  if (data.geometry.off_road_end) {
    mapInstance.addSource('route-off-road-end', {
      type: 'geojson',
      data: data.geometry.off_road_end
    })

    mapInstance.addLayer({
      id: 'route-off-road-end-layer',
      type: 'line',
      source: 'route-off-road-end',
      layout: {
        'line-join': 'round',
        'line-cap': 'round'
      },
      paint: {
        'line-color': '#4b5563', // gray-600
        'line-width': 4,
        'line-opacity': 0.8,
        'line-dasharray': [2, 2]
      }
    })
    
    // Move off-road end layer to top
    mapInstance.moveLayer('route-off-road-end-layer')
  }

  // Fit bounds to show the entire route
  const bounds = new maplibregl.LngLatBounds()

  if (data.geometry.off_road_start) {
    const coords = data.geometry.off_road_start.geometry.coordinates
    coords.forEach((coord: any) => bounds.extend(coord as [number, number]))
  }

  if (data.geometry.on_road) {
    data.geometry.on_road.features.forEach((f: any) => {
      const coords = f.geometry.coordinates
      coords.forEach((coord: any) => bounds.extend(coord as [number, number]))
    })
  }

  if (data.geometry.off_road_end) {
    const coords = data.geometry.off_road_end.geometry.coordinates
    coords.forEach((coord: any) => bounds.extend(coord as [number, number]))
  }

  if (!bounds.isEmpty()) {
    mapInstance.fitBounds(bounds, {
      padding: { top: 80, bottom: 80, left: 450, right: 80 },
      duration: 1500
    })
  }
}

watch(routeData, (newRoute) => {
  if (map) {
    if (newRoute) {
      drawRoute(map, newRoute)
    } else {
      clearRoute(map)
    }
  }
})

onUnmounted(() => {
  // Cancel any running animation
  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId)
    animationFrameId = null
  }
  
  characterMarkers.forEach((marker) => marker.remove())
  characterMarkers.clear()
  if (map) {
    clearRoute(map)
    clearTripDayRoute(map)
    clearFullTripRoute(map)
    removeMarker()
    removeLayers(map)
    map.remove()
    map = null
  }
})

function handleSearchSelect(result: SearchResult) {
  if (!map) return

  if (result.type === 'location') {
    // Reset region border highlight
    regionLayer.highlightRegionBorder(map, null)

    // Zoom fijo para locations (Point)
    const coords = (result.geometry as GeoJSON.Point).coordinates
    map.flyTo({
      center: [coords[0], coords[1]],
      zoom: 10,
      duration: 1000
    })

    // Add marker at location
    handleAddMarker(coords[0], coords[1])

    // Fetch location details after flyTo completes
    map.once('moveend', () => {
      fetchLocationDetails(coords[0], coords[1])
    })
  } else if (result.type === 'region') {
    // Zoom dinámico con fitBounds para regions (Polygon)
    const coords = (result.geometry as GeoJSON.Polygon).coordinates[0]
    const bounds = coords.reduce((bounds, coord) => {
      bounds.extend(coord as [number, number])
      return bounds
    }, new maplibregl.LngLatBounds())

    map.fitBounds(bounds, {
      padding: 50,
      duration: 1000
    })

    // Calculate center of bounds and add marker
    const center = bounds.getCenter()
    map.once('moveend', () => {
      handleAddMarker(center.lng, center.lat)
      // Highlight the selected region border in red
      if (map) {
        regionLayer.highlightRegionBorder(map, result.id as number)
      }
    })
  }
}

function handleLocationClick(location: LocationDetails) {
  if (isDirectionsMode.value) {
    pendingDestinationLocation.value = location
    return
  }

  selectedLocation.value = location
  // Set search input to location name
  if (searchInputRef.value) {
    searchInputRef.value.setSearchQuery(location.name)
  }

  // Highlight region border if this is a region
  if (location.type === 'Region' && location.regionId && map) {
    regionLayer.highlightRegionBorder(map, location.regionId)
  } else if (map) {
    regionLayer.highlightRegionBorder(map, null)
  }
}

function handleClearSearch() {
  selectedLocation.value = null
  removeMarker()
  if (map) {
    regionLayer.highlightRegionBorder(map, null)
  }
}

function handleCloseSidebar() {
  selectedLocation.value = null
  removeMarker()
  exitDirections()
  if (map) {
    regionLayer.highlightRegionBorder(map, null)
  }
}

function handleDirectionsClick() {
  if (selectedLocation.value && lastSelectedCoordinates.value) {
    startDirections({
      id: selectedLocation.value.regionId,
      name: selectedLocation.value.name,
      type: selectedLocation.value.type === 'Region' ? 'region' : 'location',
      coordinates: lastSelectedCoordinates.value
    })
    selectedLocation.value = null
  }
}

function handleDirectionsDestinationSelect(point: any) {
  if (map && point) {
    map.flyTo({
      center: point.coordinates,
      zoom: 10,
      duration: 1000
    })
    addMarker(map, point.coordinates[0], point.coordinates[1])
  }
}

function handleExitDirections() {
  exitDirections()
  selectedLocation.value = null
  removeMarker()
  if (map) {
    regionLayer.highlightRegionBorder(map, null)
  }
}

async function handleStartAdventure(payload: { origin: any; destination: any; language: string }) {
  const { origin, destination, language } = payload
  if (!origin?.coordinates || !destination?.coordinates) return

  try {
    adventureLoading.value = true
    const trip = await createTrip({
      name: `${origin.name} to ${destination.name}`,
      start: { lng: origin.coordinates[0], lat: origin.coordinates[1] },
      end: { lng: destination.coordinates[0], lat: destination.coordinates[1] },
      transport_mode: 'walk',
      start_date: timestampISO.value,
    })
    // Fetch the trip to get the route data
    const tripData = await getTrip(trip.id)
    // Draw the full trip route
    if (map && tripData?.route) {
      drawFullTripRoute(map, tripData.route)
    }
    // Generate the first chapter
    const newDay = await generateDay(trip.id, { language })
    // Start animation with the first day's route
    if (newDay?.geometry) {
      startCharacterTravelAnimation(newDay)
    }
    activeTripId.value = trip.id
    handleExitDirections()
  } catch (err) {
    console.error('Failed to start adventure:', err)
  } finally {
    adventureLoading.value = false
  }
}

async function fetchLocationDetails(lng: number, lat: number) {
  if (!map) return

  const locationDetails = await fetchLocationDetailsAtPoint(map, lng, lat, timestampISO.value)
  if (locationDetails) {
    selectedLocation.value = locationDetails
  }
}
</script>

<style scoped>
/* Sobrescribir estilos globales de #app que interfieren con el posicionamiento absoluto */
:deep(.search-container) {
  position: absolute !important;
  top: 1rem !important;
  left: 1rem !important;
  z-index: 9999 !important;
}
</style>
