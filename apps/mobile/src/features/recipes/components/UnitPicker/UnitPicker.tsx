import { COUNT_UNITS, MASS_UNITS, VOLUME_UNITS, type Unit } from '@panna/shared';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, View } from 'react-native';

import { styles } from './UnitPicker.styles';

import { Button } from '@/components/Button';
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

/**
 * The fourteen units, grouped by dimension so a cook looking for "cup" is not reading
 * past "kg". Opens as its own sheet: a wheel or a dropdown would need a native picker
 * per platform for a list this short, and a sheet works the same on both.
 */
export function UnitPicker({
  value,
  onChange,
  disabled = false,
}: UnitPickerProps): React.JSX.Element {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const label = value === null ? t('recipes:needs.unitNone') : t(`units:${value}`, { count: 1 });

  const choose = (unit: Unit | null) => {
    onChange(unit);
    setOpen(false);
  };

  return (
    <View>
      <Text
        variant="label"
        color="textSecondary"
        accessibilityElementsHidden
        importantForAccessibility="no"
      >
        {t('recipes:needs.unit')}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${t('recipes:needs.unit')}, ${label}`}
        accessibilityState={{ disabled, expanded: open }}
        disabled={disabled}
        onPress={() => {
          setOpen(true);
        }}
        style={styles.field}
      >
        <Text variant="body">{label}</Text>
      </Pressable>
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
                choices={group.units.map((unit) => ({
                  value: unit,
                  label: t(`units:${unit}`, { count: 1 }),
                }))}
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
    </View>
  );
}
