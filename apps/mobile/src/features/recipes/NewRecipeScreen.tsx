import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { RecipeForm } from './components/RecipeForm';
import { useCreateRecipe } from './queries';

import { Screen } from '@/components/Screen';

/**
 * The first page of the create flow. It saves a draft, then goes on to what the recipe
 * needs; 0008 adds the steps after that.
 */
export function NewRecipeScreen(): React.JSX.Element {
  const create = useCreateRecipe();
  const router = useRouter();
  const { t } = useTranslation();

  return (
    <Screen scroll withHeader>
      <RecipeForm
        submitLabel={t('recipes:form.saveDraft')}
        submitting={create.isPending}
        error={create.error}
        onSubmit={(body) => {
          create.mutate(body, {
            onSuccess: (recipe) => {
              // Replace, so back from the next page goes to the list rather than to this form.
              router.replace({ pathname: '/recipes/[id]/needs', params: { id: recipe.id } });
            },
          });
        }}
      />
    </Screen>
  );
}
