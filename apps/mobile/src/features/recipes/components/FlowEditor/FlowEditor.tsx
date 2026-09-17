import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import {
  candidatesFor,
  childrenOf,
  mainsOf,
  nestUnder,
  numberOf,
  release,
  stepTitle,
  type StepDraft,
} from '../../steps';
import { StepPicker } from '../StepPicker';

import { styles } from './FlowEditor.styles';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Stack } from '@/components/Stack';
import { Text } from '@/components/Text';

export interface FlowEditorProps {
  readonly value: readonly StepDraft[];
  readonly onChange: (next: StepDraft[]) => void;
}

/**
 * The main steps as a list, each able to take other steps under it (0022). The picker
 * applies every tick at once, so the chart beside this list moves as the author decides.
 */
export function FlowEditor({ value, onChange }: FlowEditorProps): React.JSX.Element {
  const { t } = useTranslation();
  const [pickingFor, setPickingFor] = useState<string | null>(null);
  const mains = mainsOf(value);
  const titleOf = (line: StepDraft) =>
    stepTitle(line.body) === '' ? t('recipes:flow.untitled') : stepTitle(line.body);

  if (value.length < 2) {
    return (
      <Text variant="body" color="textSecondary">
        {t('recipes:flow.nothingYet')}
      </Text>
    );
  }

  const picking = pickingFor === null ? undefined : value.find((line) => line.key === pickingFor);
  const options =
    picking === undefined
      ? []
      : [
          ...childrenOf(value, picking.key).map((line) => ({
            key: line.key,
            title: titleOf(line),
            checked: true,
          })),
          ...candidatesFor(value, picking.key).map((line) => ({
            key: line.key,
            title: titleOf(line),
            checked: false,
          })),
        ];

  return (
    <Stack gap="space3">
      {mains.map((main, index) => {
        const number = index + 1;
        const during = childrenOf(value, main.key);
        return (
          <Card key={main.key}>
            <Stack gap="space2">
              <Text variant="bodyStrong">
                {t('recipes:flow.line', { number, title: titleOf(main) })}
              </Text>
              {during.map((line) => (
                <View key={line.key} style={styles.parallel}>
                  <Text variant="body" style={styles.parallelTitle}>
                    {t('recipes:flow.parallelLine', {
                      number,
                      letter: numberOf(value, line.key)?.letter ?? '',
                      title: titleOf(line),
                    })}
                  </Text>
                  <Button
                    label={t('recipes:flow.backToMain')}
                    accessibilityLabel={t('recipes:flow.backToMainFor', { title: titleOf(line) })}
                    variant="ghost"
                    onPress={() => {
                      onChange(release(value, line.key));
                    }}
                  />
                </View>
              ))}
              <View style={styles.add}>
                <Button
                  label={t('recipes:flow.addParallel')}
                  accessibilityLabel={t('recipes:flow.addParallelFor', { number })}
                  variant="secondary"
                  disabled={during.length === 0 && candidatesFor(value, main.key).length === 0}
                  onPress={() => {
                    setPickingFor(main.key);
                  }}
                />
              </View>
            </Stack>
          </Card>
        );
      })}
      <StepPicker
        visible={picking !== undefined}
        title={
          picking === undefined
            ? ''
            : t('recipes:flow.pickerTitle', {
                number: numberOf(value, picking.key)?.number ?? '',
                title: titleOf(picking),
              })
        }
        options={options}
        onToggle={(key, checked) => {
          if (picking === undefined) return;
          onChange(checked ? nestUnder(value, key, picking.key) : release(value, key));
        }}
        onClose={() => {
          setPickingFor(null);
        }}
      />
    </Stack>
  );
}
