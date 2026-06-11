import type { Map as MapLibreMap } from 'maplibre-gl'
import { MAP_COLORS } from '../../config/mapColors'
import { useMapLayer } from './useMapLayer'
import { ZOOM_LEVELS, ROAD_TYPES, createTypeFilter } from '@/shared/config/zoomLevels'

export function useRoadLayer() {
  // Major roads (visible from zoom 3)
  const majorLayer = useMapLayer({
    sourceId: 'roads',
    layerId: 'roads-major',
    layerType: 'line',
    minzoom: ZOOM_LEVELS.FAR.min,
    paint: {
      'line-color': [
        'match',
        ['get', 'name'],
        'Main Road', MAP_COLORS.roads.main,
        'Royal Road', MAP_COLORS.roads.royal,
        MAP_COLORS.roads.default
      ],
      'line-width': [
        'match',
        ['get', 'name'],
        'Main Road', MAP_COLORS.roads.widthMain,
        'Royal Road', MAP_COLORS.roads.widthRoyal,
        2.5
      ],
      'line-opacity': MAP_COLORS.roads.opacity
    },
    filter: createTypeFilter('name', ROAD_TYPES.MAJOR),
    interactive: true
  })

  // Medium roads (visible from zoom 6)
  const mediumLayer = useMapLayer({
    sourceId: 'roads',
    layerId: 'roads-medium',
    layerType: 'line',
    minzoom: ZOOM_LEVELS.MEDIUM.min,
    paint: {
      'line-color': MAP_COLORS.roads.regular,
      'line-width': MAP_COLORS.roads.widthRegular,
      'line-opacity': MAP_COLORS.roads.opacity
    },
    filter: createTypeFilter('name', ROAD_TYPES.MEDIUM),
    interactive: true
  })

  // Minor roads (visible from zoom 8)
  const minorLayer = useMapLayer({
    sourceId: 'roads',
    layerId: 'roads-minor',
    layerType: 'line',
    minzoom: ZOOM_LEVELS.NEAR.min,
    paint: {
      'line-color': MAP_COLORS.roads.trail,
      'line-width': 2.5,
      'line-opacity': MAP_COLORS.roads.opacity,
      'line-dasharray': [2, 2]
    },
    filter: createTypeFilter('name', ROAD_TYPES.MINOR),
    interactive: true
  })

  const addRoadsLayer = (map: MapLibreMap, data: any) => {
    // Add all layers in order (bottom to top)
    majorLayer.addLayer(map, data)
    mediumLayer.addLayer(map, data)
    minorLayer.addLayer(map, data)
  }

  const removeLayer = (map: MapLibreMap) => {
    if (!map) return
    majorLayer.removeLayer(map)
    mediumLayer.removeLayer(map)
    minorLayer.removeLayer(map)
    // Remove source after all layers are removed
    if (map.getSource('roads')) {
      map.removeSource('roads')
    }
  }

  return {
    addRoadsLayer,
    removeLayer
  }
}
