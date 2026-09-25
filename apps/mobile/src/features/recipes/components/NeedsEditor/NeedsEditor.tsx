import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import {
  checkEquipment,
  checkIngredient,
  emptyEquipment,
  emptyIngredient,
  move,
  parseAmount,
  type EquipmentDraft,
  type IngredientDraft,
  type LineErrors,
  type NeedsDraft,
  type NeedsErrors,
} from '../../needs';
import { EquipmentLine } from '../EquipmentLine';
import { IngredientLine } from '../IngredientLine';
import { NeedRow } from '../NeedRow';
import { QUICK_EQUIPMENT, QUICK_INGREDIENTS, QuickPicks } from '../QuickPicks';

import { styles } from './NeedsEditor.styles';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ReorderableList } from '@/components/ReorderableList';
import { Stack } from '@/components/Stack';
import { Text } from '@/components/Text';

export interface NeedsEditorProps {
  readonly value: NeedsDraft;
  readonly errors: NeedsErrors;
  readonly onChange: (next: NeedsDraft) => void;
}

type Line = IngredientDraft | EquipmentDraft;
/** Open lines by key: what to put back on Cancel, or null for a line that did not exist before. */
type Open = Readonly<Record<string, Line | null>>;

/**
 * Both lists with add, remove and move, holding no state of its own about the recipe:
 * the screen owns the draft, because the screen is what sends it. What the editor does
 * own is which lines are open (0023): a line is written in a card and settled with Add,
 * and sits in the list as one row until Edit reopens it.
 */
