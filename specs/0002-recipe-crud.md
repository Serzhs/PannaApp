# 0002: Recipe CRUD

**Status:** Draft
**Depends on:** 0001, 0003

## Context

After 0001 a user can register and log in, but the app has nothing in it. The `recipes` table exists and is empty, with no endpoints and no screens. A recipe has to exist as an owned object before ingredients, steps or sharing have anything to attach to.

## Goal

A logged-in user can create, view, edit and delete their own recipes, as metadata only.

## Out of scope

- Ingredients, steps and the `step_ingredients` link. The tables exist from 0001 and stay empty.
- Sharing. `shareToken` stays null, `visibility` stays `private`, and `GET /api/shared/:shareToken` is not implemented.
- Images. `coverImageKey` stays null and is never written or returned.
- Search, filtering, sorting controls, tags, categories, favourites.
- Pagination. A user's own list is returned in full.
- Duplicating a recipe, importing a recipe, exporting a recipe.
- Soft delete, trash, undo. Deletion is permanent.
- Any read access to a recipe by anyone other than its author.

## Data model

No new tables and no new columns. The `recipes` table from 0001 is used as-is, so this spec adds no migration.

Fields written by this spec: `title`, `description`, `servings`, `totalTimeMinutes`, `authorId`.
Fields not written by this spec: `coverImageKey`, `visibility` (stays at its `private` default), `shareToken`.

## API contract

All bodies validated by Zod schemas in `packages/shared`. All routes require a valid access token; without one they return 401 before any authorization check runs.

**Recipe response shape**, used by every endpoint below:

`{ id, title, description, servings, totalTimeMinutes, createdAt, updatedAt }`

`authorId`, `coverImageKey`, `visibility` and `shareToken` are never returned by this spec's endpoints. Sharing state becomes visible to the client in 0007, not here.

**Field rules**, shared by create and update:

- `title`: string, trimmed, 1 to 120 characters. A title that is empty after trimming is a 400.
- `description`: string or null, trimmed, up to 2000 characters.
- `servings`: integer, 1 to 100.
- `totalTimeMinutes`: integer or null, 1 to 1440.

**POST /api/recipes**
Body: `{ title, description?, servings, totalTimeMinutes? }`. Omitted optional fields are stored as null.
201: recipe response shape.
400 on validation failure.

**GET /api/recipes**
Returns every recipe owned by the caller, ordered by `updatedAt` descending, then `id` descending as a tiebreak so the order is stable when two recipes share a timestamp.
200: array of recipe response shapes. An author with no recipes gets `[]`, not a 404.

**GET /api/recipes/:recipeId**
200: recipe response shape.
404 if the recipe does not exist **or** exists and belongs to another user. The two cases are indistinguishable to the caller, so the endpoint does not reveal which recipe ids are real.

**PATCH /api/recipes/:recipeId**
Body: any subset of `{ title, description, servings, totalTimeMinutes }`. An empty body is a 400. A field present with value `null` clears it, for the two nullable fields only; `title` and `servings` cannot be set to null.
200: the updated recipe response shape, with `updatedAt` refreshed.
404 under the same rule as `GET`. A rejected update writes nothing.

**DELETE /api/recipes/:recipeId**
204 with an empty body.
404 under the same rule as `GET`, including for a recipe that was already deleted.
Rows in `ingredients`, `steps` and `step_ingredients` are removed by the existing cascades. In this spec those tables are always empty, so the cascade is untested here and is covered by 0003 and 0004.

Ownership is enforced by a guard, as `CLAUDE.md` requires, not by checks scattered through the service.

## UI

Three new routes in the `(app)` group, plus a change to the existing home screen.

**`(app)/index`** stops being the 0001 placeholder and becomes the recipe list. It keeps the logged-in display name and the logout button, now in the screen header rather than the body.

- Loading: skeleton rows in the shape of real recipe rows, never a spinner and never a flash of the empty state.
- Empty: a short line explaining there are no recipes yet, and a primary action that opens the create screen.
- Error: a message and a retry control that refetches.
- Populated: one row per recipe showing title, servings and total time when it is set. Tapping a row opens the detail screen. A control in the header opens the create screen.

**`(app)/recipes/new`**: a form for the four fields. Submit is disabled while the request is in flight. On success the app navigates to the new recipe's detail screen, and the list reflects it on return without a manual refresh. Field-level errors render against the field; a failure that is not field-specific renders once at form level.

**`(app)/recipes/[recipeId]`**: detail view showing title, description, servings and total time, with actions to edit and to delete. Metadata only. There are no placeholder sections for ingredients or steps, because those are not part of this slice. Loading, error and populated states as above; a 404 renders a "recipe not found" state with a way back to the list, not a crash.

**`(app)/recipes/[recipeId]/edit`**: the same form prefilled, submitting a PATCH. On success it returns to the detail screen showing the new values.

Deleting asks for confirmation first. On confirmation the app returns to the list and the deleted recipe is gone from it without a manual refresh.

All four screens follow the `CLAUDE.md` mobile conventions: logic in `src/features/recipes`, routes carrying routing and layout only, all colours and spacing from the unistyles theme.

## Acceptance criteria

- [ ] `pnpm typecheck`, `pnpm lint` and `pnpm test` pass across all three workspaces.
- [ ] Every one of the five endpoints returns 401 when called with no access token, and with an expired one.
- [ ] Creating a recipe returns 201 and a body whose keys are exactly the seven in the recipe response shape, with no `authorId`, `coverImageKey`, `visibility` or `shareToken`.
- [ ] `GET /api/recipes` for a user returns only that user's recipes: with two users each owning recipes, neither sees any of the other's.
- [ ] `GET /api/recipes` returns `[]` with status 200 for a freshly registered user.
- [ ] `GET`, `PATCH` and `DELETE` on a recipe owned by another user each return 404 with the same body as a `GET` for a random non-existent uuid.
- [ ] A `PATCH` rejected as 404 leaves the target row byte-identical, including `updatedAt`.
- [ ] `POST` with `title` of `"   "` returns 400 and creates no row.
- [ ] `POST` with `servings` of `0`, and with `servings` of `1.5`, each return 400.
- [ ] `PATCH` with an empty body returns 400.
- [ ] `PATCH` with `{ "description": null }` clears the description, and `PATCH` with `{ "title": null }` returns 400.
- [ ] `PATCH` updates `updatedAt`, and a recipe updated after another sorts ahead of it in `GET /api/recipes`.
- [ ] `DELETE` returns 204, and a second `DELETE` of the same id returns 404.
- [ ] In the app, creating a recipe and navigating back to the list shows it without a manual refresh, and deleting one removes it from the list the same way.
- [ ] A fresh account opening the app sees the empty state, and never sees the empty state flash before the loading state resolves.
- [ ] Opening a detail route for a recipe id that does not exist shows the not-found state with a way back to the list.

## Open questions

1. **List ordering.** This spec orders by `updatedAt` descending, so the recipe most recently worked on is first. The alternative is alphabetical by title, which is more predictable for a large collection but pushes an in-progress recipe out of sight. Which one is intended?
2. **`totalTimeMinutes` ownership.** *(Reopened by the dependency graph decision.)* Here it is a free-text number the author types. Steps carry `durationSeconds` from 0001, so from 0004 onward a total could instead be derived by summing them. Now that steps form a dependency graph, the meaningful total is the critical path through it - the longest chain of dependent durations - which is genuinely computable and is a better number than a sum, because parallel work should not be counted twice. If the field is to become derived that way, it should probably not be editable in this slice's forms at all. Is it author-entered permanently, or a placeholder until steps exist?
