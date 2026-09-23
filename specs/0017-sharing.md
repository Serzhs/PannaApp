# 0017: Sharing

**Status:** Done
**Depends on:** 0011, 0016

## Context

A recipe is the author's alone. Showing it to a friend means reading it out. The tables have carried
`shareToken` and `sourceRecipeId` since 0001 for this: a private link that opens the recipe
read-only, and Add to my recipes, which copies it.

The roadmap deferred this because a link needs the API reachable by the reader. Decided on
approval: build it now, working on the same network, and leave reaching the API from outside as
a hosting question.

## Goal

An author can share a recipe by a private link and revoke it; a reader with the app opens the
link read-only and can keep a copy of their own.

## Out of scope

- Hosting. The link carries the API's address; a reader who cannot reach it sees the offline
  state, not an explanation.
- Universal links, an App Store fallback, or a web page. The link is a `panna://` link, which
  opens the app when it is installed and does nothing elsewhere.
- Cooking from a link. A reader cooks their own copy, so `cooks` keeps needing no `userId`.
- Reviving a revoked link. Revoked is gone; sharing again makes a new token and a new link.
- Comments, likes, or anything the author can see about who opened it.
- Sharing a draft. Only a ready recipe gets a link.

## Data model

`recipes.shareToken`, 12 characters from a URL-safe alphabet, unique, null until shared.
`recipes.sourceRecipeId` records where a copy came from, and is set null if the original goes.

**The copy** made by Add to my recipes: a new recipe owned by the reader, `draft`, with the title,
description, servings, ingredients, equipment, steps with their nesting, and both link tables,
every id remapped inside one transaction. Photos are copied to new keys, decided on approval, so
the author deleting theirs cannot break the copy. Not copied: `shareToken`, `featured`, `cooks`,
`cook_notes`.

## API contract

**`POST /api/recipes/:recipeId/share`**, owner only. Makes a token if the recipe has none, and
answers `200 { token, url }` either way. A draft is `409 RECIPE_NOT_READY`.

**`DELETE /api/recipes/:recipeId/share`**, owner only, nulls the token, `204`, whether or not
one existed.

**`GET /api/shared/:token`**, unauthenticated, rate limited to 30 a minute per address. The
recipe detail without `cookCount`, `lastCookedAt` and `notes`, which are the author's own, plus
`authorName`. An unknown or revoked token is `404 SHARE_NOT_FOUND`.

**`POST /api/shared/:token/save`**, authenticated. Makes the copy and answers `201` with the
new recipe detail. Saving your own shared recipe is allowed and makes a copy like any other.
Unknown token, `404 SHARE_NOT_FOUND`.

**`GET /api/recipes/:recipeId`** gains `shareToken: string | null`, so the recipe screen knows
whether a link exists, and `sourceRecipeId`, so it can say "Saved from a link".

`url` is `panna://shared/<token>?api=<the API's public origin>`, built from a new
`PUBLIC_API_URL` in `.env`, which defaults to `http://localhost:3000`; the roadmap's hosting
question is the value of that one variable.

## UI

**Recipe screen.** A ready recipe shows "Share" under Cook. Pressing it makes the link if needed
and opens the platform's share sheet with it. Under the button, once shared, a line "Shared by
link" and "Stop sharing", which asks first and revokes. A draft shows nothing. A recipe with a
`sourceRecipeId` shows "Saved from a link" in its meta line.

**Opening a link.** `panna://shared/<token>` opens `(app)/shared/[token]`, signed in or not;
signed out, the sign-in screen comes first and the link is kept. The screen reads the recipe
through the `api` in the link, shows it exactly as the recipe screen does, headed by "Shared by
Anna", with one button, "Add to my recipes", and no Cook, Edit or Delete. Adding lands on the
copy's recipe screen. A revoked link shows "This link no longer works".

The `panna` scheme was in `app.json` but never reached the built app: the Google sign-in
override in `app.config.ts` replaced the whole URL type list. It now lists both, which means
a prebuild and a rebuild for this spec.

All new strings go through `t()`, in English and Latvian.

## Acceptance criteria

- [x] `pnpm typecheck`, `pnpm lint` and `pnpm test` pass across all three workspaces. _(`pnpm check`:
      shared 9, API 132, mobile 1173 tests.)_
- [x] Share on a ready recipe answers a 12-character token and a `panna://` url, the same token
      again on a second call; on a draft, 409; another user's recipe, 404, asserted end to end. _(`makes one link per recipe, only when ready,
  only for its owner` in recipes.e2e.test.ts.)_
- [x] `GET /api/shared/:token` needs no session and returns the recipe without notes or cook
      counts; after revoke it is 404; a made-up token is 404, asserted end to end. _(`serves a shared recipe to anyone with the
  token, and nothing once revoked`.)_
- [x] Save copies the recipe to the caller as a draft with every ingredient, piece of equipment,
      step, nesting and link intact under new ids, with photos under new keys and
      `sourceRecipeId` set; the original's cooks and notes are not copied; deleting the original
      leaves the copy whole with its photos, asserted end to end. _(`copies a shared recipe to
  whoever saves it, and the copy survives the original`.)_
- [x] The recipe screen shows Share for a ready recipe and nothing for a draft; Stop sharing asks
      and revokes, asserted in a test. _(`shares a ready recipe through the platform sheet, and
  stops sharing after asking` in RecipeDetailScreen.test.tsx.)_
- [x] The shared screen shows the recipe and "Add to my recipes", and lands on the copy; a
      revoked link shows the no-longer-works state, asserted in a test. _(SharedScreen.test.tsx.)_
- [x] On the simulator: share the soup as Jānis, open the link as Anna, add it, see it in Anna's
      list with its photo, revoke as Jānis, open the link again and see it refused.
      _(Done on the iPhone 17 Pro simulator, 23 September 2026, with the development sign-in pointed
      at Anna for the reader's half. Opened signed out, the link waited through sign-in.)_
- [x] The Latvian file lists every new key. _(The key-parity test in i18n passes.)_

## Open questions

None.
