import type { Map as MapLibreMap } from 'maplibre-gl'
import { fetchLocationDetailsAtPoint, fetchRegionDetailsAtPoint } from './useLocationDetails'
import type { LocationDetails } from '@/widgets/location-sidebar'

export function useMapEvents() {
  const setupClickHandler = (
    map: MapLibreMap,
    onLocationClick?: (location: LocationDetails) => void,
    addMarker?: (lng: number, lat: number) => void
  ) => {
    map.on('click', async (e) => {
      const features = map.queryRenderedFeatures(e.point, {
        layers: [
          'locations-major', 'locations-medium', 'locations-minor',
          'biomes-fill', 'regions-fill',
          'roads-major', 'roads-medium', 'roads-minor',
          'water-fill', 'water-lines-river', 'water-lines-stream'
        ]
      })

      const locationFeature = features.find(f =>
        f.layer.id === 'locations-major' ||
        f.layer.id === 'locations-medium' ||
        f.layer.id === 'locations-minor'
      )
      const regionFeature = features.find(f => f.layer.id === 'regions-fill')

      const { lng, lat } = e.lngLat

      // Fetch location details if clicking on a location
      if (locationFeature) {
        const locationDetails = await fetchLocationDetailsAtPoint(map, lng, lat)
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
        const regionDetails = await fetchRegionDetailsAtPoint(map, lng, lat)
        if (regionDetails && onLocationClick) {
          onLocationClick(regionDetails)
        }
        // Add marker at click point (region center approximation)
        if (addMarker) {
          addMarker(lng, lat)
        }
        return
      }

      // For any other click (biome, road, water, or empty space), add marker at click point
      if (addMarker) {
        addMarker(lng, lat)
      }
    })
  }

  return {
    setupClickHandler
  }
}
