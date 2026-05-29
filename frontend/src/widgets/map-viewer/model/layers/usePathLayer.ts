import type { Map as MapLibreMap } from 'maplibre-gl'
import type { PathCollection } from '@/entities/path'
import { useMapLayer } from './useMapLayer'

export function usePathLayer() {
  const lineLayer = useMapLayer({
    sourceId: 'paths',
    layerId: 'paths-line',
    layerType: 'line',
    paint: {
      'line-color': [
        'match',
        ['get', 'path_type'],
        'road', '#64748b',
        'river', '#0ea5e9',
        'stream', '#38bdf8',
        '#94a3b8'
      ],
      'line-width': [
        'match',
        ['get', 'path_type'],
        'road', 2,
        'river', 3,
        'stream', 1.5,
        2
      ],
      'line-opacity': 0.8
    },
    interactive: true
  })

  const addPathsLayer = (map: MapLibreMap, data: PathCollection) => {
    lineLayer.addLayer(map, data)
  }

  return {
    addPathsLayer,
    removeLayer: lineLayer.removeLayer
  }
}
