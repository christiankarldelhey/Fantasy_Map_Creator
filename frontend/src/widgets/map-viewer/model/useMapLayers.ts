import type { Map as MapLibreMap } from 'maplibre-gl'
import { useLocationLayer } from './layers/useLocationLayer'
import { useBiomeLayer } from './layers/useBiomeLayer'
import { useRegionLayer } from './layers/useRegionLayer'
import { useRoadLayer } from './layers/useRoadLayer'
import { useWaterLayer } from './layers/useWaterLayer'
import { useAltitudeLayer } from './layers/useAltitudeLayer'

export type MapMode = 'explore' | 'wander'

export function useMapLayers() {
  const locationLayer = useLocationLayer()
  const biomeLayer = useBiomeLayer()
  const regionLayer = useRegionLayer()
  const roadLayer = useRoadLayer()
  const waterLayer = useWaterLayer()
  const altitudeLayer = useAltitudeLayer()

  const initializeLayers = (
    map: MapLibreMap,
    data: {
      locations?: any
      biomes?: any
      regions?: any
      roads?: any
      water?: any
      altitude?: any
    },
    mode: MapMode = 'explore'
  ) => {
    // In wander mode, show locations, regions, water (40% opacity), and forests (40% opacity)
    if (mode === 'wander') {
      if (data.regions) regionLayer.addRegionsLayer(map, data.regions)
      if (data.water) waterLayer.addWaterLayer(map, data.water, mode)
      if (data.biomes) biomeLayer.addBiomesLayer(map, data.biomes, mode)
      if (data.locations) locationLayer.addLocationsLayer(map, data.locations)
      return
    }

    // Orden de capas: bottom to top (explore mode)
    if (data.regions) regionLayer.addRegionsLayer(map, data.regions)
    // if (data.altitude) altitudeLayer.addAltitudeLayer(map, data.altitude)  // Desactivado temporalmente
    if (data.biomes) biomeLayer.addBiomesLayer(map, data.biomes, mode)
    if (data.water) waterLayer.addWaterLayer(map, data.water, mode)
    if (data.roads) roadLayer.addRoadsLayer(map, data.roads)
    if (data.locations) locationLayer.addLocationsLayer(map, data.locations)
  }

  const removeLayers = (map: MapLibreMap) => {
    locationLayer.removeLayer(map)
    roadLayer.removeLayer(map)
    waterLayer.removeLayer(map)
    biomeLayer.removeLayer(map)
    altitudeLayer.removeLayer(map)
    regionLayer.removeLayer(map)
  }

  return {
    initializeLayers,
    removeLayers,
    // Exponer capas individuales para control granular
    locationLayer,
    biomeLayer,
    regionLayer,
    roadLayer,
    waterLayer,
    altitudeLayer
  }
}
