import type { Map as MapLibreMap } from 'maplibre-gl'
import type { AltitudeCollection } from '@/entities/altitude'
import { MAP_COLORS } from '../../config/mapColors'
import { useMapLayer } from './useMapLayer'

export function useAltitudeLayer() {
  const fillLayer = useMapLayer({
    sourceId: 'altitude',
    layerId: 'altitude-fill',
    layerType: 'fill',
    paint: {
      'fill-color': [
        'match',
        ['get', 'altitude_type'],
        'plain', MAP_COLORS.altitude.plain,
        'hills', MAP_COLORS.altitude.hills,
        'mountains_low', MAP_COLORS.altitude.mountains_low,
        'mountains_med', MAP_COLORS.altitude.mountains_med,
        'mountains_high', MAP_COLORS.altitude.mountains_high,
        MAP_COLORS.altitude.default
      ],
      'fill-opacity': [
        'match',
        ['get', 'altitude_type'],
        'plain', MAP_COLORS.altitude.fillOpacityPlain,
        'hills', MAP_COLORS.altitude.fillOpacityHills,
        'mountains_low', MAP_COLORS.altitude.fillOpacityLow,
        'mountains_med', MAP_COLORS.altitude.fillOpacityMed,
        'mountains_high', MAP_COLORS.altitude.fillOpacityHigh,
        0.2
      ]
    },
    interactive: true
  })

  const outlineLayer = useMapLayer({
    sourceId: 'altitude',
    layerId: 'altitude-outline',
    layerType: 'line',
    paint: {
      'line-color': [
        'match',
        ['get', 'altitude_type'],
        'hills', MAP_COLORS.altitude.outlineColorHills,
        'mountains_low', MAP_COLORS.altitude.outlineColorLow,
        'mountains_med', MAP_COLORS.altitude.outlineColorMed,
        'mountains_high', MAP_COLORS.altitude.outlineColorHigh,
        MAP_COLORS.altitude.outlineColorDefault
      ],
      'line-width': [
        'match',
        ['get', 'altitude_type'],
        'mountains_high', MAP_COLORS.altitude.outlineWidthHigh,
        MAP_COLORS.altitude.outlineWidthDefault
      ]
    }
  })

  const addAltitudeLayer = (map: MapLibreMap, data: AltitudeCollection) => {
    fillLayer.addLayer(map, data)
    outlineLayer.addLayer(map, data)
  }

  const removeLayer = (map: MapLibreMap) => {
    fillLayer.removeLayer(map)
    outlineLayer.removeLayer(map)
  }

  return {
    addAltitudeLayer,
    removeLayer
  }
}
