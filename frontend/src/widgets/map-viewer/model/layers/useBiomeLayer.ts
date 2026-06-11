import type { Map as MapLibreMap } from 'maplibre-gl'
import type { BiomeCollection } from '@/entities/biome'
import { MAP_COLORS } from '../../config/mapColors'
import { useMapLayer } from './useMapLayer'

export function useBiomeLayer() {
  const fillLayer = useMapLayer({
    sourceId: 'biomes',
    layerId: 'biomes-fill',
    layerType: 'fill',
    paint: {
      'fill-color': [
        'match',
        ['get', 'type'],
        'forest', MAP_COLORS.biomes.forest,
        'desert', MAP_COLORS.biomes.desert,
        'marsh', MAP_COLORS.biomes.marsh,
        MAP_COLORS.biomes.default
      ],
      'fill-opacity': MAP_COLORS.biomes.fillOpacity
    },
    interactive: true
  })

  const outlineLayer = useMapLayer({
    sourceId: 'biomes',
    layerId: 'biomes-outline',
    layerType: 'line',
    paint: {
      'line-color': '#64748b',
      'line-width': 1,
      'line-opacity': 0.6
    }
  })

  const addBiomesLayer = (map: MapLibreMap, data: BiomeCollection) => {
    fillLayer.addLayer(map, data)
    outlineLayer.addLayer(map, data)
  }

  const removeLayer = (map: MapLibreMap) => {
    fillLayer.removeLayer(map)
    outlineLayer.removeLayer(map)
    // Remove source after all layers are removed
    if (map.getSource('biomes')) {
      map.removeSource('biomes')
    }
  }

  return {
    addBiomesLayer,
    removeLayer
  }
}
