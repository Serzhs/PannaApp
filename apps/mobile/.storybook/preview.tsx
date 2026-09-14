import type { Preview } from '@storybook/react-native-web-vite';
import { View } from 'react-native';

import { theme } from '../src/styles/theme';

const preview: Preview = {
  parameters: { layout: 'fullscreen' },
  decorators: [
    (Story) => (
      <View
        style={{
          flex: 1,
          padding: theme.space.space4,
          backgroundColor: theme.colors.background,
          minHeight: 240,
        }}
      >
        <Story />
      </View>
    ),
  ],
};

export default preview;
