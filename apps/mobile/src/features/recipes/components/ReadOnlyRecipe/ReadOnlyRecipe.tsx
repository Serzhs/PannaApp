import type { SharedRecipe } from '@panna/shared';
import { useTranslation } from 'react-i18next';
import { Image } from 'react-native';

import { describeMeta } from '../../format';
import { NeedsSection } from '../NeedsSection';
import { StepsSection } from '../StepsSection';

import { styles } from './ReadOnlyRecipe.styles';

import { imageUrl } from '@/api/images';
import { Button } from '@/components/Button';
import { Stack } from '@/components/Stack';
import { Text } from '@/components/Text';

export interface ReadOnlyRecipeProps {
  readonly recipe: SharedRecipe;
  /** Who it comes from: "Shared by Anna", "By Panna". */
  readonly headline: string;
  /** Where its photos live when not on the own API (0017). */
  readonly imageBaseUrl?: string;
  readonly adding: boolean;
  readonly addError: string | null;
  readonly onAdd: () => void;
}

/**
 * A recipe that is not yours yet (0017, 0019): everything the recipe screen shows, none of
 * what only an owner does, and one button. Cooking it means keeping it first.
 */
export function ReadOnlyRecipe({
  recipe,
  headline,
  imageBaseUrl,
  adding,
  addError,
  onAdd,
}: ReadOnlyRecipeProps): React.JSX.Element {
  const { t } = useTranslation();
  const cover =
    recipe.coverImageKey === null
      ? null
      : imageBaseUrl === undefined
        ? imageUrl(recipe.coverImageKey)
        : `${imageBaseUrl}/api/images/${recipe.coverImageKey}`;

  return (
    <Stack gap="space4" style={styles.body}>
      {cover === null ? null : (
        <Image
          source={{ uri: cover }}
          style={styles.cover}
          accessibilityIgnoresInvertColors
          accessibilityLabel={t('recipes:photo.coverOf', { title: recipe.title })}
        />
      )}
      <Stack gap="space1">
        <Text variant="caption" color="accent">
          {headline}
        </Text>
        <Text variant="title" accessibilityRole="header">
          {recipe.title}
        </Text>
        <Text variant="caption" color="textSecondary">
          {describeMeta(recipe, t)}
        </Text>
      </Stack>
      {recipe.description === null ? null : <Text variant="body">{recipe.description}</Text>}
      <NeedsSection ingredients={recipe.ingredients} equipment={recipe.equipment} />
      <StepsSection
        steps={recipe.steps}
        ingredients={recipe.ingredients}
        equipment={recipe.equipment}
        {...(imageBaseUrl === undefined ? {} : { imageBaseUrl })}
      />
      {addError === null ? null : (
        <Text variant="caption" color="danger" accessibilityLiveRegion="polite">
          {addError}
        </Text>
      )}
      <Button label={t('recipes:share.add')} loading={adding} onPress={onAdd} />
    </Stack>
  );
}
