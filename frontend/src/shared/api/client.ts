import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
})

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

export default api
