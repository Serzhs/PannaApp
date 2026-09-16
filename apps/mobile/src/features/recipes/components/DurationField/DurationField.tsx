import DateTimePicker from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, View } from 'react-native';

import { styles } from './DurationField.styles';

import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { Stack } from '@/components/Stack';
import { Text } from '@/components/Text';
import { formatDuration } from '@/features/recipes/format';

export interface DurationFieldProps {
  readonly value: number | null;
  readonly onChange: (seconds: number | null) => void;
  readonly error?: string;
}

/**
 * The picker works in hours and minutes of a day, anchored to today's midnight in the
 * device's time zone, so a duration is that time of day. Any other day is clamped.
 */
function toDate(seconds: number): Date {
  const date = new Date();
  date.setHours(Math.floor(seconds / 3600), Math.floor((seconds % 3600) / 60), 0, 0);
  return date;
}

function toSeconds(date: Date): number {
  return date.getHours() * 3600 + date.getMinutes() * 60;
}

/**
 * The platform's own picker rather than a text field of seconds, per the Platform
 * behaviour section of CLAUDE.md. Both platforms use their time picker, reading hours
 * and minutes as the duration. iOS also has a countdown picker made for exactly this,
 * but it ignores the value it is handed, so an existing time would always reopen at
 * one minute; a picker that cannot show what is set is worse than one that looks like
 * a clock.
 */
export function DurationField({ value, onChange, error }: DurationFieldProps): React.JSX.Element {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState<Date>(toDate(value ?? 600));
  const label = value === null ? t('recipes:steps.untimed') : formatDuration(value, t);

  return (
    <View>
      <Text
        variant="label"
        color="textSecondary"
        accessibilityElementsHidden
        importantForAccessibility="no"
      >
        {t('recipes:steps.duration')}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${t('recipes:steps.duration')}, ${label}`}
        accessibilityState={{ expanded: open }}
        onPress={() => {
          setPending(toDate(value ?? 600));
          setOpen(true);
        }}
        style={[styles.field, error === undefined ? null : styles.fieldError]}
      >
        <Text variant="body">{label}</Text>
      </Pressable>
      {error === undefined ? null : (
        <Text variant="caption" color="danger">
          {error}
        </Text>
      )}
      <Modal
        visible={open}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => {
          setOpen(false);
        }}
      >
        <Screen>
          <Stack gap="space4" style={styles.sheet}>
            <Text variant="heading" accessibilityRole="header">
              {t('recipes:steps.duration')}
            </Text>
            <DateTimePicker
              value={pending}
              mode="time"
              display="spinner"
              is24Hour
              onValueChange={(_event, date) => {
                setPending(date);
              }}
            />
            <Button
              label={t('recipes:steps.setTime')}
              onPress={() => {
                const seconds = toSeconds(pending);
                onChange(seconds === 0 ? null : seconds);
                setOpen(false);
              }}
            />
            <Button
              label={t('recipes:steps.clearTime')}
              variant="ghost"
              onPress={() => {
                onChange(null);
                setOpen(false);
              }}
            />
          </Stack>
        </Screen>
      </Modal>
    </View>
  );
}
