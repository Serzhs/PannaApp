import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { styles } from './NoteComposer.styles';

import { Button } from '@/components/Button';
import { Stack } from '@/components/Stack';
import { Text } from '@/components/Text';
import { TextField } from '@/components/TextField';
import { useIsOnline } from '@/query/useIsOnline';

export interface NoteComposerProps {
  /** Sends the note; resolves when it is saved, rejects when it is not. */
  readonly onSave: (body: string) => Promise<void>;
  readonly saving: boolean;
}

/**
 * A field behind a button, like 0020's note fields, and a Save that needs a connection
 * (0015). A failed save keeps the text, so nothing typed is lost.
 */
export function NoteComposer({ onSave, saving }: NoteComposerProps): React.JSX.Element {
  const { t } = useTranslation();
  const online = useIsOnline();
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState('');
  const [problem, setProblem] = useState<'offline' | 'failed' | null>(null);

  if (!open) {
    return (
      <View style={styles.button}>
        <Button
          label={t('recipes:notes.add')}
          variant="ghost"
          onPress={() => {
            setOpen(true);
          }}
        />
      </View>
    );
  }

  const save = async () => {
    if (!online) {
      setProblem('offline');
      return;
    }
    setProblem(null);
    try {
      await onSave(body.trim());
      setBody('');
      setOpen(false);
    } catch {
      setProblem('failed');
    }
  };

  return (
    <Stack gap="space2">
      <TextField
        label={t('recipes:notes.label')}
        value={body}
        onChangeText={setBody}
        multiline
        autoFocus
        helper={t('recipes:notes.helper')}
      />
      {problem === 'offline' && !online ? (
        <Text variant="caption" color="danger" accessibilityLiveRegion="polite">
          {t('common:offline.save')}
        </Text>
      ) : problem === 'failed' ? (
        <Text variant="caption" color="danger" accessibilityLiveRegion="polite">
          {t('recipes:notes.failed')}
        </Text>
      ) : null}
      <View style={styles.actions}>
        <Button
          label={t('recipes:notes.cancel')}
          variant="ghost"
          onPress={() => {
            setOpen(false);
            setProblem(null);
          }}
        />
        <Button
          label={t('recipes:notes.save')}
          loading={saving}
          disabled={body.trim() === ''}
          onPress={() => void save()}
        />
      </View>
    </Stack>
  );
}
