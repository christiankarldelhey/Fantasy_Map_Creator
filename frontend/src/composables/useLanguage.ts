import { ref, watch } from 'vue'
import { useUserSettings } from './useUserSettings'

const STORAGE_KEY = 'narrative_language'

type Language = 'english' | 'spanish'

// Load from localStorage or default to english
const storedLanguage = localStorage.getItem(STORAGE_KEY) as Language | null
const language = ref<Language>(storedLanguage || 'english')

// Watch for changes and persist to localStorage (fallback) and backend
watch(language, (newLanguage) => {
  localStorage.setItem(STORAGE_KEY, newLanguage)
  // Also persist to backend settings
  const { savePartialSettings } = useUserSettings()
  savePartialSettings({ narrative_language: newLanguage }).catch(err => {
    console.error('Failed to save language to backend:', err)
  })
})

export function useLanguage() {
  const { user } = useUserSettings()

  // Initialize language from backend settings if available
  function initializeFromBackend() {
    if (user.value?.settings?.narrative_language) {
      language.value = user.value.settings.narrative_language
      console.log('✅ Loaded language from backend settings:', language.value)
    }
  }

  function setLanguage(lang: Language) {
    language.value = lang
  }

  return {
    language,
    setLanguage,
    initializeFromBackend
  }
}
