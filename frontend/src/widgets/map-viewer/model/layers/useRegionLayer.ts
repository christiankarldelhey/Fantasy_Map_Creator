import type { Map as MapLibreMap } from 'maplibre-gl'

/** The slice of MapLibre the outline repaint needs — real Map and fakes fit. */
type OutlinePaintMap = {
  getLayer(id: string): unknown
  setPaintProperty(layer: string, prop: string, value: unknown): unknown
}
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
      'line-opacity': 0 // Transparent by default
    }
  })

  const addRegionsLayer = (map: MapLibreMap, data: RegionCollection) => {
    fillLayer.addLayer(map, data)
    // outlineLayer.addLayer(map, data) // Will be added last to be on top
  }

  const addRegionsOutline = (map: MapLibreMap, data: RegionCollection) => {
    outlineLayer.addLayer(map, data) // Add last to be on top of all layers
  }

  const highlightRegionBorder = (
    map: OutlinePaintMap,
    selectedId: number | null,
    hoveredId: number | null = null
  ) => {
    if (!map.getLayer('regions-outline')) return

    if (selectedId === null && hoveredId === null) {
      // Reset to transparent for all regions
      map.setPaintProperty('regions-outline', 'line-opacity', 0)
      return
    }

    const colorCases: unknown[] = []
    const widthCases: unknown[] = []
    const opacityCases: unknown[] = []
    if (selectedId !== null) {
      const match = ['==', ['get', 'id'], selectedId]
      colorCases.push(match, '#ef4444') // Selected region: red
      widthCases.push(match, 3)
      opacityCases.push(match, 1)
    }
    if (hoveredId !== null && hoveredId !== selectedId) {
      const match = ['==', ['get', 'id'], hoveredId]
      colorCases.push(match, MAP_COLORS.regions.hoverColor) // Hovered: neutral
      widthCases.push(match, 2)
      opacityCases.push(match, 1)
    }

    map.setPaintProperty('regions-outline', 'line-color', [
      'case',
      ...colorCases,
      MAP_COLORS.regions.outlineColor
    ])
    map.setPaintProperty('regions-outline', 'line-width', [
      'case',
      ...widthCases,
      MAP_COLORS.regions.outlineWidth
    ])
    map.setPaintProperty('regions-outline', 'line-opacity', [
      'case',
      ...opacityCases,
      0
    ])
  }

  const removeLayer = (map: MapLibreMap) => {
    fillLayer.removeLayer(map)
    outlineLayer.removeLayer(map)
    // Remove source after all layers are removed
    if (map.getSource('regions')) {
      map.removeSource('regions')
    }
  }

  return {
    addRegionsLayer,
    addRegionsOutline,
    removeLayer,
    highlightRegionBorder
  }
}
