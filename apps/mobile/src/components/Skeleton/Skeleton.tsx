import { View, type DimensionValue } from 'react-native';
import Animated from 'react-native-reanimated';

import { blockStyle, lineStyle, styles } from './Skeleton.styles';
import { useShimmer } from './useShimmer';

import type { TextStyleName } from '@/styles/theme';
import type { RadiusName } from '@/styles/tokens';

const HIDDEN = { accessibilityElementsHidden: true, importantForAccessibility: 'no' } as const;

function Shimmer(): React.JSX.Element {
  const shimmer = useShimmer();
  return <Animated.View style={[styles.highlight, shimmer]} />;
}

export interface SkeletonTextProps {
  readonly testID?: string;
  readonly variant?: TextStyleName;
  readonly lines?: number;
  /** The last line of a paragraph is rarely full width; a shorter one reads as text. */
  readonly lastLineWidth?: DimensionValue;
}

/**
 * Each line takes the exact line height of the text style it stands in for, so a
 * skeleton paragraph and the real one measure the same and nothing jumps on arrival.
 */
function SkeletonText({
  testID,
  variant = 'body',
  lines = 1,
  lastLineWidth = '60%',
}: SkeletonTextProps): React.JSX.Element {
  return (
    <View {...HIDDEN} testID={testID}>
      {Array.from({ length: lines }, (_, index) => {
        const last = index === lines - 1 && lines > 1;
        return (
          <View key={index} style={lineStyle(variant, last ? lastLineWidth : '100%')}>
            <View style={[styles.bar, styles.textBar]}>
              <Shimmer />
            </View>
          </View>
        );
      })}
    </View>
  );
}

export interface SkeletonBlockProps {
  readonly testID?: string;
  readonly width?: DimensionValue;
  readonly height: DimensionValue;
  readonly radius?: RadiusName;
}

function SkeletonBlock({
  testID,
  width = '100%',
  height,
  radius = 'radiusMd',
}: SkeletonBlockProps): React.JSX.Element {
  return (
    <View {...HIDDEN} testID={testID} style={[styles.bar, blockStyle(width, height, radius)]}>
      <Shimmer />
    </View>
  );
}

export const Skeleton = {
  Text: SkeletonText,
  Block: SkeletonBlock,
};
