import type { Map as MapLibreMap, GeoJSONSource } from 'maplibre-gl'
import { MAP_COLORS } from '../../config/mapColors'
import { ZOOM_LEVELS } from '@/shared/config/zoomLevels'

export function useWaterLayer() {
  const addWaterLayer = (map: MapLibreMap, data: any, mode: 'explore' | 'wander' = 'explore') => {
    if (!map) return

    // Use 40% opacity in wander mode, default opacity in explore mode
    const fillOpacity = mode === 'wander' ? 0.15 : MAP_COLORS.water.opacityFill
    const lineOpacity = mode === 'wander' ? 0.15 : MAP_COLORS.water.opacityLine

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
          'fill-opacity': fillOpacity
        }
      } as any)

      // 1.5 Capa para mares (Polígonos)
      map.addLayer({
        id: 'water-fill-sea',
        type: 'fill',
        source: 'water',
        filter: ['==', ['get', 'water_type'], 'sea'],
        paint: {
          'fill-color': MAP_COLORS.water.primary,
          'fill-opacity': fillOpacity
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
          'line-opacity': lineOpacity
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
          'line-opacity': lineOpacity
        }
      } as any)

      // 4. Labels para ríos (medium y near)
      map.addLayer({
        id: 'water-labels-river',
        type: 'symbol',
        source: 'water',
        minzoom: ZOOM_LEVELS.MEDIUM.min,
        maxzoom: ZOOM_LEVELS.NEAR.max,
        filter: [
          'all',
          ['==', ['get', 'water_type'], 'river'],
          ['has', 'name'],
          ['!=', ['downcase', ['get', 'name']], 'river']
        ],
        layout: {
          'text-field': ['get', 'name'],
          'text-font': ['Open Sans Regular'],
          'text-size': 12,
          'symbol-placement': 'line',
          'text-anchor': 'center',
          'text-offset': [0, 0.5]
        },
        paint: {
          'text-color': MAP_COLORS.water.primary,
          'text-halo-color': '#f4e4c1',
          'text-halo-width': 2
        }
      } as any)

      // 5. Labels para arroyos (solo near)
      map.addLayer({
        id: 'water-labels-stream',
        type: 'symbol',
        source: 'water',
        minzoom: ZOOM_LEVELS.NEAR.min,
        maxzoom: ZOOM_LEVELS.NEAR.max,
        filter: [
          'all',
          ['==', ['get', 'water_type'], 'stream'],
          ['has', 'name'],
          ['!=', ['downcase', ['get', 'name']], 'stream']
        ],
        layout: {
          'text-field': ['get', 'name'],
          'text-font': ['Open Sans Regular'],
          'text-size': 12,
          'symbol-placement': 'line',
          'text-anchor': 'center',
          'text-offset': [0, 0.5]
        },
        paint: {
          'text-color': MAP_COLORS.water.primary,
          'text-halo-color': '#f4e4c1',
          'text-halo-width': 2
        }
      } as any)

      // Configurar eventos de cursor interactivo
      map.on('mouseenter', 'water-fill', () => {
        map.getCanvas().style.cursor = 'pointer'
      })
      map.on('mouseleave', 'water-fill', () => {
        map.getCanvas().style.cursor = ''
      })
      map.on('mouseenter', 'water-fill-sea', () => {
        map.getCanvas().style.cursor = 'pointer'
      })
      map.on('mouseleave', 'water-fill-sea', () => {
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
    if (map.getLayer('water-fill-sea')) map.removeLayer('water-fill-sea')
    if (map.getLayer('water-lines-river')) map.removeLayer('water-lines-river')
    if (map.getLayer('water-lines-stream')) map.removeLayer('water-lines-stream')
    if (map.getLayer('water-labels-river')) map.removeLayer('water-labels-river')
    if (map.getLayer('water-labels-stream')) map.removeLayer('water-labels-stream')
    if (map.getSource('water')) map.removeSource('water')
  }

  return {
    addWaterLayer,
    removeLayer
  }
}
