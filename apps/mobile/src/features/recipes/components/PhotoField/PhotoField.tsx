import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Image, View } from 'react-native';

import { styles } from './PhotoField.styles';

import { imageUrl, uploadImage } from '@/api/images';
import { Button } from '@/components/Button';
import { Stack } from '@/components/Stack';
import { Text } from '@/components/Text';
import { useIsOnline } from '@/query/useIsOnline';

export interface PhotoFieldProps {
  readonly label: string;
  /** The key the recipe will carry, or null for none. */
  readonly value: string | null;
  readonly onChange: (key: string | null) => void;
}

/**
 * Choose a photo from the library, upload it at once, keep the key (0011). The upload
 * happens here rather than on save so the preview is the real, resized file, and so a
 * step can be pictured before the recipe is saved.
 */
export function PhotoField({ label, value, onChange }: PhotoFieldProps): React.JSX.Element {
  const { t } = useTranslation();
  const online = useIsOnline();
  const [uploading, setUploading] = useState(false);
  const [problem, setProblem] = useState<'offline' | 'failed' | null>(null);
  // What actually went wrong, for the developer only: the user sees the translated line.
  const [detail, setDetail] = useState<string | null>(null);
  // "Choose cover photo", not "Choose Cover photo": the label is a heading, the button a sentence.
  const name = label.toLocaleLowerCase();

  const choose = async () => {
    // A write attempted offline fails at once and changes nothing, per CLAUDE.md.
    if (!online) {
      setProblem('offline');
      return;
    }
    setProblem(null);
    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.9,
      // iPhones shoot HEIC, which the resizer cannot read; "compatible" hands over a JPEG.
      preferredAssetRepresentationMode:
        ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
    });
    const asset = picked.assets?.[0];
    if (picked.canceled || asset === undefined) return;
    setUploading(true);
    try {
      onChange(await uploadImage(asset));
    } catch (error: unknown) {
      setProblem('failed');
      setDetail(error instanceof Error ? `${error.name}: ${error.message}` : String(error));
    } finally {
      setUploading(false);
    }
  };

  return (
    <Stack gap="space2">
      <Text variant="label" color="textSecondary">
        {label}
      </Text>
      {value === null ? null : (
        <Image
          source={{ uri: imageUrl(value) }}
          style={styles.preview}
          accessibilityIgnoresInvertColors
          accessibilityLabel={label}
        />
      )}
      <View style={styles.actions}>
        <Button
          label={value === null ? t('recipes:photo.choose') : t('recipes:photo.change')}
          accessibilityLabel={
            value === null
              ? t('recipes:photo.chooseFor', { label: name })
              : t('recipes:photo.changeFor', { label: name })
          }
          variant="secondary"
          loading={uploading}
          onPress={() => void choose()}
        />
        {value === null ? null : (
          <Button
            label={t('recipes:photo.remove')}
            accessibilityLabel={t('recipes:photo.removeFor', { label: name })}
            variant="ghost"
            disabled={uploading}
            onPress={() => {
              setProblem(null);
              onChange(null);
            }}
          />
        )}
      </View>
      {problem === 'offline' && !online ? (
        <Text variant="caption" color="danger" accessibilityLiveRegion="polite">
          {t('common:offline.upload')}
        </Text>
      ) : problem === 'failed' ? (
        <Text variant="caption" color="danger" accessibilityLiveRegion="polite">
          {t('recipes:photo.failed')}
          {__DEV__ && detail !== null ? ` (${detail})` : ''}
        </Text>
      ) : null}
    </Stack>
  );
}
