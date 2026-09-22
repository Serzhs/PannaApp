import { useTranslation } from 'react-i18next';
import { Image, Modal, Pressable, View } from 'react-native';

import { styles } from './PhotoViewer.styles';

import { Text } from '@/components/Text';

export interface PhotoViewerProps {
  readonly uri: string | null;
  readonly label: string;
  readonly onClose: () => void;
}

/** The whole screen for the picture, and a bar as big as Done to get out of it (0012). */
export function PhotoViewer({ uri, label, onClose }: PhotoViewerProps): React.JSX.Element {
  const { t } = useTranslation();
  return (
    <Modal visible={uri !== null} animationType="fade" onRequestClose={onClose}>
      <View style={styles.screen}>
        {uri === null ? null : (
          <Image
            source={{ uri }}
            style={styles.image}
            resizeMode="contain"
            accessibilityIgnoresInvertColors
            accessibilityLabel={label}
          />
        )}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('recipes:cook.closePhoto')}
          onPress={onClose}
          style={({ pressed }) => [styles.close, pressed ? styles.pressed : null]}
        >
          <Text variant="title" color="onAccent">
            {t('recipes:cook.closePhoto')}
          </Text>
        </Pressable>
      </View>
    </Modal>
  );
}
