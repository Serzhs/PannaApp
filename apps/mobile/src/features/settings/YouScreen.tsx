import { displayNameSchema, type Locale, type UnitSystem } from '@panna/shared';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { AvatarField } from './components/AvatarField';
import { ChoiceList } from './components/ChoiceList';
import { useUpdateMe } from './queries';
import { styles } from './YouScreen.styles';

import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { Stack } from '@/components/Stack';
import { Text } from '@/components/Text';
import { TextField } from '@/components/TextField';
import { useAuth } from '@/features/auth/AuthProvider';
import { resetKnuckleHint } from '@/features/cooking/hint';
import {
  deviceLanguageTags,
  deviceMeasurementSystem,
  resolveLocale,
  resolveUnitSystem,
} from '@/i18n';

/**
 * The You tab (0018): a face, a name, the two preferences from 0006, and the way out.
 * Each "Device" row is the null state, and says what the device currently resolves to,
 * so the choice is legible rather than blank.
 */
export function YouScreen(): React.JSX.Element {
  const { t } = useTranslation();
  const router = useRouter();
  const { user, signOut } = useAuth();
  const update = useUpdateMe();
  const [name, setName] = useState(user?.displayName ?? '');
  const [nameProblem, setNameProblem] = useState<'empty' | 'tooLong' | null>(null);
  const [hintReset, setHintReset] = useState(false);

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

  const saveName = () => {
    // The same rule the API applies, checked here so a blank never leaves the phone.
    const trimmed = name.trim();
    if (trimmed.length === 0) {
      setNameProblem('empty');
      return;
    }
    if (!displayNameSchema.safeParse(trimmed).success) {
      setNameProblem('tooLong');
      return;
    }
    setNameProblem(null);
    update.mutate({ displayName: trimmed });
  };

  return (
    <Screen scroll withHeader>
      <Stack gap="space6" style={styles.body}>
        {user === null ? null : (
          <Stack gap="space4">
            <AvatarField
              name={user.displayName}
              value={user.avatarImageKey}
              saving={update.isPending}
              onChange={(avatarImageKey) => {
                update.mutate({ avatarImageKey });
              }}
            />
            <TextField
              label={t('settings:name.label')}
              value={name}
              onChangeText={(text) => {
                setName(text);
                setNameProblem(null);
              }}
              autoCapitalize="words"
              maxLength={80}
              returnKeyType="done"
              onSubmitEditing={saveName}
              {...(nameProblem === null ? {} : { error: t(`settings:name.${nameProblem}`) })}
            />
            <View style={styles.saveRow}>
              <Text variant="caption" color="textSecondary" style={styles.email}>
                {t('settings:email', { email: user.email })}
              </Text>
              <Button
                label={t('settings:name.save')}
                variant="secondary"
                loading={update.isPending}
                onPress={saveName}
              />
            </View>
          </Stack>
        )}
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
        <Stack gap="space2">
          <Button
            label={t('settings:knuckleHint.showAgain')}
            variant="secondary"
            onPress={() => {
              resetKnuckleHint();
              setHintReset(true);
            }}
          />
          {hintReset ? (
            <Text variant="caption" color="textSecondary" accessibilityLiveRegion="polite">
              {t('settings:knuckleHint.willShow')}
            </Text>
          ) : null}
        </Stack>
        {update.isError ? (
          <Text variant="caption" color="danger" accessibilityLiveRegion="polite">
            {t('settings:saveFailed')}
          </Text>
        ) : null}
        <Button label={t('settings:signOut')} variant="secondary" onPress={() => void signOut()} />
        {__DEV__ ? (
          <Button
            label={t('settings:designGallery')}
            variant="ghost"
            onPress={() => {
              router.push('/you/design');
            }}
          />
        ) : null}
      </Stack>
    </Screen>
  );
}
