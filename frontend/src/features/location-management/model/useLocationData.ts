import { ref } from 'vue'
import { getLocations } from '@/entities/location'
import type { LocationCollection } from '@/entities/location'

export function useLocationData() {
  const locations = ref<LocationCollection | null>(null)
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

  return {
    locations,
    loading,
    error,
    loadLocations
  }
}
