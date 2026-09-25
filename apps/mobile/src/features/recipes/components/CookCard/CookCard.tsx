import type { CookNote } from '@panna/shared';
import { useTranslation } from 'react-i18next';

import { formatDuration } from '../../format';
import { NoteList } from '../NoteList';

import { Card } from '@/components/Card';
import { Stack } from '@/components/Stack';
import { Text } from '@/components/Text';

export interface CookCardProps {
  readonly startedAt: string;
  readonly finishedAt: string;
  readonly excluded: readonly string[];
  readonly notes: readonly CookNote[];
  /** Finished on this phone, not yet sent (0014): shown, but nothing can be added to it yet. */
  readonly pending?: boolean;
  /** The composer, when a note can be added to this cook. */
  readonly children?: React.ReactNode;
}

/** One time the recipe was made (0029): when, how long, what was missing, what was learned. */
export function CookCard({
  startedAt,
  finishedAt,
  excluded,
  notes,
  pending = false,
  children,
}: CookCardProps): React.JSX.Element {
  const { t, i18n } = useTranslation();
  const date = new Intl.DateTimeFormat(i18n.language, { dateStyle: 'long' });
  const seconds = Math.max(0, Math.round((Date.parse(finishedAt) - Date.parse(startedAt)) / 1000));
  return (
    <Card>
      <Stack gap="space2">
        <Text variant="bodyStrong" accessibilityRole="header">
          {date.format(Date.parse(startedAt))}
        </Text>
        <Text variant="caption" color="textSecondary">
          {t('recipes:history.took', { duration: formatDuration(seconds, t) })}
          {pending ? ` · ${t('recipes:history.pending')}` : ''}
        </Text>
        {excluded.length === 0 ? null : (
          <Text variant="caption" color="textSecondary">
            {t('recipes:history.without', { list: excluded.join(', ') })}
          </Text>
        )}
        <NoteList notes={notes} />
        {children}
      </Stack>
    </Card>
  );
}
