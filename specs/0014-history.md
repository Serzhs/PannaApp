# 0014: Recipe history

**Status:** Done
**Depends on:** 0013

## Context

A cook ends and leaves no trace. The recipe screen cannot say "made six times, last on 12 January",
and 0015's notes have nothing to hang off. The `cooks` table has waited for this since 0001.

## Goal

Every finished cook is recorded, sent when there is a connection and kept until then, and the
recipe screen says how often and how recently it was made.

## Out of scope

- Abandoned cooks. Stop cooking writes nothing: a row with a null `finishedAt` is allowed by the
  table, and nothing here creates one. Decided here so history reads as meals, not attempts.
- Editing or deleting a history row. History is append-only; that is what makes the queue safe.
- Any other queued write. The Offline section of `CLAUDE.md` allows exactly this one.
- A history screen or list. The recipe screen gets one line; the rest is later.
- Notes. 0015 rides on the same queued record, and adds them.

## Data model

`cooks` as defined in `CLAUDE.md`. `excluded` holds the names of the ingredients gone without,
taken from the recipe copy at the moment of finishing, never their ids.

On the device, `panna.cookQueue`: a list of finished cooks not yet acknowledged by the server,
each `{ id, recipeId, startedAt, finishedAt, excluded }`. `id` is made on the device, so a record
sent twice, because the answer was lost, lands once.

## API contract

**`POST /api/recipes/:recipeId/cooks`**, owner only. Body `{ id, startedAt, finishedAt,
excluded }`, strict; `id` a uuid, the times ISO strings with `finishedAt` not before `startedAt`,
`excluded` up to 100 names of up to 120 characters. Answers `201` with the cook. The same `id`
sent again answers `200` with the existing row and writes nothing, which is what lets the device
retry blindly. Another user's recipe is `404 RECIPE_NOT_FOUND`; a bad body `400 VALIDATION_FAILED`.

**`GET /api/recipes/:recipeId/cooks`**, owner only, the recipe's cooks newest first, at most 50.

**`GET /api/recipes/:recipeId`** gains `cookCount` and `lastCookedAt: string | null`, so the recipe
screen needs no second request. Both derive from `cooks` and update with each finished cook.

Deleting a recipe still cascades to its cooks.

## UI

**Finish** on the guide writes the cook to the device queue, then clears the cook as before.
The queue is sent whenever the app is online and signed in: at once if it is, and otherwise the
next time the connection returns or the app comes to the foreground. A sent record is dropped
from the queue only when the server has answered; a failed send stays and is tried again later,
never shown to the user as an error. The recipe's detail is refreshed after a successful send.

**Recipe screen.** Under the servings line, "Made 6 times · last on 12 January 2026", or "Made
once · today", formatted through `Intl` in the user's language. Nothing when never made. While
a cook is queued but unsent, the line counts it too, so the person who just finished sees it.

No new components. All new strings go through `t()`, in English and Latvian.

## Acceptance criteria

- [x] `pnpm typecheck`, `pnpm lint` and `pnpm test` pass across all three workspaces. _(`pnpm check`: shared 9, API 127, mobile 1078 tests.)_
- [x] `POST` records a cook with its names, answers 201, and the same body again answers 200
      without a second row; the recipe's `cookCount` and `lastCookedAt` follow; another user's
      request is 404 and writes nothing, asserted end to end. _(e2e "records a cook once however many times it arrives, and the recipe counts it".)_
- [x] `finishedAt` before `startedAt`, a non-uuid `id`, and 101 names each return 400, asserted
      end to end. _(e2e "rejects ..." for the three bodies.)_
- [x] Finish queues the record and, online, sends it and empties the queue; offline, the record
      stays queued and is sent when the connection returns, asserted with the store and the
      network faked. _(history.test "queues a finished cook ... and sends it when online" and "keeps the record while offline or after a failed send".)_
- [x] A send that fails leaves the record in the queue, asserted in a test. _(history.test, the failed send case; a 404 drops it instead, "drops a cook the server will never accept".)_
- [x] The recipe screen shows the made line from the detail, counts a queued cook, and shows
      nothing when never made, asserted in a test. _(RecipeDetailScreen test "says how often and how recently it was made, counting a cook not yet sent".)_
- [x] On the simulator: finish a cook, see "Made once · today" on the recipe. _(Seen: Finish landed on the recipe with "Made once · today"; the server listed the cook and the detail carried the count and the time.)_
- [x] The Latvian file lists every new key. _(the `made` group with its zero, one and other forms; the key-parity test passes.)_

## Open questions

None. Decided while the author was away: abandoned cooks are not recorded; and a queued cook the
server refuses for good, because the recipe is gone or the body is bad, is dropped rather than
retried forever, while a missing connection, a missing session or a server fault keep it queued.
