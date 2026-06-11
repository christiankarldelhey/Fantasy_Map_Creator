import { ref } from 'vue'
import { searchLocationsAndRegions } from '../api/searchApi'
import type { SearchResult } from '../model/types'

let debounceTimer: ReturnType<typeof setTimeout> | null = null

export function useSearch() {
  const query = ref('')
  const results = ref<SearchResult[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function search(searchQuery: string) {
    // Solo buscar si hay al menos 2 caracteres
    if (searchQuery.length < 2) {
      results.value = []
      return
    }

    // Clear previous timer
    if (debounceTimer) {
      clearTimeout(debounceTimer)
    }

    // Debounce de 300ms
    debounceTimer = setTimeout(async () => {
      loading.value = true
      error.value = null
      
      try {
        const response = await searchLocationsAndRegions(searchQuery)
        results.value = response.data.results
        console.log(`✅ Found ${response.data.results.length} results for "${searchQuery}"`)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error'
        error.value = message
        console.error('❌ Error searching:', err)
        results.value = []
      } finally {
        loading.value = false
      }
    }, 300)
  }

  function clearResults() {
    results.value = []
    query.value = ''
    error.value = null
  }

  return {
    query,
    results,
    loading,
    error,
    search,
    clearResults
  }
}
