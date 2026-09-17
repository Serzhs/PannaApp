import { Pressable, View } from 'react-native';

import { styles } from './Tabs.styles';

import { Text } from '@/components/Text';

export interface Tab<K extends string> {
  readonly key: K;
  readonly label: string;
}

export interface TabsProps<K extends string> {
  readonly tabs: readonly Tab<K>[];
  readonly value: K;
  readonly onChange: (key: K) => void;
}

/**
 * Tabs inside a screen, not the app's own tab bar: one part of a thing at a time. The
 * open tab is underlined and marked selected, so the state is never colour alone.
 */
export function Tabs<K extends string>({ tabs, value, onChange }: TabsProps<K>): React.JSX.Element {
  return (
    <View style={styles.row} accessibilityRole="tablist">
      {tabs.map((tab) => {
        const selected = tab.key === value;
        return (
          <Pressable
            key={tab.key}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => {
              onChange(tab.key);
            }}
            style={({ pressed }) => [
              styles.tab,
              selected ? styles.tabSelected : null,
              pressed ? styles.tabPressed : null,
            ]}
          >
            <Text variant="bodyStrong" color={selected ? 'accent' : 'textSecondary'}>
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
