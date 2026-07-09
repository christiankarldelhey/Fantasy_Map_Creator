import { ref, watch } from 'vue'
import type { SearchResult } from '@/entities/search'
import { fetchDirections } from '@/entities/directions/api/directionsApi'
import type { DirectionsResponse } from '@/entities/directions/model/types'
import { useCharacter } from '@/composables/useCharacter'
import { useUserSettings } from './useUserSettings'

const TOKEN_KEY = 'me-auth-token'

export interface DirectionsPoint {
  id?: number
  name: string
  type: 'location' | 'region' | 'custom'
  coordinates: [number, number] // [lng, lat]
}

export function mapSearchResultToPoint(result: SearchResult): DirectionsPoint {
  let coordinates: [number, number] = [0, 0]
  
  if (result.geometry.type === 'Point') {
    const coords = (result.geometry as GeoJSON.Point).coordinates
    coordinates = [coords[0], coords[1]]
  } else if (result.geometry.type === 'Polygon') {
    // Basic centroid/representative point from bounding box or first coordinate path
    const coords = (result.geometry as GeoJSON.Polygon).coordinates[0]
    if (coords && coords.length > 0) {
      let sumLng = 0
      let sumLat = 0
      coords.forEach(coord => {
        sumLng += coord[0]
        sumLat += coord[1]
      })
      coordinates = [sumLng / coords.length, sumLat / coords.length]
    }
  } else if (result.geometry.type === 'MultiPolygon') {
    const coords = (result.geometry as GeoJSON.MultiPolygon).coordinates[0]?.[0]
    if (coords && coords.length > 0) {
      let sumLng = 0
      let sumLat = 0
      coords.forEach(coord => {
        sumLng += coord[0]
        sumLat += coord[1]
      })
      coordinates = [sumLng / coords.length, sumLat / coords.length]
    }
  }

  return {
    id: result.id,
    name: result.name,
    type: result.type,
    coordinates
  }
}

// Shared state for directions
const isDirectionsMode = ref(false)
const origin = ref<DirectionsPoint | null>(null)
const destination = ref<DirectionsPoint | null>(null)
const routeData = ref<DirectionsResponse | null>(null)
const routeLoading = ref(false)
const routeError = ref<string | null>(null)

// Mode-aware isolation: 'explore' never persists/loads; 'wander' owns persistence
const activeMode = ref<'explore' | 'wander' | null>(null)
const isInitializing = ref(false)

const { activeCharacter } = useCharacter()
const { savePartialSettings } = useUserSettings()

// Sync origin with activeCharacter position whenever it changes and directions mode is active.
// Only for wander mode: in explore the origin is free (searchable / map click).
watch(activeCharacter, (newChar) => {
  const hasToken = !!localStorage.getItem(TOKEN_KEY)
  console.log('🔍 activeCharacter watcher:', { isDirectionsMode: isDirectionsMode.value, hasToken, activeMode: activeMode.value, newChar: newChar?.name })

  if (activeMode.value !== 'wander') return

  if (isDirectionsMode.value && newChar && hasToken) {
    origin.value = {
      name: newChar.name || 'Aranath',
      type: 'custom',
      coordinates: [newChar.current_lng, newChar.current_lat]
    }
    console.log('✅ Set origin from character:', origin.value)
  } else if (!hasToken && origin.value) {
    // Clear origin if we're in guest mode and origin was set from character
    origin.value = null
    console.log('🧹 Cleared origin (guest mode)')
  }
})

// Clear directions state when auth state changes (guest <-> logged transition)
watch(() => localStorage.getItem(TOKEN_KEY), (newToken, oldToken) => {
  console.log('🔄 Auth token changed:', { oldToken: !!oldToken, newToken: !!newToken })
  if (newToken !== oldToken) {
    // Auth state changed, clear directions to prevent contamination
    const oldState = { isDirectionsMode: isDirectionsMode.value, origin: origin.value?.name, destination: destination.value?.name }
    isDirectionsMode.value = false
    origin.value = null
    destination.value = null
    routeData.value = null
    routeError.value = null
    console.log('🔄 Auth state changed, cleared directions state. Old state:', oldState)
  }
})

