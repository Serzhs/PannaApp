import type { CookNote } from '@panna/shared';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { styles } from './NoteList.styles';

import { Stack } from '@/components/Stack';
import { Text } from '@/components/Text';

export interface NoteListProps {
  readonly notes: readonly CookNote[];
  /** Turns a step id into "On step 2"; absent when every note here is on one known step. */
  readonly stepLabel?: (stepId: string) => string | null;
}

/** Notes as they were written, newest first, each dated through Intl (0015). */
export function NoteList({ notes, stepLabel }: NoteListProps): React.JSX.Element | null {
  const { i18n } = useTranslation();
  if (notes.length === 0) return null;
  const date = new Intl.DateTimeFormat(i18n.language, { dateStyle: 'medium' });
  return (
    <Stack gap="space2">
      {notes.map((note) => {
        const when = date.format(Date.parse(note.createdAt));
        const where =
          note.stepId === null || stepLabel === undefined ? null : stepLabel(note.stepId);
        const meta = where === null ? when : `${when} · ${where}`;
        return (
          <View
            key={note.id}
            style={styles.note}
            accessible
            accessibilityLabel={`${meta}. ${note.body}`}
          >
            <Text variant="caption" color="textSecondary">
              {meta}
            </Text>
            <Text variant="body">{note.body}</Text>
          </View>
        );
      })}
    </Stack>
  );
}
