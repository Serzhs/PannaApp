# 0002: Design system - tokens and primitives

**Status:** In progress
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

_Primitives_ — the raw scales, named for what they are:

- Spacing on a 4pt base: `space0` 0, `space1` 4, `space2` 8, `space3` 12, `space4` 16, `space5` 20, `space6` 24, `space8` 32, `space10` 40, `space12` 48, `space16` 64.
- Radii: `radiusNone` 0, `radiusSm` 4, `radiusMd` 8, `radiusLg` 16, `radiusFull` 9999.
- A neutral ramp and one accent ramp, each with at least the stops the semantic layer below needs, plus a red, a green and an amber ramp for status.
- Type sizes paired with their line heights, so the two can never drift apart.
- Durations: `durationInstant` 0, `durationFast` 120, `durationBase` 200, `durationSlow` 320, `durationDeliberate` 480, in milliseconds.
- Easings: `easeStandard` for movement that starts and ends on screen, `easeDecelerate` for something entering, `easeAccelerate` for something leaving, and one spring configuration for anything the user drags or presses.

_Semantics_ — a mapping from primitives to roles, named for what they are for. Every entry's value is a primitive reference, never a literal:

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

There is no screen to refactor here, because no real screen exists yet. The proof that this set is sufficient comes in 0003, which builds the sign-in screen from it and carries the criterion that the screen contains no raw values. If it cannot, this spec was wrong and comes back.

## Acceptance criteria

- [x] `pnpm typecheck`, `pnpm lint` and `pnpm test` pass across all three workspaces.
- [x] A search for hex colour literals in `apps/mobile/src` outside `styles/tokens.ts` returns no matches.
- [x] A test asserts that every semantic token's value is a primitive from the same module, and fails if any semantic entry is a raw literal.
- [x] Referring to a token or a text style that does not exist fails `pnpm typecheck` rather than resolving to `undefined` at runtime.
- [ ] Storybook launches on a simulator and lists every component above. **Not done.** Stories are written and the config exists, but the separate entry point does not work: an `index.js` that branches on the environment variable loads the bundle and then never mounts under Expo Router. Needs a different mechanism.
- [x] Every component folder contains a `.stories.tsx` file. A component without one fails a test that walks the components directory.
- [x] A production build contains no Storybook dependency and no story file, verified by inspecting the bundle rather than by inspecting the config.
- [x] Every component lives in its own folder with its component, styles, test and index files, and no component's styles or tests live outside its folder.
- [x] There is no `components/index.ts` re-exporting the directory.
- [x] Every interactive element has a touch target of at least 44 by 44 points. _(Tested for all four `Button` variants and for `TextField`. There is no `TextField` clear affordance in this spec, so nothing was measured for one.)_
- [x] A test walks every semantic token pair used as foreground on background and asserts 4.5:1 for body text and 3:1 for large text, icons and control boundaries. It fails if a primitive is changed to a value that breaks a pair.
- [x] Every component's own tests query it by accessible role and name rather than by `testID`, so a component that cannot be found by a screen reader cannot pass its own tests.
- [x] Every interactive component exposes an `accessibilityRole` and an accessible name, and `Button` in its disabled and loading states reports `disabled` and `busy` through `accessibilityState`.
- [x] No component conveys a state by colour alone: `TextField` in error shows a message, and every state renders legibly in greyscale in Storybook.
- [x] No component sets `allowFontScaling={false}`, verified by a search returning no matches.
- [ ] A VoiceOver or TalkBack walkthrough reaches every component in a sensible order. **Blocked** on Storybook launching, and it needs a person with a screen reader on. `TextField` announcing its label, value and error as one stop is covered by a test in the meantime.
- [ ] Text scales with the OS font size setting, and at the largest setting nothing is clipped. **Blocked** on Storybook launching. `allowFontScaling={false}` appears nowhere, which is tested, so scaling is on; what is unchecked is whether the layouts survive it.
- [x] `TextField` in its error state exposes the error message to screen readers, verified by a test asserting the accessibility label or state, not by colour alone.
- [x] `Button` in its loading state does not change width, and a second press while loading fires no additional handler call.
- [x] Every duration and easing used anywhere in the app resolves to a motion token; a search for numeric duration literals in animation calls outside `tokens.ts` returns no matches.
- [x] With the OS "reduce motion" setting on, animations either do not run or resolve instantly to their end state. _(Vacuously true: this spec ships motion tokens but no component animates. The first animation carries this criterion for real.)_
- [x] Changing one primitive colour in `tokens.ts` changes every screen that uses it, with no other file edited. _(Holds by construction and is guarded by two tests: every semantic token must resolve to a primitive, and no file outside `tokens.ts` may contain a hex literal.)_

## Verification

Walked on 2026-09-14 on an iPhone 17 Pro simulator through Expo Go. Nineteen of
twenty-two criteria verified; 157 tests pass in the mobile workspace.

Three decisions were forced during the work and are recorded above: the accent is a
neutral placeholder, unistyles is out, and mobile tests run on Jest rather than Vitest.

**Storybook is the unfinished part.** Every component has its stories and the Storybook
config is in place, but the entry point is not. A separate `index.js` that branches on
`EXPO_PUBLIC_STORYBOOK` bundles cleanly and then never mounts under Expo Router - the
app sits on "Opening project" forever. The two criteria that need to look at Storybook
on a device are blocked behind that. The criterion that stories must not reach a release
bundle is met and was checked by grepping an actual export.

**A dependency mismatch cost most of the debugging time, and the lesson is worth
keeping.** Installing Storybook pulled in `react-dom` at a version ahead of `react`, and
React refuses to run when the two disagree - which broke the app at startup with an
error that named nothing useful. The fix is the `react-dom` override in the root
`package.json`. The faster route to it, next time, is `expo install --check`, which
names every package that has drifted from what the SDK expects; hand-pinning versions
against peer warnings made it worse.

## Open questions

None.

**Accent colour - decided.** No brand colour has been chosen, so the accent ships as a neutral
placeholder that passes contrast: a desaturated blue-grey, dark enough to clear 4.5:1 against
`surface` as text and 3:1 as a control boundary. It is two primitive values in `tokens.ts` and is
replaced in one line when a brand colour exists. Shipping a placeholder that passes beats waiting,
because the contrast test below is what actually guards the swap.

**Expo Go is out; the app runs as a dev build - decided.** `react-native-unistyles` needs
`react-native-nitro-modules`, which is native code Expo Go does not carry. The app is therefore
built onto the simulator with `expo run:ios` and Metro serves it as before. This was going to
happen at 0003 regardless: Sign in with Apple cannot work under Expo Go's own bundle identifier.
`CLAUDE.md` is updated to match.
