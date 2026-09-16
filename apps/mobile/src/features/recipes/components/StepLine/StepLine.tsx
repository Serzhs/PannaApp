import { useTranslation } from 'react-i18next';

import type { StepDraft, StepField } from '../../steps';
import { DurationField } from '../DurationField';
import { TemperatureField } from '../TemperatureField';

import { Stack } from '@/components/Stack';
import { TextField } from '@/components/TextField';

export interface StepLineProps {
  readonly line: StepDraft;
  readonly errors?: Partial<Record<StepField, true>>;
  readonly onChange: (line: StepDraft) => void;
}

/** One step as the author writes it: the instruction, then the tip, then how long and how hot. */
export function StepLine({ line, errors = {}, onChange }: StepLineProps): React.JSX.Element {
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
      <TextField
        label={t('recipes:steps.note')}
        value={line.note}
        onChangeText={(note) => {
          set({ note });
        }}
        helper={t('recipes:steps.noteHelper')}
      />
      <DurationField
        value={line.durationSeconds}
        onChange={(durationSeconds) => {
          set({ durationSeconds });
        }}
        {...(errors.duration ? { error: t('recipes:steps.errors.duration') } : {})}
      />
      <TemperatureField
        value={line.temperature}
        onChangeText={(temperature) => {
          set({ temperature });
        }}
        {...(errors.temperature ? { error: t('recipes:steps.errors.temperature') } : {})}
      />
    </Stack>
  );
}
