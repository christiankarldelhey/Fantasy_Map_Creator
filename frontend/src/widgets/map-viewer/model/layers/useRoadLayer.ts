import type { Map as MapLibreMap } from 'maplibre-gl'
import { MAP_COLORS } from '../../config/mapColors'
import { useMapLayer } from './useMapLayer'

export function useRoadLayer() {
  const lineLayer = useMapLayer({
    sourceId: 'roads',
    layerId: 'roads-line',
    layerType: 'line',
    paint: {
      'line-color': [
        'match',
        ['get', 'name'],
        'Trail', MAP_COLORS.roads.trail,
        'Regular Road', MAP_COLORS.roads.regular,
        'Main Road', MAP_COLORS.roads.main,
        'Royal Road', MAP_COLORS.roads.royal,
        MAP_COLORS.roads.default
      ],
      'line-width': [
        'match',
        ['get', 'name'],
        'Trail', MAP_COLORS.roads.widthTrail,
        'Regular Road', MAP_COLORS.roads.widthRegular,
        'Main Road', MAP_COLORS.roads.widthMain,
        'Royal Road', MAP_COLORS.roads.widthRoyal,
        1.5
      ],
      'line-opacity': MAP_COLORS.roads.opacity
    },
    interactive: true
  })

  const addRoadsLayer = (map: MapLibreMap, data: any) => {
    lineLayer.addLayer(map, data)
  }

  return {
    addRoadsLayer,
    removeLayer: lineLayer.removeLayer
  }
}
