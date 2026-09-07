# 0002: Design system - tokens and primitives

**Status:** Draft
**Depends on:** 0001

## Context

0001 leaves a booting app with one placeholder screen and no shared vocabulary for building anything else. Every spec from here adds screens, and without tokens each one invents its own spacing, its own grey and its own button. Doing this before the first real screen rather than after is the difference between building on it and retrofitting it.

## Goal

A developer can build a form screen out of semantic tokens and shared components without writing a single raw value, and can see every component in isolation on a simulator.

## Out of scope

- Dark mode. The token structure must make a second theme a matter of swapping primitive values, and this spec ships one light theme only.
- An icon set. Components that could take an icon take a `React.ReactNode` slot instead, and choosing an icon library waits until a spec actually needs icons.
- A full accessibility audit. This spec covers touch target size and OS font scaling, nothing further.
- Visual regression tooling: Chromatic, screenshot diffing, or any hosted service. Storybook runs locally on a simulator and nothing publishes from it.
- A web build of Storybook. It renders through `react-native-web`, which is not this app's renderer, so it could show a component the device will not reproduce.
- The rest of the component set. `Card`, `Divider`, `Spinner`, `Skeleton`, `EmptyState`, `ErrorState` and `ConfirmDialog` are 0004. This spec ships the five a form needs, which is what 0003 requires next.
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

**Typeface.** The system font, which resolves to San Francisco on iOS and Roboto on Android with no
work and no loading step. That is the Platform behaviour rule in `CLAUDE.md` applied to type: the app
reads as native on both phones for free. A custom typeface can replace it later in one place, at the
cost of loading a font before first paint.

**`theme.ts`** assembles the unistyles theme from the semantic layer and exports its type. Named text styles live here too, each one a size, line height and weight together: `display`, `title`, `heading`, `body`, `bodyStrong`, `caption`, `label`.

Components consume semantic tokens and named text styles only. A component reaching past them to a primitive is the failure this two-layer split exists to prevent, because it is the thing that silently survives a palette change and then looks wrong.

## Components

`apps/mobile/src/components/`, one folder per component, laid out per the Repo layout section of
`CLAUDE.md`: `Button/Button.tsx`, `Button/Button.styles.ts`, `Button/Button.stories.tsx`,
`Button/Button.test.tsx`, `Button/index.ts`. Props are typed, with no `any`, and every component ships its own tests in its own
folder rather than in a parallel test tree.

This spec establishes that shape. Every component added by a later spec follows it without the later
spec having to restate it.

The list is confined to what a form screen needs, which is what 0003 builds next:

- **`Screen`** — safe area, background, standard horizontal padding, optional scrolling.
- **`Text`** — takes a named text style and a semantic colour. The only component in the app allowed to render a raw React Native `Text`.
- **`Stack`** — vertical or horizontal, with `gap` taken from the spacing scale. Replaces ad hoc margins, so spacing lives with the container rather than being sprinkled on children.
- **`Button`** — variants `primary`, `secondary`, `ghost`, `danger`. States: default, pressed, disabled, loading. Loading shows a spinner in place of the label and blocks further presses without changing the button's size.
- **`TextField`** — label, value, optional error, optional helper text, secure entry. The error state changes the border, shows the message, and is announced to screen readers rather than being colour alone.

## UI

**Storybook.** `@storybook/react-native`, run on a simulator with `pnpm --filter mobile storybook`. It uses the same renderer as the app, so what it shows is what ships - which is the entire reason it is on device rather than in a browser.

Every component has a `.stories.tsx` file in its own folder, with one story per variant and per state, and controls for the props worth varying. Three further stories cover what individual components cannot show on their own: the spacing scale, the type ramp, and the semantic colours side by side with their contrast ratios.

Storybook is reached through a separate entry point selected by an environment variable, not by a route inside the app. **No story file and no Storybook dependency may reach a production bundle**, which a route-based gallery could not guarantee. That exclusion is an acceptance criterion below, because it is the kind of thing that is easy to get wrong and impossible to notice.

There is no screen to refactor here, because no real screen exists yet. The proof that this set is sufficient comes in 0003, which builds the auth screen from it and carries the criterion that the screen contains no raw values. If it cannot, this spec was wrong and comes back.

## Acceptance criteria

- [ ] `pnpm typecheck`, `pnpm lint` and `pnpm test` pass across all three workspaces.
- [ ] A search for hex colour literals in `apps/mobile/src` outside `styles/tokens.ts` returns no matches.
- [ ] A test asserts that every semantic token's value is a primitive from the same module, and fails if any semantic entry is a raw literal.
- [ ] Referring to a token or a text style that does not exist fails `pnpm typecheck` rather than resolving to `undefined` at runtime.
- [ ] Storybook launches on a simulator and lists every component above, each with a story per variant and per state named, and no runtime warnings in the console.
- [ ] Every component folder contains a `.stories.tsx` file. A component without one fails a test that walks the components directory.
- [ ] A production build contains no Storybook dependency and no story file, verified by inspecting the bundle rather than by inspecting the config.
- [ ] Every component lives in its own folder with its component, styles, test and index files, and no component's styles or tests live outside its folder.
- [ ] There is no `components/index.ts` re-exporting the directory.
- [ ] Every interactive element has a touch target of at least 44 by 44 points, including `Button` at its smallest and the `TextField` clear affordance, measured including `hitSlop`.
- [ ] A test walks every semantic token pair used as foreground on background and asserts 4.5:1 for body text and 3:1 for large text, icons and control boundaries. It fails if a primitive is changed to a value that breaks a pair.
- [ ] Every component's own tests query it by accessible role and name rather than by `testID`, so a component that cannot be found by a screen reader cannot pass its own tests.
- [ ] Every interactive component exposes an `accessibilityRole` and an accessible name, and `Button` in its disabled and loading states reports `disabled` and `busy` through `accessibilityState`.
- [ ] No component conveys a state by colour alone: `TextField` in error shows a message, and every state renders legibly in greyscale in Storybook.
- [ ] No component sets `allowFontScaling={false}`, verified by a search returning no matches.
- [ ] A VoiceOver or TalkBack walkthrough of Storybook reaches every component in a sensible order, and each announces what it is and what it does. `TextField` announces its label, its value and its error together rather than as separate stops.
- [ ] Text scales with the OS font size setting, and at the largest setting no label in Storybook is clipped or truncated mid-word.
- [ ] `TextField` in its error state exposes the error message to screen readers, verified by a test asserting the accessibility label or state, not by colour alone.
- [ ] `Button` in its loading state does not change width, and a second press while loading fires no additional handler call.
- [ ] Every duration and easing used anywhere in the app resolves to a motion token; a search for numeric duration literals in animation calls outside `tokens.ts` returns no matches.
- [ ] With the OS "reduce motion" setting on, animations either do not run or resolve instantly to their end state, and no content becomes unreachable as a result.
- [ ] Changing one primitive colour in `tokens.ts` changes every screen that uses it, with no other file edited.

## Open questions

1. **Accent colour.** No brand colour has been chosen. Whatever it is, it has to clear 4.5:1 against `surface` for text and 3:1 for control boundaries, which rules out most of the bright mid-tone colours brands tend to pick, and usually means a darker shade for text than the one used for fills. The spec can ship a neutral placeholder that passes and have it replaced in one line, or wait for a decision. Which?
