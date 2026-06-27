<template>
  <div class="relative w-full h-screen bg-white overflow-visible">
    <div ref="mapContainer" class="w-full h-full" style="min-height: 100vh;"></div>

    <CharacterSelector v-if="mode === 'wander'" />

    <CharacterActiveHud v-if="mode === 'wander' && activeCharacter" />

    <DateSeasonPanel
      v-if="!activeTripId"
      @click="showSeasonSelector = true"
    />

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

    <CalendarPicker v-if="mode !== 'wander'" />

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

    <Modal
      v-if="showCancelForDirectionsModal"
      title="Abandon current adventure?"
      size="sm"
      @close="showCancelForDirectionsModal = false"
    >
      <div class="px-6 py-4 font-book text-ink-black text-sm leading-relaxed">
        <p>The road calls, but a tale is still being written.</p>
        <p class="mt-2 text-ink-brown">If you set new directions now, your current adventure will be abandoned and lost to the ages.</p>
        <p class="mt-2 font-semibold">Are you sure you wish to leave it behind?</p>
      </div>
      <div class="px-6 pb-5 flex gap-3 justify-end">
        <Button variant="outline" size="sm" @click="showCancelForDirectionsModal = false">Keep adventuring</Button>
        <Button variant="danger" size="sm" @click="handleConfirmCancelForDirections">Abandon &amp; get directions</Button>
      </div>
    </Modal>

    <SeasonSelectModal
      v-if="showSeasonSelector"
      @confirm="showSeasonSelector = false"
      @cancel="showSeasonSelector = false"
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
import { useCharacterAnimation } from '@/composables/useCharacterAnimation'
import {
  drawCompletedRoute,
  drawRemainingRoute,
  clearCompletedRoute,
  clearRemainingRoute,
  drawDirectionsRoute,
  clearDirectionsRoute,
  clearAllTripRoutes,
} from '@/composables/useMapRoutes'
import CharacterSelector from '@/components/CharacterSelector.vue'
import CharacterActiveHud from '@/components/CharacterActiveHud.vue'
import DateSeasonPanel from '@/components/DateSeasonPanel.vue'
import MapLoadingOverlay from './MapLoadingOverlay.vue'
import SeasonSelectModal from '@/pages/welcome/SeasonSelectModal.vue'
import { Loader } from '@/components/ui/loader'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
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
const showCancelForDirectionsModal = ref(false)
const showSeasonSelector = ref(false)

const adventurePhrases = [
  'Consulting the old maps and the older roads…',
  'Rousing the things that stir in the dark places…',
  'Asking the wind which way the weather turns…',
  'Waking sleeping dragons (quietly)…',
  'Setting your feet upon the road that goes ever on…'
]

// Character / Company state
const { characters, activeCharacter, fetchAllCharacters, setActiveCharacter } = useCharacter()
const { user, fetchUserSettings, saveUserSettings } = useUserSettings()

// Animation
const {
  isAnimating,
  characterMarkers,
  updateCharacterMarkers,
  removeAllMarkers,
  startAnimation,
  cancelCurrentAnimation,
} = useCharacterAnimation()

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

function updateCharacterMarker() {
  if (!map) return
  updateCharacterMarkers(map, characters.value)
  // Re-attach click handlers for character switching
  characters.value.forEach((character) => {
    const marker = characterMarkers.get(character.id)
    if (marker && !character.active) {
      marker.getElement().addEventListener('click', (e) => {
        e.stopPropagation()
        setActiveCharacter(character.id)
      })
    }
  })
}

function startCharacterTravelAnimation(day: any) {
  if (!map) return
  startAnimation(map, day, activeTripId.value)
}

defineExpose({ startCharacterTravelAnimation })

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
      // Trip was deactivated, clear the routes
      clearCompletedRoute(map)
      clearRemainingRoute(map)
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
            await fetchUserSettings()
            await fetchAllCharacters()
            updateCharacterMarker()
            // Restore active trip from user settings if the active character has one
            const savedTripId = user.value?.active_trip_id
            if (savedTripId && activeCharacter.value) {
              activeTripId.value = savedTripId
              console.log('✅ Restored active trip from user settings:', savedTripId)
              // Draw the completed and remaining routes
              if (user.value?.active_trip?.route) {
                drawRemainingRoute(map!, user.value.active_trip.route)
                drawCompletedRoute(map!, user.value.active_trip.route_completed)
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
    locationLayer.addLocationsLayer(map!, newLocations, props.mode || 'explore')
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


watch(routeData, (newRoute) => {
  if (map) {
    if (newRoute) {
      drawDirectionsRoute(map, newRoute)
    } else {
      clearDirectionsRoute(map)
    }
  }
})

onUnmounted(() => {
  cancelCurrentAnimation()
  removeAllMarkers()
  if (map) {
    clearDirectionsRoute(map)
    clearAllTripRoutes(map)
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
  if (!selectedLocation.value || !lastSelectedCoordinates.value) return
  if (activeTripId.value) {
    showCancelForDirectionsModal.value = true
    return
  }
  _doStartDirections()
}

function _doStartDirections() {
  if (!selectedLocation.value || !lastSelectedCoordinates.value) return
  startDirections({
    id: selectedLocation.value.regionId,
    name: selectedLocation.value.name,
    type: selectedLocation.value.type === 'Region' ? 'region' : 'location',
    coordinates: lastSelectedCoordinates.value
  })
  selectedLocation.value = null
}

async function handleConfirmCancelForDirections() {
  try {
    await saveUserSettings({ active_trip_id: null })
    activeTripId.value = null
    showCancelForDirectionsModal.value = false
    _doStartDirections()
  } catch (err) {
    console.error('Failed to cancel adventure for directions:', err)
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
    // Draw the completed and remaining routes
    if (map && tripData?.route) {
      drawRemainingRoute(map, tripData.route)
      drawCompletedRoute(map, tripData.route_completed)
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
