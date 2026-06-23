import { ref } from 'vue'
import api from '@/shared/api/client'

export interface CharacterState {
  id: number
  name: string
  current_lng: number
  current_lat: number
  type: string
  gender: string
  active: boolean
  description: string
  updated_at: string
  current_location: string | null
  current_region: string | null
}

const characters = ref<CharacterState[]>([])
const activeCharacter = ref<CharacterState | null>(null)
const characterData = ref<CharacterState | null>(null) // For backward compatibility
const characterPosition = ref<[number, number] | null>(null) // [lng, lat]
const characterLoading = ref(false)
const characterError = ref<string | null>(null)

export function useCharacter() {
  async function fetchAllCharacters() {
    characterLoading.value = true
    characterError.value = null
    try {
      const response = await api.get<CharacterState[]>('/character')
      characters.value = response.data
      activeCharacter.value = response.data.find(c => c.active) || null
      characterData.value = activeCharacter.value // For backward compatibility
      if (activeCharacter.value) {
        characterPosition.value = [activeCharacter.value.current_lng, activeCharacter.value.current_lat]
      }
      console.log('✅ Loaded all characters:', response.data)
      return response.data
    } catch (err: any) {
      const message = err.response?.data?.error || err.message || 'Failed to load characters'
      characterError.value = message
      console.error('❌ Error loading characters:', err)
      throw err
    } finally {
      characterLoading.value = false
    }
  }

  async function fetchActiveCharacter() {
    characterLoading.value = true
    characterError.value = null
    try {
      const response = await api.get<CharacterState>('/character/active')
      activeCharacter.value = response.data
      characterData.value = response.data // For backward compatibility
      characterPosition.value = [response.data.current_lng, response.data.current_lat]
      console.log('✅ Loaded active character:', response.data)
      return response.data
    } catch (err: any) {
      const message = err.response?.data?.error || err.message || 'Failed to load active character'
      characterError.value = message
      console.error('❌ Error loading active character:', err)
      throw err
    } finally {
      characterLoading.value = false
    }
  }

  async function fetchCharacterPosition() {
    // For backward compatibility, use fetchActiveCharacter
    return fetchActiveCharacter()
  }

  async function updateCharacterPosition(lng: number, lat: number) {
    if (!activeCharacter.value) {
      throw new Error('No active character')
    }
    characterLoading.value = true
    characterError.value = null
    try {
      const response = await api.put<CharacterState>(`/character/${activeCharacter.value.id}`, {
        current_lng: lng,
        current_lat: lat
      })
      // Update the character in the array
      const index = characters.value.findIndex(c => c.id === activeCharacter.value!.id)
      if (index !== -1) {
        characters.value[index] = response.data
      }
      activeCharacter.value = response.data
      characterData.value = response.data // For backward compatibility
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

  async function setActiveCharacter(id: number) {
    characterLoading.value = true
    characterError.value = null
    try {
      const response = await api.put<CharacterState>(`/character/${id}/active`)
      // Update all characters' active status
      characters.value.forEach(c => {
        c.active = c.id === id
      })
      activeCharacter.value = response.data
      characterData.value = response.data // For backward compatibility
      characterPosition.value = [response.data.current_lng, response.data.current_lat]
      console.log('✅ Set active character:', response.data)
      return response.data
    } catch (err: any) {
      const message = err.response?.data?.error || err.message || 'Failed to set active character'
      characterError.value = message
      console.error('❌ Error setting active character:', err)
      throw err
    } finally {
      characterLoading.value = false
    }
  }

  return {
    characters,
    activeCharacter,
    characterData,
    characterPosition,
    characterLoading,
    characterError,
    fetchAllCharacters,
    fetchActiveCharacter,
    fetchCharacterPosition,
    updateCharacterPosition,
    setActiveCharacter
  }
}
