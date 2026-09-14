import { Text as RNText, type TextProps as RNTextProps } from 'react-native';

import { textStyle } from './Text.styles';

import type { TextStyleName } from '@/styles/theme';
import type { SemanticColor } from '@/styles/tokens';

export interface TextProps extends RNTextProps {
  readonly variant?: TextStyleName;
  readonly color?: SemanticColor;
}

/**
 * The only component allowed to render React Native's own `Text`, so that every string
 * in the app carries a named style and a semantic colour rather than loose numbers.
 */
export function Text({
  variant = 'body',
  color = 'textPrimary',
  style,
  ...rest
}: TextProps): React.JSX.Element {
  return <RNText {...rest} style={[textStyle(variant, color), style]} />;
}
