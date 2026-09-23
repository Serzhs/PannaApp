# 0005: Recipe CRUD

**Status:** Done
**Depends on:** 0003, 0004

**Changed by 0025:** the first page of creating also carries the lists and continues to the steps; servings is picked from a row; the edit screen is three tabs.

## Context

After 0003 a user can register and log in, but the app has nothing in it. The `recipes` table exists and is empty, with no endpoints and no screens. A recipe has to exist as an owned object before ingredients, steps or sharing have anything to attach to.

## Goal

A logged-in user can create, view, edit and delete their own recipes, as metadata only.

## Out of scope

- Ingredients, steps and the `step_ingredients` link. The tables exist from 0001 and stay empty.
- Sharing. `shareToken` stays null and `GET /api/shared/:shareToken` is not implemented.
- Images. `coverImageKey` stays null and is never written or returned.
- Search, filtering, sorting controls, tags, categories, favourites.
- Pagination. A user's own list is returned in full.
- The in-progress section of the home screen. Cooking does not exist until 0012, so there is nothing to be part-way through. The list ships as one section here and gains the other above it later.
- The Cook button on the detail screen. Same reason.
- Offline editing and any mutation queue. Reads are cached per the Offline section of `CLAUDE.md`; writes require a connection.
- Duplicating a recipe, importing a recipe, exporting a recipe.
- Soft delete, trash, undo. Deletion is permanent.
- Any read access to a recipe by anyone other than its author.

## Data model

No new tables and no new columns. The `recipes` table created in 0001 is used as-is, so this spec adds no migration.

Fields written by this spec: `title`, `description`, `servings`, `totalTimeMinutes`, `authorId`.
Fields not written by this spec: `coverImageKey`, `shareToken`.

## API contract

All bodies validated by Zod schemas in `packages/shared`. All routes require a valid access token; without one they return 401 before any authorization check runs.

**Recipe response shape**, used by every endpoint below:

`{ id, title, description, status, servings, totalTimeMinutes, createdAt, updatedAt }`

`authorId`, `coverImageKey` and `shareToken` are never returned by this spec's endpoints. Sharing state becomes visible to the client in 0017, not here.

**Field rules**, shared by create and update:

- `title`: string, trimmed, 1 to 120 characters. A title that is empty after trimming is a 400.
- `description`: string or null, trimmed, up to 2000 characters.
- `servings`: integer, 1 to 100.
- `totalTimeMinutes`: integer or null, 1 to 1440.

**POST /api/recipes**
Body: `{ title, description?, servings, totalTimeMinutes? }`. Omitted optional fields are stored as null. `status` is not accepted here: every new recipe starts as `draft`.
201: recipe response shape.
400 on validation failure.

**GET /api/recipes**
Returns every recipe owned by the caller, ordered by `updatedAt` descending, then `id` descending as a tiebreak so the order is stable when two recipes share a timestamp.
200: array of recipe response shapes. An author with no recipes gets `[]`, not a 404.

**GET /api/recipes/:recipeId**
200: recipe response shape.
404 if the recipe does not exist **or** exists and belongs to another user. The two cases are indistinguishable to the caller, so the endpoint does not reveal which recipe ids are real.

**PATCH /api/recipes/:recipeId**
Body: any subset of `{ title, description, status, servings, totalTimeMinutes }`. `status` moves a recipe between `draft` and `ready` in both directions, because a finished recipe can turn out to need more work. An empty body is a 400. A field present with value `null` clears it, for the two nullable fields only; `title` and `servings` cannot be set to null.
200: the updated recipe response shape, with `updatedAt` refreshed.
404 under the same rule as `GET`. A rejected update writes nothing.

**DELETE /api/recipes/:recipeId**
204 with an empty body.
404 under the same rule as `GET`, including for a recipe that was already deleted.
Rows in `ingredients`, `steps` and `step_ingredients` are removed by the existing cascades. In this spec those tables are always empty, so the cascade is untested here and is covered by 0007 and 0008.

Ownership is enforced by a guard, as `CLAUDE.md` requires, not by checks scattered through the service.

## UI

Three new routes in the `(app)` group, plus a change to the existing home screen.

**`(app)/index`** stops being the 0003 placeholder and becomes the recipe list. It keeps the logged-in display name and the logout button, now in the screen header rather than the body.

- Loading: skeleton rows in the shape of real recipe rows, never a spinner and never a flash of the empty state.
- Empty: a short line explaining there are no recipes yet, and a primary action that opens the create screen.
- Error: a message and a retry control that refetches. Being offline is its own state with its own wording, not a generic failure, because the user can act on one and not the other.
- Populated: one row per recipe showing title, servings and total time when it is set. A recipe in `draft` carries a chip saying so, and the chip is text rather than only a colour. Tapping a row opens the detail screen. A control in the header opens the create screen.

**`(app)/recipes/new`**: the first page of the create flow. Creating a recipe is four pages - basics, what you need, the steps, then a review - but only the first exists until 0007 and 0008 add the others, so here it is one page that saves a draft and lands on the recipe. The flow grows into a wizard rather than arriving as one, and this spec builds the shell it grows in.

A form for the four fields. Submit is disabled while the request is in flight. On success the app navigates to the new recipe's detail screen, and the list reflects it on return without a manual refresh. Field-level errors render against the field; a failure that is not field-specific renders once at form level.

