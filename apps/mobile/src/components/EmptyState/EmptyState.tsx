import { View } from 'react-native';

import { styles } from './EmptyState.styles';

import { Stack } from '@/components/Stack';
import { Text } from '@/components/Text';

export interface EmptyStateProps {
  readonly title: string;
  readonly body?: string;
  readonly icon?: React.ReactNode;
  readonly action?: React.ReactNode;
}

export function EmptyState({ title, body, icon, action }: EmptyStateProps): React.JSX.Element {
  return (
    <View style={styles.container}>
      <Stack gap="space3" align="center">
        {icon === undefined ? null : (
          <View accessibilityElementsHidden importantForAccessibility="no">
            {icon}
          </View>
        )}
        <Text variant="heading" accessibilityRole="header" style={styles.centred}>
          {title}
        </Text>
        {body === undefined ? null : (
          <Text variant="body" color="textSecondary" style={styles.centred}>
            {body}
          </Text>
        )}
        {action === undefined ? null : <View style={styles.action}>{action}</View>}
      </Stack>
    </View>
  );
}