export function NeedsEditor({ value, errors, onChange }: NeedsEditorProps): React.JSX.Element {
  const { t } = useTranslation();
  const [open, setOpen] = useState<Open>({});
  const [checked, setChecked] = useState<Readonly<Record<string, LineErrors>>>({});

  // A line the server refused, or Done flagged, reopens so the author can see what to fix.
  useEffect(() => {
    const lines: readonly Line[] = [...value.ingredients, ...value.equipment];
    const toOpen = lines.filter((line) => errors[line.key] !== undefined && !(line.key in open));
    if (toOpen.length === 0) return;
    setOpen((current) => ({
      ...current,
      ...Object.fromEntries(toOpen.map((line) => [line.key, line])),
    }));
    // Only a new set of errors should reopen lines, not every keystroke while they are open.
  }, [errors]);

  const nameOf = (line: { readonly name: string }) =>
    line.name.trim() === '' ? t('recipes:needs.unnamed') : line.name;
  const labels = {
    moveUp: (line: { readonly name: string }) => t('recipes:needs.moveUp', { name: nameOf(line) }),
    moveDown: (line: { readonly name: string }) =>
      t('recipes:needs.moveDown', { name: nameOf(line) }),
    up: t('recipes:needs.up'),
    down: t('recipes:needs.down'),
  };
  const errorsFor = (key: string): LineErrors => errors[key] ?? checked[key] ?? {};

  const setIngredients = (ingredients: readonly IngredientDraft[]) => {
    onChange({ ...value, ingredients });
  };
  const setEquipment = (equipment: readonly EquipmentDraft[]) => {
    onChange({ ...value, equipment });
  };

  const without = <T,>(record: Readonly<Record<string, T>>, key: string) =>
    Object.fromEntries(Object.entries(record).filter(([k]) => k !== key));
  const settle = (key: string) => {
    setOpen((current) => without(current, key));
    setChecked((current) => without(current, key));
  };
  const add = (line: Line, found: LineErrors) => {
    if (Object.keys(found).length > 0) {
      setChecked((current) => ({ ...current, [line.key]: found }));
      return;
    }
    settle(line.key);
  };
  const reopen = (line: Line) => {
    setOpen((current) => ({ ...current, [line.key]: line }));
  };

  const ingredientTitle = (line: IngredientDraft): string => {
    const amount = line.amount.trim();
    if (amount === '') return line.name;
    const unit =
      line.unit === null ? '' : ` ${t(`units:${line.unit}`, { count: parseAmount(amount) ?? 1 })}`;
    return `${amount}${unit} ${line.name}`;
  };
  const equipmentTitle = (line: EquipmentDraft): string =>
    line.optional ? `${line.name} (${t('recipes:needs.optional')})` : line.name;

  const actions = (line: Line, isNew: boolean, onAdd: () => void, onCancel: () => void) => (
    <View style={styles.actions}>
      <Button label={t('recipes:needs.cancelLine')} variant="ghost" onPress={onCancel} />
      <Button
        label={isNew ? t('recipes:needs.addLine') : t('recipes:needs.saveLine')}
        accessibilityLabel={
          isNew
            ? t('recipes:needs.addLineFor', { name: nameOf(line) })
            : t('recipes:needs.saveLineFor', { name: nameOf(line) })
        }
        onPress={onAdd}
      />
    </View>
  );

  return (
    <Stack gap="space6">
      <Stack gap="space3">
        <Text variant="heading" accessibilityRole="header">
          {t('recipes:needs.ingredients')}
        </Text>
        <ReorderableList
          items={value.ingredients}
          keyOf={(line) => line.key}
          labels={labels}
          onMove={(from, to) => {
            setIngredients(move(value.ingredients, from, to));
          }}
          renderItem={(line, index, controls) => {
            const snapshot = open[line.key];
            const replace = (next: IngredientDraft) => {
              setIngredients(value.ingredients.map((l, i) => (i === index ? next : l)));
            };
            const remove = () => {
              settle(line.key);
              setIngredients(value.ingredients.filter((_, i) => i !== index));
            };
            // A null snapshot is a line being written from nothing. The common ones (0030)
            // sit above its card, outside it: a way in, not a field.
            return (
              <Stack gap="space3">
                {snapshot === null && line.name === '' ? (
                  <QuickPicks
                    title={t('recipes:quick.ingredients')}
                    options={QUICK_INGREDIENTS}
                    onPick={(name) => {
                      replace({ ...line, name });
                    }}
                  />
                ) : null}
                <Card>
                  <Stack gap="space3">
                    {controls}
                    {snapshot === undefined ? (
                      <NeedRow
                        title={ingredientTitle(line)}
                        {...(line.note.trim() === '' ? {} : { detail: line.note })}
                        editLabel={t('recipes:needs.editLine')}
                        editAccessibilityLabel={t('recipes:needs.edit', { name: line.name })}
                        removeLabel={t('recipes:needs.removeLine')}
                        removeAccessibilityLabel={t('recipes:needs.remove', { name: line.name })}
                        onEdit={() => {
                          reopen(line);
                        }}
                        onRemove={remove}
                      />
                    ) : (
                      <>
                        <IngredientLine
                          line={line}
                          errors={errorsFor(line.key)}
                          onChange={replace}
                        />
                        {actions(
                          line,
                          snapshot === null,
                          () => {
                            add(line, checkIngredient(line));
                          },
                          () => {
                            if (snapshot === null) remove();
                            else {
                              replace(snapshot as IngredientDraft);
                              settle(line.key);
                            }
                          },
                        )}
                      </>
                    )}
                  </Stack>
                </Card>
              </Stack>
            );
          }}
        />
        <Button
          label={t('recipes:needs.addIngredient')}
          variant="secondary"
          onPress={() => {
            const line = emptyIngredient();
            setOpen((current) => ({ ...current, [line.key]: null }));
            setIngredients([...value.ingredients, line]);
          }}
        />
      </Stack>

      <Stack gap="space3">
        <Text variant="heading" accessibilityRole="header">
          {t('recipes:needs.equipment')}
        </Text>
        <ReorderableList
          items={value.equipment}
          keyOf={(line) => line.key}
          labels={labels}
          onMove={(from, to) => {
            setEquipment(move(value.equipment, from, to));
          }}
          renderItem={(line, index, controls) => {
            const snapshot = open[line.key];
            const replace = (next: EquipmentDraft) => {
              setEquipment(value.equipment.map((l, i) => (i === index ? next : l)));
            };
            const remove = () => {
              settle(line.key);
              setEquipment(value.equipment.filter((_, i) => i !== index));
            };
            // A null snapshot is a line being written from nothing. The common ones (0030)
            // sit above its card, outside it: a way in, not a field.
            return (
              <Stack gap="space3">
                {snapshot === null && line.name === '' ? (
                  <QuickPicks
                    title={t('recipes:quick.equipment')}
                    options={QUICK_EQUIPMENT}
                    onPick={(name) => {
                      replace({ ...line, name });
                    }}
                  />
                ) : null}
                <Card>
                  <Stack gap="space3">
                    {controls}
                    {snapshot === undefined ? (
                      <NeedRow
                        title={equipmentTitle(line)}
                        {...(line.note.trim() === '' ? {} : { detail: line.note })}
                        editLabel={t('recipes:needs.editLine')}
                        editAccessibilityLabel={t('recipes:needs.edit', { name: line.name })}
                        removeLabel={t('recipes:needs.removeLine')}
                        removeAccessibilityLabel={t('recipes:needs.remove', { name: line.name })}
                        onEdit={() => {
                          reopen(line);
                        }}
                        onRemove={remove}
                      />
                    ) : (
                      <>
                        <EquipmentLine
                          line={line}
                          errors={errorsFor(line.key)}
                          onChange={replace}
                        />
                        {actions(
                          line,
                          snapshot === null,
                          () => {
                            add(line, checkEquipment(line));
                          },
                          () => {
                            if (snapshot === null) remove();
                            else {
                              replace(snapshot as EquipmentDraft);
                              settle(line.key);
                            }
                          },
                        )}
                      </>
                    )}
                  </Stack>
                </Card>
              </Stack>
            );
          }}
        />
        <Button
          label={t('recipes:needs.addEquipment')}
          variant="secondary"
          onPress={() => {
            const line = emptyEquipment();
            setOpen((current) => ({ ...current, [line.key]: null }));
            setEquipment([...value.equipment, line]);
          }}
        />
      </Stack>
    </Stack>
  );
}
