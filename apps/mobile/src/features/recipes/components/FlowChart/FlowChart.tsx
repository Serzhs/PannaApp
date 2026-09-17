import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { childrenOf, mainsOf, numberOf, stepTitle, type StepDraft } from '../../steps';

import { styles } from './FlowChart.styles';

import { Stack } from '@/components/Stack';
import { Text } from '@/components/Text';

export interface FlowChartProps {
  readonly steps: readonly StepDraft[];
}

/**
 * The recipe as a picture: main steps down a line, and what runs during a step on a
 * branch beside it (0022). Ordinary views, no drawing library: boxes and borders are
 * enough for one level of branching.
 */
export function FlowChart({ steps }: FlowChartProps): React.JSX.Element {
  const { t } = useTranslation();
  const mains = mainsOf(steps);
  const titleOf = (line: StepDraft) =>
    stepTitle(line.body) === '' ? t('recipes:flow.untitled') : stepTitle(line.body);

  return (
    <View>
      {mains.map((main, index) => {
        const number = index + 1;
        const during = childrenOf(steps, main.key);
        const parallel = during.map((line) => ({
          line,
          label: `${String(number)}${numberOf(steps, line.key)?.letter ?? ''}`,
        }));
        const spoken = [
          t('recipes:flow.chartStep', { number, title: titleOf(main) }),
          ...(parallel.length === 0
            ? []
            : [
                t('recipes:flow.chartMeanwhile', {
                  list: parallel.map((p) => `${p.label} ${titleOf(p.line)}`).join(', '),
                }),
              ]),
        ].join(', ');
        return (
          <View key={main.key} style={styles.row} accessible accessibilityLabel={spoken}>
            <View style={styles.main}>
              <View style={styles.box}>
                <Text variant="label" color="textSecondary">
                  {String(number)}
                </Text>
                <Text variant="body">{titleOf(main)}</Text>
              </View>
              {index === mains.length - 1 ? null : <View style={styles.line} />}
            </View>
            {parallel.length === 0 ? null : (
              <View style={styles.branch}>
                <View style={styles.connector} />
                <Stack gap="space2" style={styles.side}>
                  {parallel.map((p) => (
                    <View key={p.line.key} style={[styles.box, styles.sideBox]}>
                      <Text variant="label" color="textSecondary">
                        {p.label}
                      </Text>
                      <Text variant="body">{titleOf(p.line)}</Text>
                    </View>
                  ))}
                </Stack>
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}
