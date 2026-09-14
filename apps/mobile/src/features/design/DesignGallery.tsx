import { useState } from 'react';
import { View } from 'react-native';

import { styles } from './DesignGallery.styles';

import { Button, type ButtonVariant } from '@/components/Button';
import { Screen } from '@/components/Screen';
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

/**
 * Every token and component on one scrolling screen, rendered by the app's own engine,
 * so what it shows is what ships. Reached at /design in development only.
 */
export function DesignGallery(): React.JSX.Element {
  return (
    <Screen scroll>
      <Stack gap="space0">
        <View style={styles.section}>
          <Text variant="display">Design system</Text>
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
      </Stack>
    </Screen>
  );
}
