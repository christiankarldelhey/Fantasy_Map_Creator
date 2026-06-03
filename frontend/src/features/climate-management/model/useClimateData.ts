import { ref } from 'vue'
import { getCurrentClimate, getRegionClimateSummary } from '@/entities/climate'
import type { CurrentClimateResponse, RegionClimateSummaryResponse } from '@/entities/climate'

export function useClimateData() {
  const currentClimate = ref<CurrentClimateResponse | null>(null)
  const summary = ref<RegionClimateSummaryResponse | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function loadCurrentClimate(regionId: number) {
    loading.value = true
    error.value = null
    
    try {
      const response = await getCurrentClimate(regionId)
      currentClimate.value = response.data
      return response.data
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      error.value = message
      console.error(`❌ Error loading current climate for region ${regionId}:`, err)
      throw err
    } finally {
      loading.value = false
    }
  }

  async function loadRegionSummary(regionId: number) {
    loading.value = true
    error.value = null
    
    try {
      const response = await getRegionClimateSummary(regionId)
      summary.value = response.data
      return response.data
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      error.value = message
      console.error(`❌ Error loading climate summary for region ${regionId}:`, err)
      throw err
    } finally {
      loading.value = false
    }
  }

  return {
    currentClimate,
    summary,
    loading,
    error,
    loadCurrentClimate,
    loadRegionSummary
  }
}
