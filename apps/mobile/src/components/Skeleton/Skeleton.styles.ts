import { StyleSheet, type DimensionValue, type ViewStyle } from 'react-native';

import { theme, type TextStyleName } from '@/styles/theme';
import type { RadiusName } from '@/styles/tokens';

export const styles = StyleSheet.create({
  bar: {
    backgroundColor: theme.colors.skeletonBase,
    overflow: 'hidden',
  },
  textBar: {
    flex: 1,
    borderRadius: theme.radius.radiusSm,
  },
  highlight: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    start: 0,
    end: 0,
    backgroundColor: theme.colors.skeletonHighlight,
  },
});

/**
 * The outer box is the text style's line height, the bar inside it the font size, so
 * the line measures exactly what a line of that text measures while the bar itself
 * sits in the middle the way glyphs do.
 */
export function lineStyle(variant: TextStyleName, width: DimensionValue): ViewStyle {
  const { lineHeight, fontSize } = theme.text[variant];
  return {
    height: lineHeight,
    width,
    paddingVertical: (lineHeight - fontSize) / 2,
  };
}

export function blockStyle(
  width: DimensionValue,
  height: DimensionValue,
  radius: RadiusName,
): ViewStyle {
  return { width, height, borderRadius: theme.radius[radius] };
}
