# 0004: Design system - display and feedback components

**Status:** Draft
**Depends on:** 0002, 0003

## Context

0002 shipped the five components a form needs, and 0003 proved they work by building the auth screen from them. The next screens are lists rather than forms: they load, they can be empty, they can fail, and they ask before deleting. None of those states has a component yet, and each one is where an app most obviously looks unfinished.

## Goal

A developer can build a list screen with all of its states - loading, empty, error, populated - without writing a raw value or a bespoke placeholder.

## Out of scope

- Any screen. This spec adds components and their stories, and 0005 is the first to use them.
- Icons. `EmptyState` and `ErrorState` take a `React.ReactNode` slot; choosing an icon library waits for a spec that needs one.
- Illustrations for empty states. That is a separate decision with an asset dependency and no owner yet.
- Toasts, banners, snackbars, pull-to-refresh. Nothing needs them.
- Swipe actions and drag handles. 0007 and 0008 introduce reordering and can bring what they need.
- A full-screen image viewer. 0010 introduces the one place an image is shown large, and brings it then.

## Data model

None.

## API contract

None.

## Components

Same folder rule as 0002, per the Repo layout section of `CLAUDE.md`: component, styles, stories, tests and an `index.ts`, all in the component's own folder.

- **`Card`** — a padded surface with radius and border, used for list rows.
- **`Divider`** — a one-pixel line in `borderSubtle`.
- **`Spinner`** — a single size and a semantic colour. For a load that replaces known content, prefer `Skeleton`; a spinner is for an action in flight, not for a screen filling in.
- **`Skeleton`** — a shimmering placeholder in the shape of the content it stands in for, with `Skeleton.Text` for lines of text and `Skeleton.Block` for rectangles. Every screen's loading state is built from these, so the layout does not jump when real content arrives. A skeleton whose shape differs from the content it replaces is worse than a spinner, because it promises a layout and then breaks it.
- **`EmptyState`** — title, optional body, optional action slot.
- **`ErrorState`** — message and a retry action. It takes a variant for being offline, because that is a different situation from a failed request and the user can act on only one of them.
- **`ConfirmDialog`** — title, body, confirm and cancel labels, and a `destructive` flag. It wraps the platform's own alert rather than drawing a custom modal, per the Platform behaviour section of `CLAUDE.md`. That gets the right look on both phones, correct focus handling and full screen reader support without building any of it, and it is why this component has no styles file.

## UI

Storybook only. Each component gets stories covering every variant and state, in the same Storybook set up by 0002.

`Skeleton` gets one further story that places a skeleton next to the content it stands in for, so the two can be compared directly. That comparison is the only reliable way to catch the height mismatch that makes a screen jump, and it is not something a test can judge.

## Acceptance criteria

- [ ] `pnpm typecheck`, `pnpm lint` and `pnpm test` pass across all three workspaces.
- [ ] Every component above lives in its own folder with its component, styles, stories, test and index files.
- [ ] Storybook lists every component with a story per variant and state, with no runtime warnings.
- [ ] A skeleton and the content it stands in for occupy the same height in the side-by-side story: swapping one for the other shifts nothing.
- [ ] Contrast for every new semantic pairing passes the same test 0002 introduced, with no new failures.
- [ ] `ConfirmDialog` renders the platform's own alert on both iOS and Android, closes on the Android back gesture, and returns focus to whatever opened it.
- [ ] `ConfirmDialog` with `destructive` uses the platform's destructive button style and announces the action as destructive to a screen reader, rather than relying on the button being red.
- [ ] `ErrorState` in its offline variant reads differently from its failure variant, and both offer an action.
- [ ] `Skeleton` is hidden from the accessibility tree, and `Spinner` announces that something is loading.
- [ ] Every component's tests query by accessible role and name rather than by `testID`.
- [ ] No component sets `allowFontScaling={false}`, and no component contains a colour, spacing or font size literal.
- [ ] Swipe-back on iOS and the back gesture on Android both work on every screen these components appear in, including with a dialog open.
- [ ] With reduce motion on, the skeleton shimmer stops rather than animating, and the content still reads as a placeholder.
- [ ] A VoiceOver or TalkBack walkthrough of these components in Storybook reaches each in a sensible order, and `Card` used as a list row announces as one element rather than as its separate children.

## Open questions

None.
