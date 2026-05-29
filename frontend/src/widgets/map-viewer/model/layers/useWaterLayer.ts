import type { Map as MapLibreMap, GeoJSONSource } from 'maplibre-gl'
import { MAP_COLORS } from '../../config/mapColors'

export function useWaterLayer() {
  const addWaterLayer = (map: MapLibreMap, data: any) => {
    if (!map) return

    if (map.getSource('water')) {
      (map.getSource('water') as GeoJSONSource).setData(data)
    } else {
      map.addSource('water', {
        type: 'geojson',
        data: data
      })

      // 1. Capa para lagos (Polígonos)
      map.addLayer({
        id: 'water-fill',
        type: 'fill',
        source: 'water',
        filter: ['==', ['get', 'water_type'], 'lake'],
        paint: {
          'fill-color': MAP_COLORS.water.primary,
          'fill-opacity': MAP_COLORS.water.opacityFill
        }
      } as any)

      // 2. Capa para ríos/arroyos (Líneas)
      map.addLayer({
        id: 'water-lines',
        type: 'line',
        source: 'water',
        filter: ['in', ['get', 'water_type'], ['literal', ['river', 'stream']]],
        layout: {
          'line-cap': 'round',
          'line-join': 'round'
        },
        paint: {
          'line-color': MAP_COLORS.water.primary,
          'line-width': [
            'match',
            ['get', 'water_type'],
            'river', MAP_COLORS.water.lineWidthRiver,
            'stream', MAP_COLORS.water.lineWidthStream,
            1.5
          ],
          'line-opacity': MAP_COLORS.water.opacityLine
        }
      } as any)

      // Configurar eventos de cursor interactivo
      map.on('mouseenter', 'water-fill', () => {
        map.getCanvas().style.cursor = 'pointer'
      })
      map.on('mouseleave', 'water-fill', () => {
        map.getCanvas().style.cursor = ''
      })
      map.on('mouseenter', 'water-lines', () => {
        map.getCanvas().style.cursor = 'pointer'
      })
      map.on('mouseleave', 'water-lines', () => {
        map.getCanvas().style.cursor = ''
      })
    }
  }

  const removeLayer = (map: MapLibreMap) => {
    if (!map) return
    if (map.getLayer('water-fill')) map.removeLayer('water-fill')
    if (map.getLayer('water-lines')) map.removeLayer('water-lines')
    if (map.getSource('water')) map.removeSource('water')
  }

  return {
    addWaterLayer,
    removeLayer
  }
}
