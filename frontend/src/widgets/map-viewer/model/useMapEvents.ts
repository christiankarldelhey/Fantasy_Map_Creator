import type { Map as MapLibreMap } from 'maplibre-gl'
import { fetchLocationDetailsAtPoint, fetchRegionDetailsAtPoint } from './useLocationDetails'
import type { LocationDetails } from '@/widgets/location-sidebar'
import type { MapMode } from './useMapLayers'

export function useMapEvents() {
  const setupClickHandler = (
    map: MapLibreMap,
    onLocationClick?: (location: LocationDetails) => void,
    addMarker?: (lng: number, lat: number) => void,
    getTimestamp?: () => string,
    mode: MapMode = 'explore'
  ) => {
    map.on('click', async (e) => {
      // Build layers list based on mode
      const layers: string[] = [
        'locations-major', 'locations-medium', 'locations-minor'
      ]

      if (mode === 'explore') {
        layers.push(
          'biomes-fill', 'regions-fill',
          'roads-major', 'roads-medium', 'roads-minor',
          'water-fill', 'water-lines-river', 'water-lines-stream'
        )
      }

      // Filter to only include layers that actually exist in the map
      const existingLayers = layers.filter(layerId => map.getLayer(layerId))

      const features = map.queryRenderedFeatures(e.point, {
        layers: existingLayers
      })

      const locationFeature = features.find(f =>
        f.layer.id === 'locations-major' ||
        f.layer.id === 'locations-medium' ||
        f.layer.id === 'locations-minor'
      )
      const regionFeature = features.find(f => f.layer.id === 'regions-fill')

      const { lng, lat } = e.lngLat
      const timestamp = getTimestamp ? getTimestamp() : undefined

      // Fetch location details if clicking on a location
      if (locationFeature) {
        const locationDetails = await fetchLocationDetailsAtPoint(map, lng, lat, timestamp)
        if (locationDetails && onLocationClick) {
          onLocationClick(locationDetails)
        }
        // Add marker at location coordinates
        if (addMarker) {
          const coords = locationFeature.geometry as GeoJSON.Point
          addMarker(coords.coordinates[0], coords.coordinates[1])
        }
        return
      }

      // Fetch region details if clicking on a region
      if (regionFeature) {
        const regionDetails = await fetchRegionDetailsAtPoint(map, lng, lat, timestamp)
        if (regionDetails && onLocationClick) {
          onLocationClick(regionDetails)
        }
        // Add marker at click point (region center approximation)
        if (addMarker) {
          addMarker(lng, lat)
        }
        return
      }

      // For any other click (biome, road, water, or empty space), try to fetch region details
      if (addMarker) {
        addMarker(lng, lat)
      }

      // Try to fetch region details first (since we're not on a location)
      const regionDetails = await fetchRegionDetailsAtPoint(map, lng, lat, timestamp)
      if (regionDetails && onLocationClick) {
        onLocationClick(regionDetails)
      } else {
        // If no region found, try generic location details
        const locationDetails = await fetchLocationDetailsAtPoint(map, lng, lat, timestamp)
        if (locationDetails && onLocationClick) {
          onLocationClick(locationDetails)
        }
      }
    })
  }

  return {
    setupClickHandler
  }
}
