import type { Map as MapLibreMap } from 'maplibre-gl'
import type { RegionCollection } from '@/entities/region'
import { MAP_COLORS } from '../../config/mapColors'
import { useMapLayer } from './useMapLayer'

export function useRegionLayer() {
  const fillLayer = useMapLayer({
    sourceId: 'regions',
    layerId: 'regions-fill',
    layerType: 'fill',
    paint: {
      'fill-color': [
        'match',
        ['get', 'kingdom'],
        'Gondor', MAP_COLORS.regions.gondor,
        'Rohan', MAP_COLORS.regions.rohan,
        'Mordor', MAP_COLORS.regions.mordor,
        'Rivendell', MAP_COLORS.regions.rivendell,
        'Shire', MAP_COLORS.regions.shire,
        MAP_COLORS.regions.default
      ],
      'fill-opacity': MAP_COLORS.regions.fillOpacity
    },
    interactive: true
  })

  const outlineLayer = useMapLayer({
    sourceId: 'regions',
    layerId: 'regions-outline',
    layerType: 'line',
    paint: {
      'line-color': MAP_COLORS.regions.outlineColor,
      'line-width': MAP_COLORS.regions.outlineWidth,
      'line-opacity': 0.8
    }
  })

  const addRegionsLayer = (map: MapLibreMap, data: RegionCollection) => {
    fillLayer.addLayer(map, data)
    outlineLayer.addLayer(map, data)
  }

  const removeLayer = (map: MapLibreMap) => {
    fillLayer.removeLayer(map)
    outlineLayer.removeLayer(map)
  }

  return {
    addRegionsLayer,
    removeLayer
  }
}
