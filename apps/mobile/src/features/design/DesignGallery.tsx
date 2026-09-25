import { useState } from 'react';
import { View } from 'react-native';

import { styles } from './DesignGallery.styles';

import { showActionMenu } from '@/components/ActionMenu';
import { Button, type ButtonVariant } from '@/components/Button';
import { Card } from '@/components/Card';
import { Chip } from '@/components/Chip';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Divider } from '@/components/Divider';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { HeaderIcon } from '@/components/HeaderIcon';
import { ReorderableList } from '@/components/ReorderableList';
import { Screen } from '@/components/Screen';
import { Skeleton } from '@/components/Skeleton';
import { Spinner } from '@/components/Spinner';
import { Stack } from '@/components/Stack';
import { Tabs } from '@/components/Tabs';
import { Text } from '@/components/Text';
import { TextField } from '@/components/TextField';
import { CheckView } from '@/features/cooking/components/CheckView';
import { InProgressRow } from '@/features/cooking/components/InProgressRow';
import { KnuckleHint } from '@/features/cooking/components/KnuckleHint';
import { TimerBlock } from '@/features/cooking/components/TimerBlock';
import { CookBar } from '@/features/recipes/components/CookBar';
import { CookCard } from '@/features/recipes/components/CookCard';
import { DurationField } from '@/features/recipes/components/DurationField';
import { EquipmentLine } from '@/features/recipes/components/EquipmentLine';
import { FlowChart } from '@/features/recipes/components/FlowChart';
import { FlowEditor } from '@/features/recipes/components/FlowEditor';
import { IngredientLine } from '@/features/recipes/components/IngredientLine';
import { LinkChips } from '@/features/recipes/components/LinkChips';
import { NeedRow } from '@/features/recipes/components/NeedRow';
import { NeedsSection } from '@/features/recipes/components/NeedsSection';
import { NoteComposer } from '@/features/recipes/components/NoteComposer';
import { NoteList } from '@/features/recipes/components/NoteList';
import { PhotoField } from '@/features/recipes/components/PhotoField';
import { ServingsPicker } from '@/features/recipes/components/ServingsPicker';
import { StepLine } from '@/features/recipes/components/StepLine';
import { StepsEditor } from '@/features/recipes/components/StepsEditor';
import { StepsSection } from '@/features/recipes/components/StepsSection';
import { UnitPicker } from '@/features/recipes/components/UnitPicker';
import { move, type EquipmentDraft, type IngredientDraft } from '@/features/recipes/needs';
import type { StepDraft } from '@/features/recipes/steps';
import { Avatar } from '@/features/settings/components/Avatar';
import { AvatarField } from '@/features/settings/components/AvatarField';
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
        <TextField label="Tall, for a pasted document" value="" multiline tall />
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

/** The same two lines the needs section shows, so the step links below can point at them. */
const GALLERY_INGREDIENTS = [
  { id: 'n1', position: 0, name: 'kefir', amount: 250, unit: 'ml', note: 'cold' },
  { id: 'n2', position: 1, name: 'eggs', amount: 2, unit: null, note: null },
] as const;
const LINKABLE = [
  { id: 'n1', name: 'kefir' },
  { id: 'n2', name: 'eggs' },
  { name: 'dill, unsaved' },
];

function TabsAndServings(): React.JSX.Element {
  const [tab, setTab] = useState<'recipe' | 'steps' | 'flow'>('recipe');
  const [servings, setServings] = useState('4');
  const [other, setOther] = useState('3');
  return (
    <>
      <Section title="Tabs">
        <Tabs
          tabs={[
            { key: 'recipe', label: 'Recipe' },
            { key: 'steps', label: 'Steps' },
            { key: 'flow', label: 'Flow' },
          ]}
          value={tab}
          onChange={setTab}
        />
      </Section>
      <Section title="ServingsPicker">
        <Stack gap="space4">
          <ServingsPicker value={servings} onChangeText={setServings} />
          <ServingsPicker value={other} onChangeText={setOther} />
          <ServingsPicker
            value=""
            onChangeText={() => undefined}
            error="Servings is a whole number from 1 to 100."
          />
        </Stack>
      </Section>
    </>
  );
}

