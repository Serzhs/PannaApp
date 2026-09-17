import { View } from 'react-native';

import { styles } from './NeedRow.styles';

import { Button } from '@/components/Button';
import { Stack } from '@/components/Stack';
import { Text } from '@/components/Text';

export interface NeedRowProps {
  /** The line as the recipe screen will read it: "500 g beetroot", "grater (optional)". */
  readonly title: string;
  readonly detail?: string;
  readonly editLabel: string;
  readonly editAccessibilityLabel: string;
  readonly removeLabel: string;
  readonly removeAccessibilityLabel: string;
  readonly onEdit: () => void;
  readonly onRemove: () => void;
}

/** A settled line (0023): one row to read, and two buttons to change or drop it. */
export function NeedRow({
  title,
  detail,
  editLabel,
  editAccessibilityLabel,
  removeLabel,
  removeAccessibilityLabel,
  onEdit,
  onRemove,
}: NeedRowProps): React.JSX.Element {
  return (
    <Stack gap="space2">
      <View accessible accessibilityLabel={detail === undefined ? title : `${title}, ${detail}`}>
        <Text variant="body">{title}</Text>
        {detail === undefined ? null : (
          <Text variant="caption" color="textSecondary">
            {detail}
          </Text>
        )}
      </View>
      <View style={styles.actions}>
        <Button
          label={editLabel}
          accessibilityLabel={editAccessibilityLabel}
          variant="ghost"
          onPress={onEdit}
        />
        <Button
          label={removeLabel}
          accessibilityLabel={removeAccessibilityLabel}
          variant="ghost"
          onPress={onRemove}
        />
      </View>
    </Stack>
  );
}
