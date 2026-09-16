import type { Step } from '@panna/shared';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { formatDuration } from '../../format';

import { styles } from './StepsSection.styles';

import { Stack } from '@/components/Stack';
import { Text } from '@/components/Text';
import { formatTemperature } from '@/features/units/format';
import { useUnitSystem } from '@/features/units/useUnitSystem';

export interface StepsSectionProps {
  readonly steps: readonly Step[];
}

const LETTERS = 'abcdefghijklmnopqrstuvwxyz';

/**
 * The recipe as a reader follows it: numbered main steps, and under each the things to
 * get on with meanwhile. Each step is one element to a screen reader.
 */
export function StepsSection({ steps }: StepsSectionProps): React.JSX.Element {
  const { t } = useTranslation();
  const system = useUnitSystem();

  const timing = (step: Step['children'][number]): string | null => {
    const parts: string[] = [];
    if (step.durationSeconds !== null) parts.push(formatDuration(step.durationSeconds, t));
    if (step.temperatureCelsius !== null)
      parts.push(formatTemperature(step.temperatureCelsius, system, t));
    return parts.length === 0 ? null : parts.join(' · ');
  };

  const line = (step: Step['children'][number], number: string, nested: boolean) => {
    const when = timing(step);
    const label = [number, step.body, when, step.note].filter((part) => part !== null).join('. ');
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
