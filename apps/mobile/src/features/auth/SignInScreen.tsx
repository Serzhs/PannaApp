import { useState } from 'react';
import { Platform, View } from 'react-native';

import { devSignIn } from './auth.api';
import { useAuth } from './AuthProvider';
import { AppleButton } from './components/AppleButton';
import { GoogleButton } from './components/GoogleButton';
import { styles } from './SignInScreen.styles';

import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { Stack } from '@/components/Stack';
import { Text } from '@/components/Text';

/**
 * Gate three of the development sign-in. `__DEV__` is false in a release build, Metro
 * folds the ternary, and the whole affordance leaves the bundle - the same pattern the
 * design gallery uses, and checked the same way, by grepping an export.
 */
const DEV_EMAIL = __DEV__ ? 'janis@example.com' : null;

export function SignInScreen() {
  const { signIn } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const notConfigured = (provider: string) => {
    // 0003's next stage. Saying so beats a button that silently does nothing.
    setError(`${provider} is not configured yet. Use the development sign-in below.`);
  };

  const signInAsDeveloper = () => {
    if (DEV_EMAIL === null) return;
    setError(null);
    setBusy(true);
    devSignIn(DEV_EMAIL)
      .then(signIn)
      .catch((cause: unknown) => {
        setError(
          cause instanceof Error
            ? `${cause.message} - is the API running with ALLOW_DEV_SIGN_IN=true?`
            : 'Could not sign in',
        );
      })
      .finally(() => {
        setBusy(false);
      });
  };

  return (
    <Screen>
      <View style={styles.screen}>
        <Stack gap="space6">
          <Stack gap="space2">
            <Text variant="display" style={styles.intro} accessibilityRole="header">
              Panna
            </Text>
            <Text variant="body" color="textSecondary" style={styles.intro}>
              Your recipes, step by step, so you never forget them.
            </Text>
          </Stack>

          {/* One stack, one gap: the three buttons are the same size and the same
              distance apart, so the screen reads as one set rather than three. */}
          <Stack gap="space3">
            {/* Apple's guidance puts their button first on iOS. */}
            {Platform.OS === 'ios' ? (
              <AppleButton
                disabled={busy}
                onPress={() => {
                  notConfigured('Sign in with Apple');
                }}
              />
            ) : null}

            <GoogleButton
              disabled={busy}
              onPress={() => {
                notConfigured('Sign in with Google');
              }}
            />

            {DEV_EMAIL === null ? null : (
              <Button
                label="Development sign-in"
                variant="secondary"
                loading={busy}
                onPress={signInAsDeveloper}
              />
            )}
          </Stack>

          {error === null ? null : (
            <Text variant="caption" color="danger" style={styles.intro}>
              {error}
            </Text>
          )}

          {DEV_EMAIL === null ? null : (
            <Text variant="caption" color="textSecondary" style={styles.devNote}>
              Signs in as {DEV_EMAIL} from the seed. Development builds only.
            </Text>
          )}
        </Stack>
      </View>
    </Screen>
  );
}
