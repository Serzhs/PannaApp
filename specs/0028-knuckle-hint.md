# 0028: The knuckle hint

**Status:** In progress
**Depends on:** 0012, 0018

## Context

Cook mode is used with wet or greasy hands. Its targets are big enough to hit with a knuckle,
because the back of a finger stays cleaner than the pad, but nobody knows that unless told.
CLAUDE.md asks for a short animation the first time cook mode opens, shown once, dismissible,
and never again unless asked for from settings. 0012 left it for a spec of its own.

## Goal

The first time someone opens cook mode, a short hint shows tapping with a knuckle, and it never
shows again unless they ask for it from the You tab.

## Out of scope

- Any other onboarding, tour or tooltip. This is one hint on one screen.
- Sound. Cook mode has no audio in either direction.
- A per-recipe or per-account memory. Whether the hint was seen lives on the device, like cooking
  progress, and does not follow the person to another phone.
- An illustration asset or an animation library. The hand is the fist emoji the system already
  draws, moved by Reanimated; nothing is bundled and nothing is added to the dependencies.
- Showing the hint mid-cook. It appears on entering cook mode, on the check of what you have,
  before any step.
- Haptics. The hint is not something the person did, so nothing buzzes.

## Data model

Nothing on the server. One device-local flag in `expo-sqlite/kv-store`, `panna.knuckleHintSeen`,
set when the hint is dismissed and cleared from the You tab.

## API contract

No endpoints, no changes.

## UI

**The hint.** Opening cook mode with the flag unset shows the hint over the check screen: a
heading, "Tap with a knuckle"; a short body, "Your knuckles stay cleaner than your fingertips,
and every button here is big enough to hit with one."; the picture; and one full-width button,
"Got it", as big as the done bar, because it is pressed with the hand the hint is about.

The picture is a stylised done bar with a fist above it. The fist drops onto the bar, the bar
presses in and lights, and the fist lifts, three times, then rests on the bar. It plays once
per showing. Every duration and easing comes from a motion token, and it runs on the UI thread.

With reduce motion on, the fist sits on the lit bar from the start and nothing moves. The words
are the same either way, so the hint is complete without the picture; the picture is hidden from
the accessibility tree and the heading and body are what a screen reader gets.

Got it hides the hint and sets the flag. Leaving cook mode without pressing it leaves the flag
unset, so the hint comes back next time: it was not read.

**The You tab** gains, under Units, a button "Show the knuckle hint again". Pressing it clears
the flag and shows a line beneath, "It will show the next time you cook."

All new strings go through `t()`, in English and Latvian. `KnuckleHint` follows the
one-folder-per-component layout under the cooking feature, with an entry in the design gallery.

## Acceptance criteria

- [ ] `pnpm typecheck`, `pnpm lint` and `pnpm test` pass across all three workspaces.
- [ ] Opening cook mode with the flag unset shows the heading and body and the Got it button;
      pressing Got it hides it and sets the flag; opening again shows nothing; leaving without
      pressing leaves the flag unset, asserted in a test.
- [ ] With reduce motion on the hint shows the same words and the still picture, asserted in a
      test.
- [ ] The You screen's "Show the knuckle hint again" clears the flag and shows its line, asserted
      in a test.
- [ ] The motion literal test finds no duration written in the component.
- [ ] On the simulator: Cook shows the hint, Got it dismisses it, leaving and cooking again shows
      none; You, show again, Cook shows it once more.
- [ ] The Latvian file lists every new key.

Manual follow-up, not gating: a VoiceOver pass over the hint, per the Accessibility section of
CLAUDE.md, checking the picture is skipped and the words and button are read in that order.

## Open questions

None. CLAUDE.md settles when it shows, that it shows once, the settings entry, and the
reduce-motion form.
