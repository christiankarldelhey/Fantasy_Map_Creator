import type { Map as MapLibreMap } from 'maplibre-gl'
import { getElevation } from '@/entities/altitude'
import { getClimateAtPoint } from '@/entities/climate'
import type { LocationDetails } from '@/widgets/location-sidebar'

export async function fetchLocationDetailsAtPoint(
  map: MapLibreMap,
  lng: number,
  lat: number,
  timestamp?: string
): Promise<LocationDetails | null> {
  // Build layers list - only include layers that exist in the map
  const allLayers = [
    'locations-major', 'locations-medium', 'locations-minor',
    'biomes-fill', 'regions-fill',
    'roads-major', 'roads-medium', 'roads-minor',
    'water-fill', 'water-lines-river', 'water-lines-stream'
  ]
  const existingLayers = allLayers.filter(layerId => map.getLayer(layerId))

  const features = map.queryRenderedFeatures(
    map.project([lng, lat]),
    {
      layers: existingLayers
    }
  )

  const locationFeature = features.find(f =>
    f.layer.id === 'locations-major' ||
    f.layer.id === 'locations-medium' ||
    f.layer.id === 'locations-minor'
  )
  const biomeFeature = features.find(f => f.layer.id === 'biomes-fill')
  const regionFeature = features.find(f => f.layer.id === 'regions-fill')
  const roadFeature = features.find(f =>
    f.layer.id === 'roads-major' ||
    f.layer.id === 'roads-medium' ||
    f.layer.id === 'roads-minor'
  )
  const waterFeature = features.find(f =>
    f.layer.id === 'water-fill' ||
    f.layer.id === 'water-lines-river' ||
    f.layer.id === 'water-lines-stream'
  )

  // If no location feature, create a generic location details object with biome/region/elevation/climate
  const locationDetails: LocationDetails = {
    name: locationFeature ? (locationFeature.properties?.name || 'Unknown Location') : 'Unknown Location',
    type: locationFeature ? (locationFeature.properties?.type ? locationFeature.properties.type.replace('_', ' ') : 'point') : 'point',
    slug: locationFeature?.properties?.slug,
    url_path: locationFeature?.properties?.url_path,
    description: locationFeature?.properties?.description,
    population: locationFeature?.properties?.population,
    inhabitants: locationFeature?.properties?.inhabitants,
  }

  // Biome Details
  if (biomeFeature) {
    locationDetails.biome = {
      name: biomeFeature?.properties?.name || 'Unknown',
      type: biomeFeature?.properties?.type || 'grassland',
    }
  }

  // Road Details
  if (roadFeature) {
    locationDetails.road = {
      name: roadFeature.properties?.name || 'Unknown Road',
      terrain_type: roadFeature.properties?.terrain_type,
    }
  }

  // Water Details
  if (waterFeature) {
    locationDetails.water = {
      name: waterFeature.properties?.name || 'Unknown Water',
      water_type: waterFeature.properties?.water_type || 'unknown',
    }
  }

  // Region Details
  if (regionFeature) {
    locationDetails.region = {
      name: regionFeature.properties?.name || 'Unknown Region',
      kingdom: regionFeature.properties?.kingdom,
    }
  }

  // Fetch elevation
  try {
    const response = await getElevation(lng, lat)
    locationDetails.elevation = {
      meters: Math.round(response.data.elevation),
      terrain_type: response.data.terrain_type,
    }
  } catch (error) {
    console.error('Error fetching elevation:', error)
  }

  // Fetch climate
  try {
    const response = await getClimateAtPoint(lng, lat, timestamp)
    const data = response.data

    if (data && !data.error) {
      locationDetails.climate = {
        temperature: data.climate.temperature_2m !== null ? data.climate.temperature_2m : 0,
        humidity: data.climate.relative_humidity_2m !== null ? data.climate.relative_humidity_2m : 0,
        precipitation: data.climate.precipitation !== null ? data.climate.precipitation : 0,
        wind: data.climate.wind_speed_10m !== null ? data.climate.wind_speed_10m : 0,
        cloudCover: data.climate.cloud_cover !== null ? data.climate.cloud_cover : undefined,
        time: data.climate.time,
        isTransitionZone: data.is_transition_zone,
        transitionDistanceKm: data.transition_distance_km,
        neighboringRegions: data.neighboring_regions,
      }
    }
  } catch (error) {
    console.error('Error fetching climate:', error)
  }

  return locationDetails
}

