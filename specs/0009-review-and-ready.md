# 0009: Review and mark as ready

**Status:** Draft
**Depends on:** 0008

## Context

`status` has had an API since 0005 - a recipe is a `draft` until its author says it is `ready` - and the app has never offered a way to say so. Every recipe wears the Draft chip forever. The create flow was always meant to end on a review page where that decision is made, and 0008 was the last page before it.

## Goal

An author looks over a new recipe on one page and marks it ready to cook, and can change their mind either way from the recipe screen.

## Out of scope

- Any new field on a recipe. This spec writes `status` and nothing else.
- Validation of readiness. A recipe with no steps can be marked ready; the author decides, per the Data model section of `CLAUDE.md`, and the app does not second-guess them.
- Editing anything from the review page. It shows; the edit screen and the earlier pages change. A review that also edits is a fifth editor to keep in step with the other four.
- Hiding drafts from anywhere, filtering by status, or sorting drafts apart. The list shows the chip and nothing more.
- Sharing, cooking, or anything that a `ready` recipe unlocks later. 0011 and 0017 own what readiness means to them.

## Data model

No changes. `recipes.status` from 0001 is used as it is.

## API contract

No changes. `PATCH /api/recipes/:recipeId` with `{ status }` has existed since 0005, moves a recipe between `draft` and `ready` in both directions, and returns the recipe. It answers 401, 404 with `RECIPE_NOT_FOUND`, and 400 with `VALIDATION_FAILED`, as 0005 specified and tested.

## UI

**Create flow, fourth page: `(app)/recipes/[id]/review`.** After "Steps", the recipe as the reader will see it: title, servings and total time, the description, then the "What you need" and "Steps" sections 0007 and 0008 built for the recipe screen, reused as they are. Below them a switch, "Ready to cook", off by default because a recipe just typed in usually has a mistake somewhere, and a Done button. Done saves the status when the switch is on, and in either case lands on the recipe. 0008's Done and Skip continue here instead of landing on the recipe.

**Recipe screen, `(app)/recipes/[id]`.** Next to the Draft mark, a control that flips the status: "Mark as ready" on a draft, "Back to draft" on a ready recipe. Without this, a recipe created before this spec, or one whose author skipped the review, could never become ready. The chip in the list follows without a manual refresh. Offline, the control fails at once with the offline message and nothing changes, per the Offline section of `CLAUDE.md`.

The status is a word and a mark, never a colour alone.

**Components**: the review page is a screen composed from existing components, and the status control is a `Button`. No new shared component is added, so no gallery entry is due.

All new strings go through `t()`, in English and Latvian.

## Acceptance criteria

- [ ] `pnpm typecheck`, `pnpm lint` and `pnpm test` pass across all three workspaces.
- [ ] After "Steps" in the create flow the app continues to the review page, which shows the title, servings, total time, description, ingredients, equipment and steps that were entered.
- [ ] Done with the switch off lands on the recipe still as a draft; Done with the switch on lands on the recipe marked ready, and the list shows no Draft chip for it, without a manual refresh.
- [ ] "Mark as ready" on the recipe screen sends `status: ready`, the screen and the list update without a refresh, and "Back to draft" reverses it, asserted in a component test with the mutation stubbed and seen on the simulator.
- [ ] Marking a recipe ready while offline sends nothing, shows the offline message, and leaves the status unchanged, asserted in a test.
- [ ] The switch and the control are found by role and name in tests, and the switch reports its state through `accessibilityState`.
- [ ] The Latvian file lists every new key.
- _Manual follow-up, not a gate:_ A VoiceOver or TalkBack walkthrough of the review page, checking that the switch announces its state and that Done says what it will do.

## Open questions

None.
