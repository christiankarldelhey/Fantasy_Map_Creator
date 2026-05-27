import { ref } from 'vue'
import { getAltitudeLayers } from '@/entities/altitude'
import type { AltitudeCollection } from '@/entities/altitude'

export function useAltitudeData() {
  const altitude = ref<AltitudeCollection | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function loadAltitude() {
    loading.value = true
    error.value = null
    
    try {
      const response = await getAltitudeLayers()
      altitude.value = response.data
      console.log(`✅ Loaded ${response.data.features.length} altitude layers`)
      return response.data
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      error.value = message
      console.error('❌ Error loading altitude layers:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  return {
    altitude,
    loading,
    error,
    loadAltitude
  }
}