export async function fetchRegionDetailsAtPoint(
  map: MapLibreMap,
  lng: number,
  lat: number,
  timestamp?: string
): Promise<LocationDetails | null> {
  // Build layers list - only include layers that exist in the map
  const allLayers = [
    'biomes-fill', 'regions-fill',
    'roads-major', 'roads-medium', 'roads-minor',
    'water-fill', 'water-lines-river', 'water-lines-stream'
  ]
  const existingLayers = allLayers.filter(layerId => map.getLayer(layerId))

  const features = map.queryRenderedFeatures(
    map.project([lng, lat]),
    {
      layers: existingLayers
    }
  )

  const regionFeature = features.find(f => f.layer.id === 'regions-fill')
  const biomeFeature = features.find(f => f.layer.id === 'biomes-fill')
  const roadFeature = features.find(f =>
    f.layer.id === 'roads-major' ||
    f.layer.id === 'roads-medium' ||
    f.layer.id === 'roads-minor'
  )
  const waterFeature = features.find(f =>
    f.layer.id === 'water-fill' ||
    f.layer.id === 'water-lines-river' ||
    f.layer.id === 'water-lines-stream'
  )

  // Only return region details if we clicked on a region
  if (!regionFeature) {
    return null
  }

  const regProps = regionFeature.properties
  const regionDetails: LocationDetails = {
    name: regProps?.name || 'Unknown Region',
    type: 'Region',
    slug: regProps?.slug,
    url_path: regProps?.url_path,
    description: regProps?.description,
    population: regProps?.people?.population,
    inhabitants: regProps?.people?.symbol || regProps?.people?.military,
    region: undefined, // This IS a region
    // Region-specific fields
    region_type: regProps?.region_type,
    people: regProps?.people,
    land: regProps?.land,
    fauna: regProps?.fauna,
    flora: regProps?.flora,
    notes: regProps?.notes,
    source: regProps?.source,
    products: regProps?.products,
    regionId: regProps?.id,
  }

  // Biome Details
  if (biomeFeature) {
    regionDetails.biome = {
      name: biomeFeature?.properties?.name || 'Unknown',
      type: biomeFeature?.properties?.type || 'grassland',
    }
  }

  // Road Details
  if (roadFeature) {
    regionDetails.road = {
      name: roadFeature.properties?.name || 'Unknown Road',
      terrain_type: roadFeature.properties?.terrain_type,
    }
  }

  // Water Details
  if (waterFeature) {
    regionDetails.water = {
      name: waterFeature.properties?.name || 'Unknown Water',
      water_type: waterFeature.properties?.water_type || 'unknown',
    }
  }

  // Fetch elevation
  try {
    const response = await getElevation(lng, lat)
    regionDetails.elevation = {
      meters: Math.round(response.data.elevation),
      terrain_type: response.data.terrain_type,
    }
  } catch (error) {
    console.error('Error fetching elevation:', error)
  }

  // Fetch climate
  try {
    const response = await getClimateAtPoint(lng, lat, timestamp)
    const data = response.data

    if (data && !data.error) {
      regionDetails.climate = {
        temperature: data.climate.temperature_2m !== null ? data.climate.temperature_2m : 0,
        humidity: data.climate.relative_humidity_2m !== null ? data.climate.relative_humidity_2m : 0,
        precipitation: data.climate.precipitation !== null ? data.climate.precipitation : 0,
        wind: data.climate.wind_speed_10m !== null ? data.climate.wind_speed_10m : 0,
        cloudCover: data.climate.cloud_cover !== null ? data.climate.cloud_cover : undefined,
        time: data.climate.time,
        isTransitionZone: data.is_transition_zone,
        transitionDistanceKm: data.transition_distance_km,
        neighboringRegions: data.neighboring_regions,
      }
    }
  } catch (error) {
    console.error('Error fetching climate:', error)
  }

  return regionDetails
}
