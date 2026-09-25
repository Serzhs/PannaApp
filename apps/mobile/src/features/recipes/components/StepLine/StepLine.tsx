import { useTranslation } from 'react-i18next';

import type { StepDraft, StepField } from '../../steps';
import { DurationField } from '../DurationField';
import { LinkChips, type Linkable } from '../LinkChips';
import { NoteField } from '../NoteField';
import { PhotoField } from '../PhotoField';

import { Stack } from '@/components/Stack';
import { Text } from '@/components/Text';
import { TextField } from '@/components/TextField';

export interface StepLineProps {
  readonly line: StepDraft;
  readonly errors?: Partial<Record<StepField, true>>;
  readonly onChange: (line: StepDraft) => void;
  /** The recipe's own lines, which are all a step may point at (0010). */
  readonly ingredients: readonly Linkable[];
  readonly equipment: readonly Linkable[];
}

/** One step as the author writes it: the instruction, how long, what it uses, then the tip. */
export function StepLine({
  line,
  errors = {},
  onChange,
  ingredients,
  equipment,
}: StepLineProps): React.JSX.Element {
  const { t } = useTranslation();
  const set = (patch: Partial<StepDraft>) => {
    onChange({ ...line, ...patch });
  };

  return (
    <Stack gap="space2">
      <TextField
        label={t('recipes:steps.body')}
        value={line.body}
        onChangeText={(body) => {
          set({ body });
        }}
        multiline
        {...(errors.body ? { error: t('recipes:steps.errors.body') } : {})}
      />
      <DurationField
        value={line.durationSeconds}
        onChange={(durationSeconds) => {
          set({ durationSeconds });
        }}
        {...(errors.duration ? { error: t('recipes:steps.errors.duration') } : {})}
      />
      <LinkChips
        title={t('recipes:steps.uses')}
        options={ingredients}
        selected={line.ingredientIds}
        onChange={(ingredientIds) => {
          set({ ingredientIds });
        }}
        unsavedHint={t('recipes:steps.linkAfterSave')}
      />
      <LinkChips
        title={t('recipes:steps.usesEquipment')}
        options={equipment}
        selected={line.equipmentIds}
        onChange={(equipmentIds) => {
          set({ equipmentIds });
        }}
        unsavedHint={t('recipes:steps.linkAfterSave')}
      />
      {errors.links ? (
        <Text variant="caption" color="danger" accessibilityLiveRegion="polite">
          {t('recipes:steps.errors.links')}
        </Text>
      ) : null}
      <NoteField
        label={t('recipes:steps.note')}
        addLabel={t('recipes:steps.addNote')}
        value={line.note}
        onChangeText={(note) => {
          set({ note });
        }}
        helper={t('recipes:steps.noteHelper')}
      />
      <PhotoField
        label={t('recipes:steps.photo')}
        value={line.imageKey}
        onChange={(imageKey) => {
          set({ imageKey });
        }}
      />
    </Stack>
  );
}
