import { ApiError, type RecipeDetail } from '@panna/shared';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { NeedsEditor } from './components/NeedsEditor';
import { RecipeForm, type RecipeFormValues } from './components/RecipeForm';
import {
  draftFrom,
  errorsFromServer,
  validateNeeds,
  type NeedsDraft,
  type NeedsErrors,
} from './needs';
import { useRecipe, useUpdateRecipe } from './queries';

import { ErrorState } from '@/components/ErrorState';
import { Screen } from '@/components/Screen';
import { Spinner } from '@/components/Spinner';
import { useIsOnline } from '@/query/useIsOnline';

export interface EditRecipeScreenProps {
  readonly recipeId: string;
}

/**
 * The whole recipe on one screen, never the create flow's pages: someone fixing one
 * wrong number should not be walked through a wizard to reach it.
 */
export function EditRecipeScreen({ recipeId }: EditRecipeScreenProps): React.JSX.Element {
  const recipe = useRecipe(recipeId);
  const online = useIsOnline();
  const { t } = useTranslation();

  if (recipe.data === undefined) {
    return (
      <Screen withHeader>
        {recipe.isError ? (
          <ErrorState
            variant={online ? 'failure' : 'offline'}
            onRetry={() => void recipe.refetch()}
          />
        ) : (
          <Spinner label={t('recipes:detail.loading')} />
        )}
      </Screen>
    );
  }

  return <EditRecipeForm recipe={recipe.data} />;
}

/** Mounted once the recipe is known, so the draft can start from it. */
function EditRecipeForm({ recipe }: { readonly recipe: RecipeDetail }): React.JSX.Element {
  const update = useUpdateRecipe(recipe.id);
  const router = useRouter();
  const { t } = useTranslation();
  const [needs, setNeeds] = useState<NeedsDraft>(() =>
    draftFrom(recipe.ingredients, recipe.equipment),
  );
  const [needsErrors, setNeedsErrors] = useState<NeedsErrors>({});

  useEffect(() => {
    if (update.error instanceof ApiError && update.error.body.fields !== undefined) {
      setNeedsErrors(errorsFromServer(update.error.body.fields, needs));
    }
    // The draft is deliberately not a dependency: errors map onto the draft that was sent.
  }, [update.error]);

  const defaults: RecipeFormValues = {
    title: recipe.title,
    description: recipe.description ?? '',
    servings: String(recipe.servings),
    totalTimeMinutes: recipe.totalTimeMinutes === null ? '' : String(recipe.totalTimeMinutes),
  };

  return (
    <Screen scroll withHeader>
      <RecipeForm
        defaultValues={defaults}
        submitLabel={t('recipes:form.saveChanges')}
        submitting={update.isPending}
        error={update.error}
        beforeSubmit={() => {
          const outcome = validateNeeds(needs);
          setNeedsErrors(outcome.ok ? {} : outcome.errors);
          return outcome.ok;
        }}
        onSubmit={(body) => {
          const outcome = validateNeeds(needs);
          if (!outcome.ok) return;
          update.mutate(
            // An emptied field clears the value; the create body leaves it out instead.
            {
              title: body.title,
              description: body.description ?? null,
              servings: body.servings,
              totalTimeMinutes: body.totalTimeMinutes ?? null,
              ingredients: outcome.ingredients,
              equipment: outcome.equipment,
            },
            {
              onSuccess: () => {
                router.back();
              },
            },
          );
        }}
      >
        <NeedsEditor value={needs} errors={needsErrors} onChange={setNeeds} />
      </RecipeForm>
    </Screen>
  );
}
