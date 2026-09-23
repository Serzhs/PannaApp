import type { Recipe } from '@panna/shared';
import { useTranslation } from 'react-i18next';
import { Image, View } from 'react-native';

import { describeMeta, describeRecipe, isNew } from '../../format';

import { styles } from './RecipeRow.styles';

import { imageUrl } from '@/api/images';
import { Card } from '@/components/Card';
import { Skeleton } from '@/components/Skeleton';
import { Stack } from '@/components/Stack';
import { Text } from '@/components/Text';

export interface RecipeRowProps {
  readonly recipe: Recipe;
  readonly onPress: (recipe: Recipe) => void;
  /** The clock, so a test can say what day it is. */
  readonly now?: number;
  /** No chips: a featured recipe (0019) is nobody's draft and nobody's news. */
  readonly plain?: boolean;
}

/** One stop for a screen reader: title, servings, time and status in one label. */
export function RecipeRow({
  recipe,
  onPress,
  now = Date.now(),
  plain = false,
}: RecipeRowProps): React.JSX.Element {
  const { t } = useTranslation();

  return (
    <Card
      accessibilityLabel={describeRecipe(recipe, t, now, plain)}
      onPress={() => {
        onPress(recipe);
      }}
    >
      <Stack direction="row" gap="space3" align="center">
        {recipe.coverImageKey === null ? null : (
          <Image
            source={{ uri: imageUrl(recipe.coverImageKey) }}
            style={styles.cover}
            // Decorative, so nothing a person can perceive names it: a test id is the honest hook.
            testID="cover-thumbnail"
            accessibilityIgnoresInvertColors
            accessibilityElementsHidden
            importantForAccessibility="no"
          />
        )}
        <Stack gap="space1" style={styles.text}>
          <Stack direction="row" gap="space2" align="center">
            <Text variant="bodyStrong" numberOfLines={1} style={styles.title}>
              {recipe.title}
            </Text>
            {!plain && recipe.status === 'draft' ? (
              <View style={styles.chip}>
                <Text variant="label" color="textSecondary">
                  {t('recipes:status.draft')}
                </Text>
              </View>
            ) : null}
            {!plain && isNew(recipe, now) ? (
              <View style={[styles.chip, styles.newChip]}>
                <Text variant="label" color="accent">
                  {t('recipes:status.new')}
                </Text>
              </View>
            ) : null}
          </Stack>
          <Text variant="caption" color="textSecondary">
            {describeMeta(recipe, t)}
          </Text>
        </Stack>
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
