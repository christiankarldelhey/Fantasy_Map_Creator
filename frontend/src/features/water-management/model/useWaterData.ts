import { ref } from 'vue'
import { getWater } from '@/entities/water'
import type { WaterCollection } from '@/entities/water'

export function useWaterData() {
  const water = ref<WaterCollection | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function loadWater() {
    loading.value = true
    error.value = null
    
    try {
      const response = await getWater()
      water.value = response.data
      console.log(`✅ Loaded ${response.data.features.length} water features`)
      return response.data
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      error.value = message
      console.error('❌ Error loading water:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  return {
    water,
    loading,
    error,
    loadWater
  }
}
