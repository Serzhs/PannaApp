# 0013: Cooking without an ingredient

**Status:** Done
**Depends on:** 0012

## Context

Cook opens straight on step one. Nobody checks the fridge first, and a step that needs the one
thing you are out of arrives as a surprise halfway through. The App structure section of
`CLAUDE.md` says the check of what you have is the first state of cooking, not a screen of its own,
and 0012 left it out to ship the guide.

## Goal

Cooking starts with a check of what you have, and a step whose ingredients you are all going
without is skipped with the numbering closed up, while what is being left out stays visible.

## Out of scope

- Rewriting step text. A step that says "chop the carrots and celery" still says carrots. The
  marker on screen is what admits it, per the roadmap note.
- Excluding equipment. A missing herb can be improvised; a stand mixer cannot. Equipment is listed
  on the check so it is seen, and cannot be ticked away.
- Changing the recipe. Going without is part of this cook on this device, and is never written to
  the recipe. 0014 records it in history.
- Substitutions, scaling by servings, or a shopping list.

## Data model

None on the server. The device record from 0012 gains `phase: 'check' | 'cooking'` and
`excluded: ingredientId[]`. A record written before this spec reads as cooking with nothing
excluded. Which steps are live is derived, never stored: a step with ingredient links, all of them
excluded, is skipped; a step with no links, or with one link that is not excluded, is live. The
same rule applies to a meanwhile step inside its parent. Numbering, "Step N of M", Done and Back
all run over the live steps only.

## API contract

None.

## UI

**The check**, the first state of the cooking screen, reached by Cook. The title, then "What you
have": every ingredient as a row with a checkbox, all ticked to start, reading "500 g beetroot".
Unticking one means going without it. Rows are 64 points tall, as on the guide. Under them
"You will need", the equipment as plain rows. A line says what unticking changes, live: "2 steps
will be skipped · about 30 min" from the live main steps' times, or "Nothing changes" when no step
drops, or nothing when all is ticked. At the bottom a Start bar as big as Done, reading "Start
cooking" or "Start without 2 ingredients". Leave goes back and keeps nothing.

**The guide** gains one line under the title whenever something is excluded: "Without: dill,
celery". A live step that links an excluded ingredient shows it in its uses line as
"dill (going without)" rather than dropping it silently. Everything else is as 0012 built it.

**The list row** for a cook still at the check reads "Checking what you have" in place of
"Step N of M".

**Component**: the check view, in the cooking feature, its own folder with styles, test and index,
and a gallery entry with one ingredient unticked.

All new strings go through `t()`, in English and Latvian.

## Acceptance criteria

- [x] `pnpm typecheck`, `pnpm lint` and `pnpm test` pass across all three workspaces. _(`pnpm check`: shared 9, API 123, mobile 1068 tests.)_
- [x] Excluding the only ingredient of a step skips it and closes the numbering; excluding one of
      two keeps the step; a step with no links is never skipped; a meanwhile step is skipped by the
      same rule; Done and Back move over live steps only, asserted in tests on the store. _(store.test "skips the steps whose every ingredient is excluded, and numbers over the rest" and "never skips a step with no links".)_
- [x] The check starts with every ingredient ticked, updates the skipped count and time as one is
      unticked, and Start moves the record to cooking with the exclusions, asserted in a test. _(CheckView test; CookScreen test "opens on the check, and shows what is left out once cooking".)_
- [x] The guide shows "Without: …" when something is excluded and marks it in a live step's uses
      line, asserted in a test. _(CookScreen test above; StepView test "marks an excluded ingredient in the uses line".)_
- [x] A record without the new fields still opens on the guide, asserted in a test. _(store.test "reads a record from before the check as cooking with nothing excluded"; CookScreen test "keeps a record from before the check on the guide".)_
- [x] On the simulator: Cook lands on the check, untick dill, see "1 step will be skipped", Start,
      see "Without: dill" and only two steps numbered. _(Seen: the check with beetroot and dill ticked and the blender listed; dill unticked showed "Going without" and "1 step will be skipped · about 1 min"; Start without 1 ingredient opened the guide with "Without: dill" and "Step 1 of 2", the dill meanwhile step gone.)_
- [x] The Latvian file lists every new key. _(the new `cook` keys, with zero, one and other forms; the key-parity test passes.)_

## Open questions

None.
