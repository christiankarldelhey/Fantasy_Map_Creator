import { ref } from 'vue'
import api from '@/shared/api/client'
import type { LocationCollection } from '@/entities/location'

// Admin-only: the locations `visible_in_map` hides. Fetched lazily — the
// endpoint is gated server-side, so this 403s for non-admin users.
export function useHiddenLocations() {
  const hiddenLocations = ref<LocationCollection | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function loadHiddenLocations() {
    if (hiddenLocations.value) return hiddenLocations.value
    loading.value = true
    error.value = null

    try {
      const response = await api.get<LocationCollection>('/locations/hidden')
      hiddenLocations.value = response.data
      console.log(`✅ Loaded ${response.data.features.length} hidden locations`)
      return response.data
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      error.value = message
      console.error('❌ Error loading hidden locations:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  return {
    hiddenLocations,
    loading,
    error,
    loadHiddenLocations
  }
}