// Persist directions state to backend when it changes.
// Only for wander mode; explore never writes to the DB.
watch([isDirectionsMode, destination], ([newMode, newDest]) => {
  if (activeMode.value !== 'wander') return
  if (!localStorage.getItem('me-auth-token')) return
  if (isInitializing.value) return
  savePartialSettings({
    directions: {
      destination: newDest || undefined,
      is_active: newMode
    }
  }).catch(err => {
    console.error('Failed to save directions to backend:', err)
  })
})

async function calculateRoute() {
  if (!origin.value || !destination.value) {
    routeData.value = null
    return
  }
  
  routeLoading.value = true
  routeError.value = null
  
  try {
    const response = await fetchDirections(
      origin.value.coordinates[0],
      origin.value.coordinates[1],
      destination.value.coordinates[0],
      destination.value.coordinates[1]
    )
    routeData.value = response.data
  } catch (error: any) {
    console.error('Error fetching directions:', error)
    routeError.value = error?.response?.data?.error || 'Failed to calculate route'
    routeData.value = null
  } finally {
    routeLoading.value = false
  }
}

// Watch changes to trigger route calculation automatically
watch([origin, destination], () => {
  calculateRoute()
})

function resetDirectionsState() {
  isDirectionsMode.value = false
  origin.value = null
  destination.value = null
  routeData.value = null
  routeError.value = null
}

export function useDirections() {
  const { user } = useUserSettings()

  // Load directions from backend settings for wander mode.
  function initializeFromBackend() {
    if (!localStorage.getItem(TOKEN_KEY)) {
      console.log('⏭️ Skipping directions initialization (guest mode)')
      return
    }

    if (user.value?.settings?.directions?.is_active && user.value?.settings?.directions?.destination) {
      const savedDest = user.value.settings.directions.destination
      destination.value = savedDest
      isDirectionsMode.value = true
      console.log('✅ Loaded directions from backend settings:', savedDest)

      // Set origin from active character position if available
      if (activeCharacter.value) {
        origin.value = {
          name: activeCharacter.value.name || 'Aranath',
          type: 'custom',
          coordinates: [activeCharacter.value.current_lng, activeCharacter.value.current_lat]
        }
      }
    }
  }

  // Mode-aware setup: always reset first, then load persisted state only in wander.
  function configureForMode(mode: 'explore' | 'wander') {
    console.log('🔧 configureForMode:', { mode, previous: activeMode.value })
    isInitializing.value = true
    resetDirectionsState()
    activeMode.value = mode
    if (mode === 'wander') {
      initializeFromBackend()
    }
    isInitializing.value = false
    console.log('✅ configureForMode done:', { mode, isDirectionsMode: isDirectionsMode.value, origin: origin.value?.name, destination: destination.value?.name })
  }

  function startDirections(initialDestination: { name: string; coordinates: [number, number]; id?: number; type?: 'location' | 'region' }) {
    if (activeCharacter.value) {
      origin.value = {
        name: activeCharacter.value.name || 'Aranath',
        type: 'custom',
        coordinates: [activeCharacter.value.current_lng, activeCharacter.value.current_lat]
      }
    } else {
      origin.value = null
    }

    destination.value = {
      id: initialDestination.id,
      name: initialDestination.name,
      type: initialDestination.type || 'location',
      coordinates: initialDestination.coordinates
    }
    isDirectionsMode.value = true
  }

  function setOrigin(point: DirectionsPoint | null) {
    console.log('📍 setOrigin called:', point)
    origin.value = point
  }

  function setDestination(point: DirectionsPoint | null) {
    destination.value = point
  }

  function swapPoints() {
    const temp = origin.value
    origin.value = destination.value
    destination.value = temp
  }

  function exitDirections() {
    isDirectionsMode.value = false
    origin.value = null
    destination.value = null
    routeData.value = null
    routeError.value = null
  }

  return {
    isDirectionsMode,
    origin,
    destination,
    routeData,
    routeLoading,
    routeError,
    startDirections,
    setOrigin,
    setDestination,
    swapPoints,
    exitDirections,
    configureForMode
  }
}
