import { View, type ViewProps, type ViewStyle } from 'react-native';

import { stackStyle } from './Stack.styles';

import type { SpaceName } from '@/styles/tokens';

export interface StackProps extends ViewProps {
  readonly direction?: 'row' | 'column';
  readonly gap?: SpaceName;
  readonly align?: ViewStyle['alignItems'];
  readonly justify?: ViewStyle['justifyContent'];
}

/**
 * Spacing belongs to the container, not to the children. Margins sprinkled on children
 * are what makes a list item impossible to reuse in a different layout.
 */
export function Stack({
  direction = 'column',
  gap = 'space0',
  align,
  justify,
  style,
  ...rest
}: StackProps): React.JSX.Element {
  return <View {...rest} style={[stackStyle(direction, gap, align, justify), style]} />;
}
