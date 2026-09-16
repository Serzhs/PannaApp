import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import {
  emptyEquipment,
  emptyIngredient,
  move,
  type EquipmentDraft,
  type IngredientDraft,
  type NeedsDraft,
  type NeedsErrors,
} from '../../needs';
import { EquipmentLine } from '../EquipmentLine';
import { IngredientLine } from '../IngredientLine';

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

/**
 * Both lists with add, remove and move, holding no state of its own: the screen owns
 * the draft, because the screen is what sends it.
 */
export function NeedsEditor({ value, errors, onChange }: NeedsEditorProps): React.JSX.Element {
  const { t } = useTranslation();
  const nameOf = (line: { readonly name: string }) =>
    line.name.trim() === '' ? t('recipes:needs.unnamed') : line.name;
  const labels = {
    moveUp: (line: { readonly name: string }) => t('recipes:needs.moveUp', { name: nameOf(line) }),
    moveDown: (line: { readonly name: string }) =>
      t('recipes:needs.moveDown', { name: nameOf(line) }),
    drag: (line: { readonly name: string }) => t('recipes:needs.drag', { name: nameOf(line) }),
  };

  const setIngredients = (ingredients: readonly IngredientDraft[]) => {
    onChange({ ...value, ingredients });
  };
  const setEquipment = (equipment: readonly EquipmentDraft[]) => {
    onChange({ ...value, equipment });
  };

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
          renderItem={(line, index) => (
            <Card>
              <Stack gap="space3">
                <IngredientLine
                  line={line}
                  errors={errors[line.key] ?? {}}
                  onChange={(next) => {
                    setIngredients(value.ingredients.map((l, i) => (i === index ? next : l)));
                  }}
                />
                <View style={styles.remove}>
                  <Button
                    label={t('recipes:needs.removeUnnamed')}
                    accessibilityLabel={
                      line.name.trim() === ''
                        ? t('recipes:needs.removeUnnamed')
                        : t('recipes:needs.remove', { name: line.name })
                    }
                    variant="ghost"
                    onPress={() => {
                      setIngredients(value.ingredients.filter((_, i) => i !== index));
                    }}
                  />
                </View>
              </Stack>
            </Card>
          )}
        />
        <Button
          label={t('recipes:needs.addIngredient')}
          variant="secondary"
          onPress={() => {
            setIngredients([...value.ingredients, emptyIngredient()]);
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
          renderItem={(line, index) => (
            <Card>
              <Stack gap="space3">
                <EquipmentLine
                  line={line}
                  errors={errors[line.key] ?? {}}
                  onChange={(next) => {
                    setEquipment(value.equipment.map((l, i) => (i === index ? next : l)));
                  }}
                />
                <View style={styles.remove}>
                  <Button
                    label={t('recipes:needs.removeUnnamed')}
                    accessibilityLabel={
                      line.name.trim() === ''
                        ? t('recipes:needs.removeUnnamed')
                        : t('recipes:needs.remove', { name: line.name })
                    }
                    variant="ghost"
                    onPress={() => {
                      setEquipment(value.equipment.filter((_, i) => i !== index));
                    }}
                  />
                </View>
              </Stack>
            </Card>
          )}
        />
        <Button
          label={t('recipes:needs.addEquipment')}
          variant="secondary"
          onPress={() => {
            setEquipment([...value.equipment, emptyEquipment()]);
          }}
        />
      </Stack>
    </Stack>
  );
}
