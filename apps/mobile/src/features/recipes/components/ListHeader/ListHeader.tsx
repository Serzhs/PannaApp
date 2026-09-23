import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { styles } from './ListHeader.styles';

import { Button } from '@/components/Button';
import { Stack } from '@/components/Stack';
import { Text } from '@/components/Text';
import { useAuth } from '@/features/auth/AuthProvider';

/** The screen's name and whose recipes these are, in the header 0005 moves them to. */
export function ListHeaderTitle(): React.JSX.Element {
  const { user } = useAuth();
  const { t } = useTranslation();
  return (
    <Stack gap="space0" align="center" style={styles.title}>
      <Text variant="bodyStrong" accessibilityRole="header">
        {t('recipes:screens.list')}
      </Text>
      {user === null ? null : (
        <Text variant="caption" color="textSecondary">
          {user.displayName}
        </Text>
      )}
    </Stack>
  );
}

export function NewRecipeButton(): React.JSX.Element {
  const router = useRouter();
  const { t } = useTranslation();
  return (
    <Button
      label={t('recipes:header.new')}
      variant="ghost"
      accessibilityLabel={t('recipes:header.newRecipe')}
      onPress={() => {
        router.push('/recipes/new');
      }}
    />
  );
}
