import { useState } from 'react';
import { TextInput, type TextInputProps } from 'react-native';

import { inputStyle, styles } from './TextField.styles';

import { Stack } from '@/components/Stack';
import { Text } from '@/components/Text';

export interface TextFieldProps extends Omit<TextInputProps, 'style'> {
  readonly label: string;
  readonly error?: string;
  readonly helper?: string;
}

/**
 * The label and the message are hidden from the accessibility tree and folded into the
 * input's own label instead, so a screen reader reads the field as one stop carrying
 * its name, its value and its error rather than three separate ones.
 */
export function TextField({
  label,
  error,
  helper,
  onFocus,
  onBlur,
  ...rest
}: TextFieldProps): React.JSX.Element {
  const [focused, setFocused] = useState(false);
  const invalid = error !== undefined && error.length > 0;
  const message = invalid ? error : helper;

  return (
    <Stack gap="space1">
      <Text
        variant="label"
        color="textSecondary"
        accessibilityElementsHidden
        importantForAccessibility="no"
      >
        {label}
      </Text>
      <TextInput
        {...rest}
        accessibilityLabel={invalid ? `${label}, ${error}` : label}
        {...(helper !== undefined && !invalid ? { accessibilityHint: helper } : {})}
        style={[styles.input, inputStyle(invalid, focused)]}
        onFocus={(event) => {
          setFocused(true);
          onFocus?.(event);
        }}
        onBlur={(event) => {
          setFocused(false);
          onBlur?.(event);
        }}
      />
      {message !== undefined && message.length > 0 ? (
        <Text
          variant="caption"
          color={invalid ? 'danger' : 'textSecondary'}
          accessibilityElementsHidden
          importantForAccessibility="no"
        >
          {message}
        </Text>
      ) : null}
    </Stack>
  );
}
