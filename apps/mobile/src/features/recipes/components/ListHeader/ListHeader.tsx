import { useRouter } from 'expo-router';

import { styles } from './ListHeader.styles';

import { Button } from '@/components/Button';
import { Stack } from '@/components/Stack';
import { Text } from '@/components/Text';
import { useAuth } from '@/features/auth/AuthProvider';

/** The screen's name and whose recipes these are, in the header 0005 moves them to. */
export function ListHeaderTitle(): React.JSX.Element {
  const { user } = useAuth();
  return (
    <Stack gap="space0" align="center" style={styles.title}>
      <Text variant="bodyStrong" accessibilityRole="header">
        Recipes
      </Text>
      {user === null ? null : (
        <Text variant="caption" color="textSecondary">
          {user.displayName}
        </Text>
      )}
    </Stack>
  );
}

export function SignOutButton(): React.JSX.Element {
  const { signOut } = useAuth();
  return <Button label="Sign out" variant="ghost" onPress={() => void signOut()} />;
}

export function NewRecipeButton(): React.JSX.Element {
  const router = useRouter();
  return (
    <Button
      label="New"
      variant="ghost"
      accessibilityLabel="New recipe"
      onPress={() => {
        router.push('/recipes/new');
      }}
    />
  );
}
