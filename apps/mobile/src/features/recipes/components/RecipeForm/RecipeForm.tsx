import { zodResolver } from '@hookform/resolvers/zod';
import { ApiError, ERROR_CODES } from '@panna/shared';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import { ServingsPicker } from '../ServingsPicker';

import { styles } from './RecipeForm.styles';
import {
  EMPTY_VALUES,
  FIELD_MESSAGE_KEYS,
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
  /**
   * Rendered between the fields and the submit button: the lists, from 0007 on. A
   * function gets the fields to place itself, which is how the edit screen tabs them (0025).
   */
  readonly children?: React.ReactNode | ((fields: React.ReactNode) => React.ReactNode);
  /** A last check of whatever the children hold. Returning false keeps the submit from sending. */
  readonly beforeSubmit?: () => boolean;
}

function formLevelMessageKey(error: unknown): string | null {
  if (error === null || error === undefined) return null;
  if (error instanceof ApiError && error.body.code === ERROR_CODES.VALIDATION_FAILED) return null;
  if (error instanceof TypeError) return 'common:offline.save';
  return 'recipes:form.failed';
}

const FIELDS = ['title', 'description', 'servings'] as const;

export function RecipeForm({
  defaultValues = EMPTY_VALUES,
  submitLabel,
  submitting,
  error,
  onSubmit,
  children,
  beforeSubmit,
}: RecipeFormProps): React.JSX.Element {
  const { t } = useTranslation();
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

  const messageKey = online ? formLevelMessageKey(error) : null;
  const offlineBlock = !online && formState.submitCount > 0;
  const fieldError = (field: keyof RecipeFormValues, failed: boolean) =>
    failed ? { error: t(FIELD_MESSAGE_KEYS[field]) } : {};

  const submit = handleSubmit((body) => {
    // Nothing is sent offline: the input stays, the message says why, per CLAUDE.md.
    if (!online) return;
    if (beforeSubmit !== undefined && !beforeSubmit()) return;
    onSubmit(body);
  });

  const fields = (
    <Stack gap="space4">
      <Controller
        control={control}
        name="title"
        render={({ field, fieldState }) => (
          <TextField
            label={t('recipes:form.title')}
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            autoFocus
            {...fieldError('title', fieldState.error !== undefined)}
          />
        )}
      />
      <Controller
        control={control}
        name="description"
        render={({ field, fieldState }) => (
          <TextField
            label={t('recipes:form.description')}
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            multiline
            {...fieldError('description', fieldState.error !== undefined)}
          />
        )}
      />
      <Controller
        control={control}
        name="servings"
        render={({ field, fieldState }) => (
          <ServingsPicker
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            {...fieldError('servings', fieldState.error !== undefined)}
          />
        )}
      />
    </Stack>
  );

  return (
    <Stack gap="space4" style={styles.form}>
      {typeof children === 'function' ? (
        children(fields)
      ) : (
        <>
          {fields}
          {children}
        </>
      )}
      {offlineBlock ? (
        <Text variant="caption" color="danger" accessibilityLiveRegion="polite">
          {t('common:offline.save')}
        </Text>
      ) : messageKey === null ? null : (
        <Text variant="caption" color="danger" accessibilityLiveRegion="polite">
          {t(messageKey)}
        </Text>
      )}
      <Button label={submitLabel} loading={submitting} onPress={() => void submit()} />
    </Stack>
  );
}
