import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import {
  canMoveDown,
  canMoveUp,
  emptyStep,
  moveStep,
  numberOf,
  removeStep,
  type StepDraft,
  type StepErrors,
} from '../../steps';
import type { Linkable } from '../LinkChips';
import { StepLine } from '../StepLine';

import { styles } from './StepsEditor.styles';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ReorderableList } from '@/components/ReorderableList';
import { Stack } from '@/components/Stack';
import { Text } from '@/components/Text';

export interface StepsEditorProps {
  readonly value: readonly StepDraft[];
  readonly errors: StepErrors;
  readonly onChange: (next: StepDraft[]) => void;
  readonly ingredients: readonly Linkable[];
  readonly equipment: readonly Linkable[];
}

/**
 * Every step as one flat list in reading order. What runs during what is decided on
 * the Flow view (0022); here a parallel step only says so under its number.
 */
export function StepsEditor({
  value,
  errors,
  onChange,
  ingredients,
  equipment,
}: StepsEditorProps): React.JSX.Element {
  const { t } = useTranslation();
  const labelOf = (line: StepDraft): string => {
    const at = numberOf(value, line.key);
    if (at === undefined) return '';
    return at.letter === ''
      ? t('recipes:steps.number', { number: at.number })
      : t('recipes:steps.nestedNumber', { number: at.number, letter: at.letter });
  };
  const nameOf = (line: StepDraft) => (line.body.trim() === '' ? labelOf(line) : line.body);
  const labels = {
    moveUp: (line: StepDraft) => t('recipes:needs.moveUp', { name: nameOf(line) }),
    moveDown: (line: StepDraft) => t('recipes:needs.moveDown', { name: nameOf(line) }),
    up: t('recipes:needs.up'),
    down: t('recipes:needs.down'),
  };
  const set = (key: string, next: StepDraft) => {
    onChange(value.map((line) => (line.key === key ? next : line)));
  };

  return (
    <Stack gap="space3">
      <Text variant="heading" accessibilityRole="header">
        {t('recipes:steps.title')}
      </Text>
      <ReorderableList
        items={value}
        keyOf={(line) => line.key}
        labels={labels}
        canMoveUp={(line) => canMoveUp(value, line.key)}
        canMoveDown={(line) => canMoveDown(value, line.key)}
        onMove={(from, to) => {
          const line = value[from];
          if (line !== undefined) onChange(moveStep(value, line.key, to > from ? 1 : -1));
        }}
        renderItem={(line, _index, controls) => (
          <Card>
            <Stack gap="space3">
              <View style={styles.header}>
                <Stack gap="space0">
                  <Text variant="label" color="textSecondary">
                    {labelOf(line)}
                  </Text>
                  {line.during === null ? null : (
                    <Text variant="caption" color="textSecondary">
                      {t('recipes:steps.during', {
                        number: numberOf(value, line.during)?.number ?? '',
                      })}
                    </Text>
                  )}
                </Stack>
                {controls}
              </View>
              <StepLine
                line={line}
                ingredients={ingredients}
                equipment={equipment}
                errors={errors[line.key] ?? {}}
                onChange={(next) => {
                  set(line.key, next);
                }}
              />
              <View style={styles.remove}>
                <Button
                  label={t('recipes:steps.remove')}
                  variant="ghost"
                  onPress={() => {
                    onChange(removeStep(value, line.key));
                  }}
                />
              </View>
            </Stack>
          </Card>
        )}
      />
      <Button
        label={t('recipes:steps.addMain')}
        variant="secondary"
        onPress={() => {
          onChange([...value, emptyStep()]);
        }}
      />
    </Stack>
  );
}
