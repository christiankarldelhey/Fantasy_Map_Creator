import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import api from '@/shared/api/client'
import type { User } from './useUserSettings'
import { useCharacter } from './useCharacter'

const TOKEN_KEY = 'me-auth-token'

const currentUser = ref<User | null>(null)
const authLoading = ref(false)
const authError = ref<string | null>(null)

export function useAuth() {
  const router = useRouter()
  const { activeCharacter } = useCharacter()

  const isAuthenticated = computed(() => !!currentUser.value)
  const isAdmin = computed(() => currentUser.value?.is_admin ?? false)

  function getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY)
  }

  function setToken(token: string) {
    localStorage.setItem(TOKEN_KEY, token)
  }

  function clearToken() {
    localStorage.removeItem(TOKEN_KEY)
  }

  async function register(email: string, password: string, username?: string): Promise<void> {
    authLoading.value = true
    authError.value = null
    try {
      const response = await api.post<{ token: string; user: User }>('/auth/register', {
        email,
        password,
        username
      })
      setToken(response.data.token)
      currentUser.value = response.data.user
    } catch (err: any) {
      const message = err.response?.data?.error || err.message || 'Registration failed'
      authError.value = message
      throw new Error(message)
    } finally {
      authLoading.value = false
    }
  }

  async function login(email: string, password: string): Promise<void> {
    authLoading.value = true
    authError.value = null
    try {
      const response = await api.post<{ token: string; user: User }>('/auth/login', {
        email,
        password
      })
      setToken(response.data.token)
      currentUser.value = response.data.user
      await api.post('/character/clone-all').catch(() => {})
    } catch (err: any) {
      const message = err.response?.data?.error || err.message || 'Login failed'
      authError.value = message
      throw new Error(message)
    } finally {
      authLoading.value = false
    }
  }

  async function restoreSession(): Promise<boolean> {
    const token = getToken()
    if (!token) return false

    authLoading.value = true
    try {
      const response = await api.get<User>('/auth/me')
      currentUser.value = response.data
      await api.post('/character/clone-all').catch(() => {})
      return true
    } catch {
      clearToken()
      currentUser.value = null
      return false
    } finally {
      authLoading.value = false
    }
  }

  function logout() {
    clearToken()
    currentUser.value = null
    authError.value = null
    localStorage.removeItem('me-welcome-seen')
    // Clear active character to prevent contamination in guest mode
    activeCharacter.value = null
    router.push('/login')
  }

  return {
    currentUser,
    authLoading,
    authError,
    isAuthenticated,
    isAdmin,
    getToken,
    register,
    login,
    restoreSession,
    logout
  }
}
