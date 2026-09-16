import { useCallback } from 'react';
import { View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  type SharedValue,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { styles } from './ReorderableList.styles';

import { Button } from '@/components/Button';
import { useScrollLock } from '@/components/Screen';
import { Stack } from '@/components/Stack';
import { Text } from '@/components/Text';
import { theme } from '@/styles/theme';

export interface ReorderableLabels<T> {
  readonly moveUp: (item: T) => string;
  readonly moveDown: (item: T) => string;
  readonly drag: (item: T) => string;
}

export interface ReorderableListProps<T> {
  readonly items: readonly T[];
  readonly keyOf: (item: T) => string;
  readonly renderItem: (item: T, index: number) => React.ReactNode;
  readonly onMove: (from: number, to: number) => void;
  readonly labels: ReorderableLabels<T>;
}

/** Rows in a list are the same height as each other, so the active row's height is the unit of movement. */
function targetFor(activeIndex: number, dragY: number, rowHeight: number, count: number): number {
  'worklet';
  if (rowHeight <= 0) return activeIndex;
  const moved = Math.round(dragY / rowHeight);
  return Math.max(0, Math.min(count - 1, activeIndex + moved));
}

/**
 * Two ways to move a row that end in the same call: dragging the handle, and the up
 * and down buttons, which are also what a screen reader user has. The list only ever
 * reports "from here to there"; who owns the array reorders it.
 */
export function ReorderableList<T>({
  items,
  keyOf,
  renderItem,
  onMove,
  labels,
}: ReorderableListProps<T>): React.JSX.Element {
  const scrollLock = useScrollLock();
  const reduced = useReducedMotion();
  const activeIndex = useSharedValue(-1);
  const dragY = useSharedValue(0);
  const rowHeight = useSharedValue(0);
  const count = items.length;

  const finish = useCallback(
    (from: number, to: number) => {
      scrollLock.unlock();
      if (from !== to) onMove(from, to);
    },
    [onMove, scrollLock],
  );

  return (
    <View>
      {items.map((item, index) => (
        <Row
          key={keyOf(item)}
          index={index}
          count={count}
          activeIndex={activeIndex}
          dragY={dragY}
          rowHeight={rowHeight}
          reduced={reduced}
          onDragStart={scrollLock.lock}
          onDragEnd={finish}
          moveUpLabel={labels.moveUp(item)}
          moveDownLabel={labels.moveDown(item)}
          dragLabel={labels.drag(item)}
          onMoveUp={() => {
            onMove(index, index - 1);
          }}
          onMoveDown={() => {
            onMove(index, index + 1);
          }}
        >
          {renderItem(item, index)}
        </Row>
      ))}
    </View>
  );
}

interface RowProps {
  readonly index: number;
  readonly count: number;
  readonly activeIndex: SharedValue<number>;
  readonly dragY: SharedValue<number>;
  readonly rowHeight: SharedValue<number>;
  readonly reduced: boolean;
  readonly onDragStart: () => void;
  readonly onDragEnd: (from: number, to: number) => void;
  readonly moveUpLabel: string;
  readonly moveDownLabel: string;
  readonly dragLabel: string;
  readonly onMoveUp: () => void;
  readonly onMoveDown: () => void;
  readonly children: React.ReactNode;
}

const DRAG_HANDLE = '≡';

function Row({
  index,
  count,
  activeIndex,
  dragY,
  rowHeight,
  reduced,
  onDragStart,
  onDragEnd,
  moveUpLabel,
  moveDownLabel,
  dragLabel,
  onMoveUp,
  onMoveDown,
  children,
}: RowProps): React.JSX.Element {
  const pan = Gesture.Pan()
    // A few points of vertical travel before the drag wins, so a tap on the handle
    // still reads as a tap and a sideways swipe stays with whatever owns it.
    .activeOffsetY([-theme.space.space1, theme.space.space1])
    .onStart(() => {
      activeIndex.value = index;
      dragY.value = 0;
      scheduleOnRN(onDragStart);
    })
    .onUpdate((event) => {
      dragY.value = event.translationY;
    })
    .onEnd(() => {
      const to = targetFor(index, dragY.value, rowHeight.value, count);
      scheduleOnRN(onDragEnd, index, to);
    })
    .onFinalize(() => {
      activeIndex.value = -1;
      dragY.value = 0;
    });

  const animated = useAnimatedStyle(() => {
    const active = activeIndex.value;
    if (active === index) {
      return { transform: [{ translateY: dragY.value }], zIndex: 1, opacity: 0.9 };
    }
    let shift = 0;
    if (active >= 0) {
      const target = targetFor(active, dragY.value, rowHeight.value, count);
      if (active < index && index <= target) shift = -rowHeight.value;
      if (target <= index && index < active) shift = rowHeight.value;
    }
    const translateY = reduced
      ? shift
      : withTiming(shift, { duration: theme.duration.durationFast });
    return { transform: [{ translateY }], zIndex: 0, opacity: 1 };
  });

  return (
    <Animated.View
      style={[styles.row, animated]}
      onLayout={(event) => {
        rowHeight.value = event.nativeEvent.layout.height;
      }}
    >
      <View style={styles.content}>{children}</View>
      <Stack gap="space1" align="center" style={styles.controls}>
        {index === 0 ? null : (
          <Button label="↑" variant="ghost" accessibilityLabel={moveUpLabel} onPress={onMoveUp} />
        )}
        <GestureDetector gesture={pan}>
          <View
            style={styles.handle}
            accessible
            accessibilityRole="button"
            accessibilityLabel={dragLabel}
          >
            <Text variant="heading" color="textSecondary">
              {DRAG_HANDLE}
            </Text>
          </View>
        </GestureDetector>
        {index === count - 1 ? null : (
          <Button
            label="↓"
            variant="ghost"
            accessibilityLabel={moveDownLabel}
            onPress={onMoveDown}
          />
        )}
      </Stack>
    </Animated.View>
  );
}
