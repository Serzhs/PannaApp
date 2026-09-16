import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { RecipeForm, type RecipeFormValues } from './components/RecipeForm';
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
  const update = useUpdateRecipe(recipeId);
  const online = useIsOnline();
  const router = useRouter();
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

  const defaults: RecipeFormValues = {
    title: recipe.data.title,
    description: recipe.data.description ?? '',
    servings: String(recipe.data.servings),
    totalTimeMinutes:
      recipe.data.totalTimeMinutes === null ? '' : String(recipe.data.totalTimeMinutes),
  };

  return (
    <Screen scroll withHeader>
      <RecipeForm
        defaultValues={defaults}
        submitLabel={t('recipes:form.saveChanges')}
        submitting={update.isPending}
        error={update.error}
        onSubmit={(body) => {
          update.mutate(
            // An emptied field clears the value; the create body leaves it out instead.
            {
              title: body.title,
              description: body.description ?? null,
              servings: body.servings,
              totalTimeMinutes: body.totalTimeMinutes ?? null,
            },
            {
              onSuccess: () => {
                router.back();
              },
            },
          );
        }}
      />
    </Screen>
  );
}
