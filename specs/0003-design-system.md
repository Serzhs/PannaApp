# 0003: Design system and tokens

**Status:** Draft
**Depends on:** 0001

## Context

0001 ships two auth screens with whatever handful of values they needed, which is the right amount of design system for two screens and the wrong amount for the rest of the app. From 0002 onward every spec adds screens, and without a shared vocabulary each one invents its own spacing, its own grey and its own button. That divergence is cheap to prevent now and expensive to unpick later.

## Goal

A developer can build any screen in this app out of semantic tokens and shared components without writing a single raw value.

## Out of scope

- Dark mode. The token structure must make a second theme a matter of swapping primitive values, and this spec ships one light theme only.
- An icon set. Components that could take an icon take a `React.ReactNode` slot instead, and choosing an icon library waits until a spec actually needs icons.
- A full accessibility audit. This spec covers touch target size and OS font scaling, nothing further.
- Storybook, Chromatic, or any visual regression tooling. The gallery below is a plain route in the app.
- Any component that no existing spec needs. New components arrive with the feature that requires them, per `CLAUDE.md`.

## Data model

None. This spec adds no tables, no columns and no migration.

## API contract

None. This spec adds no endpoints and makes no network calls.

## Token structure

Two files under `apps/mobile/src/styles/`.

**`tokens.ts`** is the only file in `apps/mobile/src` permitted to contain a hex colour, a spacing number, a radius or a font size literal. It exports two layers.

*Primitives* — the raw scales, named for what they are:

- Spacing on a 4pt base: `space0` 0, `space1` 4, `space2` 8, `space3` 12, `space4` 16, `space5` 20, `space6` 24, `space8` 32, `space10` 40, `space12` 48, `space16` 64.
- Radii: `radiusNone` 0, `radiusSm` 4, `radiusMd` 8, `radiusLg` 16, `radiusFull` 9999.
- A neutral ramp and one accent ramp, each with at least the stops the semantic layer below needs, plus a red, a green and an amber ramp for status.
- Type sizes paired with their line heights, so the two can never drift apart.
- Durations: `durationInstant` 0, `durationFast` 120, `durationBase` 200, `durationSlow` 320, `durationDeliberate` 480, in milliseconds.
- Easings: `easeStandard` for movement that starts and ends on screen, `easeDecelerate` for something entering, `easeAccelerate` for something leaving, and one spring configuration for anything the user drags or presses.

*Semantics* — a mapping from primitives to roles, named for what they are for. Every entry's value is a primitive reference, never a literal:

- Surfaces: `background`, `surface`, `surfaceRaised`, `overlay`.
- Text: `textPrimary`, `textSecondary`, `textDisabled`, `textInverse`.
- Lines: `border`, `borderSubtle`, `borderFocus`.
- Roles: `accent`, `onAccent`, `danger`, `onDanger`, `success`, `warning`.
- Skeleton: `skeletonBase` and `skeletonHighlight`, the two ends of the shimmer.

Motion is tokenised for the same reason colour is. A duration typed inline is a duration nobody can
change globally, and an app whose transitions each picked their own number reads as sloppy long
before anyone can say which one is wrong.

**`theme.ts`** assembles the unistyles theme from the semantic layer and exports its type. Named text styles live here too, each one a size, line height and weight together: `display`, `title`, `heading`, `body`, `bodyStrong`, `caption`, `label`.

Components consume semantic tokens and named text styles only. A component reaching past them to a primitive is the failure this two-layer split exists to prevent, because it is the thing that silently survives a palette change and then looks wrong.

## Components

`apps/mobile/src/components/`, one folder per component, laid out per the Repo layout section of
`CLAUDE.md`: `Button/Button.tsx`, `Button/Button.styles.ts`, `Button/Button.test.tsx`,
`Button/index.ts`. Props are typed, with no `any`, and every component ships its own tests in its own
folder rather than in a parallel test tree.

This spec establishes that shape. Every component added by a later spec follows it without the later
spec having to restate it.

The list is deliberately confined to what 0001 and 0002 already need:

- **`Screen`** — safe area, background, standard horizontal padding, optional scrolling.
- **`Text`** — takes a named text style and a semantic colour. The only component in the app allowed to render a raw React Native `Text`.
- **`Stack`** — vertical or horizontal, with `gap` taken from the spacing scale. Replaces ad hoc margins, so spacing lives with the container rather than being sprinkled on children.
- **`Button`** — variants `primary`, `secondary`, `ghost`, `danger`. States: default, pressed, disabled, loading. Loading shows a spinner in place of the label and blocks further presses without changing the button's size.
- **`TextField`** — label, value, optional error, optional helper text, secure entry. The error state changes the border, shows the message, and is announced to screen readers rather than being colour alone.
- **`Card`** — a padded surface with radius and border, used for recipe rows.
- **`Divider`** — a one-pixel line in `borderSubtle`.
- **`Spinner`** — a single size and a semantic colour. For a load that replaces known content, prefer `Skeleton`; a spinner is for an action in flight, not for a screen filling in.
- **`Skeleton`** — a shimmering placeholder in the shape of the content it stands in for, with `Skeleton.Text` for lines of text and `Skeleton.Block` for rectangles. Every screen's loading state is built from these, so the layout does not jump when real content arrives: a skeleton whose shape differs from the content it replaces is worse than a spinner, because it promises a layout and then breaks it.
- **`EmptyState`** — title, optional body, optional action slot.
- **`ErrorState`** — message and a retry action.
- **`ConfirmDialog`** — title, body, confirm and cancel labels, and a `destructive` flag that renders confirm as the `danger` button variant.

## UI

**Gallery.** A route at `(app)/_dev/gallery`, reachable only in development builds, rendering every component in every variant and every state on one scrolling screen, alongside the spacing scale, the type ramp and the colour semantics. It exists so the acceptance criteria below can be checked by looking at one screen rather than hunting through features, and so a palette change can be eyeballed in one place.

**Refactor.** The `(auth)/login` and `(auth)/register` screens from 0001 are rebuilt on these components. This is the proof that the set is sufficient: if either screen still needs a local `StyleSheet` with a colour or a spacing number in it, the design system is missing something and this spec is not done.

## Acceptance criteria

- [ ] `pnpm typecheck`, `pnpm lint` and `pnpm test` pass across all three workspaces.
- [ ] A search for hex colour literals in `apps/mobile/src` outside `styles/tokens.ts` returns no matches.
- [ ] A test asserts that every semantic token's value is a primitive from the same module, and fails if any semantic entry is a raw literal.
- [ ] Referring to a token or a text style that does not exist fails `pnpm typecheck` rather than resolving to `undefined` at runtime.
- [ ] The gallery route renders every component listed above, in every variant and state named, with no runtime warnings in the console.
- [ ] `(auth)/login` and `(auth)/register` contain no colour value, no spacing number and no font size.
- [ ] Every component lives in its own folder with its component, styles, test and index files, and no component's styles or tests live outside its folder.
- [ ] There is no `components/index.ts` re-exporting the directory.
- [ ] Every interactive element has a touch target of at least 44 by 44 points, including `Button` at its smallest and the `TextField` clear affordance, measured including `hitSlop`.
- [ ] A test walks every semantic token pair used as foreground on background and asserts 4.5:1 for body text and 3:1 for large text, icons and control boundaries. It fails if a primitive is changed to a value that breaks a pair.
- [ ] Every component's own tests query it by accessible role and name rather than by `testID`, so a component that cannot be found by a screen reader cannot pass its own tests.
- [ ] Every interactive component exposes an `accessibilityRole` and an accessible name, and `Button` in its disabled and loading states reports `disabled` and `busy` through `accessibilityState`.
- [ ] No component conveys a state by colour alone: `TextField` in error shows a message, and the gallery renders every state legibly in greyscale.
- [ ] No component sets `allowFontScaling={false}`, verified by a search returning no matches.
- [ ] Text scales with the OS font size setting, and at the largest setting no label in the gallery is clipped or truncated mid-word.
- [ ] `TextField` in its error state exposes the error message to screen readers, verified by a test asserting the accessibility label or state, not by colour alone.
- [ ] `Button` in its loading state does not change width, and a second press while loading fires no additional handler call.
- [ ] Every duration and easing used anywhere in the app resolves to a motion token; a search for numeric duration literals in animation calls outside `tokens.ts` returns no matches.
- [ ] With the OS "reduce motion" setting on, animations either do not run or resolve instantly to their end state, and no content becomes unreachable as a result.
- [ ] A skeleton and the content that replaces it occupy the same height, verified for the recipe list row: swapping one for the other shifts nothing on screen.
- [ ] Changing one primitive colour in `tokens.ts` changes every screen that uses it, with no other file edited.

## Open questions

1. **Accent colour.** No brand colour has been chosen. Whatever it is, it has to clear 4.5:1 against `surface` for text and 3:1 for control boundaries, which rules out most of the bright mid-tone colours brands tend to pick, and usually means a darker shade for text than the one used for fills. The spec can ship a neutral placeholder that passes and have it replaced in one line, or wait for a decision. Which?
2. **Font.** Nothing here picks a typeface, so this ships on the system font. Loading a custom font through `expo-font` changes the splash and loading behaviour in 0001, so if a specific font is wanted it is better decided now than retrofitted.