function Cooking(): React.JSX.Element {
  const noop = () => undefined;
  const base = {
    note: null,
    durationSeconds: null,
    ingredientIds: [],
    equipmentIds: [],
    imageKey: null,
  };
  return (
    <>
      <Section title="TimerBlock">
        <Stack gap="space4">
          <TimerBlock
            state={{ kind: 'idle', seconds: 1200 }}
            onStart={noop}
            onStop={noop}
            onEnded={noop}
          />
          <TimerBlock
            state={{ kind: 'running', endsAt: Date.now() + 5 * 60 * 1000, silent: false }}
            onStart={noop}
            onStop={noop}
            onEnded={noop}
          />
          <TimerBlock
            state={{ kind: 'running', endsAt: Date.now() + 9 * 60 * 1000, silent: true }}
            onStart={noop}
            onStop={noop}
            onEnded={noop}
          />
          <TimerBlock
            state={{ kind: 'elsewhere', stepNumber: 2, endsAt: Date.now() + 4 * 60 * 1000 }}
            onStart={noop}
            onStop={noop}
            onEnded={noop}
          />
          <TimerBlock state={{ kind: 'done' }} onStart={noop} onStop={noop} onEnded={noop} />
        </Stack>
      </Section>
      <Section title="KnuckleHint">
        <KnuckleHint onDismiss={noop} />
      </Section>
      <Section title="CheckView">
        <CheckView
          record={{
            recipe: {
              id: 'g2',
              title: 'Cold beetroot soup',
              description: null,
              status: 'ready',
              coverImageKey: null,
              servings: 4,
              totalTimeMinutes: 22,
              createdAt: '2026-09-16T12:00:00.000Z',
              updatedAt: '2026-09-16T12:00:00.000Z',
              cookCount: 0,
              lastCookedAt: null,
              notes: [],
              shareToken: null,
              sourceRecipeId: null,
              ingredients: [
                { id: 'beet', position: 0, name: 'beetroot', note: null, amount: 500, unit: 'g' },
                { id: 'dill', position: 1, name: 'dill', note: null, amount: null, unit: null },
              ],
              equipment: [{ id: 'e1', position: 0, name: 'blender', note: null, optional: false }],
              steps: [
                {
                  id: 'a',
                  position: 0,
                  body: 'Boil',
                  ...base,
                  durationSeconds: 1200,
                  ingredientIds: ['beet'],
                  children: [],
                },
                {
                  id: 'b',
                  position: 1,
                  body: 'Garnish',
                  ...base,
                  durationSeconds: 120,
                  ingredientIds: ['dill'],
                  children: [],
                },
              ],
            },
            startedAt: '2026-09-22T10:00:00.000Z',
            phase: 'check',
            excluded: ['dill'],
            currentStepId: 'a',
            done: [],
            timer: null,
          }}
          onToggle={noop}
          onStart={noop}
        />
      </Section>
      <Section title="InProgressRow">
        <InProgressRow
          record={{
            recipe: {
              id: 'g',
              title: 'Cold beetroot soup',
              description: null,
              status: 'ready',
              coverImageKey: null,
              servings: 4,
              totalTimeMinutes: 45,
              createdAt: '2026-09-16T12:00:00.000Z',
              updatedAt: '2026-09-16T12:00:00.000Z',
              cookCount: 0,
              lastCookedAt: null,
              notes: [],
              shareToken: null,
              sourceRecipeId: null,
              ingredients: [],
              equipment: [],
              steps: [
                { id: 'a', position: 0, body: 'Boil', ...base, children: [] },
                { id: 'b', position: 1, body: 'Roast', ...base, children: [] },
                { id: 'c', position: 2, body: 'Blend', ...base, children: [] },
              ],
            },
            startedAt: '2026-09-22T10:00:00.000Z',
            phase: 'cooking',
            excluded: [],
            currentStepId: 'b',
            done: ['a'],
            timer: null,
          }}
          onPress={noop}
        />
      </Section>
    </>
  );
}

