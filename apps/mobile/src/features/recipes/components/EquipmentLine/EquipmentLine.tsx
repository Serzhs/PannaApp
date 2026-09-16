import { useTranslation } from 'react-i18next';
import { Switch, View } from 'react-native';

import type { EquipmentDraft, LineField } from '../../needs';

import { styles } from './EquipmentLine.styles';

import { Stack } from '@/components/Stack';
import { Text } from '@/components/Text';
import { TextField } from '@/components/TextField';

export interface EquipmentLineProps {
  readonly line: EquipmentDraft;
  readonly errors?: Partial<Record<LineField, true>>;
  readonly onChange: (line: EquipmentDraft) => void;
}

/** One piece of equipment as the author types it, with the platform's own switch for optional. */
export function EquipmentLine({
  line,
  errors = {},
  onChange,
}: EquipmentLineProps): React.JSX.Element {
  const { t } = useTranslation();
  const set = (patch: Partial<EquipmentDraft>) => {
    onChange({ ...line, ...patch });
  };

  return (
    <Stack gap="space2">
      <TextField
        label={t('recipes:needs.name')}
        value={line.name}
        onChangeText={(name) => {
          set({ name });
        }}
        {...(errors.name ? { error: t('recipes:needs.errors.name') } : {})}
      />
      <TextField
        label={t('recipes:needs.note')}
        value={line.note}
        onChangeText={(note) => {
          set({ note });
        }}
      />
      <View style={styles.switchRow}>
        <Text variant="body">{t('recipes:needs.optionalSwitch')}</Text>
        <Switch
          accessibilityLabel={t('recipes:needs.optionalSwitch')}
          value={line.optional}
          onValueChange={(optional) => {
            set({ optional });
          }}
        />
      </View>
    </Stack>
  );
}
