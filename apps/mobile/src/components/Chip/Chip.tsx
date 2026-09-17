import { Pressable } from 'react-native';

import { chipStyle, labelStyle, styles } from './Chip.styles';

import { Text } from '@/components/Text';

export interface ChipProps {
  readonly label: string;
  readonly selected: boolean;
  readonly onPress: () => void;
  readonly disabled?: boolean;
  readonly accessibilityHint?: string;
  /** Checkbox when each chip is its own choice; radio when exactly one of a row is chosen. */
  readonly role?: 'checkbox' | 'radio';
}

/**
 * A toggle that reads as a checkbox: a filled chip is on, an outlined one off. The
 * state is carried by the fill and the mark together, never by colour alone.
 */
export function Chip({
  label,
  selected,
  onPress,
  disabled = false,
  accessibilityHint,
  role = 'checkbox',
}: ChipProps): React.JSX.Element {
  return (
    <Pressable
      accessibilityRole={role}
      accessibilityState={{ checked: selected, disabled }}
      accessibilityLabel={label}
      {...(accessibilityHint === undefined ? {} : { accessibilityHint })}
      disabled={disabled}
      onPress={onPress}
      hitSlop={styles.hitSlop}
      style={({ pressed }) => [styles.base, chipStyle(selected, disabled, pressed)]}
    >
      <Text variant="label" style={labelStyle(selected, disabled)}>
        {selected ? `✓ ${label}` : label}
      </Text>
    </Pressable>
  );
}
