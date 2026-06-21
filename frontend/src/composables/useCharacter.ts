import { ref } from 'vue'
import api from '@/shared/api/client'

export interface CharacterState {
  id: number
  name: string
  current_lng: number
  current_lat: number
  updated_at: string
  current_location: string | null
  current_region: string | null
}

const characterData = ref<CharacterState | null>(null)
const characterPosition = ref<[number, number] | null>(null) // [lng, lat]
const characterLoading = ref(false)
const characterError = ref<string | null>(null)

export function useCharacter() {
  async function fetchCharacterPosition() {
    characterLoading.value = true
    characterError.value = null
    try {
      const response = await api.get<CharacterState>('/character')
      characterData.value = response.data
      characterPosition.value = [response.data.current_lng, response.data.current_lat]
      console.log('✅ Loaded character position:', response.data)
      return response.data
    } catch (err: any) {
      const message = err.response?.data?.error || err.message || 'Failed to load character position'
      characterError.value = message
      console.error('❌ Error loading character position:', err)
      throw err
    } finally {
      characterLoading.value = false
    }
  }

  async function updateCharacterPosition(lng: number, lat: number) {
    characterLoading.value = true
    characterError.value = null
    try {
      const response = await api.put<CharacterState>('/character', {
        current_lng: lng,
        current_lat: lat
      })
      characterData.value = response.data
      characterPosition.value = [response.data.current_lng, response.data.current_lat]
      console.log('✅ Updated character position:', response.data)
      return response.data
    } catch (err: any) {
      const message = err.response?.data?.error || err.message || 'Failed to update character position'
      characterError.value = message
      console.error('❌ Error updating character position:', err)
      throw err
    } finally {
      characterLoading.value = false
    }
  }

  return {
    characterData,
    characterPosition,
    characterLoading,
    characterError,
    fetchCharacterPosition,
    updateCharacterPosition
  }
}
