import type { Map as MapLibreMap } from 'maplibre-gl'
import type { LocationCollection } from '@/entities/location'
import type { MapMode } from '../useMapLayers'
import { MAP_COLORS } from '../../config/mapColors'
import { useMapLayer } from './useMapLayer'
import { ZOOM_LEVELS, LOCATION_TYPES, createTypeFilter } from '@/shared/config/zoomLevels'

// Layer IDs for the hover-label logic
const LABEL_MEDIUM_ID = 'locations-labels-medium'
const LABEL_MINOR_ID = 'locations-labels-minor'

// Circle layers that trigger hover labels in wander mode
const HOVER_CIRCLE_LAYERS = ['locations-major', 'locations-medium', 'locations-minor']

// Original filter for the medium label layer (MAJOR + MEDIUM types)
const MEDIUM_LABEL_FILTER = ['any',
  createTypeFilter('type', LOCATION_TYPES.MAJOR),
  createTypeFilter('type', LOCATION_TYPES.MEDIUM)
] as any

export function useLocationLayer() {
  // Major locations (visible from zoom 2)
  const majorLayer = useMapLayer({
    sourceId: 'locations',
    layerId: 'locations-major',
    layerType: 'circle',
    minzoom: ZOOM_LEVELS.FAR.min,
    paint: {
      'circle-radius': 7,
      'circle-color': MAP_COLORS.locations.primary,
      'circle-opacity': 0.5,
      'circle-stroke-width': 2,
      'circle-stroke-color': MAP_COLORS.locations.stroke
    },
    filter: createTypeFilter('type', LOCATION_TYPES.MAJOR),
    interactive: true
  })

  // Medium locations (visible from zoom 6 - MEDIUM, same as labels)
  const mediumLayer = useMapLayer({
    sourceId: 'locations',
    layerId: 'locations-medium',
    layerType: 'circle',
    minzoom: ZOOM_LEVELS.MEDIUM.min,
    paint: {
      'circle-radius': 6,
      'circle-color': MAP_COLORS.locations.primary,
      'circle-opacity': 0.4,
      'circle-stroke-width': 2,
      'circle-stroke-color': MAP_COLORS.locations.stroke
    },
    filter: createTypeFilter('type', LOCATION_TYPES.MEDIUM),
    interactive: true
  })

  // Minor locations (visible from zoom 8)
  const minorLayer = useMapLayer({
    sourceId: 'locations',
    layerId: 'locations-minor',
    layerType: 'circle',
    minzoom: ZOOM_LEVELS.NEAR.min,
    paint: {
      'circle-radius': 4,
      'circle-color': MAP_COLORS.locations.primary,
      'circle-opacity': 0.3,
      'circle-stroke-width': 1.5,
      'circle-stroke-color': MAP_COLORS.locations.stroke
    },
    filter: createTypeFilter('type', LOCATION_TYPES.MINOR),
    interactive: true
  })

  // Labels for MAJOR and MEDIUM locations (visible from zoom 6 - MEDIUM)
  const labelsMediumLayer = useMapLayer({
    sourceId: 'locations',
    layerId: LABEL_MEDIUM_ID,
    layerType: 'symbol',
    minzoom: ZOOM_LEVELS.MEDIUM.min,
    paint: {
      'text-color': '#2c2416',
      'text-halo-color': '#f4e4c1',
      'text-halo-width': 2
    },
    layout: {
      'text-field': ['get', 'name'],
      'text-font': ['Open Sans Regular'],
      'text-size': 12,
      'text-anchor': 'top',
      'text-offset': [0, 1.5]
    },
    filter: MEDIUM_LABEL_FILTER,
    interactive: false
  })

  // Labels for MINOR locations (visible from zoom 8 - NEAR)
  const labelsMinorLayer = useMapLayer({
    sourceId: 'locations',
    layerId: LABEL_MINOR_ID,
    layerType: 'symbol',
    minzoom: ZOOM_LEVELS.NEAR.min,
    paint: {
      'text-color': '#2c2416',
      'text-halo-color': '#f4e4c1',
      'text-halo-width': 2
    },
    layout: {
      'text-field': ['get', 'name'],
      'text-font': ['Open Sans Regular'],
      'text-size': 12,
      'text-anchor': 'top',
      'text-offset': [0, 1.5]
    },
    filter: createTypeFilter('type', LOCATION_TYPES.MINOR),
    interactive: false
  })

  // -------------------------------------------------------------------------
  // Hover-label wiring for wander mode
  // In wander, labels are hidden by default (zoom < NEAR).
  // Hovering a circle shows only that feature's label.
  // -------------------------------------------------------------------------
  function attachWanderHoverLabels(map: MapLibreMap) {
    const isNearZoom = () => map.getZoom() >= ZOOM_LEVELS.NEAR.min

    // Sync medium label opacity based on zoom level
    function syncMediumLabels() {
      if (isNearZoom()) {
        map.setPaintProperty(LABEL_MEDIUM_ID, 'text-opacity', 1)
        map.setFilter(LABEL_MEDIUM_ID, MEDIUM_LABEL_FILTER)
      } else {
        map.setPaintProperty(LABEL_MEDIUM_ID, 'text-opacity', 0)
        map.setFilter(LABEL_MEDIUM_ID, MEDIUM_LABEL_FILTER)
      }
    }

    // Initial state
    syncMediumLabels()

    // Keep in sync as user zooms
    map.on('zoom', syncMediumLabels)

    HOVER_CIRCLE_LAYERS.forEach((circleLayerId) => {
      map.on('mouseenter', circleLayerId, (e) => {
        // In NEAR zoom, all labels are already visible — no need for hover logic
        if (isNearZoom()) return
        if (!e.features || e.features.length === 0) return
        const name = e.features[0].properties?.name
        if (!name) return

        map.setPaintProperty(LABEL_MEDIUM_ID, 'text-opacity', 1)
        map.setFilter(LABEL_MEDIUM_ID, ['==', ['get', 'name'], name])
      })

      map.on('mouseleave', circleLayerId, () => {
        // In NEAR zoom, keep labels visible
        if (isNearZoom()) return
        map.setPaintProperty(LABEL_MEDIUM_ID, 'text-opacity', 0)
        map.setFilter(LABEL_MEDIUM_ID, MEDIUM_LABEL_FILTER)
      })
    })
  }

  const addLocationsLayer = (map: MapLibreMap, data: LocationCollection, mode: MapMode = 'explore') => {
    // Add all layers in order (bottom to top)
    majorLayer.addLayer(map, data as any)
    mediumLayer.addLayer(map, data as any)
    minorLayer.addLayer(map, data as any)
    labelsMediumLayer.addLayer(map, data as any)
    labelsMinorLayer.addLayer(map, data as any)

    if (mode === 'wander') {
      attachWanderHoverLabels(map)
    }
  }

  const removeLayer = (map: MapLibreMap) => {
    if (!map) return
    majorLayer.removeLayer(map)
    mediumLayer.removeLayer(map)
    minorLayer.removeLayer(map)
    labelsMediumLayer.removeLayer(map)
    labelsMinorLayer.removeLayer(map)
    // Remove source after all layers are removed
    if (map.getSource('locations')) {
      map.removeSource('locations')
    }
  }

  return {
    addLocationsLayer,
    removeLayer
  }
}
