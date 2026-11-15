import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import { en } from './en'
import { ru } from './ru'

type Widen<T> = { [K in keyof T]: T[K] extends string ? string : Widen<T[K]> }
/** Russian is the source of truth: English must have exactly the same keys (checked by tsc). */
export type Messages = Widen<typeof ru>

export const LANGUAGES = ['ru', 'en'] as const
export type Language = (typeof LANGUAGES)[number]
const STORAGE_KEY = 'lang'

function initialLanguage(): Language {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === 'ru' || saved === 'en') return saved
  } catch {
    // storage unavailable — fall back to browser language
  }
  return typeof navigator !== 'undefined' && navigator.language.toLowerCase().startsWith('ru') ? 'ru' : 'en'
}

export function setLanguage(lang: Language): void {
  void i18n.changeLanguage(lang)
  try {
    localStorage.setItem(STORAGE_KEY, lang)
  } catch {
    // ignore
  }
}

void i18n.use(initReactI18next).init({
  resources: { ru: { translation: ru }, en: { translation: en } },
  lng: initialLanguage(),
  fallbackLng: 'ru',
  interpolation: { escapeValue: false },
})

export default i18n
