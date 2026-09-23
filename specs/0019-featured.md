# 0019: Featured recipes

**Status:** Done
**Depends on:** 0017, 0018

## Context

A new account opens on an empty list. `recipes.featured` has been in the table since 0001 for
exactly this: a handful of recipes we wrote, marked in the database and never by the app, so
there is somewhere to start. 0018 left the tab bar with two tabs and a gap where Featured goes.

Nothing here is user-generated. That is what removes the spam problem rather than managing it:
no moderation, no report button, no cap on how many recipes somebody keeps.

## Goal

A signed-in person can browse and search the recipes we wrote, read one, and keep a copy.

## Out of scope

- Any way to set `featured` from the app or the API. It is set in the database by hand, and
  the seed sets it for the recipes it writes.
- Rankings: no "most copied", no "latest". Both were rankings over a stream of posts that does
  not exist.
- Searching your own recipes. The search box lives on Featured only; your list is short enough
  to scroll, and a search there is its own spec if it ever earns one.
- Searching ingredients, descriptions or steps. Title only, as the roadmap decided.
- Cooking a featured recipe without keeping it first. Cooking needs the recipe in your list, so
  `cooks` keeps needing no `userId`.
- Categories, tags, or a hero image on the tab. A list with a search box.
- Photos of the featured recipes coming from anywhere but the seed. They are development data
  with the same attribution file as the rest.

## Data model

Nothing new. `recipes.featured` (boolean, default false, indexed) is read for the first time.
The trigram extension `pg_trgm` was created in the first migration for this; no index is added,
because the featured set is a handful of rows and a sequential scan is the right plan.

**The seed** gains a fourth user, Panna (`panna@example.com`), who owns three featured, ready
recipes with a real photo each, attributed in `seed-photos/ATTRIBUTION.md`: grey peas with
bacon, sklandrausis, and pancakes. They are Latvian classics because the second language is
Latvian, and the seed's other recipes already are.

## API contract

All three need a session. A featured recipe is readable by anyone signed in, so ownership plays
no part; an id that is not featured answers `404 RECIPE_NOT_FOUND`, the same body as an id that
does not exist.

**`GET /api/featured?q=`**. The featured recipes with status `ready`, as the list shape
(`recipeSchema`), ordered by title. With `q`, only titles that contain it or are near it by
trigram similarity, nearest first, so `pankukas` finds `Pankūkas`. `q` is trimmed and capped
at 80 characters; blank means no filter. A malformed query is `400 VALIDATION_FAILED`.

**`GET /api/featured/:recipeId`**. The recipe as a reader sees it: `sharedRecipeSchema`, which
is the detail without the author's cooks and notes, plus `authorName`.

**`POST /api/featured/:recipeId/save`**. The same copy as saving a shared recipe (0017): a new
draft owned by the caller, every id remapped, photos copied to new keys, `sourceRecipeId` set,
answered `201` with the detail. The copy code is shared with 0017, not duplicated.

Error codes: `VALIDATION_FAILED`, `RECIPE_NOT_FOUND`, and the usual `AUTH_*` for a missing session.

## UI

**Tab bar.** A third tab, Featured, between Recipes and You, with its own stack.

**Featured list.** A search field at the top, then the recipes as rows like your own list, with
the photo, the title, servings and time, and no chips: nothing here is a draft and nothing is
new. Typing filters after a short pause, so a request is not sent per keystroke. States: loading;
the list; an empty search, "Nothing matches"; an empty tab with no search, "Nothing here yet",
which only a database with no featured rows shows; offline with a cached list shows the list;
offline with nothing cached, or a failed request, shows the usual error state with Retry.

**Featured recipe.** Opening a row shows the recipe read-only, exactly as a shared recipe is
shown (0017), headed by "By Panna" from `authorName`, with one button, "Add to my recipes",
and no Cook, Edit or Delete. Adding lands on the copy's recipe screen, which carries "Saved from
a link" as any copy does. The read-only screen is one component used by both the shared and
the featured screens; the data source is the only difference.

All new strings go through `t()`, in English and Latvian. New components follow the
one-folder-per-component layout.

Found while building: the seed inserts rows directly, so it has to sum the main steps' minutes
into `totalTimeMinutes` itself, which the API does on every write. And the overnight soak in the
grey peas is untimed, or the recipe reads as thirteen hours.

## Acceptance criteria

- [x] `pnpm typecheck`, `pnpm lint` and `pnpm test` pass across all three workspaces. _(`pnpm check`:
      shared 9, API 137, mobile 1248 tests.)_
- [x] `GET /api/featured` lists featured ready recipes only, ordered by title; a featured draft
      and an unfeatured ready recipe are absent; `q` with a typo still finds the title; a blank
      `q` is no filter; an over-long `q` is 400; no session is 401, asserted end to end. _(`lists the
featured ready recipes by title, and searches by title with a typo` in featured.e2e.test.ts.)_
- [x] `GET /api/featured/:id` answers the read-only shape for a featured recipe to a user who
      does not own it, without notes or cook counts, and 404 for an unfeatured recipe of another
      user, asserted end to end. _(`serves a featured recipe read-only to anyone signed in, and
hides the rest`.)_
- [x] `POST /api/featured/:id/save` copies the recipe to the caller as a draft with lists, steps,
      nesting, links and photos under new ids and keys, `sourceRecipeId` set, and 404 for an
      unfeatured id, asserted end to end. _(`copies a featured recipe to whoever saves it`; the copy
      code is one method shared with 0017.)_
- [x] The featured list shows the rows without chips, filters through the query after a pause,
      shows "Nothing matches" for an empty result, and opens a row, asserted in a test.
      _(FeaturedScreen.test.tsx, and the plain row in RecipeRow.test.tsx.)_
- [x] The featured recipe screen shows the recipe headed "By Panna" with only "Add to my
      recipes", and lands on the copy, asserted in a test. _(FeaturedRecipeScreen.test.tsx.)_
- [x] The seed creates Panna's three featured recipes with photos, and `pnpm db:seed` twice
      leaves three, asserted by running it. _(Run twice on 23 September 2026: three seeded, then
      none.)_
- [x] On the simulator: the Featured tab lists the three with photos; searching `pankukas`
      finds the pancakes; opening one and adding it puts it in Jānis's list with its photo. _(Done on
      the iPhone 17 Pro simulator, 23 September 2026. After adding, the Featured tab pops back to
      its list and the copy opens in the Recipes tab, where it now lives.)_
- [x] The Latvian file lists every new key. _(The key-parity test in i18n passes.)_

Manual follow-up, not gating: a VoiceOver walkthrough of the Featured tab and the search field,
per the Accessibility section of CLAUDE.md.

## Open questions

None. The three seed recipes were approved as proposed.
