import { localeSchema, type Locale, type UnitSystem } from '@panna/shared';

/**
 * Explicit choice, then the device, then English - and null is not English. A Latvian
 * on a Latvian phone who never opened settings gets Latvian; English is the last
 * resort for a device asking for a language the app does not ship.
 */
export function resolveLocale(
  explicit: Locale | null,
  deviceLanguageTags: readonly string[],
): Locale {
  if (explicit !== null) return explicit;
  for (const tag of deviceLanguageTags) {
    const language = tag.split('-')[0]?.toLowerCase();
    const parsed = localeSchema.safeParse(language);
    if (parsed.success) return parsed.data;
  }
  return 'en';
}

/** Same order, ending at metric. The device reports its measurement system directly. */
export function resolveUnitSystem(
  explicit: UnitSystem | null,
  deviceMeasurementSystem: string | null | undefined,
): UnitSystem {
  if (explicit !== null) return explicit;
  return deviceMeasurementSystem === 'us' ? 'imperial' : 'metric';
}
