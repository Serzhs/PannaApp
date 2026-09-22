import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable } from 'react-native';

import { styles } from './FinishSheet.styles';

import { Screen } from '@/components/Screen';
import { Stack } from '@/components/Stack';
import { Text } from '@/components/Text';
import { TextField } from '@/components/TextField';

export interface FinishSheetProps {
  readonly visible: boolean;
  /** Called with the note, or null for none; either way the cook is over. */
  readonly onFinish: (note: string | null) => void;
}

/** The one question at the end of a cook (0015), with bars as big as the guide's. */
export function FinishSheet({ visible, onFinish }: FinishSheetProps): React.JSX.Element {
  const { t } = useTranslation();
  const [body, setBody] = useState('');
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => {
        onFinish(null);
      }}
    >
      <Screen scroll>
        <Stack gap="space5" style={styles.sheet}>
          <Text variant="heading" accessibilityRole="header">
            {t('recipes:notes.finishTitle')}
          </Text>
          <TextField
            label={t('recipes:notes.label')}
            value={body}
            onChangeText={setBody}
            multiline
            autoFocus
            helper={t('recipes:notes.helper')}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('recipes:notes.saveAndFinish')}
            accessibilityState={{ disabled: body.trim() === '' }}
            disabled={body.trim() === ''}
            onPress={() => {
              onFinish(body.trim());
            }}
            style={({ pressed }) => [
              styles.bar,
              styles.primary,
              body.trim() === '' ? styles.disabled : null,
              pressed ? styles.pressed : null,
            ]}
          >
            <Text variant="title" color="onAccent">
              {t('recipes:notes.saveAndFinish')}
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('recipes:notes.finishWithout')}
            onPress={() => {
              onFinish(null);
            }}
            style={({ pressed }) => [styles.bar, styles.secondary, pressed ? styles.pressed : null]}
          >
            <Text variant="title" color="accent">
              {t('recipes:notes.finishWithout')}
            </Text>
          </Pressable>
        </Stack>
      </Screen>
    </Modal>
  );
}
