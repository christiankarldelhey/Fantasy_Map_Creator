import type { Map as MapLibreMap, GeoJSONSource } from 'maplibre-gl'

export interface LayerConfig {
  sourceId: string
  layerId: string
  layerType: 'circle' | 'fill' | 'line' | 'symbol'
  paint: any
  interactive?: boolean
  beforeLayer?: string
  minzoom?: number
  maxzoom?: number
  filter?: any
  layout?: any
}

export function useMapLayer(config: LayerConfig) {
  const addLayer = (map: MapLibreMap, data: any) => {
    if (!map) return

    // Only add source if it doesn't exist
    if (!map.getSource(config.sourceId)) {
      map.addSource(config.sourceId, {
        type: 'geojson',
        data: data
      })
    } else {
      (map.getSource(config.sourceId) as GeoJSONSource).setData(data)
    }

    // Only add layer if it doesn't exist
    if (!map.getLayer(config.layerId)) {
      const layerConfig: any = {
        id: config.layerId,
        type: config.layerType,
        source: config.sourceId,
        paint: config.paint
      }

      // Only add optional properties if they are defined
      if (config.minzoom !== undefined) layerConfig.minzoom = config.minzoom
      if (config.maxzoom !== undefined) layerConfig.maxzoom = config.maxzoom
      if (config.filter !== undefined) layerConfig.filter = config.filter
      if (config.layout !== undefined) layerConfig.layout = config.layout

      map.addLayer(layerConfig, config.beforeLayer)

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
  }

  return {
    addLayer,
    removeLayer
  }
}
