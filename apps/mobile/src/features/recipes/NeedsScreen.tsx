import { ApiError, ERROR_CODES } from '@panna/shared';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { NeedsEditor } from './components/NeedsEditor';
import {
  EMPTY_NEEDS,
  errorsFromServer,
  validateNeeds,
  type NeedsDraft,
  type NeedsErrors,
} from './needs';
import { styles } from './NeedsScreen.styles';
import { useUpdateRecipe } from './queries';

import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { Stack } from '@/components/Stack';
import { Text } from '@/components/Text';
import { useIsOnline } from '@/query/useIsOnline';

export interface NeedsScreenProps {
  readonly recipeId: string;
}

/**
 * The second page of the create flow. Skip is a real option: a recipe can be written
 * down before its shopping is known, and the lists are a tap away on the recipe.
 */
export function NeedsScreen({ recipeId }: NeedsScreenProps): React.JSX.Element {
  const { t } = useTranslation();
  const router = useRouter();
  const online = useIsOnline();
  const update = useUpdateRecipe(recipeId);
  const [draft, setDraft] = useState<NeedsDraft>(EMPTY_NEEDS);
  const [errors, setErrors] = useState<NeedsErrors>({});
  const [triedOffline, setTriedOffline] = useState(false);

  useEffect(() => {
    if (update.error instanceof ApiError && update.error.body.fields !== undefined) {
      setErrors(errorsFromServer(update.error.body.fields, draft));
    }
    // The draft is deliberately not a dependency: errors map onto the draft that was sent.
  }, [update.error]);

  const landOnRecipe = () => {
    router.replace({ pathname: '/recipes/[id]', params: { id: recipeId } });
  };

  const done = () => {
    if (!online) {
      setTriedOffline(true);
      return;
    }
    const outcome = validateNeeds(draft);
    if (!outcome.ok) {
      setErrors(outcome.errors);
      return;
    }
    setErrors({});
    update.mutate(
      { ingredients: outcome.ingredients, equipment: outcome.equipment },
      { onSuccess: landOnRecipe },
    );
  };

  const failed =
    update.isError &&
    !(update.error instanceof ApiError && update.error.body.code === ERROR_CODES.VALIDATION_FAILED);

  return (
    <Screen scroll withHeader>
      <Stack gap="space6" style={styles.body}>
        <NeedsEditor
          value={draft}
          errors={errors}
          onChange={(next) => {
            setDraft(next);
            setTriedOffline(false);
          }}
        />
        {triedOffline && !online ? (
          <Text variant="caption" color="danger" accessibilityLiveRegion="polite">
            {t('common:offline.save')}
          </Text>
        ) : failed ? (
          <Text variant="caption" color="danger" accessibilityLiveRegion="polite">
            {t('recipes:form.failed')}
          </Text>
        ) : null}
        <Stack gap="space3">
          <Button label={t('recipes:needs.done')} loading={update.isPending} onPress={done} />
          <Button label={t('recipes:needs.skip')} variant="ghost" onPress={landOnRecipe} />
        </Stack>
      </Stack>
    </Screen>
  );
}
