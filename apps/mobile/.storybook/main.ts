import type { StorybookConfig } from '@storybook/react-native-web-vite';

/**
 * A browser gallery, not the app's renderer. It goes through react-native-web, so it is
 * for looking at spacing, type and colour - not for judging touch behaviour or anything
 * platform specific. The device is still the only place those are true.
 */
const main: StorybookConfig = {
  stories: ['../src/components/**/*.stories.tsx'],
  framework: {
    name: '@storybook/react-native-web-vite',
    options: {},
  },
};

export default main;
