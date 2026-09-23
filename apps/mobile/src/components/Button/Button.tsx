import { ActivityIndicator, Pressable, type PressableProps } from 'react-native';

import { buttonStyle, labelStyle, styles } from './Button.styles';

import { Text } from '@/components/Text';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

export interface ButtonProps extends Omit<PressableProps, 'children' | 'style'> {
  readonly label: string;
  readonly variant?: ButtonVariant;
  readonly loading?: boolean;
  /** Only for a button inside a layout that cannot stretch; see FIXED_LAYOUT_MAX_FONT_SCALE. */
  readonly maxFontSizeMultiplier?: number;
}

export function Button({
  label,
  variant = 'primary',
  loading = false,
  disabled,
  onPress,
  maxFontSizeMultiplier,
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
      <Text
        variant="bodyStrong"
        style={labelStyle(variant, isDisabled, loading)}
        {...(maxFontSizeMultiplier === undefined ? {} : { maxFontSizeMultiplier })}
      >
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
