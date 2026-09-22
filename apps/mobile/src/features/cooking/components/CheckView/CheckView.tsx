import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import type { CookRecord } from '../../store';
import { liveMinutes, skippedCount } from '../../store';

import { styles } from './CheckView.styles';

import { Stack } from '@/components/Stack';
import { Text } from '@/components/Text';
import { describeIngredient } from '@/features/recipes/format';
import { useUnitSystem } from '@/features/units/useUnitSystem';

export interface CheckViewProps {
  readonly record: CookRecord;
  readonly onToggle: (ingredientId: string) => void;
  readonly onStart: () => void;
}

const CHECKED = '☑';
const UNCHECKED = '☐';

/**
 * The first state of cooking (0013): tick what you have, and see what going without
 * changes before anything is skipped. Everything starts ticked, because most cooks have
 * what they set out to cook.
 */
export function CheckView({ record, onToggle, onStart }: CheckViewProps): React.JSX.Element {
  const { t, i18n } = useTranslation();
  const system = useUnitSystem();
  const skipped = skippedCount(record);
  const minutes = liveMinutes(record);
  const missing = record.excluded.length;
  const summary =
    missing === 0
      ? null
      : skipped === 0
        ? t('recipes:cook.checkNothingChanges')
        : minutes === null
          ? t('recipes:cook.checkSkipped', { count: skipped })
          : t('recipes:cook.checkSkippedTimed', { count: skipped, minutes });

  return (
    <Stack gap="space5">
      <Stack gap="space2">
        <Text variant="heading" accessibilityRole="header">
          {t('recipes:cook.checkTitle')}
        </Text>
        {record.recipe.ingredients.length === 0 ? (
          <Text variant="body" color="textSecondary">
            {t('recipes:needs.noIngredients')}
          </Text>
        ) : (
          record.recipe.ingredients.map((line) => {
            const have = !record.excluded.includes(line.id);
            const label = describeIngredient(line, system, t, i18n.language);
            return (
              <Pressable
                key={line.id}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: have }}
                accessibilityLabel={label}
                accessibilityHint={t('recipes:cook.checkHint')}
                onPress={() => {
                  onToggle(line.id);
                }}
                style={({ pressed }) => [
                  styles.row,
                  have ? null : styles.rowWithout,
                  pressed ? styles.pressed : null,
                ]}
              >
                <Text variant="heading" color={have ? 'accent' : 'textSecondary'}>
                  {have ? CHECKED : UNCHECKED}
                </Text>
                <View style={styles.rowText}>
                  <Text variant="heading">{label}</Text>
                  {have ? null : (
                    <Text variant="caption" color="textSecondary">
                      {t('recipes:cook.goingWithout')}
                    </Text>
                  )}
                </View>
              </Pressable>
            );
          })
        )}
      </Stack>

      {record.recipe.equipment.length === 0 ? null : (
        <Stack gap="space1">
          <Text variant="label" color="textSecondary" accessibilityRole="header">
            {t('recipes:cook.checkEquipment')}
          </Text>
          {record.recipe.equipment.map((line) => (
            <Text key={line.id} variant="body">
              {line.optional ? `${line.name} (${t('recipes:needs.optional')})` : line.name}
            </Text>
          ))}
        </Stack>
      )}

      {summary === null ? null : (
        <Text variant="body" color="textSecondary" accessibilityLiveRegion="polite">
          {summary}
        </Text>
      )}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          missing === 0
            ? t('recipes:cook.startCooking')
            : t('recipes:cook.startWithout', { count: missing })
        }
        onPress={onStart}
        style={({ pressed }) => [styles.startBar, pressed ? styles.pressed : null]}
      >
        <Text variant="title" color="onAccent">
          {missing === 0
            ? t('recipes:cook.startCooking')
            : t('recipes:cook.startWithout', { count: missing })}
        </Text>
      </Pressable>
    </Stack>
  );
}
