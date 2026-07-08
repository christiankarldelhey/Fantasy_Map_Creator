import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
})

api.interceptors.request.use(
  config => {
    const token = localStorage.getItem('me-auth-token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
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

export default api
