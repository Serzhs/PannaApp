import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { styles } from './ServingsPicker.styles';

import { Chip } from '@/components/Chip';
import { Stack } from '@/components/Stack';
import { Text } from '@/components/Text';
import { TextField } from '@/components/TextField';

export interface ServingsPickerProps {
  /** Text, as the form holds it; a number when picked from the row. */
  readonly value: string;
  readonly onChangeText: (text: string) => void;
  readonly onBlur?: () => void;
  readonly error?: string;
}

/** The servings almost everyone cooks for. Anything else is a tap on Other. */
const QUICK = ['1', '2', '4', '6'] as const;

/** One choice at a time, so the row reads as radio buttons (0025). */
export function ServingsPicker({
  value,
  onChangeText,
  onBlur,
  error,
}: ServingsPickerProps): React.JSX.Element {
  const { t } = useTranslation();
  const quick = (QUICK as readonly string[]).includes(value.trim());
  // Other stays open once chosen, even while its field is empty or holds a quick number.
  const [other, setOther] = useState(value.trim() !== '' && !quick);
  const showField = other || (value.trim() !== '' && !quick) || (error !== undefined && !quick);

  return (
    <Stack gap="space2">
      <Text variant="label" color="textSecondary">
        {t('recipes:form.servings')}
      </Text>
      <View style={styles.row}>
        {QUICK.map((option) => (
          <Chip
            key={option}
            role="radio"
            label={option}
            selected={!showField && value.trim() === option}
            onPress={() => {
              setOther(false);
              onChangeText(option);
            }}
          />
        ))}
        <Chip
          role="radio"
          label={t('recipes:form.servingsOther')}
          selected={showField}
          onPress={() => {
            setOther(true);
            if (quick) onChangeText('');
          }}
        />
      </View>
      {showField ? (
        <TextField
          label={t('recipes:form.servings')}
          value={value}
          onChangeText={onChangeText}
          {...(onBlur === undefined ? {} : { onBlur })}
          keyboardType="number-pad"
          autoFocus={other}
          {...(error === undefined ? {} : { error })}
        />
      ) : error === undefined ? null : (
        <Text variant="caption" color="danger" accessibilityLiveRegion="polite">
          {error}
        </Text>
      )}
    </Stack>
  );
}
