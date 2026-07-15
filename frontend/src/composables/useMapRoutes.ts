import maplibregl from 'maplibre-gl'
import { lineString, point } from '@turf/helpers'
import { medievalColors } from '@/app/theme/colors'

const DANGER_RED = medievalColors.danger.base

// ============================================================================
// Layer/source ID constants
// ============================================================================
export const LAYER_IDS = {
  tripDay: 'trip-day-route-layer',
  completedRoute: 'completed-route-layer',
  remainingRoute: 'remaining-route-layer',
  tripDestination: 'trip-destination-layer',
  directionsOnRoad: 'route-on-road-layer',
  directionsOffRoadStart: 'route-off-road-start-layer',
  directionsOffRoadEnd: 'route-off-road-end-layer',
  directionsCheckpoints: 'route-checkpoints-layer',
}

export const SOURCE_IDS = {
  tripDay: 'trip-day-route',
  completedRoute: 'completed-route',
  remainingRoute: 'remaining-route',
  tripDestination: 'trip-destination',
  directionsOnRoad: 'route-on-road',
  directionsOffRoadStart: 'route-off-road-start',
  directionsOffRoadEnd: 'route-off-road-end',
  directionsCheckpoints: 'route-checkpoints',
}

// ============================================================================
// Helper: flatten the backend route geometry into a single coordinate array
// ============================================================================
function flattenRouteToCoords(routeData: any): number[][] {
  const all: number[][] = []

  if (!routeData) return all

  if (routeData.geometry) {
    const g = routeData.geometry

    if (g.off_road_start?.geometry?.coordinates) {
      all.push(...g.off_road_start.geometry.coordinates)
    }

    if (g.on_road?.features) {
      g.on_road.features.forEach((feature: any) => {
        if (feature.geometry?.coordinates) {
          const coords = feature.geometry.coordinates
          // Skip first coord to avoid duplicates at junctions
          all.length > 0 ? all.push(...coords.slice(1)) : all.push(...coords)
        }
      })
    }

    if (g.off_road_end?.geometry?.coordinates) {
      const coords = g.off_road_end.geometry.coordinates
      all.length > 0 ? all.push(...coords.slice(1)) : all.push(...coords)
    }
  } else if (routeData.coordinates) {
    all.push(...routeData.coordinates)
  }

  return all
}

// ============================================================================
// Helper: safe remove layer + source
// ============================================================================
function removeLayerSource(map: maplibregl.Map, layerId: string, sourceId: string) {
  if (map.getLayer(layerId)) map.removeLayer(layerId)
  if (map.getSource(sourceId)) map.removeSource(sourceId)
}

// ============================================================================
// Trip day route (green progressive line drawn during animation)
// ============================================================================
export function initTripDayRoute(map: maplibregl.Map, allCoords: number[][], fitMap = true) {
  clearTripDayRoute(map)

  if (allCoords.length < 2) return

  // Start with an empty line — it will grow via updateTripDayRouteProgress
  const empty = lineString([allCoords[0], allCoords[0]])
  map.addSource(SOURCE_IDS.tripDay, { type: 'geojson', data: empty })
  map.addLayer({
    id: LAYER_IDS.tripDay,
    type: 'line',
    source: SOURCE_IDS.tripDay,
    layout: { 'line-join': 'round', 'line-cap': 'round' },
    paint: { 'line-color': '#16a34a', 'line-width': 5, 'line-opacity': 0.9 },
  })
  map.moveLayer(LAYER_IDS.tripDay)

  if (fitMap) {
    const bounds = new maplibregl.LngLatBounds()
    allCoords.forEach((c) => bounds.extend(c as [number, number]))
    map.fitBounds(bounds, { padding: { top: 80, bottom: 80, left: 80, right: 620 }, maxZoom: 7, duration: 1200 })
  }
}

export function updateTripDayRouteProgress(
  map: maplibregl.Map,
  allCoords: number[][],
  currentPos: [number, number],
  segIdx: number,
) {
  const src = map.getSource(SOURCE_IDS.tripDay) as maplibregl.GeoJSONSource | undefined
  if (!src) return

  // Coordinates drawn so far: all points up to segIdx + the interpolated current position
  const drawn = allCoords.slice(0, segIdx + 1) as number[][]
  drawn.push(currentPos)

  src.setData(lineString(drawn))
}

