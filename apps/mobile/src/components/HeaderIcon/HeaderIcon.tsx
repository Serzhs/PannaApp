import { Ionicons } from '@expo/vector-icons';
import { Pressable } from 'react-native';

import { styles } from './HeaderIcon.styles';

import { theme } from '@/styles/theme';

export type HeaderIconName = keyof typeof Ionicons.glyphMap;

export interface HeaderIconProps {
  readonly name: HeaderIconName;
  /** Its meaning is otherwise a picture alone, so the label is required, not optional. */
  readonly label: string;
  readonly onPress: () => void;
  readonly disabled?: boolean;
}

/** An icon-only control in the navigation header: 44 points of target around a 24 point glyph. */
export function HeaderIcon({
  name,
  label,
  onPress,
  disabled = false,
}: HeaderIconProps): React.JSX.Element {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      hitSlop={styles.hitSlop.margin}
      style={({ pressed }) => [styles.target, pressed ? styles.pressed : null]}
    >
      <Ionicons name={name} size={styles.glyph.width} color={theme.colors.accent} />
    </Pressable>
  );
}
