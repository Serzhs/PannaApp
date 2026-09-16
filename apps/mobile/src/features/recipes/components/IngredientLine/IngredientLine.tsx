import type { Unit } from '@panna/shared';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import type { IngredientDraft, LineField } from '../../needs';
import { UnitPicker } from '../UnitPicker';

import { styles } from './IngredientLine.styles';

import { Stack } from '@/components/Stack';
import { TextField } from '@/components/TextField';

export interface IngredientLineProps {
  readonly line: IngredientDraft;
  readonly errors?: Partial<Record<LineField, true>>;
  readonly onChange: (line: IngredientDraft) => void;
}

/** One ingredient as the author types it: name, amount and unit, then the note. */
export function IngredientLine({
  line,
  errors = {},
  onChange,
}: IngredientLineProps): React.JSX.Element {
  const { t } = useTranslation();
  const set = (patch: Partial<IngredientDraft>) => {
    onChange({ ...line, ...patch });
  };

  return (
    <Stack gap="space2">
      <TextField
        label={t('recipes:needs.name')}
        value={line.name}
        onChangeText={(name) => {
          set({ name });
        }}
        {...(errors.name ? { error: t('recipes:needs.errors.name') } : {})}
      />
      <View style={styles.amountRow}>
        <View style={styles.amount}>
          <TextField
            label={t('recipes:needs.amount')}
            value={line.amount}
            onChangeText={(amount) => {
              set({ amount });
            }}
            keyboardType="decimal-pad"
            {...(errors.amount ? { error: t('recipes:needs.errors.amount') } : {})}
          />
        </View>
        <View style={styles.unit}>
          <UnitPicker
            value={line.unit}
            onChange={(unit: Unit | null) => {
              set({ unit });
            }}
          />
        </View>
      </View>
      {errors.unit ? (
        <TextField
          label={t('recipes:needs.unit')}
          value={line.unit ?? ''}
          editable={false}
          error={t('recipes:needs.errors.unit')}
        />
      ) : null}
      <TextField
        label={t('recipes:needs.note')}
        value={line.note}
        onChangeText={(note) => {
          set({ note });
        }}
        helper={t('recipes:needs.noteHelper')}
      />
    </Stack>
  );
}
