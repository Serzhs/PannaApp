import { useTranslation } from 'react-i18next';

import { styles } from './ListHeader.styles';

import { Button } from '@/components/Button';
import { Stack } from '@/components/Stack';
import { Text } from '@/components/Text';
import { useAuth } from '@/features/auth/AuthProvider';
import { useNewRecipeMenu } from '@/features/recipes/useNewRecipeMenu';
import { FIXED_LAYOUT_MAX_FONT_SCALE } from '@/styles/theme';

/** The screen's name and whose recipes these are, in the header 0005 moves them to. */
export function ListHeaderTitle(): React.JSX.Element {
  const { user } = useAuth();
  const { t } = useTranslation();
  return (
    <Stack gap="space0" align="center" style={styles.title}>
      {/* The native header has a fixed height, so these cannot grow with the largest sizes. */}
      <Text
        variant="bodyStrong"
        accessibilityRole="header"
        maxFontSizeMultiplier={FIXED_LAYOUT_MAX_FONT_SCALE}
      >
        {t('recipes:screens.list')}
      </Text>
      {user === null ? null : (
        <Text
          variant="caption"
          color="textSecondary"
          numberOfLines={1}
          maxFontSizeMultiplier={FIXED_LAYOUT_MAX_FONT_SCALE}
        >
          {user.displayName}
        </Text>
      )}
    </Stack>
  );
}

export function NewRecipeButton(): React.JSX.Element {
  const openMenu = useNewRecipeMenu();
  const { t } = useTranslation();
  return (
    <Button
      label={t('recipes:header.new')}
      variant="ghost"
      accessibilityLabel={t('recipes:header.newRecipe')}
      maxFontSizeMultiplier={FIXED_LAYOUT_MAX_FONT_SCALE}
      onPress={openMenu}
    />
  );
}
