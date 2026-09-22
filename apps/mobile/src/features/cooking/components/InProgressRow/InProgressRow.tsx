import { useTranslation } from 'react-i18next';
import { Image, View } from 'react-native';

import type { CookRecord } from '../../store';
import { liveSteps, stepIndex } from '../../store';

import { styles } from './InProgressRow.styles';

import { imageUrl } from '@/api/images';
import { Card } from '@/components/Card';
import { Stack } from '@/components/Stack';
import { Text } from '@/components/Text';

export interface InProgressRowProps {
  readonly record: CookRecord;
  readonly onPress: (record: CookRecord) => void;
}

/** A cook in progress on the home screen: the recipe, and how far it has got (0012). */
export function InProgressRow({ record, onPress }: InProgressRowProps): React.JSX.Element {
  const { t } = useTranslation();
  const progress =
    record.phase === 'check'
      ? t('recipes:cook.checking')
      : t('recipes:cook.stepOf', {
          number: stepIndex(record) + 1,
          total: liveSteps(record).length,
        });
  return (
    <Card
      accessibilityLabel={`${record.recipe.title}, ${progress}`}
      onPress={() => {
        onPress(record);
      }}
    >
      <Stack direction="row" gap="space3" align="center">
        {record.recipe.coverImageKey === null ? null : (
          <Image
            source={{ uri: imageUrl(record.recipe.coverImageKey) }}
            style={styles.cover}
            accessibilityIgnoresInvertColors
            accessibilityElementsHidden
            importantForAccessibility="no"
          />
        )}
        <View style={styles.text}>
          <Text variant="bodyStrong" numberOfLines={1}>
            {record.recipe.title}
          </Text>
          <Text variant="caption" color="accent">
            {progress}
          </Text>
        </View>
      </Stack>
    </Card>
  );
}
