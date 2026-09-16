import { useEffect } from 'react';
import { AccessibilityInfo, ActivityIndicator } from 'react-native';

import { styles } from './Spinner.styles';

export interface SpinnerProps {
  readonly label?: string;
}

/**
 * For an action in flight, not for a screen filling in - that is Skeleton's job. It
 * announces itself on appearance because a spinner is a change the user did not cause
 * and would otherwise have to look at to notice.
 */
export function Spinner({ label = 'Loading' }: SpinnerProps): React.JSX.Element {
  useEffect(() => {
    AccessibilityInfo.announceForAccessibility(label);
  }, [label]);

  return (
    <ActivityIndicator
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityState={{ busy: true }}
      color={styles.spinner.color}
      size="small"
    />
  );
}
