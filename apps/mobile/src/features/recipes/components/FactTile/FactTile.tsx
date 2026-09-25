import { Ionicons } from '@expo/vector-icons';
import { Pressable, View } from 'react-native';

import { styles } from './FactTile.styles';

import { Text } from '@/components/Text';
import { theme } from '@/styles/theme';

export interface FactTileProps {
  readonly icon: keyof typeof Ionicons.glyphMap;
  readonly text: string;
  readonly detail?: string;
  /** What a screen reader hears; the icon says nothing on its own. */
  readonly accessibilityLabel: string;
  readonly accessibilityHint?: string;
  /** With a press the tile is a link; without one it is a fact. */
  readonly onPress?: () => void;
}

/** One quick fact above the fold (0031): servings, time, times made. */
export function FactTile({
  icon,
  text,
  detail,
  accessibilityLabel,
  accessibilityHint,
  onPress,
}: FactTileProps): React.JSX.Element {
  const body = (
    <>
      <Ionicons
        name={icon}
        size={styles.icon.width}
        color={onPress === undefined ? theme.colors.textSecondary : theme.colors.accent}
      />
      <Text variant="label" color={onPress === undefined ? 'textPrimary' : 'accent'}>
        {text}
      </Text>
      {detail === undefined ? null : (
        <Text variant="caption" color="textSecondary" numberOfLines={2}>
          {detail}
        </Text>
      )}
    </>
  );
  if (onPress === undefined) {
    return (
      <View style={styles.tile} accessible accessibilityLabel={accessibilityLabel}>
        {body}
      </View>
    );
  }
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={accessibilityLabel}
      {...(accessibilityHint === undefined ? {} : { accessibilityHint })}
      onPress={onPress}
      style={({ pressed }) => [styles.tile, pressed ? styles.pressed : null]}
    >
      {body}
    </Pressable>
  );
}
