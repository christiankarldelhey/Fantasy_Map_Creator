import { ref } from 'vue'
import { getCurrentClimate, getRegionClimateSummary, getAllRegionsClimate } from '@/entities/climate'
import type { CurrentClimateResponse, RegionClimateSummaryResponse, AllRegionsClimateResponse } from '@/entities/climate'

export function useClimateData() {
  const currentClimate = ref<CurrentClimateResponse | null>(null)
  const summary = ref<RegionClimateSummaryResponse | null>(null)
  const allRegionsClimate = ref<AllRegionsClimateResponse | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function loadCurrentClimate(regionId: number, timestamp?: string) {
    loading.value = true
    error.value = null
    
    try {
      const response = await getCurrentClimate(regionId, timestamp)
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

  async function loadAllRegionsClimate(timestamp?: string) {
    loading.value = true
    error.value = null
    
    try {
      const response = await getAllRegionsClimate(timestamp)
      allRegionsClimate.value = response.data
      return response.data
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      error.value = message
      console.error(`❌ Error loading all regions climate:`, err)
      throw err
    } finally {
      loading.value = false
    }
  }

  return {
    currentClimate,
    summary,
    allRegionsClimate,
    loading,
    error,
    loadCurrentClimate,
    loadRegionSummary,
    loadAllRegionsClimate
  }
}
