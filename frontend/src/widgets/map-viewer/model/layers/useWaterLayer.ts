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

      // 2. Capa para ríos (Líneas)
      map.addLayer({
        id: 'water-lines-river',
        type: 'line',
        source: 'water',
        filter: ['==', ['get', 'water_type'], 'river'],
        layout: {
          'line-cap': 'round',
          'line-join': 'round'
        },
        paint: {
          'line-color': MAP_COLORS.water.primary,
          'line-width': [
            'interpolate',
            ['linear'],
            ['zoom'],
            3, 2,      // zoom 3 (FAR): 2px
            5, 3,      // zoom 5 (FAR): 3px
            6, 4,      // zoom 6 (MEDIUM): 4px
            7, 6,      // zoom 7 (MEDIUM): 6px
            18, 10     // zoom 18 (NEAR): 10px
          ],
          'line-opacity': MAP_COLORS.water.opacityLine
        }
      } as any)

      // 3. Capa para arroyos (Líneas)
      map.addLayer({
        id: 'water-lines-stream',
        type: 'line',
        source: 'water',
        filter: ['==', ['get', 'water_type'], 'stream'],
        layout: {
          'line-cap': 'round',
          'line-join': 'round'
        },
        paint: {
          'line-color': MAP_COLORS.water.primary,
          'line-width': [
            'interpolate',
            ['linear'],
            ['zoom'],
            3, 1,      // zoom 3 (FAR): 1px
            5, 1.5,    // zoom 5 (FAR): 1.5px
            6, 2,      // zoom 6 (MEDIUM): 2px
            7, 3,      // zoom 7 (MEDIUM): 3px
            18, 5      // zoom 18 (NEAR): 5px
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
      map.on('mouseenter', 'water-lines-river', () => {
        map.getCanvas().style.cursor = 'pointer'
      })
      map.on('mouseleave', 'water-lines-river', () => {
        map.getCanvas().style.cursor = ''
      })
      map.on('mouseenter', 'water-lines-stream', () => {
        map.getCanvas().style.cursor = 'pointer'
      })
      map.on('mouseleave', 'water-lines-stream', () => {
        map.getCanvas().style.cursor = ''
      })
    }
  }

  const removeLayer = (map: MapLibreMap) => {
    if (!map) return
    if (map.getLayer('water-fill')) map.removeLayer('water-fill')
    if (map.getLayer('water-lines-river')) map.removeLayer('water-lines-river')
    if (map.getLayer('water-lines-stream')) map.removeLayer('water-lines-stream')
    if (map.getSource('water')) map.removeSource('water')
  }

  return {
    addWaterLayer,
    removeLayer
  }
}
