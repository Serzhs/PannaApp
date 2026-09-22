import { StyleSheet } from 'react-native';

import { theme } from '@/styles/theme';

export const styles = StyleSheet.create({
  /** Four by three, the shape of a photo of a plate; the file is cropped to fit, never stretched. */
  preview: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: theme.radius.radiusMd,
    backgroundColor: theme.colors.surfaceRaised,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.space.space2,
  },
});
