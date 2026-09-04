import { ref, watch } from 'vue'
import { useUserSettings } from './useUserSettings'
import i18n, { type AppLocale } from '@/app/i18n'

const STORAGE_KEY = 'narrative_language'

type Language = 'english' | 'spanish'

// Map between the persisted backend language value and the i18n locale code
function languageToLocale(lang: Language): AppLocale {
  return lang === 'spanish' ? 'es' : 'en'
}

// Load from localStorage or default to english
const storedLanguage = localStorage.getItem(STORAGE_KEY) as Language | null
const language = ref<Language>(storedLanguage || 'english')

// Keep the i18n locale in sync with the persisted language value
function syncI18nLocale(lang: Language) {
  i18n.global.locale.value = languageToLocale(lang)
}

// Sync once on load so the UI matches the stored/default language
syncI18nLocale(language.value)

// Watch for changes and persist to localStorage (fallback) and backend,
// and keep the i18n locale in sync.
watch(language, (newLanguage) => {
  localStorage.setItem(STORAGE_KEY, newLanguage)
  syncI18nLocale(newLanguage)
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
