import { ref } from 'vue'
import { getPaths } from '@/entities/path'
import type { PathCollection } from '@/entities/path'

export function usePathData() {
  const paths = ref<PathCollection | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function loadPaths(type?: string) {
    loading.value = true
    error.value = null
    
    try {
      const response = await getPaths(type)
      paths.value = response.data
      console.log(`✅ Loaded ${response.data.features.length} paths`)
      return response.data
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      error.value = message
      console.error('❌ Error loading paths:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  return {
    paths,
    loading,
    error,
    loadPaths
  }
}
