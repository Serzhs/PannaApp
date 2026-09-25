import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { styles } from './QuickPicks.styles';

import { Chip } from '@/components/Chip';
import { Stack } from '@/components/Stack';
import { Text } from '@/components/Text';

/** Each list is five and in the order of a recipe: the first things one does or reaches for. */
export const QUICK_STEPS = ['boilWater', 'heatPan', 'heatOven', 'chopOnions', 'season'] as const;
export const QUICK_INGREDIENTS = ['salt', 'water', 'oil', 'onion', 'garlic'] as const;
export const QUICK_EQUIPMENT = ['pot', 'pan', 'knife', 'board', 'bowl'] as const;

export interface QuickPicksProps {
  readonly title: string;
  /** Translation keys under `recipes:quick`, each a button named by its text. */
  readonly options: readonly string[];
  readonly onPick: (text: string) => void;
}

/**
 * A way into an empty card (0030): the most common steps, ingredients or tools as chips.
 * A chip writes the name or the instruction and nothing else; the rest is the author's.
 */
export function QuickPicks({ title, options, onPick }: QuickPicksProps): React.JSX.Element {
  const { t } = useTranslation();
  return (
    <Stack gap="space2">
      <Text variant="label" color="textSecondary">
        {title}
      </Text>
      <View style={styles.row}>
        {options.map((key) => {
          const text = t(`recipes:quick.${key}`);
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
