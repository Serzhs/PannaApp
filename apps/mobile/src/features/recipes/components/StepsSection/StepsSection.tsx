import type { Equipment, Ingredient, Step } from '@panna/shared';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { describeIngredient, formatDuration } from '../../format';

import { styles } from './StepsSection.styles';

import { Stack } from '@/components/Stack';
import { Text } from '@/components/Text';
import { formatTemperature } from '@/features/units/format';
import { useUnitSystem } from '@/features/units/useUnitSystem';

export interface StepsSectionProps {
  readonly steps: readonly Step[];
  readonly ingredients: readonly Ingredient[];
  readonly equipment: readonly Equipment[];
}

const LETTERS = 'abcdefghijklmnopqrstuvwxyz';

/**
 * The recipe as a reader follows it: numbered main steps, and under each the things to
 * get on with meanwhile. Each step is one element to a screen reader.
 */
export function StepsSection({
  steps,
  ingredients,
  equipment,
}: StepsSectionProps): React.JSX.Element {
  const { t, i18n } = useTranslation();
  const system = useUnitSystem();

  const timing = (step: Step['children'][number]): string | null => {
    const parts: string[] = [];
    if (step.durationSeconds !== null) parts.push(formatDuration(step.durationSeconds, t));
    if (step.temperatureCelsius !== null)
      parts.push(formatTemperature(step.temperatureCelsius, system, t));
    return parts.length === 0 ? null : parts.join(' · ');
  };

  // Links read in list order and name only lines that still exist, per 0010.
  const uses = (step: Step['children'][number]): string | null => {
    const names = ingredients
      .filter((line) => step.ingredientIds.includes(line.id))
      .map((line) => describeIngredient(line, system, t, i18n.language));
    return names.length === 0 ? null : t('recipes:steps.usesLine', { list: names.join(', ') });
  };
  const needs = (step: Step['children'][number]): string | null => {
    const names = equipment
      .filter((line) => step.equipmentIds.includes(line.id))
      .map((line) => line.name);
    return names.length === 0 ? null : t('recipes:steps.needsLine', { list: names.join(', ') });
  };

  const line = (step: Step['children'][number], number: string, nested: boolean) => {
    const when = timing(step);
    const used = uses(step);
    const needed = needs(step);
    const label = [number, step.body, when, used, needed, step.note]
      .filter((part) => part !== null)
      .join('. ');
    return (
      <View
        key={step.id}
        style={[styles.step, nested ? styles.nested : null]}
        accessible
        accessibilityLabel={label}
      >
        <Text variant="label" color="textSecondary">
          {number}
        </Text>
        <Text variant="body">{step.body}</Text>
        {when === null ? null : (
          <Text variant="caption" color="textSecondary">
            {when}
          </Text>
        )}
        {used === null ? null : (
          <Text variant="caption" color="textSecondary">
            {used}
          </Text>
        )}
        {needed === null ? null : (
          <Text variant="caption" color="textSecondary">
            {needed}
          </Text>
        )}
        {step.note === null ? null : (
          <Text variant="caption" color="textSecondary">
            {step.note}
          </Text>
        )}
      </View>
    );
  };

  return (
    <Stack gap="space3">
      <Text variant="heading" accessibilityRole="header">
        {t('recipes:steps.title')}
      </Text>
      {steps.length === 0 ? (
        <Text variant="body" color="textSecondary">
          {t('recipes:steps.empty')}
        </Text>
      ) : (
        steps.map((step, index) => (
          <View key={step.id}>
            {line(step, t('recipes:steps.number', { number: index + 1 }), false)}
            {step.children.length === 0 ? null : (
              <View style={styles.meanwhile}>
                <Text variant="label" color="textSecondary">
                  {t('recipes:steps.meanwhile')}
                </Text>
                {step.children.map((child, childIndex) =>
                  line(
                    child,
                    t('recipes:steps.nestedNumber', {
                      number: index + 1,
                      letter: LETTERS[childIndex] ?? '',
                    }),
                    true,
                  ),
                )}
              </View>
            )}
          </View>
        ))
      )}
    </Stack>
  );
}
