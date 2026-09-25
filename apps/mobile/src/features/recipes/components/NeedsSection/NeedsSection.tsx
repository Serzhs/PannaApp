import type { Equipment, Ingredient } from '@panna/shared';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { describeAmount, describeIngredient } from '../../format';
import { IngredientRow } from '../IngredientRow';

import { styles } from './NeedsSection.styles';

import { Card } from '@/components/Card';
import { Stack } from '@/components/Stack';
import { Text } from '@/components/Text';
import { useUnitSystem } from '@/features/units/useUnitSystem';

export interface NeedsSectionProps {
  readonly ingredients: readonly Ingredient[];
  readonly equipment: readonly Equipment[];
}

/**
 * What a recipe needs, as the reader sees it (0031): two cards, amounts in their unit
 * system in a column of their own, the author's note under the name. Each line is one
 * element to a screen reader.
 */
export function NeedsSection({ ingredients, equipment }: NeedsSectionProps): React.JSX.Element {
  const { t, i18n } = useTranslation();
  const system = useUnitSystem();
  const measured = ingredients.some((line) => line.amount !== null);

  return (
    <Stack gap="space4">
      <Card>
        <View style={styles.heading}>
          <Text variant="heading" accessibilityRole="header">
            {t('recipes:needs.ingredients')}
          </Text>
          {ingredients.length === 0 ? null : (
            <Text variant="caption" color="textSecondary">
              {ingredients.length}
            </Text>
          )}
        </View>
        {ingredients.length === 0 ? (
          <Text variant="body" color="textSecondary">
            {t('recipes:needs.noIngredients')}
          </Text>
        ) : (
          ingredients.map((line, index) => (
            <IngredientRow
              key={line.id}
              amount={describeAmount(line, system, t, i18n.language)}
              name={line.name}
              note={line.note}
              accessibilityLabel={[describeIngredient(line, system, t, i18n.language), line.note]
                .filter((part) => part !== null)
                .join(', ')}
              last={index === ingredients.length - 1}
              column={measured}
            />
          ))
        )}
      </Card>
      <Card>
        <View style={styles.heading}>
          <Text variant="heading" accessibilityRole="header">
            {t('recipes:needs.equipment')}
          </Text>
          {equipment.length === 0 ? null : (
            <Text variant="caption" color="textSecondary">
              {equipment.length}
            </Text>
          )}
        </View>
        {equipment.length === 0 ? (
          <Text variant="body" color="textSecondary">
            {t('recipes:needs.noEquipment')}
          </Text>
        ) : (
          equipment.map((line, index) => {
            const optional = line.optional ? t('recipes:needs.optional') : null;
            return (
              <IngredientRow
                key={line.id}
                amount={null}
                name={line.name}
                note={line.note}
                {...(optional === null ? {} : { tag: optional })}
                accessibilityLabel={[line.name, optional, line.note]
                  .filter((part) => part !== null)
                  .join(', ')}
                last={index === equipment.length - 1}
                column={false}
              />
            );
          })
        )}
      </Card>
    </Stack>
  );
}