/** Legacy helper used when restoring a geometry object (non-progressive) */
export function drawTripDayRoute(map: maplibregl.Map, geometry: any) {
  let coords: any
  if (typeof geometry === 'string') {
    try { coords = JSON.parse(geometry) } catch { return }
  } else {
    coords = geometry
  }
  initTripDayRoute(map, coords?.coordinates ?? [])
}

export function clearTripDayRoute(map: maplibregl.Map) {
  removeLayerSource(map, LAYER_IDS.tripDay, SOURCE_IDS.tripDay)
}

// ============================================================================
// Completed route (green solid line)
// ============================================================================
export function drawCompletedRoute(map: maplibregl.Map, routeCompleted: any) {
  clearCompletedRoute(map)

  if (!routeCompleted?.coordinates || routeCompleted.coordinates.length < 2) return

  map.addSource(SOURCE_IDS.completedRoute, { type: 'geojson', data: lineString(routeCompleted.coordinates) })
  map.addLayer({
    id: LAYER_IDS.completedRoute,
    type: 'line',
    source: SOURCE_IDS.completedRoute,
    layout: { 'line-join': 'round', 'line-cap': 'round' },
    paint: { 'line-color': '#16a34a', 'line-width': 5, 'line-opacity': 0.9 },
  })
}

export function clearCompletedRoute(map: maplibregl.Map) {
  removeLayerSource(map, LAYER_IDS.completedRoute, SOURCE_IDS.completedRoute)
}

// ============================================================================
// Remaining route (brown dashed line — full trip route)
// ============================================================================
export function drawRemainingRoute(map: maplibregl.Map, routeData: any) {
  clearRemainingRoute(map)

  const allCoordinates = flattenRouteToCoords(routeData)
  if (allCoordinates.length < 2) return

  map.addSource(SOURCE_IDS.remainingRoute, { type: 'geojson', data: lineString(allCoordinates) })
  map.addLayer({
    id: LAYER_IDS.remainingRoute,
    type: 'line',
    source: SOURCE_IDS.remainingRoute,
    layout: { 'line-join': 'round', 'line-cap': 'round' },
    paint: { 'line-color': DANGER_RED, 'line-width': 3, 'line-opacity': 0.8, 'line-dasharray': [2, 3] },
  })

  // Keep the dashed line above location circles but below their labels
  const labelsLayerId = 'locations-labels-medium'
  if (map.getLayer(labelsLayerId)) {
    map.moveLayer(LAYER_IDS.remainingRoute, labelsLayerId)
  }

  // Red destination circle marking the end of the trip
  const destination = allCoordinates[allCoordinates.length - 1]
  map.addSource(SOURCE_IDS.tripDestination, { type: 'geojson', data: point(destination) })
  map.addLayer({
    id: LAYER_IDS.tripDestination,
    type: 'circle',
    source: SOURCE_IDS.tripDestination,
    paint: {
      'circle-radius': 8,
      'circle-color': DANGER_RED,
      'circle-opacity': 0.5,
      'circle-stroke-width': 0,
    },
  })

  if (map.getLayer(labelsLayerId)) {
    map.moveLayer(LAYER_IDS.tripDestination, labelsLayerId)
  }
}

export function clearRemainingRoute(map: maplibregl.Map) {
  removeLayerSource(map, LAYER_IDS.remainingRoute, SOURCE_IDS.remainingRoute)
  removeLayerSource(map, LAYER_IDS.tripDestination, SOURCE_IDS.tripDestination)
}

