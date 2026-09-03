import { createI18n } from 'vue-i18n'
import en from './locales/en.json'

export type AppLocale = 'en' | 'es'

const i18n = createI18n({
  legacy: false,
  locale: 'en',
  fallbackLocale: 'en',
  messages: {
    en,
  },
})

export { i18n }
export default i18n
