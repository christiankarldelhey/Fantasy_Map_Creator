import axios from 'axios'
import type { GeoJSONFeatureCollection, HealthCheckResponse } from '@/types/geojson'

const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// Interceptors para logging
api.interceptors.request.use(
  config => {
    console.log(`📡 ${config.method?.toUpperCase()} ${config.url}`)
    return config
  },
  error => {
    console.error('❌ Request error:', error)
    return Promise.reject(error)
  }
)

api.interceptors.response.use(
  response => {
    console.log(`✅ Response from ${response.config.url}`)
    return response
  },
  error => {
    console.error('❌ Response error:', error.response?.data || error.message)
    return Promise.reject(error)
  }
)

// API functions
export const getLocations = () => api.get<GeoJSONFeatureCollection>('/locations')
export const getLocation = (id: number) => api.get<GeoJSONFeatureCollection>(`/locations/${id}`)
export const getRegions = () => api.get<GeoJSONFeatureCollection>('/regions')
export const healthCheck = () => api.get<HealthCheckResponse>('/health')

export default api
