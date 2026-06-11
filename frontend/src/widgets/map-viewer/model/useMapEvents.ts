import type { Map as MapLibreMap } from 'maplibre-gl'
import maplibregl from 'maplibre-gl'
import { getElevation } from '@/entities/altitude'
import { getClimateAtPoint } from '@/entities/climate'
import { fetchLocationDetailsAtPoint } from './useLocationDetails'
import type { LocationDetails } from '@/widgets/location-sidebar'

export function useMapEvents() {
  const setupClickHandler = (map: MapLibreMap, onLocationClick?: (location: LocationDetails) => void) => {
    map.on('click', async (e) => {
      const features = map.queryRenderedFeatures(e.point, {
        layers: ['locations', 'biomes-fill', 'regions-fill', 'roads-line', 'water-fill', 'water-lines']
      })

      const locationFeature = features.find(f => f.layer.id === 'locations')
      const biomeFeature = features.find(f => f.layer.id === 'biomes-fill')
      const regionFeature = features.find(f => f.layer.id === 'regions-fill')
      const roadFeature = features.find(f => f.layer.id === 'roads-line')
      const waterFeature = features.find(f => f.layer.id === 'water-fill' || f.layer.id === 'water-lines')

      const { lng, lat } = e.lngLat

      // Fetch location details if clicking on a location
      if (locationFeature) {
        const locationDetails = await fetchLocationDetailsAtPoint(map, lng, lat)
        if (locationDetails && onLocationClick) {
          onLocationClick(locationDetails)
        }
        return // Don't show popup for locations
      }

      // Show popup for non-location clicks
      let biomeHTML = ''
      if (biomeFeature) {
        const biomeName = biomeFeature?.properties?.name || 'Unknown'
        const biomeType = biomeFeature?.properties?.type || 'grassland'
        biomeHTML = `
          <div class="flex items-center gap-1.5 mt-1">
            <span class="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
            <span class="text-xs font-semibold text-gray-700">Biome:</span>
            <span class="text-xs text-emerald-700 font-medium">${biomeName.replace('_', ' ')} (${biomeType})</span>
          </div>
        `
      }

      let roadHTML = ''
      if (roadFeature) {
        const roadProps = roadFeature.properties
        roadHTML = `
          <div class="flex items-center gap-1.5 mt-1">
            <span class="inline-block w-2 h-2 rounded-full bg-amber-700"></span>
            <span class="text-xs font-semibold text-gray-700">Road:</span>
            <span class="text-xs text-amber-700 font-medium">${roadProps?.name || 'Unknown Road'}</span>
            ${roadProps?.terrain_type ? `<span class="text-xs text-gray-500 ml-1">(${roadProps.terrain_type})</span>` : ''}
          </div>
        `
      }

      let waterHTML = ''
      if (waterFeature) {
        const waterProps = waterFeature.properties
        const waterType = waterProps?.water_type || 'unknown'
        waterHTML = `
          <div class="flex items-center gap-1.5 mt-1">
            <span class="inline-block w-2 h-2 rounded-full bg-blue-500"></span>
            <span class="text-xs font-semibold text-gray-700">Water:</span>
            <span class="text-xs text-blue-700 font-medium">${waterProps?.name || 'Unknown Water'}</span>
            <span class="text-xs text-gray-500 ml-1">(${waterType})</span>
          </div>
        `
      }

      let elevationHTML = `
        <div id="popup-elevation-container" class="flex items-center gap-1.5 mt-1">
          <span class="inline-block w-2 h-2 rounded-full bg-amber-500"></span>
          <span class="text-xs font-semibold text-gray-700">Elevation:</span>
          <span class="text-xs text-amber-600 italic ml-1">Loading meters...</span>
        </div>
      `

      let regionHTML = ''
      if (regionFeature) {
        const regProps = regionFeature.properties
        const kingdomLabel = regProps?.kingdom ? ` (${regProps.kingdom})` : ''

        // Parse description if it's a JSON string
        let descObj = null
        if (regProps?.description) {
          try {
            descObj = typeof regProps.description === 'string'
              ? JSON.parse(regProps.description)
              : regProps.description
          } catch (e) {
            // If it's not JSON, treat as plain text
          }
        }

        // Extract specific fields from description
        const nestedDescription = descObj?.description || ''
        const population = descObj?.population || ''
        const products = descObj?.products || ''
        const politicalOrganization = descObj?.political_organization || ''

        regionHTML = `
          <div class="mt-3 pt-2.5 border-t border-gray-100">
            <span class="text-[10px] uppercase tracking-wider text-gray-400 font-bold block">Political Region</span>
            <p class="text-xs text-teal-700 font-semibold mt-0.5">${regProps?.name || 'Unknown Region'}<span class="text-gray-500 font-normal">${kingdomLabel}</span></p>
            ${nestedDescription ? `<p class="text-[11px] mt-1 text-gray-500 leading-snug">${nestedDescription}</p>` : ''}
            ${population ? `<p class="text-[11px] mt-1 text-gray-500"><span class="font-semibold">Population:</span> ${population}</p>` : ''}
            ${products ? `<p class="text-[11px] mt-1 text-gray-500"><span class="font-semibold">Products:</span> ${products}</p>` : ''}
            ${politicalOrganization ? `<p class="text-[11px] mt-1 text-gray-500"><span class="font-semibold">Political Organization:</span> ${politicalOrganization}</p>` : ''}
          </div>
        `
      }

      const climateHTML = `
        <div id="popup-climate-container" class="mt-2.5 pt-2.5 border-t border-dashed border-gray-100">
          <span class="text-[10px] uppercase tracking-wider text-teal-500 font-bold block">Climate (1950)</span>
          <span class="text-xs text-teal-600 italic mt-0.5 block">Loading climate data...</span>
        </div>
      `

      // Initial Render of Popup
      new maplibregl.Popup({ className: 'fantasy-popup' })
        .setLngLat(e.lngLat)
        .setHTML(`
          <div class="p-3 min-w-[220px] max-w-[280px] font-sans">
            <div class="space-y-1">
              ${biomeHTML}
              ${roadHTML}
              ${waterHTML}
              ${elevationHTML}
            </div>
            ${regionHTML}
            ${climateHTML}
          </div>
        `)
        .addTo(map)

      // Fetch elevation asynchronously and update popup contents
      try {
        const response = await getElevation(lng, lat)
        const elevMeters = Math.round(response.data.elevation)
        const terrainType = response.data.terrain_type

        const elevationContainer = document.getElementById('popup-elevation-container')
        if (elevationContainer) {
          const terrainLabel = terrainType ? ` (${terrainType})` : ''
          const updatedElevationHTML = `
            <span class="inline-block w-2 h-2 rounded-full bg-amber-500"></span>
            <span class="text-xs font-semibold text-gray-700">Elevation:</span>
            <span class="text-xs text-amber-600 font-semibold ml-1">${elevMeters}m${terrainLabel}</span>
          `
          elevationContainer.innerHTML = updatedElevationHTML
        }
      } catch (error) {
        console.error('Error fetching elevation:', error)
        const elevationContainer = document.getElementById('popup-elevation-container')
        if (elevationContainer) {
          elevationContainer.innerHTML = `
            <span class="inline-block w-2 h-2 rounded-full bg-amber-500"></span>
            <span class="text-xs font-semibold text-gray-700">Elevation:</span>
            <span class="text-xs text-amber-600 italic ml-1">N/A</span>
          `
        }
      }

      // Fetch climate asynchronously and update popup contents
      getClimateAtPoint(lng, lat)
        .then(response => {
          const data = response.data
          const climateContainer = document.getElementById('popup-climate-container')

          if (climateContainer && data && !data.error) {
            const temp = data.climate.temperature_2m !== null ? data.climate.temperature_2m : 0
            const humidity = data.climate.relative_humidity_2m !== null ? data.climate.relative_humidity_2m : 0
            const precip = data.climate.precipitation !== null ? data.climate.precipitation : 0
            const wind = data.climate.wind_speed_10m !== null ? data.climate.wind_speed_10m : 0

            const tempDisplay = temp !== null ? `${temp.toFixed(1)}°C` : 'N/A'
            const humidityDisplay = humidity !== null ? `${humidity.toFixed(0)}%` : 'N/A'
            const precipDisplay = precip !== null ? `${precip.toFixed(2)} mm` : 'N/A'
            const windDisplay = wind !== null ? `${wind.toFixed(1)} km/h` : 'N/A'

            // Transition zone indicator
            let transitionHTML = ''
            if (data.is_transition_zone) {
              const distanceLabel = data.transition_distance_km < 1
                ? `${(data.transition_distance_km * 1000).toFixed(0)}m`
                : `${data.transition_distance_km.toFixed(1)}km`

              transitionHTML = `
                <div class="flex items-center gap-1.5 mt-1.5 bg-amber-50 border border-amber-200 rounded px-2 py-1">
                  <span class="text-xs">🔄</span>
                  <span class="text-[10px] text-amber-700 font-semibold">Transition Zone</span>
                  <span class="text-[10px] text-amber-600">(${distanceLabel} from boundary)</span>
                </div>
              `
            }

            // Neighboring regions info
            let neighborsHTML = ''
            if (data.is_transition_zone && data.neighboring_regions && data.neighboring_regions.length > 1) {
              const neighborList = data.neighboring_regions
                .filter(n => n.region_id !== data.region_id)
                .map(n => `${n.region_name} (${(n.weight * 100).toFixed(0)}%)`)
                .join(', ')
              neighborsHTML = `
                <p class="text-[10px] text-gray-400 mt-1 italic leading-tight">
                  Blended with: ${neighborList}
                </p>
              `
            }

            climateContainer.innerHTML = `
              <div class="flex items-center justify-between">
                <span class="text-[10px] uppercase tracking-wider text-teal-500 font-bold">Climate (1950)</span>
                ${data.is_transition_zone ? '<span class="bg-amber-100 text-amber-700 text-[10px] font-bold px-1.5 py-0.5 rounded border border-amber-200">Transition</span>' : ''}
              </div>
              <div class="grid grid-cols-2 gap-x-3 gap-y-1 mt-1 text-[11px] text-gray-600">
                <div class="flex items-center gap-1">
                  <span class="text-xs">🌡️</span> <span>Temp: <strong>${tempDisplay}</strong></span>
                </div>
                <div class="flex items-center gap-1">
                  <span class="text-xs">💧</span> <span>Hum: <strong>${humidityDisplay}</strong></span>
                </div>
                <div class="flex items-center gap-1">
                  <span class="text-xs">🌧️</span> <span>Rain: <strong>${precipDisplay}</strong></span>
                </div>
                <div class="flex items-center gap-1">
                  <span class="text-xs">💨</span> <span>Wind: <strong>${windDisplay}</strong></span>
                </div>
              </div>
              ${transitionHTML}
              ${neighborsHTML}
            `
          } else if (climateContainer && data?.error) {
            climateContainer.innerHTML = `
              <span class="text-[10px] uppercase tracking-wider text-teal-500 font-bold block">Climate (1950)</span>
              <span class="text-xs text-gray-500 italic mt-0.5 block">${data.error}</span>
            `
          }
        })
        .catch((error: unknown) => {
          console.error('Error fetching climate:', error)
          const climateContainer = document.getElementById('popup-climate-container')
          if (climateContainer) {
            climateContainer.innerHTML = `
              <span class="text-[10px] uppercase tracking-wider text-teal-500 font-bold block">Climate (1950)</span>
              <span class="text-xs text-red-500 italic mt-0.5 block">Failed to load climate data</span>
            `
          }
        })
    })
  }

  return {
    setupClickHandler
  }
}
