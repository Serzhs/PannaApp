import { ApiError } from '@panna/shared';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { NeedsEditor } from './components/NeedsEditor';
import { PhotoField } from './components/PhotoField';
import { RecipeForm } from './components/RecipeForm';
import {
  EMPTY_NEEDS,
  errorsFromServer,
  validateNeeds,
  type NeedsDraft,
  type NeedsErrors,
} from './needs';
import { useCreateRecipe } from './queries';

import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { Stack } from '@/components/Stack';

/**
 * The first page of the create flow (0025): what the recipe is and what it needs, saved
 * together. Continue goes on to the steps.
 */
export function NewRecipeScreen(): React.JSX.Element {
  const create = useCreateRecipe();
  const router = useRouter();
  const { t } = useTranslation();
  const [needs, setNeeds] = useState<NeedsDraft>(EMPTY_NEEDS);
  const [needsErrors, setNeedsErrors] = useState<NeedsErrors>({});
  const [cover, setCover] = useState<string | null>(null);

  useEffect(() => {
    if (create.error instanceof ApiError && create.error.body.fields !== undefined) {
      setNeedsErrors(errorsFromServer(create.error.body.fields, needs));
    }
    // The draft is deliberately not a dependency: errors map onto the draft that was sent.
  }, [create.error]);

  return (
    <Screen scroll withHeader>
      <Stack gap="space4">
        <Button
          label={t('recipes:import.instead')}
          variant="ghost"
          onPress={() => {
            router.push('/recipes/import');
          }}
        />
      </Stack>
      <RecipeForm
        submitLabel={t('recipes:form.continue')}
        submitting={create.isPending}
        error={create.error}
        beforeSubmit={() => {
          const lists = validateNeeds(needs);
          setNeedsErrors(lists.ok ? {} : lists.errors);
          return lists.ok;
        }}
        onSubmit={(body) => {
          const lists = validateNeeds(needs);
          if (!lists.ok) return;
          create.mutate(
            {
              ...body,
              coverImageKey: cover,
              ingredients: lists.ingredients,
              equipment: lists.equipment,
            },
            {
              onSuccess: (recipe) => {
                // Replace, so back from the next page goes to the list rather than to this form.
                router.replace({ pathname: '/recipes/[id]/steps', params: { id: recipe.id } });
              },
            },
          );
        }}
      >
        <PhotoField label={t('recipes:photo.cover')} value={cover} onChange={setCover} />
        <NeedsEditor value={needs} errors={needsErrors} onChange={setNeeds} />
      </RecipeForm>
    </Screen>
  );
}
