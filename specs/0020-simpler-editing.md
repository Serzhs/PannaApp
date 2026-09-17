# 0020: Simpler editing

**Status:** Draft
**Depends on:** 0007, 0008, 0010

## Context

Clicking through the editor after 0010 showed three things that cost more space and attention than
they give back. Every step carries a temperature field that almost nobody fills, because the oven
setting reads better inside the instruction itself. Every step shows an open note field whether or
not there is a note. And every line in every list carries a drag handle beside the arrows, a column
wide enough to squeeze the fields it sits next to.

This spec takes the number after the roadmap's reserved ones rather than renumbering 0011 to 0019,
which the other specs and `CLAUDE.md` refer to by number.

## Goal

The editor shows a field only when it is wanted, and lines move with buttons alone.

## Out of scope

- Removing the note itself. `steps.note` stays, and the recipe screen still shows it; only the editor
  hides the field until asked.
- Ingredient and equipment notes. Their fields stay as 0007 built them. _(See Open questions.)_
- The unit converter for mass and volume from 0006. Only the temperature part goes.
- Any other change to the reorderable list: the animation on move, a swipe to delete, or moving a
  step between levels by anything but the buttons 0008 gave it.
- Removing `react-native-gesture-handler` or `react-native-reanimated` from the app. The list stops
  using the gesture; nothing else changes about what is installed.
- The create flow's pages. They use the same components and change with them, and nothing else about
  them changes.

## Data model

`steps.temperatureCelsius` is dropped, with a generated migration. Any value already stored is lost,
deliberately: the field was never filled on the seeded data, and a recipe that needs a temperature
carries it in the instruction, where it was always going to be read from.

## API contract

The step shape in `GET /api/recipes/:recipeId` and the step input in `PATCH /api/recipes/:recipeId`
lose `temperatureCelsius`. Because the input schemas are strict, a body that still sends it gets
`400 VALIDATION_FAILED` with `fields` naming the key, as any unknown key does. No new error codes.

## UI

**Steps, in the editor.** The temperature field is gone from every step card. Below the duration, a
step with no note shows a single button, "Add a note", and no note field. Pressing it shows the note
field in its place and moves focus into it. A step that already has a note shows the field from the
start, so an existing note is never hidden behind a button. Clearing the text keeps the field open
until the screen is left; an empty note saves as null, as before.

**Lists, everywhere they are edited.** The reorderable list loses its drag handle and the gesture
behind it. A line moves with the move up and move down buttons only, which were always what a screen
reader user had. The two arrows sit in a narrow column at the end of the row, each a 44-point target
and no wider, so the fields beside them get the width back. The first line has no move up and the
last no move down, as before. The scroll lock that the drag needed goes from `Screen`.

**Recipe screen.** A step's timing line shows its duration only. The accessible name of a step is its
number, body, duration, links and note.

**Removed** with nothing replacing them: the temperature field component from 0008, the temperature
half of 0006's converter and formatter, and their tests and gallery entries. The step line's gallery
entry shows a step with the note button and one with the note open; the reorderable list's entry
shows the buttons only.

## Acceptance criteria

- [ ] `pnpm typecheck`, `pnpm lint` and `pnpm test` pass across all three workspaces.
- [ ] `pnpm db:migrate` on the existing development database drops the column, and `pnpm db:seed`
      still runs.
- [ ] A `PATCH` with `temperatureCelsius` on a step returns 400 naming
      `steps.0.temperatureCelsius`, and `GET` returns steps without the key, asserted end to end.
- [ ] The recipe screen shows a step's duration alone on its timing line, and a step's accessible
      name carries number, body, duration, links and note, asserted in a component test.
- [ ] A step with no note shows "Add a note" and no note field; pressing it shows the field. A step
      with a note shows the field at once. Both asserted in a component test.
- [ ] No element named for dragging exists in a rendered list, asserted in a test, and a line still
      moves with the buttons.
- [ ] The step editor on the simulator shows no temperature field, no open note field on a fresh
      step, and arrows without a handle, with a list line noticeably wider than before.
- [ ] Nothing in `apps/mobile` imports the removed temperature code, and the gallery has no entry
      for it.
- [ ] The Latvian file has no key the English file lacks and lists the new "Add a note" key.

## Open questions

- Should ingredient and equipment notes also sit behind an "Add a note" button? The request named
  steps. Doing the lists too keeps the three editors alike and shortens each ingredient line; leaving
  them as they are keeps this spec small. Either is a few lines of work.
