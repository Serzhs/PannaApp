import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { ActivityIndicator } from 'react-native';

import { checkHealth } from '@/api/health';
import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { Stack } from '@/components/Stack';
import { Text } from '@/components/Text';

/**
 * A placeholder, deleted once 0003 adds the sign-in screen. It calls the health
 * endpoint so that "the app talks to the API" is something you can see rather than
 * assume.
 */
export default function Placeholder() {
  const health = useQuery({ queryKey: ['health'], queryFn: checkHealth });
  const router = useRouter();

  return (
    <Screen>
      <Stack gap="space4" align="center" justify="center" style={{ flex: 1 }}>
        <Text variant="display">Panna</Text>
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
      </Stack>
    </Screen>
  );
}
