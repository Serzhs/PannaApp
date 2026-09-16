import type { Recipe } from '@panna/shared';
import { View } from 'react-native';

import { describeRecipe, describeServings, describeTime } from '../../format';

import { styles } from './RecipeRow.styles';

import { Card } from '@/components/Card';
import { Skeleton } from '@/components/Skeleton';
import { Stack } from '@/components/Stack';
import { Text } from '@/components/Text';

export interface RecipeRowProps {
  readonly recipe: Recipe;
  readonly onPress: (recipe: Recipe) => void;
}

/** One stop for a screen reader: title, servings, time and status in one label. */
export function RecipeRow({ recipe, onPress }: RecipeRowProps): React.JSX.Element {
  const meta = [describeServings(recipe.servings)];
  if (recipe.totalTimeMinutes !== null) meta.push(describeTime(recipe.totalTimeMinutes));

  return (
    <Card
      accessibilityLabel={describeRecipe(recipe)}
      onPress={() => {
        onPress(recipe);
      }}
    >
      <Stack gap="space1">
        <Stack direction="row" gap="space2" align="center">
          <Text variant="bodyStrong" numberOfLines={1} style={styles.title}>
            {recipe.title}
          </Text>
          {recipe.status === 'draft' ? (
            <View style={styles.chip}>
              <Text variant="label" color="textSecondary">
                Draft
              </Text>
            </View>
          ) : null}
        </Stack>
        <Text variant="caption" color="textSecondary">
          {meta.join(' · ')}
        </Text>
      </Stack>
    </Card>
  );
}

/** The same two lines the row has, so the list does not jump when the rows arrive. */
export function RecipeRowSkeleton(): React.JSX.Element {
  return (
    <Card>
      <Stack gap="space1">
        <Skeleton.Text variant="bodyStrong" lines={1} lastLineWidth="70%" />
        <Skeleton.Text variant="caption" lines={1} lastLineWidth="40%" />
      </Stack>
    </Card>
  );
}
