import { View } from 'react-native';

import { styles } from './IngredientRow.styles';

import { Text } from '@/components/Text';

export interface IngredientRowProps {
  /** Already in the reader's units; null for an unmeasured line, which leaves the column empty. */
  readonly amount: string | null;
  readonly name: string;
  readonly note: string | null;
  /** A small tag after the name: "optional" on a tool. */
  readonly tag?: string;
  /** One element to a screen reader, carrying amount, name, tag and note. */
  readonly accessibilityLabel: string;
  readonly last?: boolean;
  /** Whether the list has amounts at all; a tools list has none and no column to keep. */
  readonly column?: boolean;
}

/** One line of a list you scan (0031): the amount in its own column, so names line up. */
export function IngredientRow({
  amount,
  name,
  note,
  tag,
  accessibilityLabel,
  last = false,
  column = true,
}: IngredientRowProps): React.JSX.Element {
  return (
    <View
      style={[styles.row, last ? null : styles.divided]}
      accessible
      accessibilityLabel={accessibilityLabel}
    >
      {column ? (
        <View style={styles.amount}>
          {amount === null ? null : (
            <Text variant="bodyStrong" color="accent">
              {amount}
            </Text>
          )}
        </View>
      ) : null}
      <View style={styles.text}>
        <View style={styles.nameRow}>
          <Text variant="body" style={styles.name}>
            {name}
          </Text>
          {tag === undefined ? null : (
            <View style={styles.tag}>
              <Text variant="caption" color="textSecondary">
                {tag}
              </Text>
            </View>
          )}
        </View>
        {note === null ? null : (
          <Text variant="caption" color="textSecondary">
            {note}
          </Text>
        )}
      </View>
    </View>
  );
}
