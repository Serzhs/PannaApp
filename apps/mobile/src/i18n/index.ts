import { getLocales } from 'expo-localization';
import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';

import { resolveLocale } from './resolve';
import { NAMESPACES, resources } from './resources';

/** The device's languages in order of preference, or none where the module is absent. */
export function deviceLanguageTags(): string[] {
  try {
    return getLocales().map((locale) => locale.languageTag);
  } catch {
    return [];
  }
}

export function deviceMeasurementSystem(): string | null {
  try {
    return getLocales().at(0)?.measurementSystem ?? null;
  } catch {
    return null;
  }
}

/**
 * Starts in the device's language; the signed-in user's choice is applied on top by
 * LocaleSync once the session is known. `returnEmptyString` is off so a Latvian file
 * with every key listed and the value still to be written falls back to English rather
 * than rendering nothing - which is what lets the file be a to-do list.
 */
void i18next.use(initReactI18next).init({
  resources,
  ns: NAMESPACES,
  defaultNS: 'common',
  lng: resolveLocale(null, deviceLanguageTags()),
  fallbackLng: 'en',
  supportedLngs: ['en', 'lv'],
  returnEmptyString: false,
  interpolation: { escapeValue: false },
});

export { i18next as i18n };
export { resolveLocale, resolveUnitSystem } from './resolve';
