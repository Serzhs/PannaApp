import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

import type { ConfigContext, ExpoConfig } from 'expo/config';
import { withPodfileProperties } from 'expo/config-plugins';

/**
 * The Google iOS client id is read from the repo's one .env, the same line the API uses
 * as the audience it accepts, so the app cannot ask Google for tokens the API refuses.
 * It is not a secret: it ships inside every copy of the app.
 */
const ENV_FILE = resolve(__dirname, '../../.env');
if (existsSync(ENV_FILE)) process.loadEnvFile(ENV_FILE);

const googleIosClientId = process.env.GOOGLE_CLIENT_ID_IOS ?? '';

/**
 * Expo's precompiled ExpoModulesCore expects expo-modules-jsi built in Swift 6 mode, and
 * patches/expo-modules-jsi builds it in Swift 5 mode because Xcode 26.3 cannot compile it
 * otherwise. Linked together the app dies at launch on a missing symbol, so everything is
 * compiled from source against the patched copy. Remove with both patches.
 */
const withModulesFromSource = (config: ExpoConfig): ExpoConfig =>
  withPodfileProperties(config, (podfile) => {
    podfile.modResults.EXPO_USE_PRECOMPILED_MODULES = 'false';
    return podfile;
  });

function ownSchemes(scheme: ExpoConfig['scheme']): string[] {
  if (scheme === undefined) return [];
  return typeof scheme === 'string' ? [scheme] : scheme;
}

export default ({ config }: ConfigContext): ExpoConfig =>
  withModulesFromSource({
    ...config,
    name: config.name ?? 'Panna',
    slug: config.slug ?? 'panna',
    ios: {
      ...config.ios,
      infoPlist: {
        ...config.ios?.infoPlist,
        // Google sends the person back to the app on its reversed client id. Without the
        // scheme registered, the sign-in sheet finishes and nothing receives the answer.
        // Setting this replaces the list Expo would build, so the app's own scheme, which
        // share links use (0017), has to be listed here again or it silently disappears.
        ...(googleIosClientId.length > 0
          ? {
              CFBundleURLTypes: [
                {
                  CFBundleURLSchemes: [
                    ...ownSchemes(config.scheme),
                    googleIosClientId.split('.').reverse().join('.'),
                  ],
                },
              ],
            }
          : {}),
      },
    },
    extra: { ...config.extra, googleIosClientId },
  });
