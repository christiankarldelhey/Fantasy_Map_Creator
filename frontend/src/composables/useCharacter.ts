import { ref, watch } from 'vue'
import api from '@/shared/api/client'
import { useUserSettings } from './useUserSettings'

const TOKEN_KEY = 'me-auth-token'

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
  energy: number
  shadow: number
  permadeath: boolean
  updated_at: string
  current_location: string | null
  current_region: string | null
}

const characters = ref<CharacterState[]>([])
const activeCharacter = ref<CharacterState | null>(null)
const characterLoading = ref(false)
const characterError = ref<string | null>(null)

// Clear active character when auth state changes (guest <-> logged transition)
watch(() => localStorage.getItem(TOKEN_KEY), (newToken, oldToken) => {
  if (newToken !== oldToken) {
    // Auth state changed, clear character state
    activeCharacter.value = null
    characters.value = []
    console.log('🔄 Auth state changed, cleared character state')
  }
})

export function useCharacter() {
  const { user } = useUserSettings()

  async function fetchAllCharacters() {
    characterLoading.value = true
    characterError.value = null
    try {
      const response = await api.get<CharacterState[]>('/character/my')
      characters.value = response.data
      
      // Determine active character: prefer is_active_for_user flag, fallback to user settings
      const activeByFlag = response.data.find((c: any) => c.is_active_for_user)
      const userActiveCharacterId = user.value?.active_character_id
      if (activeByFlag) {
        activeCharacter.value = activeByFlag
      } else if (userActiveCharacterId) {
        activeCharacter.value = response.data.find(c => c.id === userActiveCharacterId) || response.data[0] || null
      } else {
        activeCharacter.value = response.data[0] || null
      }
      
      console.log('✅ Loaded user characters:', response.data)
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
      if (activeCharacter.value) {
        Object.assign(activeCharacter.value, response.data)
      } else {
        activeCharacter.value = response.data
      }
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
      activeCharacter.value = response.data
      // Sync user settings local state
      if (user.value) {
        user.value.active_character_id = id
      }
      // Update is_active_for_user flag in local characters array so markers re-render
      characters.value = characters.value.map((c: any) => ({
        ...c,
        is_active_for_user: c.id === id
      }))
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
    characterLoading,
    characterError,
    fetchAllCharacters,
    fetchActiveCharacter,
    updateActiveCharacterPosition,
    setActiveCharacter
  }
}
