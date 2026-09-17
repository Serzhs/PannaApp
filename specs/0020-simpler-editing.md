# 0020: Simpler editing

**Status:** Done
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

**Ingredient and equipment lines** get the same button in place of their always-open note field, so
the three editors behave alike and each line is shorter.

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

- [x] `pnpm typecheck`, `pnpm lint` and `pnpm test` pass across all three workspaces. _(`pnpm check`: shared 9, API 118, mobile 819 tests.)_
- [x] `pnpm db:migrate` on the existing development database drops the column, and `pnpm db:seed`
      still runs. _(Migration `0001_drop-step-temperature` applied to the dev database, then reseeded.)_
- [x] A `PATCH` with `temperatureCelsius` on a step returns 400 naming
      `steps.0.temperatureCelsius`, and `GET` returns steps without the key, asserted end to end. _(e2e "rejects a temperature, which 0020 removed"; every step response is parsed by the shared schema, which no longer has the key.)_
- [x] The recipe screen shows a step's duration alone on its timing line, and a step's accessible
      name carries number, body, duration, links and note, asserted in a component test. _(StepsSection tests: "10 min" alone; label "Step 1. Heat the oven. Fan off" and the link test from 0010.)_
- [x] A step with no note shows "Add a note" and no note field; pressing it shows the field. A step
      with a note shows the field at once. Both asserted in a component test, and the same for an
      ingredient line and an equipment line. _(NoteField and StepLine tests; NeedsEditor test covers an ingredient without a note and equipment with one.)_
- [x] No element named for dragging exists in a rendered list, asserted in a test, and a line still
      moves with the buttons. _(ReorderableList tests.)_
- [x] The step editor on the simulator shows no temperature field, no open note field on a fresh
      step, and arrows without a handle, with a list line noticeably wider than before. _(Seen: "Add a note" on ingredient, equipment and steps; the field opened with focus on press; a saved note open at once; arrows only. A list with one line now takes the full width.)_
- [x] Nothing in `apps/mobile` imports the removed temperature code, and the gallery has no entry
      for it. _(The component folder and the converter functions are deleted, so an import would fail typecheck.)_
- [x] The Latvian file has no key the English file lacks and lists the new "Add a note" key. _(`needs.addNote` and `steps.addNote` as "Pievienot piezīmi"; the key-parity test passes.)_

## Open questions

None.
