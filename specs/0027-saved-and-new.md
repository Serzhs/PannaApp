# 0027: Saved and new

**Status:** Done
**Depends on:** 0026

## Context

Clicking through after 0026: Save on the review lands on the recipe you just wrote, which you
have been staring at for five pages; the list is where you want to see it appear. And once a
recipe is ready, the recipe screen still offers "Back to draft", a step backwards nobody asked for.

## Goal

Save lands on the list, a recipe younger than three days is marked New there, and a ready recipe
cannot be put back to draft.

## Out of scope

- The API. A recipe's `createdAt` already says how old it is, and the status change 0009 sends is
  what Save sends.
- The look of the list beyond the one chip. The bigger design pass is later.

## Data model

None.

## API contract

None.

## UI

**Review page.** Save marks the recipe ready and lands on the recipe list, not the recipe.

**Recipe list.** A recipe created less than three days ago shows a "New" chip beside its title,
next to the Draft chip when both apply. Its accessible name says "new" as it says "draft".

**Recipe screen.** "Back to draft" is gone. A draft still shows "Mark as ready"; a ready recipe
shows nothing in its place. Editing is how a ready recipe changes.

All new strings go through `t()`, in English and Latvian.

## Acceptance criteria

- [x] `pnpm typecheck`, `pnpm lint` and `pnpm test` pass across all three workspaces. _(`pnpm check`: shared 9, API 119, mobile 930 tests.)_
- [x] Save on the review sends the ready status and lands on the list, asserted in a test. _(ReviewScreen test "marks the recipe ready on Save and lands on the list".)_
- [x] A recipe created two days ago shows the New chip and one created four days ago does not,
      asserted in a test on the row; the row's accessible name carries "new". _(RecipeRow test "marks a recipe new for three days, in the chip and in its name".)_
- [x] A ready recipe shows no status button and a draft shows "Mark as ready", asserted in a test. _(RecipeDetailScreen tests "offers to mark a draft ready" and "offers nothing to a ready recipe".)_
- [x] On the simulator: save a recipe from the review and see it in the list with New. _(Seen: a ready recipe showed only Edit and Delete; the list showed New on recipes made today.)_
- [x] The Latvian file lists every new key. _(`status.new` as "Jauna"; the key-parity test passes.)_

## Open questions

None.
