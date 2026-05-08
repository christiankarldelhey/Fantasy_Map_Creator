import { ref } from 'vue'
import { getRegions } from '@/entities/region'
import type { RegionCollection } from '@/entities/region'

export function useRegionData() {
  const regions = ref<RegionCollection | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

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

  return {
    regions,
    loading,
    error,
    loadRegions
  }
}
