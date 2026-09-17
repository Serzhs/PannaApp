import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { formatDuration } from '../../format';
import {
  canMoveDown,
  canMoveUp,
  checkStep,
  emptyStep,
  moveStep,
  numberOf,
  removeStep,
  type StepDraft,
  type StepErrors,
  type StepFieldErrors,
} from '../../steps';
import type { Linkable } from '../LinkChips';
import { NeedRow } from '../NeedRow';
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

/** Open steps by key: what to put back on Cancel, or null for a step that did not exist before. */
type Open = Readonly<Record<string, StepDraft | null>>;

/**
 * Every step as one flat list in reading order. What runs during what is decided on
 * the Flow view (0022); here a parallel step only says so under its number. A step is
 * written in a card and settled with Add (0024), and sits in the list as one row until
 * Edit reopens it. A step that has never been saved starts open.
 */
export function StepsEditor({
  value,
  errors,
  onChange,
  ingredients,
  equipment,
}: StepsEditorProps): React.JSX.Element {
  const { t } = useTranslation();
  const [open, setOpen] = useState<Open>(() =>
    Object.fromEntries(
      value.filter((line) => line.id === undefined).map((line) => [line.key, null]),
    ),
  );
  const [checked, setChecked] = useState<Readonly<Record<string, StepFieldErrors>>>({});

  // A step the server refused, or Done flagged, reopens so the author can see what to fix.
  useEffect(() => {
    const toOpen = value.filter((line) => errors[line.key] !== undefined && !(line.key in open));
    if (toOpen.length === 0) return;
    setOpen((current) => ({
      ...current,
      ...Object.fromEntries(toOpen.map((line) => [line.key, line])),
    }));
    // Only a new set of errors should reopen steps, not every keystroke while they are open.
  }, [errors]);

  const labelOf = (line: StepDraft): string => {
    const at = numberOf(value, line.key);
    if (at === undefined) return '';
    return at.letter === ''
      ? t('recipes:steps.number', { number: at.number })
      : t('recipes:steps.nestedNumber', { number: at.number, letter: at.letter });
  };
  const nameOf = (line: StepDraft) => (line.body.trim() === '' ? labelOf(line) : line.body);
  // "Edit step 2", not "Edit Step 2": the number line is a heading, the button is a sentence.
  const refOf = (line: StepDraft) => labelOf(line).toLocaleLowerCase();
  const labels = {
    moveUp: (line: StepDraft) => t('recipes:needs.moveUp', { name: nameOf(line) }),
    moveDown: (line: StepDraft) => t('recipes:needs.moveDown', { name: nameOf(line) }),
    up: t('recipes:needs.up'),
    down: t('recipes:needs.down'),
  };
  const errorsFor = (key: string): StepFieldErrors => errors[key] ?? checked[key] ?? {};
  const detailOf = (line: StepDraft): string | undefined => {
    const parts = [
      line.durationSeconds === null ? null : formatDuration(line.durationSeconds, t),
      line.note.trim() === '' ? null : line.note.trim(),
    ].filter((part) => part !== null);
    return parts.length === 0 ? undefined : parts.join(' · ');
  };

  const without = <T,>(record: Readonly<Record<string, T>>, key: string) =>
    Object.fromEntries(Object.entries(record).filter(([k]) => k !== key));
  const settle = (key: string) => {
    setOpen((current) => without(current, key));
    setChecked((current) => without(current, key));
  };
  const set = (key: string, next: StepDraft) => {
    onChange(value.map((line) => (line.key === key ? next : line)));
  };
  const remove = (key: string) => {
    settle(key);
    onChange(removeStep(value, key));
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
        renderItem={(line, _index, controls) => {
          const snapshot = open[line.key];
          const detail = detailOf(line);
          return (
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
                {snapshot === undefined ? (
                  <NeedRow
                    title={line.body}
                    {...(detail === undefined ? {} : { detail })}
                    editLabel={t('recipes:steps.editLine')}
                    editAccessibilityLabel={t('recipes:steps.edit', { label: refOf(line) })}
                    removeLabel={t('recipes:steps.remove')}
                    removeAccessibilityLabel={t('recipes:steps.removeFor', { label: refOf(line) })}
                    onEdit={() => {
                      setOpen((current) => ({ ...current, [line.key]: line }));
                    }}
                    onRemove={() => {
                      remove(line.key);
                    }}
                  />
                ) : (
                  <>
                    <StepLine
                      line={line}
                      ingredients={ingredients}
                      equipment={equipment}
                      errors={errorsFor(line.key)}
                      onChange={(next) => {
                        set(line.key, next);
                      }}
                    />
                    <View style={styles.actions}>
                      <Button
                        label={t('recipes:steps.cancelLine')}
                        variant="ghost"
                        onPress={() => {
                          if (snapshot === null) remove(line.key);
                          else {
                            set(line.key, snapshot);
                            settle(line.key);
                          }
                        }}
                      />
                      <Button
                        label={
                          snapshot === null
                            ? t('recipes:steps.addLine')
                            : t('recipes:steps.saveLine')
                        }
                        accessibilityLabel={
                          snapshot === null
                            ? t('recipes:steps.addLineFor', { label: refOf(line) })
                            : t('recipes:steps.saveLineFor', { label: refOf(line) })
                        }
                        onPress={() => {
                          const found = checkStep(line);
                          if (Object.keys(found).length > 0) {
                            setChecked((current) => ({ ...current, [line.key]: found }));
                            return;
                          }
                          settle(line.key);
                        }}
                      />
                    </View>
                  </>
                )}
              </Stack>
            </Card>
          );
        }}
      />
      <Button
        label={t('recipes:steps.addMain')}
        variant="secondary"
        onPress={() => {
          const line = emptyStep();
          setOpen((current) => ({ ...current, [line.key]: null }));
          onChange([...value, line]);
        }}
      />
    </Stack>
  );
}
