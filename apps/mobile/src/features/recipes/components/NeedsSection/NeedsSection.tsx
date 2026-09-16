import type { Equipment, Ingredient } from '@panna/shared';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { styles } from './NeedsSection.styles';

import { Stack } from '@/components/Stack';
import { Text } from '@/components/Text';
import { formatAmount } from '@/features/units/format';
import { useUnitSystem } from '@/features/units/useUnitSystem';

export interface NeedsSectionProps {
  readonly ingredients: readonly Ingredient[];
  readonly equipment: readonly Equipment[];
}

/**
 * What a recipe needs, as the reader sees it: amounts in their unit system, the
 * author's note under the name. Each line is one element to a screen reader.
 */
export function NeedsSection({ ingredients, equipment }: NeedsSectionProps): React.JSX.Element {
  const { t, i18n } = useTranslation();
  const system = useUnitSystem();

  const amountOf = (line: Ingredient): string | null =>
    line.amount === null
      ? null
      : line.unit === null
        ? new Intl.NumberFormat(i18n.language, { maximumFractionDigits: 2 }).format(line.amount)
        : formatAmount(line.amount, line.unit, system, t, i18n.language);

  return (
    <Stack gap="space4">
      <Text variant="heading" accessibilityRole="header">
        {t('recipes:needs.title')}
      </Text>

      <Stack gap="space2">
        <Text variant="label" color="textSecondary" accessibilityRole="header">
          {t('recipes:needs.ingredients')}
        </Text>
        {ingredients.length === 0 ? (
          <Text variant="body" color="textSecondary">
            {t('recipes:needs.noIngredients')}
          </Text>
        ) : (
          ingredients.map((line) => {
            const amount = amountOf(line);
            const heading = amount === null ? line.name : `${amount} ${line.name}`;
            const label = [heading, line.note].filter((part) => part !== null).join(', ');
            return (
              <View key={line.id} style={styles.line} accessible accessibilityLabel={label}>
                <Text variant="body">{heading}</Text>
                {line.note === null ? null : (
                  <Text variant="caption" color="textSecondary">
                    {line.note}
                  </Text>
                )}
              </View>
            );
          })
        )}
      </Stack>

      <Stack gap="space2">
        <Text variant="label" color="textSecondary" accessibilityRole="header">
          {t('recipes:needs.equipment')}
        </Text>
        {equipment.length === 0 ? (
          <Text variant="body" color="textSecondary">
            {t('recipes:needs.noEquipment')}
          </Text>
        ) : (
          equipment.map((line) => {
            const optional = line.optional ? t('recipes:needs.optional') : null;
            const label = [line.name, optional, line.note]
              .filter((part) => part !== null)
              .join(', ');
            return (
              <View key={line.id} style={styles.line} accessible accessibilityLabel={label}>
                <Text variant="body">
                  {optional === null ? line.name : `${line.name} (${optional})`}
                </Text>
                {line.note === null ? null : (
                  <Text variant="caption" color="textSecondary">
                    {line.note}
                  </Text>
                )}
              </View>
            );
          })
        )}
      </Stack>
    </Stack>
  );
}
