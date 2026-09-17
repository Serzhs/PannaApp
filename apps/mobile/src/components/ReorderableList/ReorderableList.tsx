import { Pressable, View } from 'react-native';

import { styles } from './ReorderableList.styles';

import { Text } from '@/components/Text';

export interface ReorderableLabels<T> {
  /** What a screen reader hears: which line moves, not just which way. */
  readonly moveUp: (item: T) => string;
  readonly moveDown: (item: T) => string;
  /** What everyone sees beside the arrow. */
  readonly up: string;
  readonly down: string;
}

export interface ReorderableListProps<T> {
  readonly items: readonly T[];
  readonly keyOf: (item: T) => string;
  /** The row's content, given the move control to place wherever its card wants it (0021). */
  readonly renderItem: (item: T, index: number, controls: React.ReactNode) => React.ReactNode;
  readonly onMove: (from: number, to: number) => void;
  readonly labels: ReorderableLabels<T>;
  /** By default the first line cannot go up and the last cannot go down; a list with levels says otherwise. */
  readonly canMoveUp?: (item: T, index: number) => boolean;
  readonly canMoveDown?: (item: T, index: number) => boolean;
}

/**
 * Rows move with the up and down buttons, which are also what a screen reader user has.
 * The list draws no column of its own: it hands each row its control and the owner puts
 * it on the card's first line. A single line has nothing to move and gets no control.
 * The list only ever reports "from here to there"; who owns the array reorders it.
 */
export function ReorderableList<T>({
  items,
  keyOf,
  renderItem,
  onMove,
  labels,
  canMoveUp = (_item, index) => index > 0,
  canMoveDown = (_item, index) => index < items.length - 1,
}: ReorderableListProps<T>): React.JSX.Element {
  const controlsFor = (item: T, index: number): React.ReactNode => {
    const up = canMoveUp(item, index);
    const down = canMoveDown(item, index);
    if (!up && !down) return null;
    return (
      <View style={styles.controls}>
        {!up ? null : (
          <MoveButton
            label={labels.moveUp(item)}
            text={labels.up}
            glyph="↑"
            onPress={() => {
              onMove(index, index - 1);
            }}
          />
        )}
        {!down ? null : (
          <MoveButton
            label={labels.moveDown(item)}
            text={labels.down}
            glyph="↓"
            onPress={() => {
              onMove(index, index + 1);
            }}
          />
        )}
      </View>
    );
  };

  return (
    <View>
      {items.map((item, index) => (
        <View key={keyOf(item)} style={styles.row}>
          {renderItem(item, index, controlsFor(item, index))}
        </View>
      ))}
    </View>
  );
}

interface MoveButtonProps {
  readonly label: string;
  readonly text: string;
  readonly glyph: string;
  readonly onPress: () => void;
}

/** Small text, but a 44-point target: the words are a hint, the button is the whole row height. */
function MoveButton({ label, text, glyph, onPress }: MoveButtonProps): React.JSX.Element {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.button, pressed ? styles.buttonPressed : null]}
    >
      <Text variant="caption" color="accent">
        {`${glyph} ${text}`}
      </Text>
    </Pressable>
  );
}
