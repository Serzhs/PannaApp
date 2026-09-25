import type { CookNote } from '@panna/shared';
import { useTranslation } from 'react-i18next';

import { CookCard } from './components/CookCard';
import { NoteComposer } from './components/NoteComposer';
import { NoteList } from './components/NoteList';
import { styles } from './HistoryScreen.styles';
import { useAddNote, useCookHistory, useRecipe } from './queries';

import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { Screen } from '@/components/Screen';
import { Skeleton } from '@/components/Skeleton';
import { Stack } from '@/components/Stack';
import { Text } from '@/components/Text';
import { queuedCooks } from '@/features/cooking/history';
import { useIsOnline } from '@/query/useIsOnline';

export interface HistoryScreenProps {
  readonly recipeId: string;
}

/**
 * Every time this recipe was made (0029), with what was learned each time. A note is
 * written here or at the end of a cook, never from the recipe screen: it is what you
 * found out making it, and that is when you know.
 */
export function HistoryScreen({ recipeId }: HistoryScreenProps): React.JSX.Element {
  const { t } = useTranslation();
  const online = useIsOnline();
  const recipe = useRecipe(recipeId);
  const cooks = useCookHistory(recipeId);
  const addNote = useAddNote(recipeId);

  if (recipe.isPending || cooks.isPending) {
    return (
      <Screen withHeader>
        <Stack
          gap="space4"
          style={styles.body}
          accessibilityLabel={t('recipes:history.loading')}
          accessible
        >
          <Skeleton.Text variant="body" lines={3} />
          <Skeleton.Text variant="body" lines={3} />
        </Stack>
      </Screen>
    );
  }
  if (
    (recipe.isError && recipe.data === undefined) ||
    (cooks.isError && cooks.data === undefined)
  ) {
    return (
      <Screen withHeader>
        <ErrorState
          variant={online ? 'failure' : 'offline'}
          onRetry={() => {
            void recipe.refetch();
            void cooks.refetch();
          }}
        />
      </Screen>
    );
  }
  const notes: readonly CookNote[] = recipe.data.notes;
  const sent = cooks.data;
  const pending = queuedCooks(recipeId).sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  const attached = new Set(sent.map((cook) => cook.id));
  const other = notes.filter((note) => note.cookId === null || !attached.has(note.cookId));
  const stepLabel = (stepId: string) => {
    const index = recipe.data.steps.findIndex((step) => step.id === stepId);
    return index < 0 ? null : t('recipes:notes.onStep', { number: index + 1 });
  };

  if (sent.length === 0 && pending.length === 0 && other.length === 0) {
    return (
      <Screen withHeader>
        <EmptyState
          title={t('recipes:history.empty.title')}
          body={t('recipes:history.empty.body')}
        />
      </Screen>
    );
  }

  return (
    <Screen scroll withHeader>
      <Stack gap="space4" style={styles.body}>
        {pending.map((cook) => (
          <CookCard
            key={cook.id}
            startedAt={cook.startedAt}
            finishedAt={cook.finishedAt}
            excluded={cook.excluded}
            notes={[]}
            pending
          />
        ))}
        {sent.map((cook) => (
          <CookCard
            key={cook.id}
            startedAt={cook.startedAt}
            finishedAt={cook.finishedAt}
            excluded={cook.excluded}
            notes={notes.filter((note) => note.cookId === cook.id)}
          >
            <NoteComposer
              saving={addNote.isPending}
              onSave={async (body) => {
                await addNote.mutateAsync({ body, cookId: cook.id });
              }}
            />
          </CookCard>
        ))}
        {other.length === 0 ? null : (
          <Stack gap="space2">
            <Text variant="heading" accessibilityRole="header">
              {t('recipes:history.otherNotes')}
            </Text>
            <NoteList notes={other} stepLabel={stepLabel} />
          </Stack>
        )}
      </Stack>
    </Screen>
  );
}
