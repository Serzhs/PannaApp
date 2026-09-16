import type { Locale, UnitSystem } from '@panna/shared';
import { useTranslation } from 'react-i18next';

import { ChoiceList } from './components/ChoiceList';
import { useUpdateMe } from './queries';
import { styles } from './SettingsScreen.styles';

import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { Stack } from '@/components/Stack';
import { Text } from '@/components/Text';
import { useAuth } from '@/features/auth/AuthProvider';
import {
  deviceLanguageTags,
  deviceMeasurementSystem,
  resolveLocale,
  resolveUnitSystem,
} from '@/i18n';

/**
 * Each "Device" row is the null state, and says what the device currently resolves to,
 * so the choice is legible rather than blank.
 */
export function SettingsScreen(): React.JSX.Element {
  const { t } = useTranslation();
  const { user, signOut } = useAuth();
  const update = useUpdateMe();

  const deviceLocale = resolveLocale(null, deviceLanguageTags());
  const deviceUnits = resolveUnitSystem(null, deviceMeasurementSystem());

  const languages = [
    {
      value: null,
      label: t('settings:language.device', { resolved: t(`settings:language.${deviceLocale}`) }),
    },
    { value: 'en', label: t('settings:language.en') },
    { value: 'lv', label: t('settings:language.lv') },
  ] as const satisfies readonly { value: Locale | null; label: string }[];

  const units = [
    {
      value: null,
      label: t('settings:units.device', { resolved: t(`settings:units.${deviceUnits}`) }),
    },
    { value: 'metric', label: t('settings:units.metric') },
    { value: 'imperial', label: t('settings:units.imperial') },
  ] as const satisfies readonly { value: UnitSystem | null; label: string }[];

  return (
    <Screen scroll withHeader>
      <Stack gap="space6" style={styles.body}>
        <ChoiceList
          title={t('settings:language.title')}
          choices={languages}
          value={user?.locale ?? null}
          disabled={update.isPending}
          onChange={(locale) => {
            update.mutate({ locale });
          }}
        />
        <ChoiceList
          title={t('settings:units.title')}
          choices={units}
          value={user?.unitSystem ?? null}
          disabled={update.isPending}
          onChange={(unitSystem) => {
            update.mutate({ unitSystem });
          }}
        />
        {update.isError ? (
          <Text variant="caption" color="danger" accessibilityLiveRegion="polite">
            {t('settings:saveFailed')}
          </Text>
        ) : null}
        <Button label={t('settings:signOut')} variant="secondary" onPress={() => void signOut()} />
      </Stack>
    </Screen>
  );
}