function Chips(): React.JSX.Element {
  const [on, setOn] = useState(true);
  const [picked, setPicked] = useState<string[]>(['n1']);
  return (
    <>
      <Section title="Chip">
        <Text variant="caption" color="textSecondary">
          A checkbox drawn as a chip: filled with a mark when on, outlined when off, grey when it
          cannot be pressed.
        </Text>
        <View style={styles.row}>
          <Chip
            label="Toggles"
            selected={on}
            onPress={() => {
              setOn(!on);
            }}
          />
          <Chip label="On" selected onPress={() => undefined} />
          <Chip label="Off" selected={false} onPress={() => undefined} />
          <Chip label="Disabled" selected={false} disabled onPress={() => undefined} />
        </View>
      </Section>
      <Section title="LinkChips">
        <LinkChips
          title="Uses"
          options={LINKABLE}
          selected={picked}
          onChange={setPicked}
          unsavedHint="Save the recipe once to link new lines."
        />
      </Section>
    </>
  );
}

function Reorderables(): React.JSX.Element {
  const [items, setItems] = useState(['Beetroot', 'Kefir', 'Dill', 'Sour cream']);
  return (
    <Section title="ReorderableList">
      <Text variant="caption" color="textSecondary">
        The buttons sit inside the card. The first has no up, the last no down.
      </Text>
      <ReorderableList
        items={items}
        keyOf={(item) => item}
        renderItem={(item, _index, controls) => (
          <Card>
            <Stack gap="space2">
              {controls}
              <Text>{item}</Text>
            </Stack>
          </Card>
        )}
        onMove={(from, to) => {
          setItems(move(items, from, to));
        }}
        labels={{
          moveUp: (item) => `Move ${item} up`,
          moveDown: (item) => `Move ${item} down`,
          up: 'Move up',
          down: 'Move down',
        }}
      />
    </Section>
  );
}

