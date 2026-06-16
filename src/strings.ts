import { de } from './i18n/locales/de';
import { en } from './i18n/locales/en';
import { fr } from './i18n/locales/fr';
import { es } from './i18n/locales/es';
import { nl } from './i18n/locales/nl';

export type LanguageCode = 'de' | 'en' | 'fr' | 'es' | 'nl';

export const LOCALES: Record<LanguageCode, { label: string; dict: typeof de }> = {
  de: { label: 'Deutsch', dict: de },
  en: { label: 'English', dict: en },
  fr: { label: 'Français', dict: fr },
  es: { label: 'Español', dict: es },
  nl: { label: 'Nederlands', dict: nl }
};

export const LANGUAGE_CODES = Object.keys(LOCALES) as LanguageCode[];

export function getSavedLanguage(): LanguageCode {
  try {
    const saved = localStorage.getItem('bbk:lang') as LanguageCode;
    if (saved && LOCALES[saved]) return saved;
    
    // Auto-detect based on browser language
    const browserLang = navigator.language.split('-')[0] as LanguageCode;
    if (LOCALES[browserLang]) return browserLang;
  } catch {
    // ignore
  }
  return 'de';
}

export function setLanguage(lang: LanguageCode) {
  try {
    localStorage.setItem('bbk:lang', lang);
    location.reload();
  } catch {
    // ignore
  }
}

export const currentLanguage = getSavedLanguage();
export const strings = LOCALES[currentLanguage].dict;
