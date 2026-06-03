import type { Map as MapLibreMap } from 'maplibre-gl'
import maplibregl from 'maplibre-gl'
import { getElevation } from '@/entities/altitude'
import { getCurrentClimate } from '@/entities/climate'

export function useMapEvents() {
  const setupClickHandler = (map: MapLibreMap) => {
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

      // 1. Location Details
      let locationHTML = ''
      if (locationFeature) {
        const locProps = locationFeature.properties
        const imgHTML = locProps?.image || locProps?.image_url 
          ? `<img src="${locProps.image || locProps.image_url}" class="w-full h-28 object-cover rounded-md mt-2 mb-1 shadow-sm border border-gray-100" alt="${locProps.name}" />`
          : ''
        locationHTML = `
          <div class="mb-3 pb-3 border-b border-gray-100">
            <h3 class="font-bold text-lg text-rose-600 leading-tight">${locProps?.name || 'Unknown Location'}</h3>
            <p class="text-xs text-rose-500 font-semibold mt-0.5">${locProps?.type ? locProps.type.replace('_', ' ') : 'point'}</p>
            ${imgHTML}
            ${locProps?.description ? `<p class="text-xs mt-1 text-gray-600 leading-normal">${locProps.description}</p>` : ''}
          </div>
        `
      }

      // 2. Biome Details
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

      // 3. Road Details
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

      // 4. Water Details
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

      // 5. Elevation Placeholder (updated asynchronously with real meters)
      let elevationHTML = `
        <div id="popup-elevation-container" class="flex items-center gap-1.5 mt-1">
          <span class="inline-block w-2 h-2 rounded-full bg-amber-500"></span>
          <span class="text-xs font-semibold text-gray-700">Elevation:</span>
          <span class="text-xs text-amber-600 italic ml-1">Loading meters...</span>
        </div>
      `

      // 6. Region Details
      let regionHTML = ''
      let climateHTML = ''
      if (regionFeature) {
        const regProps = regionFeature.properties
        const kingdomLabel = regProps?.kingdom ? ` (${regProps.kingdom})` : ''
        regionHTML = `
          <div class="mt-3 pt-2.5 border-t border-gray-100">
            <span class="text-[10px] uppercase tracking-wider text-gray-400 font-bold block">Political Region</span>
            <p class="text-xs text-teal-700 font-semibold mt-0.5">${regProps?.name || 'Unknown Region'}<span class="text-gray-500 font-normal">${kingdomLabel}</span></p>
            ${regProps?.description ? `<p class="text-[11px] mt-1 text-gray-500 leading-snug">${regProps.description}</p>` : ''}
          </div>
        `

        // Climate placeholder
        climateHTML = `
          <div id="popup-climate-container" class="mt-2.5 pt-2.5 border-t border-dashed border-gray-100">
            <span class="text-[10px] uppercase tracking-wider text-teal-500 font-bold block">Regional Climate (1950)</span>
            <span class="text-xs text-teal-600 italic mt-0.5 block">Loading climate data...</span>
          </div>
        `
      }

      // Initial Render of Popup
      new maplibregl.Popup({ className: 'fantasy-popup' })
        .setLngLat(e.lngLat)
        .setHTML(`
          <div class="p-3 min-w-[220px] max-w-[280px] font-sans">
            ${locationHTML}
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

        const terrainLabel = terrainType ? ` (${terrainType})` : ''
        const updatedElevationHTML = `
          <span class="inline-block w-2 h-2 rounded-full bg-amber-500"></span>
          <span class="text-xs font-semibold text-gray-700">Elevation:</span>
          <span class="text-xs text-amber-600 font-semibold ml-1">${elevMeters}m${terrainLabel}</span>
        `

        const elevationContainer = document.getElementById('popup-elevation-container')
        if (elevationContainer) {
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
      if (regionFeature) {
        const regionId = regionFeature.properties?.id
        if (regionId) {
          getCurrentClimate(Number(regionId))
            .then(response => {
              const data = response.data
              const climateContainer = document.getElementById('popup-climate-container')
              if (climateContainer && data) {
                const temp = data.temperature_2m !== null ? `${data.temperature_2m}°C` : 'N/A'
                const humidity = data.relative_humidity_2m !== null ? `${data.relative_humidity_2m}%` : 'N/A'
                const precip = data.precipitation !== null ? `${data.precipitation} mm` : 'N/A'
                const wind = data.wind_speed_10m !== null ? `${data.wind_speed_10m} km/h` : 'N/A'
                const koppenLabel = data.koppen ? ` <span class="bg-teal-50 text-teal-700 text-[10px] font-bold px-1.5 py-0.5 rounded border border-teal-100 ml-1.5" title="Köppen Climate Classification">${data.koppen}</span>` : ''
                
                let analogHTML = ''
                if (data.analog_location) {
                  analogHTML = `
                    <p class="text-[10px] text-gray-400 mt-1.5 italic leading-tight">
                      Analog: ${data.analog_location}
                    </p>
                  `
                }

                climateContainer.innerHTML = `
                  <div class="flex items-center justify-between">
                    <span class="text-[10px] uppercase tracking-wider text-teal-500 font-bold">Climate (1950)</span>
                    ${koppenLabel}
                  </div>
                  <div class="grid grid-cols-2 gap-x-3 gap-y-1 mt-1 text-[11px] text-gray-600">
                    <div class="flex items-center gap-1">
                      <span class="text-xs">🌡️</span> <span>Temp: <strong>${temp}</strong></span>
                    </div>
                    <div class="flex items-center gap-1">
                      <span class="text-xs">💧</span> <span>Hum: <strong>${humidity}</strong></span>
                    </div>
                    <div class="flex items-center gap-1">
                      <span class="text-xs">🌧️</span> <span>Rain: <strong>${precip}</strong></span>
                    </div>
                    <div class="flex items-center gap-1">
                      <span class="text-xs">💨</span> <span>Wind: <strong>${wind}</strong></span>
                    </div>
                  </div>
                  ${analogHTML}
                `
              }
            })
            .catch(error => {
              console.error('Error fetching climate:', error)
              const climateContainer = document.getElementById('popup-climate-container')
              if (climateContainer) {
                climateContainer.innerHTML = `
                  <span class="text-[10px] uppercase tracking-wider text-teal-500 font-bold block">Climate (1950)</span>
                  <span class="text-xs text-red-500 italic mt-0.5 block">Failed to load climate data</span>
                `
              }
            })
        }
      }
    })
  }

  return {
    setupClickHandler
  }
}
