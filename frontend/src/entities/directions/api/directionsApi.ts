import axios from 'axios'
import type { DirectionsResponse } from '../model/types'

// Route calculation can take a while, especially before the backend graph cache
// is warm, so give it more time than the default shared client.
const directionsApi = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json'
  }
})

directionsApi.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('me-auth-token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

export const fetchDirections = (
  startLng: number,
  startLat: number,
  endLng: number,
  endLat: number
) => {
  return directionsApi.get<DirectionsResponse>('/directions', {
    params: {
      start_lng: startLng,
      start_lat: startLat,
      end_lng: endLng,
      end_lat: endLat,
    },
  })
}