function NeedsLines(): React.JSX.Element {
  const noop = () => undefined;
  const [ingredient, setIngredient] = useState<IngredientDraft>({
    key: 'g1',
    name: 'Beetroot',
    amount: '500',
    unit: 'g',
    note: '',
  });
  const [equipment, setEquipment] = useState<EquipmentDraft>({
    key: 'g2',
    name: 'Grater',
    note: '',
    optional: true,
  });
  const [unit, setUnit] = useState<IngredientDraft['unit']>('cup');
  const [photo, setPhoto] = useState<string | null>(null);
  return (
    <>
      <Section title="IngredientLine">
        <Stack gap="space4">
          <IngredientLine line={ingredient} onChange={setIngredient} />
          <Text variant="caption" color="textSecondary">
            with every error
          </Text>
          <IngredientLine
            line={{ key: 'g3', name: '', amount: '1/2', unit: 'cup', note: '' }}
            errors={{ name: true, amount: true, unit: true }}
            onChange={() => undefined}
          />
        </Stack>
      </Section>
      <Section title="EquipmentLine">
        <Stack gap="space4">
          <EquipmentLine line={equipment} onChange={setEquipment} />
          <EquipmentLine
            line={{ key: 'g4', name: '', note: '', optional: false }}
            errors={{ name: true }}
            onChange={() => undefined}
          />
        </Stack>
      </Section>
      <Section title="PhotoField">
        <Stack gap="space4">
          <PhotoField label="Cover photo" value={photo} onChange={setPhoto} />
          <PhotoField
            label="Photo of the result"
            value={'a'.repeat(32)}
            onChange={() => undefined}
          />
        </Stack>
      </Section>
      <Section title="Avatar">
        <Stack gap="space4" align="center">
          <Avatar name="Jānis" imageKey={null} accessibilityLabel="No photo yet" />
          <Avatar name="Anna" imageKey={'a'.repeat(32)} accessibilityLabel="Photo of Anna" />
          <AvatarField name="Jānis" value={null} onChange={() => undefined} />
        </Stack>
      </Section>
      <Section title="ActionMenu">
        <Button
          label="Open the menu"
          variant="secondary"
          onPress={() => {
            showActionMenu({
              title: 'Cold beetroot soup',
              actions: [
                { label: 'Edit', onPress: noop },
                { label: 'Delete', destructive: true, onPress: noop },
              ],
              cancelLabel: 'Cancel',
            });
          }}
        />
      </Section>
      <Section title="HeaderIcon">
        <Stack direction="row" gap="space2">
          <HeaderIcon name="share-outline" label="Share" onPress={noop} />
          <HeaderIcon name="share" label="Shared by link" onPress={noop} />
          <HeaderIcon name="ellipsis-horizontal" label="More" onPress={noop} />
          <HeaderIcon name="ellipsis-horizontal" label="More, disabled" onPress={noop} disabled />
        </Stack>
      </Section>
      <Section title="CookBar">
        <Stack gap="space2">
          <CookBar continuing={false} onPress={noop} />
          <CookBar continuing onPress={noop} />
        </Stack>
      </Section>
      <Section title="CookCard">
        <Stack gap="space3">
          <CookCard
            startedAt="2026-09-14T15:30:00.000Z"
            finishedAt="2026-09-14T16:40:00.000Z"
            excluded={['spring onions']}
            notes={[
              {
                id: 'g-n1',
                stepId: null,
                cookId: 'g-c1',
                body: 'Less salt next time.',
                createdAt: '2026-09-14T17:00:00.000Z',
              },
            ]}
          >
            <Button label="Add a note" variant="ghost" onPress={noop} />
          </CookCard>
          <CookCard
            startedAt="2026-09-20T10:00:00.000Z"
            finishedAt="2026-09-20T10:30:00.000Z"
            excluded={[]}
            notes={[]}
            pending
          />
        </Stack>
      </Section>
      <Section title="NoteList">
        <NoteList
          notes={[
            {
              id: 'g1',
              stepId: 's1',
              cookId: null,
              body: 'Small ones take 35 min',
              createdAt: '2026-09-14T16:00:00.000Z',
            },
            {
              id: 'g2',
              stepId: null,
              cookId: 'c1',
              body: 'Half a lemon at the end.',
              createdAt: '2026-08-30T17:00:00.000Z',
            },
          ]}
          stepLabel={() => 'On step 1'}
        />
      </Section>
      <Section title="NoteComposer">
        <NoteComposer onSave={() => Promise.resolve()} saving={false} />
      </Section>
      <Section title="NeedRow">
        <Stack gap="space3">
          {[
            { title: '500 g beetroot' },
            { title: 'Grater (optional)' },
            { title: '2 cups flour', detail: 'plain, not self-raising' },
          ].map((row) => (
            <Card key={row.title}>
              <NeedRow
                title={row.title}
                {...(row.detail === undefined ? {} : { detail: row.detail })}
                editLabel="Edit"
                editAccessibilityLabel={`Edit ${row.title}`}
                removeLabel="Remove"
                removeAccessibilityLabel={`Remove ${row.title}`}
                onEdit={() => undefined}
                onRemove={() => undefined}
              />
            </Card>
          ))}
        </Stack>
      </Section>
      <Section title="UnitPicker">
        <UnitPicker value={unit} onChange={setUnit} />
      </Section>
      <Section title="NeedsSection">
        <Card>
          <NeedsSection
            ingredients={[
              { id: 'n1', position: 0, name: 'kefir', amount: 250, unit: 'ml', note: 'cold' },
              { id: 'n2', position: 1, name: 'eggs', amount: 2, unit: null, note: null },
              { id: 'n3', position: 2, name: 'salt', amount: null, unit: null, note: 'to taste' },
            ]}
            equipment={[
              { id: 'e1', position: 0, name: 'Large bowl', note: null, optional: false },
              { id: 'e2', position: 1, name: 'Grater', note: 'the fine side', optional: true },
            ]}
          />
        </Card>
        <Card>
          <NeedsSection ingredients={[]} equipment={[]} />
        </Card>
      </Section>
    </>
  );
}

