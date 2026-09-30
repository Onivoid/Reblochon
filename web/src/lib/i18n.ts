import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from '@/locales/en.json'
import fr from '@/locales/fr.json'

const stored = typeof localStorage !== 'undefined' ? localStorage.getItem('reblochon-locale') : null

void i18n.use(initReactI18next).init({
  resources: {
    fr: { translation: fr },
    en: { translation: en },
  },
  lng: stored === 'en' || stored === 'fr' ? stored : 'fr',
  fallbackLng: 'fr',
  interpolation: { escapeValue: false },
})

export function setAppLocale(locale: 'fr' | 'en') {
  localStorage.setItem('reblochon-locale', locale)
  void i18n.changeLanguage(locale)
}

export default i18n
