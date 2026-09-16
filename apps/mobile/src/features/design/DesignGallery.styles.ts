import { StyleSheet } from 'react-native';

import { theme } from '@/styles/theme';

export const styles = StyleSheet.create({
  section: {
    paddingVertical: theme.space.space5,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderSubtle,
  },
  swatch: {
    width: theme.space.space12,
    height: theme.space.space10,
    borderRadius: theme.radius.radiusSm,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
  },
  swatchRow: {
    alignItems: 'center',
  },
  spacingBar: {
    height: theme.space.space3,
    backgroundColor: theme.colors.accent,
    borderRadius: theme.radius.radiusSm,
  },
  ratio: {
    minWidth: theme.space.space12,
  },
  half: {
    flex: 1,
  },
});
