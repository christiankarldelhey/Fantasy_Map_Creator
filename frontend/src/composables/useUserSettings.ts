import { ref } from 'vue'
import api from '@/shared/api/client'

export interface UserSettings {
  narrative_language?: 'english' | 'spanish'
  current_climate_time?: string
  is_real_time?: boolean
  directions?: {
    destination?: {
      id?: number
      name: string
      type: 'location' | 'region' | 'custom'
      coordinates: [number, number]
    } | null
    is_active?: boolean
  }
}

export interface User {
  id: number
  email: string
  active_character_id: number | null
  active_trip_id: string | null
  settings: UserSettings
  created_at: string
  updated_at: string
  active_character: {
    id: number
    name: string
    current_lng: number
    current_lat: number
    type: string
    gender: string
    active: boolean
    description: string
    updated_at: string
  } | null
  active_trip: {
    id: string
    name: string
    start_lng: number
    start_lat: number
    end_lng: number
    end_lat: number
    transport_mode: string
    start_date: string
    current_day: number
    created_at: string
    route: any
  } | null
}

const user = ref<User | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)

export function useUserSettings() {
  async function fetchUserSettings() {
    loading.value = true
    error.value = null
    try {
      const response = await api.get<User>('/users/me')
      user.value = response.data
      console.log('✅ Loaded user settings:', response.data)
      return response.data
    } catch (err: any) {
      const message = err.response?.data?.error || err.message || 'Failed to load user settings'
      error.value = message
      console.error('❌ Error loading user settings:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  async function saveUserSettings(params: {
    active_character_id?: number | null
    active_trip_id?: string | null
    settings?: UserSettings
  }) {
    loading.value = true
    error.value = null
    try {
      const response = await api.put<User>('/users/me', params)
      user.value = response.data
      console.log('✅ Saved user settings:', response.data)
      return response.data
    } catch (err: any) {
      const message = err.response?.data?.error || err.message || 'Failed to save user settings'
      error.value = message
      console.error('❌ Error saving user settings:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  async function savePartialSettings(settings: Partial<UserSettings>) {
    loading.value = true
    error.value = null
    try {
      const response = await api.patch<User>('/users/me/settings', { settings })
      user.value = response.data
      console.log('✅ Saved partial settings:', response.data)
      return response.data
    } catch (err: any) {
      const message = err.response?.data?.error || err.message || 'Failed to save partial settings'
      error.value = message
      console.error('❌ Error saving partial settings:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  return {
    user,
    loading,
    error,
    fetchUserSettings,
    saveUserSettings,
    savePartialSettings
  }
}
