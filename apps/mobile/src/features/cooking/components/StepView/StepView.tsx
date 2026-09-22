import type { RecipeDetail } from '@panna/shared';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { styles } from './StepView.styles';

import { Stack } from '@/components/Stack';
import { Text } from '@/components/Text';
import { describeIngredient, formatDuration } from '@/features/recipes/format';
import { useUnitSystem } from '@/features/units/useUnitSystem';

export interface StepViewProps {
  readonly recipe: RecipeDetail;
  readonly step: RecipeDetail['steps'][number];
  readonly number: number;
  readonly total: number;
  readonly done: readonly string[];
  readonly onDone: () => void;
  readonly onToggleMeanwhile: (stepId: string) => void;
  readonly onShowPhoto: () => void;
}

const LETTERS = 'abcdefghijklmnopqrstuvwxyz';
const CHECKED = '☑';
const UNCHECKED = '☐';

/**
 * The step as read from across a counter (0012): instruction in display size, and what
 * runs meanwhile as rows a knuckle can hit. The card itself is Done, and says so.
 */
export function StepView({
  recipe,
  step,
  number,
  total,
  done,
  onDone,
  onToggleMeanwhile,
  onShowPhoto,
}: StepViewProps): React.JSX.Element {
  const { t, i18n } = useTranslation();
  const system = useUnitSystem();
  const uses = recipe.ingredients
    .filter((line) => step.ingredientIds.includes(line.id))
    .map((line) => describeIngredient(line, system, t, i18n.language));
  const needs = recipe.equipment
    .filter((line) => step.equipmentIds.includes(line.id))
    .map((line) => line.name);
  const heading = t('recipes:cook.stepOf', { number, total });

  return (
    <Stack gap="space5">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${heading}. ${step.body}`}
        accessibilityHint={t('recipes:cook.doneHint')}
        onPress={onDone}
        style={({ pressed }) => [styles.card, pressed ? styles.pressed : null]}
      >
        <Text variant="label" color="textSecondary">
          {heading}
        </Text>
        <Text variant="display">{step.body}</Text>
        {step.durationSeconds === null ? null : (
          <Text variant="body" color="textSecondary">
            {formatDuration(step.durationSeconds, t)}
          </Text>
        )}
        {step.note === null ? null : <Text variant="body">{step.note}</Text>}
        {uses.length === 0 ? null : (
          <Text variant="body" color="textSecondary">
            {t('recipes:steps.usesLine', { list: uses.join(', ') })}
          </Text>
        )}
        {needs.length === 0 ? null : (
          <Text variant="body" color="textSecondary">
            {t('recipes:steps.needsLine', { list: needs.join(', ') })}
          </Text>
        )}
      </Pressable>

      {step.imageKey === null ? null : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('recipes:cook.showPhoto')}
          onPress={onShowPhoto}
          style={({ pressed }) => [styles.photoBar, pressed ? styles.pressed : null]}
        >
          <Text variant="title" color="accent">
            {t('recipes:cook.showPhoto')}
          </Text>
        </Pressable>
      )}

      {step.children.length === 0 ? null : (
        <Stack gap="space2">
          <Text variant="label" color="textSecondary">
            {t('recipes:steps.meanwhile')}
          </Text>
          {step.children.map((child, index) => {
            const ticked = done.includes(child.id);
            const label = t('recipes:cook.meanwhileStep', {
              letter: LETTERS[index] ?? '',
              body: child.body,
            });
            return (
              <Pressable
                key={child.id}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: ticked }}
                accessibilityLabel={label}
                onPress={() => {
                  onToggleMeanwhile(child.id);
                }}
                style={({ pressed }) => [
                  styles.meanwhile,
                  ticked ? styles.meanwhileDone : null,
                  pressed ? styles.pressed : null,
                ]}
              >
                <Text variant="heading" color={ticked ? 'accent' : 'textSecondary'}>
                  {ticked ? CHECKED : UNCHECKED}
                </Text>
                <View style={styles.meanwhileText}>
                  <Text variant="heading">{child.body}</Text>
                  {child.durationSeconds === null ? null : (
                    <Text variant="caption" color="textSecondary">
                      {formatDuration(child.durationSeconds, t)}
                    </Text>
                  )}
                </View>
              </Pressable>
            );
          })}
        </Stack>
      )}
    </Stack>
  );
}
