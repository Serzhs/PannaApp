import { Ionicons } from '@expo/vector-icons';
import { Image, View } from 'react-native';

import { styles } from './StepCard.styles';

import { Card } from '@/components/Card';
import { Text } from '@/components/Text';
import { theme } from '@/styles/theme';

export interface StepCardProps {
  /** What the circle shows: "1", or "2a" for a nested step. */
  readonly number: string;
  readonly body: string;
  readonly when?: string | null;
  readonly uses?: string | null;
  readonly needs?: string | null;
  readonly note?: string | null;
  readonly photoUri?: string | null;
  readonly photoAlt?: string;
  /** One element to a screen reader: number, body, timing, links and note. */
  readonly accessibilityLabel: string;
  /** Inside a parent's card, with a paler circle and no card of its own. */
  readonly nested?: boolean;
  /** The "Meanwhile" block, rendered by the caller. */
  readonly children?: React.ReactNode;
}

function Meta({
  icon,
  text,
}: {
  readonly icon: keyof typeof Ionicons.glyphMap;
  readonly text: string;
}): React.JSX.Element {
  return (
    <View style={styles.meta}>
      <Ionicons name={icon} size={styles.metaIcon.width} color={theme.colors.textSecondary} />
      <Text variant="caption" color="textSecondary" style={styles.metaText}>
        {text}
      </Text>
    </View>
  );
}

/** One step as the reader sees it (0031): a numbered circle, the instruction, then the small facts. */
export function StepCard({
  number,
  body,
  when = null,
  uses = null,
  needs = null,
  note = null,
  photoUri = null,
  photoAlt,
  accessibilityLabel,
  nested = false,
  children,
}: StepCardProps): React.JSX.Element {
  const content = (
    <>
      <View style={styles.head} accessible accessibilityLabel={accessibilityLabel}>
        <View style={[styles.circle, nested ? styles.circleNested : null]}>
          <Text variant="label" color={nested ? 'accent' : 'onAccent'}>
            {number}
          </Text>
        </View>
        <View style={styles.text}>
          <Text variant={nested ? 'body' : 'bodyStrong'}>{body}</Text>
          {when === null ? null : <Meta icon="time-outline" text={when} />}
          {uses === null ? null : <Meta icon="basket-outline" text={uses} />}
          {needs === null ? null : <Meta icon="restaurant-outline" text={needs} />}
          {note === null ? null : (
            <View style={styles.note}>
              <Text variant="caption">{note}</Text>
            </View>
          )}
          {photoUri === null ? null : (
            <Image
              source={{ uri: photoUri }}
              style={styles.photo}
              accessibilityIgnoresInvertColors
              {...(photoAlt === undefined ? {} : { accessibilityLabel: photoAlt })}
            />
          )}
        </View>
      </View>
      {children}
    </>
  );
  if (nested) return <View style={styles.nested}>{content}</View>;
  return <Card style={styles.card}>{content}</Card>;
}
