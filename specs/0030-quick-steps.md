# 0030: Quick steps

**Status:** Done
**Depends on:** 0024, 0025

## Context

Most recipes start the same way: boil water, heat the pan, chop the onions. Writing those out
every time is tedious, and it is the part of writing a recipe that makes people give up
halfway. 0024 settled each step in a card; the card opens empty, and empty is the hardest
place to start.

## Goal

A new step offers the most common kitchen actions as a row of chips, and tapping one fills the
instruction in so the author only has to say what changes.

## Out of scope

- Guessing steps from the ingredients, or any suggestion that depends on the recipe.
- Chips on an existing step, or once the author has started typing. They are a way in, not
  an editor.
- Filling in the time, the linked lines or the note. A chip writes the instruction; the rest is
  the author's, since "boil the water" means a different pot every time.
- Learning from what the author writes, or a list the author edits. The list is fixed.
- Chips for the recipe's own ingredients and tools. Linking is what Uses and Needs do.

## Data model

Nothing. The list is a constant in the app, in both languages.

## API contract

No endpoints, no changes.

## UI

**In a new step's card**, above the instruction field, a heading "Common steps" and a row of
chips that wraps: Boil water, Heat the pan, Heat the oven, Chop the onions, Season with salt
and pepper. Five, decided on approval: start slow, and add more once these earn their place.
The Latvian file carries its own wording, not a translation word for word.

Tapping a chip puts its text in the instruction field, puts the cursor at the end so the author
can carry on, and the row goes away. The row is also gone once the author types anything into
the field, and it is never shown on a step that already has an instruction, which is every
existing step. A chip is a button named by its text.

`QuickSteps` follows the one-folder-per-component layout under the recipes feature, with a
gallery entry. All new strings go through `t()`, in English and Latvian.

## Acceptance criteria

- [x] `pnpm typecheck`, `pnpm lint` and `pnpm test` pass across all three workspaces. _(`pnpm check`:
      shared 9, API 138, mobile 1313 tests.)_
- [x] A new step's card shows the five chips; tapping one fills the instruction with its text
      and the chips go; typing into the empty field also removes them; a step opened for editing
      with text shows none, asserted in a test. _(QuickSteps.test.tsx and `offers the common steps on a
fresh step until there is an instruction` in StepLine.test.tsx.)_
- [x] The English and Latvian files each list five, and the key-parity test passes. _(The list is a
      constant of five keys; both files carry them.)_
- [x] On the simulator: Add step on the plov shows the chips; tapping "Heat the pan" fills the
      field; Add settles the step with that text. _(Done on the iPhone 17 Pro simulator, 25 September
      2026, in Latvian: "Uzkarsē pannu".)_

## Open questions

None. Decided on approval: five to start, more later if they earn it.
