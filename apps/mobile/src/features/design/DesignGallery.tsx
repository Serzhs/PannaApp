import { useState } from 'react';
import { View } from 'react-native';

import { styles } from './DesignGallery.styles';

import { Button, type ButtonVariant } from '@/components/Button';
import { Card } from '@/components/Card';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Divider } from '@/components/Divider';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { Screen } from '@/components/Screen';
import { Skeleton } from '@/components/Skeleton';
import { Spinner } from '@/components/Spinner';
import { Stack } from '@/components/Stack';
import { Text } from '@/components/Text';
import { TextField } from '@/components/TextField';
import { contrast } from '@/styles/contrast';
import { textStyles, theme } from '@/styles/theme';
import { primitives, type SemanticColor, type SpaceName } from '@/styles/tokens';

const VARIANTS: readonly ButtonVariant[] = ['primary', 'secondary', 'ghost', 'danger'];

/** Foreground roles worth a ratio. A surface against itself is not a reading. */
const FOREGROUNDS: readonly SemanticColor[] = [
  'textPrimary',
  'textSecondary',
  'textDisabled',
  'accent',
  'danger',
  'success',
  'warning',
  'border',
  'borderFocus',
];

function Section({
  title,
  children,
}: {
  readonly title: string;
  readonly children: React.ReactNode;
}): React.JSX.Element {
  return (
    <View style={styles.section}>
      <Stack gap="space4">
        <Text variant="heading" accessibilityRole="header">
          {title}
        </Text>
        {children}
      </Stack>
    </View>
  );
}

function Colours(): React.JSX.Element {
  return (
    <Section title="Colour">
      <Stack gap="space3">
        {Object.entries(theme.colors).map(([name, value]) => {
          const measurable = FOREGROUNDS.includes(name as SemanticColor);
          const ratio = measurable ? contrast(value, theme.colors.surface) : null;
          return (
            <Stack key={name} direction="row" gap="space3" align="center" style={styles.swatchRow}>
              <View style={[styles.swatch, { backgroundColor: value }]} />
              <Stack gap="space0">
                <Text variant="bodyStrong">{name}</Text>
                <Text variant="caption" color="textSecondary">
                  {value}
                </Text>
              </Stack>
              {ratio === null ? null : (
                <Text variant="caption" color="textSecondary" style={styles.ratio}>
                  {ratio.toFixed(2)}:1 on surface
                </Text>
              )}
            </Stack>
          );
        })}
      </Stack>
    </Section>
  );
}

function Spacing(): React.JSX.Element {
  return (
    <Section title="Spacing">
      <Stack gap="space2">
        {Object.entries(primitives.space).map(([name, value]) => (
          <Stack key={name} direction="row" gap="space3" align="center">
            <Text variant="caption" color="textSecondary" style={styles.ratio}>
              {name} · {value}
            </Text>
            <View style={[styles.spacingBar, { width: Math.max(value, 1) }]} />
          </Stack>
        ))}
      </Stack>
    </Section>
  );
}

function Typography(): React.JSX.Element {
  return (
    <Section title="Type">
      <Stack gap="space3">
        {Object.keys(textStyles).map((name) => (
          <Stack key={name} gap="space0">
            <Text variant="caption" color="textSecondary">
              {name}
            </Text>
            <Text variant={name as keyof typeof textStyles}>Slow roast pork</Text>
          </Stack>
        ))}
      </Stack>
    </Section>
  );
}

function Buttons(): React.JSX.Element {
  return (
    <Section title="Button">
      <Stack gap="space4">
        {VARIANTS.map((variant) => (
          <Stack key={variant} gap="space2">
            <Text variant="caption" color="textSecondary">
              {variant}
            </Text>
            <Button label="Save recipe" variant={variant} />
            <Button label="Disabled" variant={variant} disabled />
            <Button label="Loading" variant={variant} loading />
          </Stack>
        ))}
      </Stack>
    </Section>
  );
}

function Fields(): React.JSX.Element {
  const [value, setValue] = useState('');

  return (
    <Section title="TextField">
      <Stack gap="space4">
        <TextField
          label="Recipe title"
          value={value}
          onChangeText={setValue}
          placeholder="Slow roast pork"
        />
        <TextField label="With a helper" value="" helper="Shown at the top of the recipe" />
        <TextField
          label="With an error"
          value="S"
          error="A title needs at least three characters"
        />
        <TextField label="Share code" value="abc123" secureTextEntry />
      </Stack>
    </Section>
  );
}

function Stacks(): React.JSX.Element {
  const gaps: readonly SpaceName[] = ['space1', 'space3', 'space6'];

  return (
    <Section title="Stack">
      <Stack gap="space4">
        {gaps.map((gap) => (
          <Stack key={gap} gap="space2">
            <Text variant="caption" color="textSecondary">
              row, gap {gap}
            </Text>
            <Stack direction="row" gap={gap}>
              <View style={[styles.swatch, { backgroundColor: theme.colors.accentMuted }]} />
              <View style={[styles.swatch, { backgroundColor: theme.colors.accentMuted }]} />
              <View style={[styles.swatch, { backgroundColor: theme.colors.accentMuted }]} />
            </Stack>
          </Stack>
        ))}
      </Stack>
    </Section>
  );
}

