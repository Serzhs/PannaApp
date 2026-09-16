import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { RecipeForm } from './components/RecipeForm';
import { useCreateRecipe } from './queries';

import { Screen } from '@/components/Screen';

/**
 * The first page of what becomes a four-page create flow. Until 0007 and 0008 add the
 * others, it saves a draft and lands on the recipe.
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
              // Replace, so back from the recipe goes to the list rather than to this form.
              router.replace({ pathname: '/recipes/[id]', params: { id: recipe.id } });
            },
          });
        }}
      />
    </Screen>
  );
}
