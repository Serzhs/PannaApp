import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { styles } from './AvatarField.styles';

import { pickImage, uploadImage } from '@/api/images';
import { Button } from '@/components/Button';
import { Stack } from '@/components/Stack';
import { Text } from '@/components/Text';
import { Avatar } from '@/features/settings/components/Avatar';
import { useIsOnline } from '@/query/useIsOnline';

export interface AvatarFieldProps {
  readonly name: string;
  readonly value: string | null;
  /** The chosen upload's key, or null for none; the caller saves it. */
  readonly onChange: (key: string | null) => void;
  readonly saving?: boolean;
}

/**
 * Choose a photo, upload it at once, hand back the key (0018). The same shape as a
 * recipe photo (0011): offline refuses before anything is sent, a failure says so.
 */
export function AvatarField({
  name,
  value,
  onChange,
  saving = false,
}: AvatarFieldProps): React.JSX.Element {
  const { t } = useTranslation();
  const online = useIsOnline();
  const [uploading, setUploading] = useState(false);
  const [problem, setProblem] = useState<'offline' | 'failed' | null>(null);

  const choose = async () => {
    if (!online) {
      setProblem('offline');
      return;
    }
    setProblem(null);
    const asset = await pickImage();
    if (asset === null) return;
    setUploading(true);
    try {
      onChange(await uploadImage(asset));
    } catch {
      setProblem('failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Stack gap="space3" align="center">
      <Avatar
        name={name}
        imageKey={value}
        accessibilityLabel={
          value === null ? t('settings:avatar.noPhoto') : t('settings:avatar.photoOf', { name })
        }
      />
      <View style={styles.actions}>
        <Button
          label={value === null ? t('settings:avatar.choose') : t('settings:avatar.change')}
          variant="secondary"
          loading={uploading}
          disabled={saving}
          onPress={() => void choose()}
        />
        {value === null ? null : (
          <Button
            label={t('settings:avatar.remove')}
            variant="ghost"
            disabled={uploading || saving}
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
          {t('settings:avatar.failed')}
        </Text>
      ) : null}
    </Stack>
  );
}
