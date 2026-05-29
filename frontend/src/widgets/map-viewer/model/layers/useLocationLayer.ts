import type { Map as MapLibreMap } from 'maplibre-gl'
import type { LocationCollection } from '@/entities/location'
import { MAP_COLORS } from '../../config/mapColors'
import { useMapLayer } from './useMapLayer'

export function useLocationLayer() {
  const { addLayer, removeLayer } = useMapLayer({
    sourceId: 'locations',
    layerId: 'locations',
    layerType: 'circle',
    paint: {
      'circle-radius': 6,
      'circle-color': MAP_COLORS.locations.primary,
      'circle-stroke-width': 2,
      'circle-stroke-color': MAP_COLORS.locations.stroke
    },
    interactive: true
  })

  const addLocationsLayer = (map: MapLibreMap, data: LocationCollection) => {
    addLayer(map, data)
  }

  return {
    addLocationsLayer,
    removeLayer
  }
}
