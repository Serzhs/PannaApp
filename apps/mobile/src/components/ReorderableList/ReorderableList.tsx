import { Pressable, View } from 'react-native';

import { styles } from './ReorderableList.styles';

import { Text } from '@/components/Text';

export interface ReorderableLabels<T> {
  readonly moveUp: (item: T) => string;
  readonly moveDown: (item: T) => string;
}

export interface ReorderableListProps<T> {
  readonly items: readonly T[];
  readonly keyOf: (item: T) => string;
  readonly renderItem: (item: T, index: number) => React.ReactNode;
  readonly onMove: (from: number, to: number) => void;
  readonly labels: ReorderableLabels<T>;
}

/**
 * Rows move with the up and down buttons, which are also what a screen reader user has.
 * 0020 dropped the drag handle: its column cost more width than the gesture was worth.
 * A single line has nothing to move, so it gets the whole width and no column at all.
 * The list only ever reports "from here to there"; who owns the array reorders it.
 */
export function ReorderableList<T>({
  items,
  keyOf,
  renderItem,
  onMove,
  labels,
}: ReorderableListProps<T>): React.JSX.Element {
  const count = items.length;
  return (
    <View>
      {items.map((item, index) => (
        <View key={keyOf(item)} style={styles.row}>
          <View style={styles.content}>{renderItem(item, index)}</View>
          {count === 1 ? null : (
            <View style={styles.controls}>
              {index === 0 ? null : (
                <Arrow
                  label={labels.moveUp(item)}
                  glyph="↑"
                  onPress={() => {
                    onMove(index, index - 1);
                  }}
                />
              )}
              {index === count - 1 ? null : (
                <Arrow
                  label={labels.moveDown(item)}
                  glyph="↓"
                  onPress={() => {
                    onMove(index, index + 1);
                  }}
                />
              )}
            </View>
          )}
        </View>
      ))}
    </View>
  );
}

interface ArrowProps {
  readonly label: string;
  readonly glyph: string;
  readonly onPress: () => void;
}

/** A 44-point square and no wider, so the fields beside the column keep their width. */
function Arrow({ label, glyph, onPress }: ArrowProps): React.JSX.Element {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.arrow, pressed ? styles.arrowPressed : null]}
    >
      <Text variant="heading" color="accent">
        {glyph}
      </Text>
    </Pressable>
  );
}
