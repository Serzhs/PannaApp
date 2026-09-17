# 0024: Settled steps

**Status:** Done
**Depends on:** 0022, 0023

## Context

0023 gave ingredients and equipment a way to be approved: a line is written in a card and settled
with Add. Steps still float. The steps page opens on an empty list and a button, and every step
card stays open for as long as the recipe is being written, so a finished step looks the same as
one just started.

## Goal

The steps page opens with the first step ready to write, and a step is settled with Add and sits
in the list as one row until Edit reopens it, exactly as a line does.

## Out of scope

- Any change to the API, the data model, or the Flow view from 0022. Settling is on screen only;
  Done and Save changes still send the whole recipe.
- A new row component. The settled row from 0023 is reused, so nothing new goes in the gallery.
- Ingredients and equipment. 0023 already did them and nothing there changes.

## Data model

None.

## API contract

None.

## UI

**Steps page and the steps on the edit screen.** A step is open or settled, as a line is in 0023.

_Open_: the card from 0022, instruction, time, links and note, with Cancel and Add underneath, or
Cancel and Save for a step that was settled before. Add checks the step as Done does, an
instruction at least and a sensible time, shows the field's error and stays open if it fails, and
otherwise settles it. Cancel on a new step removes it; on a reopened one it puts the values back.

_Settled_: the step's number line with the move buttons, then one row reading the instruction,
with the time and the note under it, and Edit and Remove. Remove keeps the promotion rule from
0022: what ran during a removed step becomes main steps in its place.

A step loaded from a saved recipe starts settled. A step just added starts open.

**The first step is already open.** The steps page of the create flow opens with one open, empty
step card rather than an empty list, so the author starts typing instead of pressing a button
first. If they leave it blank, Done and Skip treat it as if it were never there: a blank step is
dropped, never flagged. A blank step that was typed into and emptied again is the same case.

**Done and Save changes** send every step that is not blank, open or settled. A step the server
refuses reopens with its error.

All new strings go through `t()`, in English and Latvian.

## Acceptance criteria

- [x] `pnpm typecheck`, `pnpm lint` and `pnpm test` pass across all three workspaces. _(`pnpm check`: shared 9, API 118, mobile 895 tests.)_
- [x] The steps page renders with one open step card and no settled rows, asserted in a test. _(StepsScreen test "opens with the first step ready to write".)_
- [x] Add with an empty instruction shows the instruction error and keeps the card open; Add with
      one settles the step into a row reading its instruction and time, asserted in a test. _(StepsEditor test "refuses to settle an empty instruction, then settles a written one"; the time under a row in "shows the time under a settled step".)_
- [x] Cancel on a new step removes it; Edit on a settled step reopens it with its values; Cancel
      after an edit restores them, asserted in a test. _(StepsEditor test "drops a new step on Cancel, and puts an edited step back on Cancel".)_
- [x] A recipe loaded for editing shows every step settled, asserted in a test. _(StepsEditor test "opens a step that was never saved and settles the loaded ones".)_
- [x] The helper the pages send through drops a blank step and keeps a typed one, open or settled,
      asserted in a test. _(steps.test "drops a step nobody typed into and keeps the rest".)_
- [x] On the simulator: the steps page opens on a card, two steps are written and settled, one is
      edited, Done, and the recipe screen shows both. _(Seen: the page opened on an open step 1; two steps written and settled; step 1 reopened with Edit, changed and saved; Done went on to the flow and the review showed both steps.)_
- [x] The Latvian file lists every new key. _(`steps.addLine`, `saveLine`, `cancelLine`, `editLine`, `edit`, `removeFor` and the `...For` labels; the key-parity test passes.)_

## Open questions

None.
