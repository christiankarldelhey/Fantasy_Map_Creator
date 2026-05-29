import { ref } from 'vue'
import { getRoads } from '@/entities/road'
import type { RoadCollection } from '@/entities/road'

export function useRoadData() {
  const roads = ref<RoadCollection | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function loadRoads() {
    loading.value = true
    error.value = null
    
    try {
      const response = await getRoads()
      roads.value = response.data
      console.log(`✅ Loaded ${response.data.features.length} roads`)
      return response.data
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      error.value = message
      console.error('❌ Error loading roads:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  return {
    roads,
    loading,
    error,
    loadRoads
  }
}
