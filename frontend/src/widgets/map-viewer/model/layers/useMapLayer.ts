import type { Map as MapLibreMap, GeoJSONSource } from 'maplibre-gl'

export interface LayerConfig {
  sourceId: string
  layerId: string
  layerType: 'circle' | 'fill' | 'line'
  paint: any
  interactive?: boolean
  beforeLayer?: string
}

export function useMapLayer(config: LayerConfig) {
  const addLayer = (map: MapLibreMap, data: any) => {
    if (!map) return

    if (map.getSource(config.sourceId)) {
      (map.getSource(config.sourceId) as GeoJSONSource).setData(data)
    } else {
      map.addSource(config.sourceId, {
        type: 'geojson',
        data: data
      })

      map.addLayer({
        id: config.layerId,
        type: config.layerType,
        source: config.sourceId,
        paint: config.paint
      } as any, config.beforeLayer)

      if (config.interactive) {
        map.on('mouseenter', config.layerId, () => {
          map.getCanvas().style.cursor = 'pointer'
        })

        map.on('mouseleave', config.layerId, () => {
          map.getCanvas().style.cursor = ''
        })
      }
    }
  }

  const removeLayer = (map: MapLibreMap) => {
    if (!map) return
    if (map.getLayer(config.layerId)) {
      map.removeLayer(config.layerId)
    }
    if (map.getSource(config.sourceId)) {
      map.removeSource(config.sourceId)
    }
  }

  return {
    addLayer,
    removeLayer
  }
}
