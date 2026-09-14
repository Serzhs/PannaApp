import type { Preview } from '@storybook/react-native';
import { View } from 'react-native';

import { theme } from '@/styles/theme';

const preview: Preview = {
  decorators: [
    (Story) => (
      <View
        style={{ flex: 1, padding: theme.space.space4, backgroundColor: theme.colors.background }}
      >
        <Story />
      </View>
    ),
  ],
};

export default preview;
