import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { styles } from './QuickSteps.styles';

import { Chip } from '@/components/Chip';
import { Stack } from '@/components/Stack';
import { Text } from '@/components/Text';

/** The order is the order of a recipe: the first things one does, then the last. */
export const QUICK_STEPS = ['boilWater', 'heatPan', 'heatOven', 'chopOnions', 'season'] as const;

export interface QuickStepsProps {
  readonly onPick: (text: string) => void;
}

/**
 * A way into an empty step (0030): the most common kitchen actions as chips. It writes the
 * instruction and nothing else, since "boil the water" means a different pot every time.
 */
export function QuickSteps({ onPick }: QuickStepsProps): React.JSX.Element {
  const { t } = useTranslation();
  return (
    <Stack gap="space2">
      <Text variant="label" color="textSecondary">
        {t('recipes:quickSteps.title')}
      </Text>
      <View style={styles.row}>
        {QUICK_STEPS.map((key) => {
          const text = t(`recipes:quickSteps.${key}`);
          return (
            <Chip
              key={key}
              label={text}
              selected={false}
              onPress={() => {
                onPick(text);
              }}
            />
          );
        })}
      </View>
    </Stack>
  );
}
