import type { Equipment, Ingredient, Step } from '@panna/shared';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { describeIngredient, formatDuration } from '../../format';
import { StepCard } from '../StepCard';

import { styles } from './StepsSection.styles';

import { imageUrl } from '@/api/images';
import { Stack } from '@/components/Stack';
import { Text } from '@/components/Text';
import { useUnitSystem } from '@/features/units/useUnitSystem';

export interface StepsSectionProps {
  readonly steps: readonly Step[];
  readonly ingredients: readonly Ingredient[];
  readonly equipment: readonly Equipment[];
  /** Where a shared recipe's photos live (0017); the own API when absent. */
  readonly imageBaseUrl?: string;
}

const LETTERS = 'abcdefghijklmnopqrstuvwxyz';

/**
 * The recipe as a reader follows it (0031): each main step a card with a numbered
 * circle, and inside it the things to get on with meanwhile. Each step is one element
 * to a screen reader.
 */
export function StepsSection({
  steps,
  ingredients,
  equipment,
  imageBaseUrl,
}: StepsSectionProps): React.JSX.Element {
  const { t, i18n } = useTranslation();
  const system = useUnitSystem();
  type AnyStep = Step['children'][number];

  const timing = (step: AnyStep): string | null =>
    step.durationSeconds === null ? null : formatDuration(step.durationSeconds, t);
  // Links read in list order and name only lines that still exist, per 0010.
  const uses = (step: AnyStep): string | null => {
    const names = ingredients
      .filter((line) => step.ingredientIds.includes(line.id))
      .map((line) => describeIngredient(line, system, t, i18n.language));
    return names.length === 0 ? null : t('recipes:steps.usesLine', { list: names.join(', ') });
  };
  const needs = (step: AnyStep): string | null => {
    const names = equipment
      .filter((line) => step.equipmentIds.includes(line.id))
      .map((line) => line.name);
    return names.length === 0 ? null : t('recipes:steps.needsLine', { list: names.join(', ') });
  };
  const photo = (step: AnyStep): string | null =>
    step.imageKey === null
      ? null
      : imageBaseUrl === undefined
        ? imageUrl(step.imageKey)
        : `${imageBaseUrl}/api/images/${step.imageKey}`;
  const label = (step: AnyStep, spoken: string): string =>
    [spoken, step.body, timing(step), uses(step), needs(step), step.note]
      .filter((part) => part !== null)
      .join('. ');

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
          <StepCard
            key={step.id}
            number={String(index + 1)}
            body={step.body}
            when={timing(step)}
            uses={uses(step)}
            needs={needs(step)}
            note={step.note}
            photoUri={photo(step)}
            photoAlt={t('recipes:steps.photoAlt')}
            accessibilityLabel={label(step, t('recipes:steps.number', { number: index + 1 }))}
          >
            {step.children.length === 0 ? null : (
              <View style={styles.meanwhile}>
                <Text variant="label" color="textSecondary">
                  {t('recipes:steps.meanwhile')}
                </Text>
                {step.children.map((child, childIndex) => {
                  const letter = LETTERS[childIndex] ?? '';
                  return (
                    <StepCard
                      key={child.id}
                      nested
                      number={`${String(index + 1)}${letter}`}
                      body={child.body}
                      when={timing(child)}
                      uses={uses(child)}
                      needs={needs(child)}
                      note={child.note}
                      photoUri={photo(child)}
                      photoAlt={t('recipes:steps.photoAlt')}
                      accessibilityLabel={label(
                        child,
                        t('recipes:steps.nestedNumber', { number: index + 1, letter }),
                      )}
                    />
                  );
                })}
              </View>
            )}
          </StepCard>
        ))
      )}
    </Stack>
  );
}
