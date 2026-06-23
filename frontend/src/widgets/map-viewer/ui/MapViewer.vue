<template>
  <div class="relative w-full h-screen bg-white overflow-visible">
    <div ref="mapContainer" class="w-full h-full" style="min-height: 100vh;"></div>

    <CharacterSelector />

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
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed } from 'vue'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { MAPLIBRE_CONFIG } from '@/shared/config/maplibre'
import { useMapLayers, useMapEvents, useMapMarkers, useMapDataLoading } from '../model'
import { fetchLocationDetailsAtPoint } from '../model/useLocationDetails'
import { SearchInput } from '@/widgets/search-input'
import { LocationSidebar } from '@/widgets/location-sidebar'
import { DirectionsInput } from '@/widgets/directions-input'
import { CalendarPicker } from '@/widgets/calendar-picker'
import { ChapterViewer, useTrips } from '@/features/prompt-management'
import { useDirections } from '@/composables/useDirections'
import { useGlobalClimateTime } from '@/composables/useGlobalClimateTime'
import { useCharacter } from '@/composables/useCharacter'
import CharacterSelector from '@/components/CharacterSelector.vue'
import MapLoadingOverlay from './MapLoadingOverlay.vue'
import type { SearchResult } from '@/entities/search'
import type { LocationDetails } from '@/widgets/location-sidebar'

const mapContainer = ref<HTMLDivElement | null>(null)
const searchInputRef = ref<InstanceType<typeof SearchInput> | null>(null)
const selectedLocation = ref<LocationDetails | null>(null)
let map: maplibregl.Map | null = null

const { isDirectionsMode, startDirections, exitDirections, setDestination, routeData } = useDirections()

// Adventure / trip generation
const { createTrip, generateDay } = useTrips()
const activeTripId = ref<string | null>(null)
const { currentClimateTime, timestampISO } = useGlobalClimateTime()
const lastSelectedCoordinates = ref<[number, number] | null>(null)
const pendingDestinationLocation = ref<LocationDetails | null>(null)

// Character / Company state
const { characters, fetchAllCharacters, setActiveCharacter } = useCharacter()
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

    // Create custom HTML element for character marker
    const el = document.createElement('div')
    el.className = 'character-marker'
    el.style.width = '44px'
    el.style.height = '44px'
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

watch(characters, () => {
  updateCharacterMarker()
}, { deep: true })

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
      
      try {
        await loadAllData()

        // Initialize all layers
        initializeLayers(map!, {
          regions: regions.value,
          biomes: biomes.value,
          water: water.value,
          roads: roads.value,
          locations: locations.value
        })

        // Add region outline last to be on top of all layers
        const regionsData = regions.value
        if (regionsData) {
          regionLayer.addRegionsOutline(map!, regionsData)
        }

        // Setup events
        setupClickHandler(map!, handleLocationClick, handleAddMarker, () => timestampISO.value)

        // Load and display character/company cursor
        try {
          await fetchAllCharacters()
          updateCharacterMarker()
        } catch (err) {
          console.error('Failed to load character position:', err)
        }

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
  characterMarkers.forEach((marker) => marker.remove())
  characterMarkers.clear()
  if (map) {
    clearRoute(map)
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
    const trip = await createTrip({
      name: `${origin.name} to ${destination.name}`,
      start: { lng: origin.coordinates[0], lat: origin.coordinates[1] },
      end: { lng: destination.coordinates[0], lat: destination.coordinates[1] },
      transport_mode: 'walk',
      start_date: timestampISO.value,
    })
    // Generate the first chapter, then open the viewer
    await generateDay(trip.id, { language })
    // Update character position to the end of the first day
    await fetchAllCharacters()
    updateCharacterMarker()
    activeTripId.value = trip.id
    handleExitDirections()
  } catch (err) {
    console.error('Failed to start adventure:', err)
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
