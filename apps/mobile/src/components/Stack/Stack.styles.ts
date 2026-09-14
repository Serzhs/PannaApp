import type { ViewStyle } from 'react-native';

import { theme } from '@/styles/theme';
import type { SpaceName } from '@/styles/tokens';

export function stackStyle(
  direction: 'row' | 'column',
  gap: SpaceName,
  align: ViewStyle['alignItems'],
  justify: ViewStyle['justifyContent'],
): ViewStyle {
  return {
    flexDirection: direction,
    gap: theme.space[gap],
    alignItems: align,
    justifyContent: justify,
  };
}
