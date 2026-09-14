import type { TextStyle } from 'react-native';

import { theme, type TextStyleName } from '@/styles/theme';
import type { SemanticColor } from '@/styles/tokens';

export function textStyle(variant: TextStyleName, color: SemanticColor): TextStyle {
  return { ...theme.text[variant], color: theme.colors[color] };
}
