import { ref } from 'vue'
import { getBiomes } from '@/entities/biome'
import type { BiomeCollection } from '@/entities/biome'

export function useBiomeData() {
  const biomes = ref<BiomeCollection | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function loadBiomes() {
    loading.value = true
    error.value = null
    
    try {
      const response = await getBiomes()
      biomes.value = response.data
      console.log(`✅ Loaded ${response.data.features.length} biomes`)
      return response.data
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      error.value = message
      console.error('❌ Error loading biomes:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  return {
    biomes,
    loading,
    error,
    loadBiomes
  }
}