function StepPieces(): React.JSX.Element {
  const [duration, setDuration] = useState<number | null>(5400);
  const [line, setLine] = useState<StepDraft>({
    key: 's1',
    body: 'Roast the beetroot until a knife slides in',
    note: 'Turn once',
    durationSeconds: 3600,
    ingredientIds: [],
    equipmentIds: [],
    during: null,
    imageKey: null,
  });
  const [drafts, setDrafts] = useState<StepDraft[]>([
    {
      key: 'm1',
      body: 'Heat the oven',
      note: '',
      durationSeconds: 600,
      ingredientIds: [],
      equipmentIds: [],
      during: null,
      imageKey: null,
    },
    {
      key: 'm2',
      body: 'Roast the beetroot',
      note: '',
      durationSeconds: 3600,
      ingredientIds: [],
      equipmentIds: [],
      during: null,
      imageKey: null,
    },
    {
      key: 'c1',
      body: 'Chop the dill',
      note: '',
      durationSeconds: 120,
      ingredientIds: [],
      equipmentIds: [],
      during: 'm2',
      imageKey: null,
    },
    {
      key: 'm3',
      body: 'Blend and chill',
      note: '',
      durationSeconds: null,
      ingredientIds: [],
      equipmentIds: [],
      during: null,
      imageKey: null,
    },
  ]);
  return (
    <>
      <Section title="DurationField">
        <Stack gap="space4">
          <DurationField value={duration} onChange={setDuration} />
          <DurationField
            value={null}
            onChange={() => undefined}
            error="Time is between one minute and a day."
          />
        </Stack>
      </Section>
      <Section title="StepLine">
        <Card>
          <StepLine line={line} onChange={setLine} ingredients={LINKABLE} equipment={[]} />
        </Card>
        <Card>
          <StepLine
            line={{ ...line, key: 'g-noted', note: 'Do not let the garlic brown.' }}
            onChange={() => undefined}
            ingredients={LINKABLE}
            equipment={[]}
          />
        </Card>
      </Section>
      <Section title="StepsEditor">
        <StepsEditor
          value={drafts}
          errors={{}}
          onChange={setDrafts}
          ingredients={LINKABLE}
          equipment={[]}
        />
      </Section>
      <Section title="FlowEditor">
        <Text variant="caption" color="textSecondary">
          Edits the same steps as the editor above; the chart below follows.
        </Text>
        <FlowEditor value={drafts} onChange={setDrafts} />
      </Section>
      <Section title="FlowChart">
        <Card>
          <FlowChart steps={drafts} />
        </Card>
        <Card>
          <FlowChart
            steps={drafts.filter((d) => d.during === null).map((d) => ({ ...d, during: null }))}
          />
        </Card>
      </Section>
      <Section title="StepsSection">
        <Card>
          <StepsSection
            ingredients={GALLERY_INGREDIENTS}
            equipment={[]}
            steps={[
              {
                id: 'r1',
                position: 0,
                body: 'Heat the oven',
                note: 'Fan off',
                durationSeconds: 600,
                ingredientIds: ['n1'],
                equipmentIds: [],
                imageKey: null,
                children: [],
              },
              {
                id: 'r2',
                position: 1,
                body: 'Roast the beetroot',
                note: null,
                durationSeconds: 3600,
                ingredientIds: [],
                equipmentIds: [],
                imageKey: null,
                children: [
                  {
                    id: 'r3',
                    position: 0,
                    body: 'Chop the dill',
                    note: null,
                    durationSeconds: 120,
                    ingredientIds: [],
                    equipmentIds: [],
                    imageKey: null,
                  },
                  {
                    id: 'r4',
                    position: 1,
                    body: 'Boil the eggs',
                    note: 'Nine minutes, then cold water',
                    durationSeconds: 540,
                    ingredientIds: [],
                    equipmentIds: [],
                    imageKey: null,
                  },
                ],
              },
            ]}
          />
        </Card>
        <Card>
          <StepsSection steps={[]} ingredients={[]} equipment={[]} />
        </Card>
      </Section>
    </>
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
        <Reorderables />
        <Chips />
        <TabsAndServings />
        <Cooking />
        <NeedsLines />
        <StepPieces />
      </Stack>
    </Screen>
  );
}