function Cards(): React.JSX.Element {
  return (
    <Section title="Card">
      <Stack gap="space3">
        <Card>
          <Text variant="bodyStrong">Plain</Text>
          <Text variant="caption" color="textSecondary">
            A padded surface with a border. Children are read one by one.
          </Text>
        </Card>
        <Card accessibilityLabel="Slow roast pork, 4 servings, draft">
          <Text variant="bodyStrong">As a list row</Text>
          <Text variant="caption" color="textSecondary">
            One stop for a screen reader: title, servings and status in one label.
          </Text>
        </Card>
        <Card accessibilityLabel="Pressable row" onPress={() => undefined}>
          <Text variant="bodyStrong">Pressable</Text>
          <Text variant="caption" color="textSecondary">
            A button to a screen reader, and dims while pressed.
          </Text>
        </Card>
      </Stack>
    </Section>
  );
}

function Dividers(): React.JSX.Element {
  return (
    <Section title="Divider">
      <Stack gap="space3">
        <Text>Above the line</Text>
        <Divider />
        <Text>Below the line</Text>
      </Stack>
    </Section>
  );
}

function Spinners(): React.JSX.Element {
  return (
    <Section title="Spinner">
      <Stack direction="row" gap="space3" align="center">
        <Spinner />
        <Text variant="caption" color="textSecondary">
          For an action in flight. A screen filling in uses Skeleton.
        </Text>
      </Stack>
    </Section>
  );
}

/**
 * The side-by-side entry 0004 asks for: a skeleton beside the content it stands in for.
 * If the two cards differ in height, swapping one for the other will make a screen jump,
 * and that is only reliably caught by looking.
 */
function Skeletons(): React.JSX.Element {
  return (
    <Section title="Skeleton">
      <Stack gap="space4">
        <Stack gap="space2">
          <Text variant="caption" color="textSecondary">
            content, and its skeleton
          </Text>
          <Stack direction="row" gap="space3">
            <Card style={styles.half}>
              <Stack gap="space2">
                <Skeleton.Block height={theme.space.space16} />
                <Text variant="heading">Slow roast pork</Text>
                <Text variant="caption" color="textSecondary">
                  Six hours in a low oven, salt on the skin.
                </Text>
              </Stack>
            </Card>
            <Card style={styles.half}>
              <Stack gap="space2">
                <Skeleton.Block height={theme.space.space16} />
                <Skeleton.Text variant="heading" />
                <Skeleton.Text variant="caption" lines={2} />
              </Stack>
            </Card>
          </Stack>
        </Stack>
        <Stack gap="space2">
          <Text variant="caption" color="textSecondary">
            Skeleton.Text, three lines of body
          </Text>
          <Skeleton.Text lines={3} />
        </Stack>
        <Stack gap="space2">
          <Text variant="caption" color="textSecondary">
            Skeleton.Block, full radius
          </Text>
          <Skeleton.Block
            width={theme.space.space12}
            height={theme.space.space12}
            radius="radiusFull"
          />
        </Stack>
      </Stack>
    </Section>
  );
}

function EmptyStates(): React.JSX.Element {
  return (
    <Section title="EmptyState">
      <Stack gap="space3">
        <Card>
          <EmptyState title="No recipes yet" />
        </Card>
        <Card>
          <EmptyState
            title="No recipes yet"
            body="Write one from scratch, or paste one your AI made from a video."
            action={<Button label="New recipe" />}
          />
        </Card>
      </Stack>
    </Section>
  );
}

function ErrorStates(): React.JSX.Element {
  return (
    <Section title="ErrorState">
      <Stack gap="space3">
        <Card>
          <ErrorState onRetry={() => undefined} />
        </Card>
        <Card>
          <ErrorState message="The recipe could not be loaded." onRetry={() => undefined} />
        </Card>
        <Card>
          <ErrorState variant="offline" onRetry={() => undefined} />
        </Card>
      </Stack>
    </Section>
  );
}

function Dialogs(): React.JSX.Element {
  const [open, setOpen] = useState<'plain' | 'destructive' | null>(null);
  const close = () => {
    setOpen(null);
  };

  return (
    <Section title="ConfirmDialog">
      <Stack gap="space3">
        <Text variant="caption" color="textSecondary">
          The platform's own alert, so there is nothing to draw here. Press to open.
        </Text>
        <Button
          label="Confirm"
          variant="secondary"
          onPress={() => {
            setOpen('plain');
          }}
        />
        <Button
          label="Confirm, destructive"
          variant="danger"
          onPress={() => {
            setOpen('destructive');
          }}
        />
        <ConfirmDialog
          visible={open === 'plain'}
          title="Mark as ready?"
          body="It stays yours; ready only removes the draft chip."
          confirmLabel="Mark ready"
          cancelLabel="Not yet"
          onConfirm={close}
          onCancel={close}
        />
        <ConfirmDialog
          visible={open === 'destructive'}
          title="Delete this recipe?"
          body="This cannot be undone."
          confirmLabel="Delete"
          cancelLabel="Keep"
          destructive
          onConfirm={close}
          onCancel={close}
        />
      </Stack>
    </Section>
  );
}

/**
 * Every token and component on one scrolling screen, rendered by the app's own engine,
 * so what it shows is what ships. Reached at /design in development only.
 */
export function DesignGallery(): React.JSX.Element {
  return (
    <Screen scroll withHeader>
      <Stack gap="space0">
        <View style={styles.section}>
          <Text variant="body" color="textSecondary">
            Tokens and components as the device renders them.
          </Text>
        </View>
        <Colours />
        <Spacing />
        <Typography />
        <Buttons />
        <Fields />
        <Stacks />
        <Cards />
        <Dividers />
        <Spinners />
        <Skeletons />
        <EmptyStates />
        <ErrorStates />
        <Dialogs />
      </Stack>
    </Screen>
  );
}
