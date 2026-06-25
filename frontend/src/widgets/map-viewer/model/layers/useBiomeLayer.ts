import type { Map as MapLibreMap } from 'maplibre-gl'
import type { BiomeCollection } from '@/entities/biome'
import { MAP_COLORS } from '../../config/mapColors'
import { useMapLayer } from './useMapLayer'

export function useBiomeLayer() {
  let fillLayer: any = null
  let outlineLayer: any = null

  const addBiomesLayer = (map: MapLibreMap, data: BiomeCollection, mode: 'explore' | 'wander' = 'explore') => {
    // Use 40% opacity for forests in wander mode, default opacity in explore mode
    const forestOpacity = mode === 'wander' ? 0.3 : MAP_COLORS.biomes.fillOpacity
    const defaultOpacity = mode === 'wander' ? 0.3 : MAP_COLORS.biomes.fillOpacity

    fillLayer = useMapLayer({
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
        'fill-opacity': [
          'match',
          ['get', 'type'],
          'forest', forestOpacity,
          defaultOpacity
        ]
      },
      interactive: true
    })

    outlineLayer = useMapLayer({
      sourceId: 'biomes',
      layerId: 'biomes-outline',
      layerType: 'line',
      paint: {
        'line-color': '#64748b',
        'line-width': 1,
        'line-opacity': 0.6
      }
    })

    fillLayer.addLayer(map, data)
    outlineLayer.addLayer(map, data)
  }

  const removeLayer = (map: MapLibreMap) => {
    if (fillLayer) fillLayer.removeLayer(map)
    if (outlineLayer) outlineLayer.removeLayer(map)
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
