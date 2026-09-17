import { useTranslation } from 'react-i18next';
import { Modal, Pressable } from 'react-native';

import { styles } from './StepPicker.styles';

import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { Stack } from '@/components/Stack';
import { Text } from '@/components/Text';

const CHECKED = '☑';
const UNCHECKED = '☐';

export interface StepPickerOption {
  readonly key: string;
  readonly title: string;
  readonly checked: boolean;
}

export interface StepPickerProps {
  readonly visible: boolean;
  readonly title: string;
  readonly options: readonly StepPickerOption[];
  readonly onToggle: (key: string, checked: boolean) => void;
  readonly onClose: () => void;
}

/** A checklist in a sheet, like the unit picker. Each tick applies at once; Done only closes it. */
export function StepPicker({
  visible,
  title,
  options,
  onToggle,
  onClose,
}: StepPickerProps): React.JSX.Element {
  const { t } = useTranslation();
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <Screen scroll>
        <Stack gap="space5" style={styles.sheet}>
          <Stack gap="space1">
            <Text variant="heading" accessibilityRole="header">
              {title}
            </Text>
            <Text variant="caption" color="textSecondary">
              {t('recipes:flow.pickerHelp')}
            </Text>
          </Stack>
          {options.length === 0 ? (
            <Text variant="body" color="textSecondary">
              {t('recipes:flow.pickerEmpty')}
            </Text>
          ) : (
            <Stack gap="space1">
              {options.map((option) => (
                <Pressable
                  key={option.key}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: option.checked }}
                  accessibilityLabel={option.title}
                  onPress={() => {
                    onToggle(option.key, !option.checked);
                  }}
                  style={({ pressed }) => [styles.row, pressed ? styles.rowPressed : null]}
                >
                  <Text variant="heading" color={option.checked ? 'accent' : 'textSecondary'}>
                    {option.checked ? CHECKED : UNCHECKED}
                  </Text>
                  <Text variant="body" style={styles.rowTitle}>
                    {option.title}
                  </Text>
                </Pressable>
              ))}
            </Stack>
          )}
          <Button label={t('recipes:flow.close')} onPress={onClose} />
        </Stack>
      </Screen>
    </Modal>
  );
}
