import { zodResolver } from '@hookform/resolvers/zod';
import { ApiError, ERROR_CODES } from '@panna/shared';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';

import { styles } from './RecipeForm.styles';
import {
  EMPTY_VALUES,
  FIELD_MESSAGES,
  recipeFormSchema,
  type RecipeFormOutput,
  type RecipeFormValues,
} from './schema';

import { Button } from '@/components/Button';
import { Stack } from '@/components/Stack';
import { Text } from '@/components/Text';
import { TextField } from '@/components/TextField';
import { useIsOnline } from '@/query/useIsOnline';

export interface RecipeFormProps {
  readonly defaultValues?: RecipeFormValues;
  readonly submitLabel: string;
  readonly submitting: boolean;
  /** The failure of the last submit, if any. Field errors from it land on their fields. */
  readonly error: unknown;
  readonly onSubmit: (body: RecipeFormOutput) => void;
}

const OFFLINE_MESSAGE = 'You are offline. Connect to the internet to save.';

function formLevelMessage(error: unknown): string | null {
  if (error === null || error === undefined) return null;
  if (error instanceof ApiError && error.body.code === ERROR_CODES.VALIDATION_FAILED) return null;
  if (error instanceof TypeError) return OFFLINE_MESSAGE;
  return 'Could not save the recipe. Try again.';
}

const FIELDS = ['title', 'description', 'servings', 'totalTimeMinutes'] as const;

export function RecipeForm({
  defaultValues = EMPTY_VALUES,
  submitLabel,
  submitting,
  error,
  onSubmit,
}: RecipeFormProps): React.JSX.Element {
  const online = useIsOnline();
  const form = useForm<RecipeFormValues, unknown, RecipeFormOutput>({
    defaultValues,
    resolver: zodResolver(recipeFormSchema),
    mode: 'onBlur',
  });
  const { control, handleSubmit, setError, formState } = form;

  // The API validates with the same schema, so its field errors map straight back.
  useEffect(() => {
    if (!(error instanceof ApiError) || error.body.fields === undefined) return;
    for (const field of FIELDS) {
      if (field in error.body.fields) setError(field, { type: 'server' });
    }
  }, [error, setError]);

  const message = online ? formLevelMessage(error) : null;
  const offlineBlock = !online && formState.submitCount > 0;

  const submit = handleSubmit((body) => {
    // Nothing is sent offline: the input stays, the message says why, per CLAUDE.md.
    if (!online) return;
    onSubmit(body);
  });

  return (
    <Stack gap="space4" style={styles.form}>
      <Controller
        control={control}
        name="title"
        render={({ field, fieldState }) => (
          <TextField
            label="Title"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            autoFocus
            {...(fieldState.error ? { error: FIELD_MESSAGES.title } : {})}
          />
        )}
      />
      <Controller
        control={control}
        name="description"
        render={({ field, fieldState }) => (
          <TextField
            label="Description"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            multiline
            {...(fieldState.error ? { error: FIELD_MESSAGES.description } : {})}
          />
        )}
      />
      <Controller
        control={control}
        name="servings"
        render={({ field, fieldState }) => (
          <TextField
            label="Servings"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            keyboardType="number-pad"
            {...(fieldState.error ? { error: FIELD_MESSAGES.servings } : {})}
          />
        )}
      />
      <Controller
        control={control}
        name="totalTimeMinutes"
        render={({ field, fieldState }) => (
          <TextField
            label="Total time, minutes"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            keyboardType="number-pad"
            helper="Leave empty if you are not sure yet."
            {...(fieldState.error ? { error: FIELD_MESSAGES.totalTimeMinutes } : {})}
          />
        )}
      />
      {offlineBlock ? (
        <Text variant="caption" color="danger" accessibilityLiveRegion="polite">
          {OFFLINE_MESSAGE}
        </Text>
      ) : message === null ? null : (
        <Text variant="caption" color="danger" accessibilityLiveRegion="polite">
          {message}
        </Text>
      )}
      <Button label={submitLabel} loading={submitting} onPress={() => void submit()} />
    </Stack>
  );
}
