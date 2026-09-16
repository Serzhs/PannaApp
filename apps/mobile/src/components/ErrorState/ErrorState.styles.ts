import { StyleSheet } from 'react-native';

import { theme } from '@/styles/theme';

export const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.space.space10,
    paddingHorizontal: theme.space.space6,
  },
  centred: {
    textAlign: 'center',
  },
  action: {
    marginTop: theme.space.space2,
  },
});
