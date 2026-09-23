import { Image, View } from 'react-native';

import { styles } from './Avatar.styles';

import { imageUrl } from '@/api/images';
import { Text } from '@/components/Text';
import { FIXED_LAYOUT_MAX_FONT_SCALE } from '@/styles/theme';

export interface AvatarProps {
  readonly name: string;
  readonly imageKey: string | null;
  /** What a screen reader says for it; the picture alone says nothing. */
  readonly accessibilityLabel: string;
}

/** A circle with the photo, or the first letter of the name, so the space is never blank (0018). */
export function Avatar({ name, imageKey, accessibilityLabel }: AvatarProps): React.JSX.Element {
  if (imageKey !== null) {
    return (
      <Image
        source={{ uri: imageUrl(imageKey) }}
        style={styles.circle}
        accessibilityIgnoresInvertColors
        accessibilityLabel={accessibilityLabel}
      />
    );
  }
  // One code point, not one UTF-16 unit, so a rare first letter is not cut in half. Hermes
  // has no Intl.Segmenter, which would have handled combining marks too.
  const point = name.trim().codePointAt(0);
  const initial = point === undefined ? '?' : String.fromCodePoint(point).toLocaleUpperCase();
  return (
    <View
      style={[styles.circle, styles.empty]}
      accessible
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}
    >
      {/* The circle is a fixed size, so the letter inside it cannot grow past its rim. */}
      <Text variant="display" color="accent" maxFontSizeMultiplier={FIXED_LAYOUT_MAX_FONT_SCALE}>
        {initial}
      </Text>
    </View>
  );
}
