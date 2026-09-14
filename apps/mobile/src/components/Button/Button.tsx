import { ActivityIndicator, Pressable, type PressableProps } from 'react-native';

import { buttonStyle, labelStyle, styles } from './Button.styles';

import { Text } from '@/components/Text';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

export interface ButtonProps extends Omit<PressableProps, 'children' | 'style'> {
  readonly label: string;
  readonly variant?: ButtonVariant;
  readonly loading?: boolean;
}

export function Button({
  label,
  variant = 'primary',
  loading = false,
  disabled,
  onPress,
  ...rest
}: ButtonProps): React.JSX.Element {
  // Pressable types `disabled` as boolean | null, and null is not "off" to the styles.
  const isDisabled = disabled === true;
  const blocked = isDisabled || loading;

  return (
    <Pressable
      {...rest}
      accessibilityRole="button"
      accessibilityState={{ disabled: blocked, busy: loading }}
      disabled={blocked}
      onPress={blocked ? undefined : onPress}
      style={({ pressed }) => [styles.base, buttonStyle(variant, pressed, isDisabled)]}
    >
      <Text variant="bodyStrong" style={labelStyle(variant, isDisabled, loading)}>
        {label}
      </Text>
      {loading ? (
        <ActivityIndicator
          accessibilityElementsHidden
          importantForAccessibility="no"
          style={styles.spinner}
        />
      ) : null}
    </Pressable>
  );
}
