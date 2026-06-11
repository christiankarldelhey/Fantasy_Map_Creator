import type { Map as MapLibreMap } from 'maplibre-gl'
import type { LocationCollection } from '@/entities/location'
import { MAP_COLORS } from '../../config/mapColors'
import { useMapLayer } from './useMapLayer'
import { ZOOM_LEVELS, LOCATION_TYPES, createTypeFilter } from '@/shared/config/zoomLevels'

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
    layerId: 'locations-labels-medium',
    layerType: 'symbol',
    minzoom: ZOOM_LEVELS.MEDIUM.min,
    paint: {
      'text-color': '#1e293b',
      'text-halo-color': '#ffffff',
      'text-halo-width': 2
    },
    layout: {
      'text-field': ['get', 'name'],
      'text-font': ['Open Sans Regular'],
      'text-size': 12,
      'text-anchor': 'top',
      'text-offset': [0, 1.5]
    },
    filter: ['any',
      createTypeFilter('type', LOCATION_TYPES.MAJOR),
      createTypeFilter('type', LOCATION_TYPES.MEDIUM)
    ],
    interactive: false
  })

  // Labels for MINOR locations (visible from zoom 8 - NEAR)
  const labelsMinorLayer = useMapLayer({
    sourceId: 'locations',
    layerId: 'locations-labels-minor',
    layerType: 'symbol',
    minzoom: ZOOM_LEVELS.NEAR.min,
    paint: {
      'text-color': '#1e293b',
      'text-halo-color': '#ffffff',
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

  const addLocationsLayer = (map: MapLibreMap, data: LocationCollection) => {
    // Add all layers in order (bottom to top)
    majorLayer.addLayer(map, data as any)
    mediumLayer.addLayer(map, data as any)
    minorLayer.addLayer(map, data as any)
    labelsMediumLayer.addLayer(map, data as any)
    labelsMinorLayer.addLayer(map, data as any)
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
