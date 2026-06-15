import type { Map as MapLibreMap } from 'maplibre-gl'
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

  const highlightRegionBorder = (map: MapLibreMap, regionId: number | null) => {
    if (!map.getLayer('regions-outline')) return

    if (regionId === null) {
      // Reset to transparent for all regions
      map.setPaintProperty('regions-outline', 'line-opacity', 0)
    } else {
      // Highlight selected region border in red, others stay transparent
      map.setPaintProperty('regions-outline', 'line-color', [
        'case',
        ['==', ['get', 'id'], regionId], '#ef4444', // Selected region: red
        MAP_COLORS.regions.outlineColor // Other regions: normal color (but transparent)
      ])
      map.setPaintProperty('regions-outline', 'line-width', [
        'case',
        ['==', ['get', 'id'], regionId], 3, // Selected region: thicker
        MAP_COLORS.regions.outlineWidth // Other regions: normal width
      ])
      map.setPaintProperty('regions-outline', 'line-opacity', [
        'case',
        ['==', ['get', 'id'], regionId], 1, // Selected region: visible
        0 // Other regions: transparent
      ])
    }
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
