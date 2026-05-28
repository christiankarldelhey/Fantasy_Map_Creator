import { ref } from 'vue'
import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'

export interface PeakProperties {
  id: number
  altitude_type: string
  elevation_final: number
}

export interface PeakFeature {
  type: 'Feature'
  id: number
  geometry: {
    type: 'Point'
    coordinates: [number, number]
  }
  properties: PeakProperties
}

export interface PeakCollection {
  type: 'FeatureCollection'
  features: PeakFeature[]
}

export function usePeakData() {
  const peaks = ref<PeakCollection | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  const loadPeaks = async () => {
    loading.value = true
    error.value = null
    
    try {
      const response = await axios.get<PeakCollection>(`${API_BASE_URL}/api/peaks`)
      peaks.value = response.data
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load peaks'
      console.error('Error loading peaks:', err)
    } finally {
      loading.value = false
    }
  }

  return {
    peaks,
    loading,
    error,
    loadPeaks
  }
}
