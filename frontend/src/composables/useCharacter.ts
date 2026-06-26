import { ref } from 'vue'
import api from '@/shared/api/client'
import { useUserSettings } from './useUserSettings'

export interface CharacterState {
  id: number
  name: string
  current_lng: number
  current_lat: number
  type: string
  gender: string
  active: boolean
  description: string
  resistance: number
  permadeath: boolean
  updated_at: string
  current_location: string | null
  current_region: string | null
}

const characters = ref<CharacterState[]>([])
const activeCharacter = ref<CharacterState | null>(null)
const characterLoading = ref(false)
const characterError = ref<string | null>(null)

export function useCharacter() {
  const { user, saveUserSettings } = useUserSettings()

  async function fetchAllCharacters() {
    characterLoading.value = true
    characterError.value = null
    try {
      const response = await api.get<CharacterState[]>('/character')
      characters.value = response.data
      
      // First, check if there's an active character in the user settings
      const userActiveCharacterId = user.value?.active_character_id
      if (userActiveCharacterId) {
        const characterFromSettings = response.data.find(c => c.id === userActiveCharacterId)
        if (characterFromSettings) {
          // Ensure the character is marked as active in the DB
          activeCharacter.value = characterFromSettings
          console.log('✅ Loaded active character from user settings:', characterFromSettings)
        } else {
          // Fallback to DB active flag if settings character not found
          activeCharacter.value = response.data.find(c => c.active) || null
        }
      } else {
        // No user settings, use DB active flag
        activeCharacter.value = response.data.find(c => c.active) || null
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

  async function updateActiveCharacterPosition(lng: number, lat: number) {
    if (!activeCharacter.value) {
      throw new Error('No active character')
    }
    characterLoading.value = true
    characterError.value = null
    try {
      const response = await api.put<CharacterState>('/character/active/position', {
        current_lng: lng,
        current_lat: lat
      })
      // Update the character in the array
      const index = characters.value.findIndex(c => c.id === activeCharacter.value!.id)
      if (index !== -1) {
        characters.value[index] = response.data
      }
      activeCharacter.value = response.data
      console.log('✅ Updated active character position:', response.data)
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
      
      // Persist to user settings
      await saveUserSettings({ active_character_id: id })
      console.log('✅ Set active character and saved to user settings:', response.data)
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
    characterLoading,
    characterError,
    fetchAllCharacters,
    fetchActiveCharacter,
    updateActiveCharacterPosition,
    setActiveCharacter
  }
}
