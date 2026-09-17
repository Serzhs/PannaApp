import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import {
  emptyMainStep,
  emptyStep,
  moveChild,
  moveMain,
  nestUnderPrevious,
  promote,
  removeChild,
  removeMain,
  type MainStepDraft,
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
  readonly value: readonly MainStepDraft[];
  readonly errors: StepErrors;
  readonly onChange: (next: MainStepDraft[]) => void;
  readonly ingredients: readonly Linkable[];
  readonly equipment: readonly Linkable[];
}

const LETTERS = 'abcdefghijklmnopqrstuvwxyz';

/**
 * Two levels, each its own reorderable list. Changing level is a button, never a drag:
 * a drag that can also re-parent is two gestures pretending to be one.
 */
export function StepsEditor({
  value,
  errors,
  onChange,
  ingredients,
  equipment,
}: StepsEditorProps): React.JSX.Element {
  const { t } = useTranslation();
  const nameOf = (line: StepDraft, label: string) => (line.body.trim() === '' ? label : line.body);
  const labelsFor = (label: (line: StepDraft) => string) => ({
    moveUp: (line: StepDraft) => t('recipes:needs.moveUp', { name: nameOf(line, label(line)) }),
    moveDown: (line: StepDraft) => t('recipes:needs.moveDown', { name: nameOf(line, label(line)) }),
    drag: (line: StepDraft) => t('recipes:needs.drag', { name: nameOf(line, label(line)) }),
  });

  const setMain = (index: number, next: StepDraft) => {
    onChange(value.map((main, i) => (i === index ? { ...main, ...next } : main)));
  };
  const setChild = (parent: number, index: number, next: StepDraft) => {
    onChange(
      value.map((main, i) =>
        i === parent
          ? { ...main, children: main.children.map((c, j) => (j === index ? next : c)) }
          : main,
      ),
    );
  };

  return (
    <Stack gap="space3">
      <Text variant="heading" accessibilityRole="header">
        {t('recipes:steps.title')}
      </Text>
      <ReorderableList
        items={value}
        keyOf={(main) => main.key}
        labels={labelsFor((line) =>
          t('recipes:steps.number', { number: value.findIndex((m) => m.key === line.key) + 1 }),
        )}
        onMove={(from, to) => {
          onChange(moveMain(value, from, to));
        }}
        renderItem={(main, index) => (
          <Card>
            <Stack gap="space3">
              <Text variant="label" color="textSecondary">
                {t('recipes:steps.number', { number: index + 1 })}
              </Text>
              <StepLine
                line={main}
                ingredients={ingredients}
                equipment={equipment}
                errors={errors[main.key] ?? {}}
                onChange={(next) => {
                  setMain(index, next);
                }}
              />
              {main.children.length === 0 ? null : (
                <View style={styles.nested}>
                  <Text variant="label" color="textSecondary">
                    {t('recipes:steps.meanwhile')}
                  </Text>
                  <ReorderableList
                    items={main.children}
                    keyOf={(child) => child.key}
                    labels={labelsFor((line) =>
                      t('recipes:steps.nestedNumber', {
                        number: index + 1,
                        letter: LETTERS[main.children.findIndex((c) => c.key === line.key)] ?? '',
                      }),
                    )}
                    onMove={(from, to) => {
                      onChange(moveChild(value, index, from, to));
                    }}
                    renderItem={(child, childIndex) => (
                      <Card>
                        <Stack gap="space3">
                          <Text variant="label" color="textSecondary">
                            {t('recipes:steps.nestedNumber', {
                              number: index + 1,
                              letter: LETTERS[childIndex] ?? '',
                            })}
                          </Text>
                          <StepLine
                            line={child}
                            ingredients={ingredients}
                            equipment={equipment}
                            errors={errors[child.key] ?? {}}
                            onChange={(next) => {
                              setChild(index, childIndex, next);
                            }}
                          />
                          <Stack gap="space2">
                            <Button
                              label={t('recipes:steps.promote')}
                              variant="ghost"
                              onPress={() => {
                                onChange(promote(value, index, childIndex));
                              }}
                            />
                            <Button
                              label={t('recipes:steps.remove')}
                              variant="ghost"
                              onPress={() => {
                                onChange(removeChild(value, index, childIndex));
                              }}
                            />
                          </Stack>
                        </Stack>
                      </Card>
                    )}
                  />
                </View>
              )}
              <Stack gap="space2">
                <Button
                  label={t('recipes:steps.addNested')}
                  variant="secondary"
                  onPress={() => {
                    setMain(index, main);
                    onChange(
                      value.map((m, i) =>
                        i === index ? { ...m, children: [...m.children, emptyStep()] } : m,
                      ),
                    );
                  }}
                />
                {index > 0 && main.children.length === 0 ? (
                  <Button
                    label={t('recipes:steps.nest')}
                    variant="ghost"
                    onPress={() => {
                      onChange(nestUnderPrevious(value, index));
                    }}
                  />
                ) : null}
                <Button
                  label={t('recipes:steps.remove')}
                  variant="ghost"
                  onPress={() => {
                    onChange(removeMain(value, index));
                  }}
                />
              </Stack>
            </Stack>
          </Card>
        )}
      />
      <Button
        label={t('recipes:steps.addMain')}
        variant="secondary"
        onPress={() => {
          onChange([...value, emptyMainStep()]);
        }}
      />
    </Stack>
  );
}
