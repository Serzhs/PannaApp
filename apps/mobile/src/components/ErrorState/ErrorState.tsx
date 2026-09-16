import { useEffect } from 'react';
import { AccessibilityInfo, View } from 'react-native';

import { styles } from './ErrorState.styles';

import { Button } from '@/components/Button';
import { Stack } from '@/components/Stack';
import { Text } from '@/components/Text';

export type ErrorStateVariant = 'failure' | 'offline';

export interface ErrorStateProps {
  readonly variant?: ErrorStateVariant;
  /** Shown under the title for a failure. Ignored offline, where the cause is already known. */
  readonly message?: string;
  readonly onRetry: () => void;
}

/**
 * Offline is its own variant because it is the one failure the person can do something
 * about: the words say what to do rather than that something went wrong.
 */
const COPY: Record<ErrorStateVariant, { title: string; body: string; action: string }> = {
  failure: {
    title: 'Something went wrong',
    body: 'That did not work. Try again in a moment.',
    action: 'Try again',
  },
  offline: {
    title: 'You are offline',
    body: 'Connect to the internet, then try again.',
    action: 'Retry',
  },
};

export function ErrorState({
  variant = 'failure',
  message,
  onRetry,
}: ErrorStateProps): React.JSX.Element {
  const copy = COPY[variant];
  const body = variant === 'failure' && message !== undefined ? message : copy.body;

  // An error arriving is a change the person did not cause, so it is spoken, not just shown.
  useEffect(() => {
    AccessibilityInfo.announceForAccessibility(`${copy.title}. ${body}`);
  }, [copy.title, body]);

  return (
    <View style={styles.container}>
      <Stack gap="space3" align="center">
        <Text variant="heading" accessibilityRole="header" style={styles.centred}>
          {copy.title}
        </Text>
        <Text variant="body" color="textSecondary" style={styles.centred}>
          {body}
        </Text>
        <View style={styles.action}>
          <Button label={copy.action} variant="secondary" onPress={onRetry} />
        </View>
      </Stack>
    </View>
  );
}
