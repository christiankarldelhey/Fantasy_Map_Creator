import { ref } from 'vue'
import { getLocations, getRegions } from '@/services/api'
import type { GeoJSONFeatureCollection } from '@/types/geojson'

export function useMapData() {
  const locations = ref<GeoJSONFeatureCollection | null>(null)
  const regions = ref<GeoJSONFeatureCollection | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function loadLocations() {
    loading.value = true
    error.value = null
    
    try {
      const response = await getLocations()
      locations.value = response.data
      console.log(`✅ Loaded ${response.data.features.length} locations`)
      return response.data
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      error.value = message
      console.error('❌ Error loading locations:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  async function loadRegions() {
    loading.value = true
    error.value = null
    
    try {
      const response = await getRegions()
      regions.value = response.data
      console.log(`✅ Loaded ${response.data.features.length} regions`)
      return response.data
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      error.value = message
      console.error('❌ Error loading regions:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  async function loadAll() {
    await Promise.all([
      loadLocations(),
      loadRegions()
    ])
  }

  return {
    locations,
    regions,
    loading,
    error,
    loadLocations,
    loadRegions,
    loadAll
  }
}
