import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { ActivityIndicator } from 'react-native';

import { checkHealth } from '@/api/health';
import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { Stack } from '@/components/Stack';
import { Text } from '@/components/Text';
import { useAuth } from '@/features/auth/AuthProvider';

/** A placeholder home screen. 0005 replaces it with the recipe list. */
export default function Home() {
  const health = useQuery({ queryKey: ['health'], queryFn: checkHealth });
  const { user, signOut } = useAuth();
  const router = useRouter();

  return (
    <Screen>
      <Stack gap="space4" align="center" justify="center" style={{ flex: 1 }}>
        <Text variant="display">Panna</Text>
        {user === null ? null : <Text variant="heading">Signed in as {user.displayName}</Text>}
        {health.isPending ? (
          <ActivityIndicator />
        ) : health.isError ? (
          <Text color="textSecondary">Cannot reach the API. Is it running?</Text>
        ) : (
          <Text color="textSecondary">
            API {health.data.status} · database {health.data.database}
          </Text>
        )}
        {__DEV__ ? (
          <Button
            label="Design system"
            variant="secondary"
            onPress={() => {
              router.push('/design');
            }}
          />
        ) : null}
        <Button
          label="Sign out"
          variant="ghost"
          onPress={() => {
            void signOut();
          }}
        />
      </Stack>
    </Screen>
  );
}
