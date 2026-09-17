# 0010: Step links

**Status:** Done
**Depends on:** 0007, 0008

## Context

A recipe now has what it needs and what to do, as two separate lists. Nothing says which ingredients a step uses or which pan it needs. The `step_ingredients` and `step_equipment` tables have existed since 0001 for exactly this, and two later specs cannot start without them: cooking mode in 0012 shows only what the current step needs, and going without an ingredient in 0013 hides the steps that only used it.

## Goal

An author says which ingredients and equipment each step uses, and a reader sees them under the step.

## Out of scope

- Cooking mode, and showing a step's needs at the stove. 0012 reads these links; this spec only writes and shows them.
- Hiding steps whose ingredients are excluded. 0013.
- Amounts per step, "half the flour here, half later". A link says a step uses an ingredient, nothing more. Splitting amounts is a different data model and nobody has asked for it.
- Checking that every ingredient is linked to some step, or warning about unlinked ones. The author decides how much to link; a recipe with no links at all stays valid.
- Linking across recipes, or linking a step to an ingredient of another recipe. Refused, never supported.
- Automatic linking by matching names in the step text. It would be wrong often enough to be worse than nothing, and "chop the carrots and celery" already reads fine without a link.
- Any change to how ingredients, equipment or steps themselves are edited.

## Data model

No new tables and no new columns. `step_ingredients` and `step_equipment` from 0001 are used as they are, so there is no migration.

Both are join tables with a composite primary key on the two ids, and both cascade when either side is deleted. Deleting an ingredient through 0007's write removes its links; deleting a step through 0008's write removes its links; neither needs this spec to do anything.

**A link must stay inside one recipe.** A foreign key checks that the ingredient exists, not that it belongs to the same recipe as the step, per the Data model section of `CLAUDE.md`. That is checked in application code on write, inside the same transaction, like the other same-recipe rules.

## API contract

All routes require a valid access token and answer 401 without one. Ownership goes through the guard 0005 added: a recipe that does not exist and one that belongs to someone else both answer 404 with `RECIPE_NOT_FOUND`, with identical bodies.

**Step shape** gains two arrays in every response that carries steps, on main and nested steps alike:

```
{ ..., ingredientIds: [uuid], equipmentIds: [uuid] }
```

Each holds the ids of this recipe's ingredients and equipment the step uses, in the order of the lists they belong to. Empty arrays for a step with no links.

**PATCH /api/recipes/:recipeId** accepts, on each step in `steps`, optional `ingredientIds` and `equipmentIds`. As with the lists and the steps, what is sent is the whole truth for that step: an id present is linked, an id absent is not. A step sent without the field keeps no links, the same as sending `[]`, because the body is the complete list and a step row is written whole. Links are written in the same transaction as everything else.

A link can only name a row that will exist once the same body is written: an ingredient that carries an `id` in the body's `ingredients`, or one already in the recipe when the body does not send `ingredients`. Ingredients and equipment are written before steps for that reason. A link to a row the body deletes, or a row that never existed, or a row of another recipe, is a 400.

400 with `VALIDATION_FAILED` and a `fields` object, and nothing written, when an id in either array is not one of this recipe's rows, or an id appears twice in one array. A `fields` key names the step and array, as in `steps.2.ingredientIds` or `steps.2.children.1.equipmentIds`. A new ingredient in the same body, one with no `id` yet, cannot be linked in that body: it has no id to name. The editor links it on the next save.

Error codes this spec can return: `AUTH_TOKEN_INVALID`, `AUTH_TOKEN_EXPIRED`, `RECIPE_NOT_FOUND`, `VALIDATION_FAILED`.

## UI

**Recipe screen, `(app)/recipes/[id]`.** Under a step's timing, the ingredients it uses, each with its amount as the reader sees it, and the equipment it needs, as one short line each: "500 g beetroot, 2 eggs" and "Large bowl". A step with no links shows nothing extra. The lines are part of the step's single accessible element.

**Edit screen and the create flow's Steps page.** Under each step's fields, two rows of chips, one per ingredient and one per piece of equipment in the recipe, each a toggle showing the name; a chip is on when the step uses it. A recipe with no ingredients shows no ingredient row. A chip for a line added on the same screen and not yet saved is disabled, with a hint that it can be linked after saving, because it has no id yet.

Chips are toggles to a screen reader, with their state, and are at least 44 points tall.

**Components** added, in their own folders with styles, test and index: a chip, and a chip group that takes the list and the selected ids. The chip goes to the design gallery.

All new strings go through `t()`, in English and Latvian.

## Acceptance criteria

- [x] `pnpm typecheck`, `pnpm lint` and `pnpm test` pass across all three workspaces. _(`pnpm check`: shared 9, API 118, mobile 826 tests at the first run; one section test and one assertion added after.)_
- [x] `GET /api/recipes/:recipeId` returns `ingredientIds` and `equipmentIds` as `[]` on every step of a recipe with no links. _(e2e "reads back empty links on every step until some are set".)_
- [x] A `PATCH` linking a main step to two ingredients and a nested step to one piece of equipment stores the links, and `GET` returns the ids in the order of the lists. _(e2e "links a step to ingredients and equipment, and reads them in list order": sent as dill, beetroot; read back as beetroot, dill.)_
- [x] A `PATCH` that sends a step without `ingredientIds` after it had links removes them, and one that sends fewer ids keeps only those. _(e2e "treats the ids sent as the whole truth".)_
- [x] A `PATCH` linking an ingredient id that belongs to another user's recipe returns 400 naming `steps.0.ingredientIds` and writes nothing, and that other recipe is unchanged. _(e2e "refuses another recipe's ingredient, a stranger's or my own"; Bob's recipe is read back unchanged.)_
- [x] A `PATCH` linking an id the same body omits from `ingredients`, so the row is deleted, returns 400 and writes nothing. _(e2e "refuses a link to an ingredient the same body deletes": both ingredients still there afterwards.)_
- [x] A `PATCH` with the same id twice in one array returns 400. _(e2e "refuses a duplicate id in one step", path `steps.0.children.0.ingredientIds`.)_
- [x] Removing an ingredient through a `PATCH` removes its links, and the step it was linked to remains. _(e2e "loses the link when the ingredient goes" and "keeps links across a reorder and loses them with the step".)_
- [x] The recipe screen shows a step's linked ingredients with their amounts and its equipment, and includes them in the step's accessible name, asserted in a component test. _(StepsSection test: "Uses 500 g beetroot, dill" and "Needs blender" inside the step's label.)_
- [x] Toggling chips on the edit screen and saving shows the links on the recipe screen without a manual refresh, seen on the simulator; a chip for an unsaved line is disabled, asserted in a test. _(Simulator: kefir and blender toggled on step 2, saved, recipe screen showed "Uses 1 l kefir" and "Needs blender" at once. LinkChips test covers the disabled chip and its hint.)_
- [x] Every new component appears in the design gallery in every state. _(Chip: toggling, on, off, disabled. LinkChips: with an unsaved line.)_
- [x] The Latvian file lists every new key. _(`steps.uses`, `usesEquipment`, `usesLine`, `needsLine`, `linkAfterSave`, `errors.links`; the key-parity test passes.)_
- _Manual follow-up, not a gate:_ A VoiceOver or TalkBack walkthrough of a step with links, checking that the chips announce their state and that the step reads its links in one element.

## Open questions

None.
