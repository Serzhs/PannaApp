import { COUNT_UNITS, MASS_UNITS, VOLUME_UNITS, type Unit } from '@panna/shared';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, View } from 'react-native';

import { styles } from './UnitPicker.styles';

import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { Screen } from '@/components/Screen';
import { Stack } from '@/components/Stack';
import { Text } from '@/components/Text';
import { ChoiceList } from '@/features/settings/components/ChoiceList';

export interface UnitPickerProps {
  readonly value: Unit | null;
  readonly onChange: (unit: Unit | null) => void;
  readonly disabled?: boolean;
}

const GROUPS = [
  { dimension: 'mass', units: MASS_UNITS },
  { dimension: 'volume', units: VOLUME_UNITS },
  { dimension: 'count', units: COUNT_UNITS },
] as const;

/** The units a kitchen reaches for nine times in ten (0033); the rest sit behind Other. */
const COMMON: readonly Unit[] = ['g', 'kg', 'ml', 'l', 'tsp', 'tbsp', 'piece'];

/**
 * A row of chips for the common units, and Other for the full sheet of fourteen grouped
 * by dimension. A unit chosen from the sheet shows selected in Other's place, so what is
 * chosen is always on screen.
 */
export function UnitPicker({
  value,
  onChange,
  disabled = false,
}: UnitPickerProps): React.JSX.Element {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const name = (unit: Unit) => t(`units:${unit}`, { count: 1 });
  const uncommon = value !== null && !COMMON.includes(value);

  const choose = (unit: Unit | null) => {
    onChange(unit);
    setOpen(false);
  };

  return (
    <Stack gap="space1">
      <Text variant="label" color="textSecondary">
        {t('recipes:needs.unit')}
      </Text>
      <View style={styles.row} accessibilityRole="radiogroup">
        <Chip
          role="radio"
          label={t('recipes:needs.unitNone')}
          selected={value === null}
          disabled={disabled}
          onPress={() => {
            onChange(null);
          }}
        />
        {COMMON.map((unit) => (
          <Chip
            key={unit}
            role="radio"
            label={name(unit)}
            selected={value === unit}
            disabled={disabled}
            onPress={() => {
              onChange(unit);
            }}
          />
        ))}
        <Chip
          role="radio"
          label={uncommon ? name(value) : t('recipes:needs.unitOther')}
          accessibilityHint={t('recipes:needs.unitOtherHint')}
          selected={uncommon}
          disabled={disabled}
          onPress={() => {
            setOpen(true);
          }}
        />
      </View>
      <Modal
        visible={open}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => {
          setOpen(false);
        }}
      >
        <Screen scroll>
          <Stack gap="space5" style={styles.sheet}>
            <Text variant="heading" accessibilityRole="header">
              {t('recipes:needs.unitPicker')}
            </Text>
            <ChoiceList
              title={t('recipes:needs.unitNone')}
              choices={[{ value: null, label: t('recipes:needs.unitNone') }]}
              value={value}
              onChange={choose}
            />
            {GROUPS.map((group) => (
              <ChoiceList
                key={group.dimension}
                title={t(`units:dimension.${group.dimension}`)}
                choices={group.units.map((unit) => ({ value: unit, label: name(unit) }))}
                value={value}
                onChange={choose}
              />
            ))}
            <Button
              label={t('recipes:detail.confirmDelete.cancel')}
              variant="ghost"
              onPress={() => {
                setOpen(false);
              }}
            />
          </Stack>
        </Screen>
      </Modal>
    </Stack>
  );
}
