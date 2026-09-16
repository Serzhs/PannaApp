import { Pressable, View, type ViewProps } from 'react-native';

import { styles } from './Card.styles';

export interface CardProps extends ViewProps {
  readonly onPress?: () => void;
}

/**
 * A row in a list is one thing to a screen reader, not a title, a subtitle and a
 * chip visited separately. Giving the card an `accessibilityLabel` makes it a single
 * stop; without one its children are read as usual.
 */
export function Card({
  onPress,
  accessibilityLabel,
  style,
  ...rest
}: CardProps): React.JSX.Element {
  const asOne = accessibilityLabel !== undefined;

  if (onPress === undefined) {
    return (
      <View
        {...rest}
        accessible={asOne}
        {...(asOne ? { accessibilityLabel } : {})}
        style={[styles.card, style]}
      />
    );
  }

  return (
    <Pressable
      {...rest}
      accessibilityRole="button"
      {...(asOne ? { accessibilityLabel } : {})}
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed ? styles.pressed : null, style]}
    />
  );
}