// ============================================================================
// Directions route (on-road + off-road segments for the directions widget)
// ============================================================================
export function drawDirectionsRoute(map: maplibregl.Map, data: any) {
  clearDirectionsRoute(map)

  const g = data?.geometry
  if (!g) return

  if (g.on_road?.features?.length > 0) {
    map.addSource(SOURCE_IDS.directionsOnRoad, { type: 'geojson', data: g.on_road })
    map.addLayer({
      id: LAYER_IDS.directionsOnRoad,
      type: 'line',
      source: SOURCE_IDS.directionsOnRoad,
      layout: { 'line-join': 'round', 'line-cap': 'round' },
      paint: { 'line-color': DANGER_RED, 'line-width': 5, 'line-opacity': 0.85 },
    })
    map.moveLayer(LAYER_IDS.directionsOnRoad)
  }

  const offRoadStyle = {
    layout: { 'line-join': 'round' as const, 'line-cap': 'round' as const },
    paint: { 'line-color': DANGER_RED, 'line-width': 4, 'line-opacity': 0.8, 'line-dasharray': [2, 2] },
  }

  if (g.off_road_start) {
    map.addSource(SOURCE_IDS.directionsOffRoadStart, { type: 'geojson', data: g.off_road_start })
    map.addLayer({ id: LAYER_IDS.directionsOffRoadStart, type: 'line', source: SOURCE_IDS.directionsOffRoadStart, ...offRoadStyle })
    map.moveLayer(LAYER_IDS.directionsOffRoadStart)
  }

  if (g.off_road_end) {
    map.addSource(SOURCE_IDS.directionsOffRoadEnd, { type: 'geojson', data: g.off_road_end })
    map.addLayer({ id: LAYER_IDS.directionsOffRoadEnd, type: 'line', source: SOURCE_IDS.directionsOffRoadEnd, ...offRoadStyle })
    map.moveLayer(LAYER_IDS.directionsOffRoadEnd)
  }

  // Daily checkpoints as small red circles on top of the route
  if (data?.checkpoints && data.checkpoints.length > 0) {
    const checkpointFeatures = data.checkpoints.map((c: any) => ({
      type: 'Feature' as const,
      geometry: {
        type: 'Point' as const,
        coordinates: c.coordinates
      },
      properties: {
        day_number: c.day_number,
        name: c.location?.name || `Day ${c.day_number}`,
        type: c.location?.type || null
      }
    }))

    map.addSource(SOURCE_IDS.directionsCheckpoints, {
      type: 'geojson',
      data: {
        type: 'FeatureCollection' as const,
        features: checkpointFeatures
      }
    })

    map.addLayer({
      id: LAYER_IDS.directionsCheckpoints,
      type: 'circle',
      source: SOURCE_IDS.directionsCheckpoints,
      paint: {
        'circle-radius': 5,
        'circle-color': DANGER_RED,
        'circle-opacity': 0.9,
        'circle-stroke-width': 1,
        'circle-stroke-color': '#ffffff'
      }
    })
    map.moveLayer(LAYER_IDS.directionsCheckpoints)
  }

  // Fit bounds
  const bounds = new maplibregl.LngLatBounds()
  if (g.off_road_start) g.off_road_start.geometry.coordinates.forEach((c: any) => bounds.extend(c))
  if (g.on_road) g.on_road.features.forEach((f: any) => f.geometry.coordinates.forEach((c: any) => bounds.extend(c)))
  if (g.off_road_end) g.off_road_end.geometry.coordinates.forEach((c: any) => bounds.extend(c))
  if (!bounds.isEmpty()) {
    map.fitBounds(bounds, { padding: { top: 80, bottom: 80, left: 450, right: 80 }, duration: 1500 })
  }
}

export function clearDirectionsRoute(map: maplibregl.Map) {
  removeLayerSource(map, LAYER_IDS.directionsOnRoad, SOURCE_IDS.directionsOnRoad)
  removeLayerSource(map, LAYER_IDS.directionsOffRoadStart, SOURCE_IDS.directionsOffRoadStart)
  removeLayerSource(map, LAYER_IDS.directionsOffRoadEnd, SOURCE_IDS.directionsOffRoadEnd)
  removeLayerSource(map, LAYER_IDS.directionsCheckpoints, SOURCE_IDS.directionsCheckpoints)
}

// ============================================================================
// Clear all trip-related routes
// ============================================================================
export function clearAllTripRoutes(map: maplibregl.Map) {
  clearTripDayRoute(map)
  clearCompletedRoute(map)
  clearRemainingRoute(map)
}
