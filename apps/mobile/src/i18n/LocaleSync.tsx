import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { deviceLanguageTags, resolveLocale } from './index';

import { useAuth } from '@/features/auth/AuthProvider';

/**
 * Applies the signed-in person's language choice, and follows the device when there is
 * none. Changing the setting changes the language here, at once, with no restart.
 */
export function LocaleSync(): null {
  const { user } = useAuth();
  const { i18n } = useTranslation();
  const explicit = user?.locale ?? null;

  useEffect(() => {
    const next = resolveLocale(explicit, deviceLanguageTags());
    if (i18n.language !== next) void i18n.changeLanguage(next);
  }, [explicit, i18n]);

  return null;
}
