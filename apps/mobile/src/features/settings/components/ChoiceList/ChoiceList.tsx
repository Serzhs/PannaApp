import { Pressable, View } from 'react-native';

import { styles } from './ChoiceList.styles';

import { Divider } from '@/components/Divider';
import { Stack } from '@/components/Stack';
import { Text } from '@/components/Text';

/** A mark, not a colour: the chosen row is visible in greyscale and audible by state. */
const CHECK_MARK = '✓';

export interface Choice<T extends string | null> {
  readonly value: T;
  readonly label: string;
}

export interface ChoiceListProps<T extends string | null> {
  readonly title: string;
  readonly choices: readonly Choice<T>[];
  readonly value: T;
  readonly onChange: (value: T) => void;
  readonly disabled?: boolean;
}

/**
 * A radio group. The chosen row carries a mark as well as its state, so the choice is
 * visible without colour and audible without sight.
 */
export function ChoiceList<T extends string | null>({
  title,
  choices,
  value,
  onChange,
  disabled = false,
}: ChoiceListProps<T>): React.JSX.Element {
  return (
    <Stack gap="space2">
      <Text variant="label" color="textSecondary" accessibilityRole="header">
        {title}
      </Text>
      <View style={styles.group} accessibilityRole="radiogroup" accessibilityLabel={title}>
        {choices.map((choice, index) => {
          const checked = choice.value === value;
          return (
            <View key={String(choice.value)}>
              {index === 0 ? null : <Divider />}
              <Pressable
                accessibilityRole="radio"
                accessibilityLabel={choice.label}
                accessibilityState={{ checked, disabled }}
                disabled={disabled}
                onPress={() => {
                  if (!checked) onChange(choice.value);
                }}
                style={({ pressed }) => [styles.row, pressed ? styles.pressed : null]}
              >
                <Text variant="body" style={styles.rowLabel}>
                  {choice.label}
                </Text>
                <Text
                  variant="bodyStrong"
                  color="accent"
                  accessibilityElementsHidden
                  importantForAccessibility="no"
                >
                  {checked ? CHECK_MARK : ''}
                </Text>
              </Pressable>
            </View>
          );
        })}
      </View>
    </Stack>
  );
}
