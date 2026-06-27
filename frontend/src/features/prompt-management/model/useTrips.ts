import { ref } from 'vue'
import axios from 'axios'
import { useUserSettings } from '@/composables/useUserSettings'

// Trip/day generation can call an LLM, so it needs a longer timeout than the
// shared client (10s). We use a dedicated instance for this feature.
const tripApi = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 60000,
  headers: { 'Content-Type': 'application/json' },
})

export interface LatLng {
  lng: number
  lat: number
}

export interface Trip {
  id: string
  name: string | null
  start_lng: number
  start_lat: number
  end_lng: number
  end_lat: number
  transport_mode: string
  start_date: string
  total_distance_km: number | null
  total_time_hours: number | null
  current_day: number
  created_at: string
  route: any
  route_completed: any
}

export interface TripDay {
  id: string
  trip_id: string
  day_number: number
  date: string
  start_lng: number
  start_lat: number
  end_lng: number
  end_lat: number
  distance_km: number | null
  walking_hours: number | null
  geometry: unknown
  regions: Array<{ name: string; description_text?: string | null }>
  biomes: string[]
  altitude: string[]
  road_types: Record<string, number>
  locations: Array<{ name: string; type?: string; region?: string; hour?: string; distance_km?: number }>
  climate: unknown
  encounters: Array<{ hour: string; phase: string; region: string; entity: Record<string, unknown> }>
  prompt: string | null
  narrative: string | null
  is_last_day?: boolean
  trip_status?: 'active' | 'dead'
  created_at: string
}

export function useTrips() {
  const trip = ref<Trip | null>(null)
  const days = ref<TripDay[]>([])
  const loading = ref(false)
  const generating = ref(false)
  const error = ref<string | null>(null)
  const { saveUserSettings } = useUserSettings()

  async function createTrip(params: {
    name?: string
    start: LatLng
    end: LatLng
    transport_mode?: string
    start_date?: string
  }): Promise<Trip> {
    loading.value = true
    error.value = null
    try {
      const { data } = await tripApi.post<Trip>('/trips', params)
      trip.value = data
      days.value = []
      // Persist as active trip in user settings
      await saveUserSettings({ active_trip_id: data.id })
      console.log('✅ Created trip and saved as active trip:', data.id)
      return data
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error'
      console.error('❌ Error creating trip:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  async function generateDay(tripId: string, options: { day_number?: number; seed?: number; language?: string } = {}): Promise<TripDay> {
    generating.value = true
    error.value = null
    try {
      const { data } = await tripApi.post<TripDay>(`/trips/${tripId}/days`, options)
      days.value = [...days.value.filter((d) => d.day_number !== data.day_number), data]
        .sort((a, b) => a.day_number - b.day_number)
      return data
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error'
      console.error('❌ Error generating day:', err)
      throw err
    } finally {
      generating.value = false
    }
  }

  async function getDays(tripId: string): Promise<TripDay[]> {
    loading.value = true
    error.value = null
    try {
      const { data } = await tripApi.get<TripDay[]>(`/trips/${tripId}/days`)
      days.value = data.sort((a, b) => a.day_number - b.day_number)
      return data
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error'
      console.error('❌ Error loading days:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  async function getTrip(tripId: string): Promise<Trip> {
    loading.value = true
    error.value = null
    try {
      const { data } = await tripApi.get<Trip>(`/trips/${tripId}`)
      trip.value = data
      return data
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error'
      console.error('❌ Error loading trip:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  return {
    trip,
    days,
    loading,
    generating,
    error,
    createTrip,
    generateDay,
    getDays,
    getTrip,
  }
}
