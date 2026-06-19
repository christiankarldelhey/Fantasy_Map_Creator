import { ref, watch } from 'vue'
import type { SearchResult } from '@/entities/search'
import { fetchDirections } from '@/entities/directions/api/directionsApi'
import type { DirectionsResponse } from '@/entities/directions/model/types'

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

export function useDirections() {
  function startDirections(initialDestination: { name: string; coordinates: [number, number]; id?: number; type?: 'location' | 'region' }) {
    destination.value = {
      id: initialDestination.id,
      name: initialDestination.name,
      type: initialDestination.type || 'location',
      coordinates: initialDestination.coordinates
    }
    isDirectionsMode.value = true
  }

  function setOrigin(point: DirectionsPoint | null) {
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
    exitDirections
  }
}