**`(app)/recipes/[id]`**: detail view showing title, description, servings and total time, with actions to edit and to delete. Metadata only. There are no placeholder sections for ingredients or steps, because those are not part of this slice. Loading, error and populated states as above; a 404 renders a "recipe not found" state with a way back to the list, not a crash.

**`(app)/recipes/[id]/edit`**: the whole recipe on one screen, prefilled, submitting a PATCH. Editing never uses the create flow's pages - someone fixing one wrong quantity should not be walked through a wizard to reach it. On success it returns to the detail screen showing the new values.

Deleting asks for confirmation first. On confirmation the app returns to the list and the deleted recipe is gone from it without a manual refresh.

All four screens follow the `CLAUDE.md` mobile conventions: logic in `src/features/recipes`, routes carrying routing and layout only, all colours and spacing from the typed theme module.

## Acceptance criteria

- [x] `pnpm typecheck`, `pnpm lint` and `pnpm test` pass across all three workspaces.
- [x] Every one of the five endpoints returns 401 when called with no access token, and with an expired one. _(Tested.)_
- [x] Creating a recipe returns 201 and a body whose keys are exactly the eight in the recipe response shape, with no `authorId`, `coverImageKey` or `shareToken`. _(Tested.)_
- [x] `GET /api/recipes` for a user returns only that user's recipes: with two users each owning recipes, neither sees any of the other's. _(Tested.)_
- [x] `GET /api/recipes` returns `[]` with status 200 for a freshly registered user. _(Tested.)_
- [x] `GET`, `PATCH` and `DELETE` on a recipe owned by another user each return 404 with the same body as a `GET` for a random non-existent uuid. _(Tested. A malformed id is a 404 too, not a 500.)_
- [x] A `PATCH` rejected as 404 leaves the target row byte-identical, including `updatedAt`. _(Tested.)_
- [x] `POST` with `title` of `"   "` returns 400 and creates no row. _(Tested.)_
- [x] `POST` with `servings` of `0`, and with `servings` of `1.5`, each return 400. _(Tested.)_
- [x] `PATCH` with an empty body returns 400. _(Tested.)_
- [x] A newly created recipe has `status` of `draft`, and a `POST` body containing `status` is rejected as an unknown field. _(Tested. The 400 names `status` in `fields`.)_
- [x] `PATCH` moves a recipe from `draft` to `ready` and back again. _(Tested. No screen in this spec offers the change; the UI section names none, so it waits for the review page of the create flow.)_
- [x] A draft recipe shows a chip in the list that reads as text, not colour alone, and a screen reader announces it as part of the row. _(Tested: the row's one accessible name ends in "draft". Seen on the simulator.)_
- [x] `PATCH` with `{ "description": null }` clears the description, and `PATCH` with `{ "title": null }` returns 400. _(Tested.)_
- [x] `PATCH` updates `updatedAt`, and a recipe updated after another sorts ahead of it in `GET /api/recipes`. _(Tested.)_
- [x] `DELETE` returns 204, and a second `DELETE` of the same id returns 404. _(Tested.)_
- [x] In the app, creating a recipe and navigating back to the list shows it without a manual refresh, and deleting one removes it from the list the same way. _(Verified on an iPhone 17 Pro simulator, along with edit.)_
- [x] A fresh account opening the app sees the empty state, and never sees the empty state flash before the loading state resolves. _(Verified on the simulator on 23 September 2026 with Anna's one recipe deleted. It found a leak on the way: cooking progress is device-local and keyed by recipe, so Anna saw Jānis's cook in progress. Cook records and queued cooks now carry the owner's id, and only the signed-in person's show or send. A record from before carries none and shows to nobody.)_
- [x] Opening a detail route for a recipe id that does not exist shows the not-found state with a way back to the list. _(Verified on the simulator, 23 September 2026, through the `panna://` scheme 0017 made work: "Recipe not found" with "Back to recipes".)_
- [x] The query cache is persisted: opening a recipe, force-quitting the app, going offline and reopening it shows the recipe rather than an error. _(Verified on the simulator, 23 September 2026, with the API stopped in place of a network cut, which this machine cannot do without cutting its own: after a force-quit the list and the recipe render from the cache.)_
- [x] Creating a recipe with no connection fails with an offline message, keeps everything the user typed, and creates nothing when the connection returns. _(Verified on the simulator with the API stopped, 23 September 2026: the fields keep their text and the list after the API returns holds no new row. The line shown was "Could not save the recipe" rather than the offline one, correctly: the phone was online and only the server was gone. The no-connection case itself is `sends nothing offline, keeps what was typed, and says so` in RecipeForm.test.tsx.)_
- _Manual follow-up, not a gate:_ A VoiceOver or TalkBack walkthrough of the list, create, detail and edit screens reaches every control in a sensible order. Each recipe row is one element announcing title, servings and time together, not four separate stops, and the delete confirmation announces itself and returns focus to the list afterwards.

## Open questions

None.

## Decided

**Most recently edited first.** The list orders by `updatedAt` descending, so the recipe being worked
on stays at the top. Alphabetical is more predictable for a large collection but pushes an in-progress
recipe out of sight, and nobody has a large collection yet. Sorting controls are a later spec.

**`totalTimeMinutes` is author-entered here and derived from 0008.** Until steps exist there is nothing
to sum, so this spec keeps it a number the author types. Once 0008 lands it becomes the sum of the main
steps' durations - nested steps happen inside those and correctly add nothing - and stops being
editable. A computed number cannot drift out of date when someone edits a step, which a typed one
always eventually does. 0008 owns removing the field from the form.
