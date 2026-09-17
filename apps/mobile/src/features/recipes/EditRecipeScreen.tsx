import { ApiError, type RecipeDetail } from '@panna/shared';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { FlowChart } from './components/FlowChart';
import { FlowEditor } from './components/FlowEditor';
import { NeedsEditor } from './components/NeedsEditor';
import { RecipeForm, type RecipeFormValues } from './components/RecipeForm';
import { StepsEditor } from './components/StepsEditor';
import {
  draftFrom,
  errorsFromServer,
  validateNeeds,
  type NeedsDraft,
  type NeedsErrors,
} from './needs';
import { useRecipe, useUpdateRecipe } from './queries';
import {
  draftFromSteps,
  stepErrorsFromServer,
  dropBlank,
  validateSteps,
  type StepDraft,
  type StepErrors,
} from './steps';

import { ErrorState } from '@/components/ErrorState';
import { Screen } from '@/components/Screen';
import { Spinner } from '@/components/Spinner';
import { Stack } from '@/components/Stack';
import { Text } from '@/components/Text';
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
  const [steps, setSteps] = useState<StepDraft[]>(() => draftFromSteps(recipe.steps));
  const [stepErrors, setStepErrors] = useState<StepErrors>({});

  useEffect(() => {
    if (update.error instanceof ApiError && update.error.body.fields !== undefined) {
      setNeedsErrors(errorsFromServer(update.error.body.fields, needs));
      setStepErrors(stepErrorsFromServer(update.error.body.fields, steps));
    }
    // The drafts are deliberately not dependencies: errors map onto what was sent.
  }, [update.error]);

  const defaults: RecipeFormValues = {
    title: recipe.title,
    description: recipe.description ?? '',
    servings: String(recipe.servings),
  };

  return (
    <Screen scroll withHeader>
      <RecipeForm
        defaultValues={defaults}
        submitLabel={t('recipes:form.saveChanges')}
        submitting={update.isPending}
        error={update.error}
        beforeSubmit={() => {
          const lists = validateNeeds(needs);
          const stepsOutcome = validateSteps(dropBlank(steps));
          setNeedsErrors(lists.ok ? {} : lists.errors);
          setStepErrors(stepsOutcome.ok ? {} : stepsOutcome.errors);
          return lists.ok && stepsOutcome.ok;
        }}
        onSubmit={(body) => {
          const lists = validateNeeds(needs);
          const stepsOutcome = validateSteps(dropBlank(steps));
          if (!lists.ok || !stepsOutcome.ok) return;
          update.mutate(
            // An emptied field clears the value; the create body leaves it out instead.
            {
              title: body.title,
              description: body.description ?? null,
              servings: body.servings,
              ingredients: lists.ingredients,
              equipment: lists.equipment,
              steps: stepsOutcome.steps,
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
        <StepsEditor
          value={steps}
          errors={stepErrors}
          onChange={setSteps}
          ingredients={needs.ingredients}
          equipment={needs.equipment}
        />
        <Stack gap="space3">
          <Text variant="heading" accessibilityRole="header">
            {t('recipes:flow.title')}
          </Text>
          <FlowEditor value={steps} onChange={setSteps} />
          <FlowChart steps={steps} />
        </Stack>
      </RecipeForm>
    </Screen>
  );
}
