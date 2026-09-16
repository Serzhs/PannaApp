import { View, type ViewProps } from 'react-native';

import { styles } from './Divider.styles';

/** Decoration only, so it is hidden from the accessibility tree rather than read as a blank stop. */
export function Divider(props: ViewProps): React.JSX.Element {
  return (
    <View
      {...props}
      style={[styles.line, props.style]}
      accessibilityElementsHidden
      importantForAccessibility="no"
    />
  );
}
