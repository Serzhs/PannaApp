import { View } from 'react-native';

import { styles } from './LinkChips.styles';

import { Chip } from '@/components/Chip';
import { Stack } from '@/components/Stack';
import { Text } from '@/components/Text';

export interface Linkable {
  /** Absent until the line has been saved, and a chip cannot point at what has no id (0010). */
  readonly id?: string;
  readonly name: string;
}

export interface LinkChipsProps {
  readonly title: string;
  readonly options: readonly Linkable[];
  readonly selected: readonly string[];
  readonly onChange: (next: string[]) => void;
  readonly unsavedHint: string;
}

/** A wrapping row of toggle chips: the ones this step uses are filled. Nothing to pick renders nothing. */
export function LinkChips({
  title,
  options,
  selected,
  onChange,
  unsavedHint,
}: LinkChipsProps): React.JSX.Element | null {
  if (options.length === 0) return null;
  const toggle = (id: string) => {
    onChange(selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id]);
  };
  const unsaved = options.some((option) => option.id === undefined);

  return (
    <Stack gap="space1">
      <Text variant="label" color="textSecondary">
        {title}
      </Text>
      <View style={styles.row}>
        {options.map((option, index) => {
          const id = option.id;
          return id === undefined ? (
            <Chip
              key={`unsaved-${String(index)}`}
              label={option.name}
              selected={false}
              disabled
              accessibilityHint={unsavedHint}
              onPress={() => undefined}
            />
          ) : (
            <Chip
              key={id}
              label={option.name}
              selected={selected.includes(id)}
              onPress={() => {
                toggle(id);
              }}
            />
          );
        })}
      </View>
      {unsaved ? (
        <Text variant="caption" color="textSecondary">
          {unsavedHint}
        </Text>
      ) : null}
    </Stack>
  );
}
