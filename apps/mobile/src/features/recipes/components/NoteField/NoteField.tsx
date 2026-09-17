import { useState } from 'react';
import { View } from 'react-native';

import { styles } from './NoteField.styles';

import { Button } from '@/components/Button';
import { TextField } from '@/components/TextField';

export interface NoteFieldProps {
  readonly label: string;
  readonly addLabel: string;
  readonly value: string;
  readonly onChangeText: (text: string) => void;
  readonly helper?: string;
}

/**
 * A note is the exception, not the rule, so the field waits behind a button until it is
 * wanted (0020). A saved note opens the field at once: nothing written is ever hidden.
 */
export function NoteField({
  label,
  addLabel,
  value,
  onChangeText,
  helper,
}: NoteFieldProps): React.JSX.Element {
  const [opened, setOpened] = useState(false);
  if (value === '' && !opened) {
    return (
      <View style={styles.button}>
        <Button
          label={addLabel}
          variant="ghost"
          onPress={() => {
            setOpened(true);
          }}
        />
      </View>
    );
  }
  return (
    <TextField
      label={label}
      value={value}
      onChangeText={onChangeText}
      autoFocus={opened}
      {...(helper === undefined ? {} : { helper })}
    />
  );
}
