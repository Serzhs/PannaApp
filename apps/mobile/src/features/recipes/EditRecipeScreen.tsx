import { ApiError, type RecipeDetail } from '@panna/shared';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { FlowChart } from './components/FlowChart';
import { FlowEditor } from './components/FlowEditor';
import { NeedsEditor } from './components/NeedsEditor';
import { PhotoField } from './components/PhotoField';
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
import { Tabs, type Tab } from '@/components/Tabs';
import { useIsOnline } from '@/query/useIsOnline';

export interface EditRecipeScreenProps {
  readonly recipeId: string;
}

type Part = 'recipe' | 'steps' | 'flow';

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
  const [cover, setCover] = useState<string | null>(recipe.coverImageKey);
  const [tab, setTab] = useState<Part>('recipe');
  const tabs: readonly Tab<Part>[] = [
    { key: 'recipe', label: t('recipes:form.tabRecipe') },
    { key: 'steps', label: t('recipes:steps.title') },
    { key: 'flow', label: t('recipes:flow.title') },
  ];

  useEffect(() => {
    if (update.error instanceof ApiError && update.error.body.fields !== undefined) {
      const fields = update.error.body.fields;
      const forNeeds = errorsFromServer(fields, needs);
      const forSteps = stepErrorsFromServer(fields, steps);
      setNeedsErrors(forNeeds);
      setStepErrors(forSteps);
      // The tab that holds the refused field opens, so the error is never on a hidden part.
      const onRecipe =
        Object.keys(forNeeds).length > 0 ||
        Object.keys(fields).some((key) => !key.startsWith('steps.'));
      setTab(onRecipe ? 'recipe' : Object.keys(forSteps).length > 0 ? 'steps' : tab);
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
          if (!lists.ok) setTab('recipe');
          else if (!stepsOutcome.ok) setTab('steps');
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
              coverImageKey: cover,
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
        {(fields) => (
          <Stack gap="space5">
            <Tabs tabs={tabs} value={tab} onChange={setTab} />
            {tab === 'recipe' ? (
              <Stack gap="space5">
                {fields}
                <PhotoField label={t('recipes:photo.cover')} value={cover} onChange={setCover} />
                <NeedsEditor value={needs} errors={needsErrors} onChange={setNeeds} />
              </Stack>
            ) : tab === 'steps' ? (
              <StepsEditor
                value={steps}
                errors={stepErrors}
                onChange={setSteps}
                ingredients={needs.ingredients}
                equipment={needs.equipment}
              />
            ) : (
              <Stack gap="space3">
                <FlowEditor value={steps} onChange={setSteps} />
                <FlowChart steps={steps} />
              </Stack>
            )}
          </Stack>
        )}
      </RecipeForm>
    </Screen>
  );
}
