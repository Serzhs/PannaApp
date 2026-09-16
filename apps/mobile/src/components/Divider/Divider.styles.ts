import { StyleSheet } from 'react-native';

import { theme } from '@/styles/theme';

export const styles = StyleSheet.create({
  line: {
    // One device pixel rather than one point, so it stays a line and not a bar on a 3x screen.
    height: StyleSheet.hairlineWidth,
    backgroundColor: theme.colors.borderSubtle,
    alignSelf: 'stretch',
  },
});
