import { useQuery } from '@tanstack/react-query';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { checkHealth } from '@/api/health';

/**
 * A placeholder, deleted once 0003 adds the sign-in screen. It calls the health
 * endpoint so that "the app talks to the API" is something you can see rather than
 * assume.
 */
export default function Placeholder() {
  const health = useQuery({ queryKey: ['health'], queryFn: checkHealth });

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Panna</Text>
      {health.isPending ? (
        <ActivityIndicator />
      ) : health.isError ? (
        <Text style={styles.body}>Cannot reach the API. Is it running?</Text>
      ) : (
        <Text style={styles.body}>
          API {health.data.status} · database {health.data.database}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  title: { fontSize: 32 },
  body: { fontSize: 15, opacity: 0.7 },
});
