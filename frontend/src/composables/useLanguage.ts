import { ref, watch } from 'vue'

const STORAGE_KEY = 'narrative_language'

type Language = 'english' | 'spanish'

// Load from localStorage or default to english
const storedLanguage = localStorage.getItem(STORAGE_KEY) as Language | null
const language = ref<Language>(storedLanguage || 'english')

// Watch for changes and persist to localStorage
watch(language, (newLanguage) => {
  localStorage.setItem(STORAGE_KEY, newLanguage)
})

export function useLanguage() {
  function setLanguage(lang: Language) {
    language.value = lang
  }

  return {
    language,
    setLanguage
  }
}
