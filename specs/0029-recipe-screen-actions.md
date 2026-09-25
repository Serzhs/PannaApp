# 0029: Recipe screen actions

**Status:** In progress
**Depends on:** 0014, 0015, 0017, 0018

## Context

The recipe screen has grown a column of buttons at the bottom: Cook, Mark as ready, Share,
Stop sharing, Edit, Delete. The one that matters, Cook, is the one you scroll to. Notes can
be added from the middle of the screen, which is not when anyone has anything to say; a note
is what you learned making it, and that moment is the end of a cook or looking back at one.

## Goal

Cook is always in reach, everything else moves to the header, and notes are written where
they belong: at the end of a cook, or from the history of cooks.

## Out of scope

- Editing or deleting a note. Notes are append-only, as 0015 decided.
- Editing or deleting a cook.
- Any change to cook mode itself, to the finish sheet, or to what a step shows while cooking.
- Sharing a draft, reviving a link, or any change to what sharing does.
- The featured and shared read-only screens. They keep their one button.
- A history across recipes. This is one recipe's history.

## Data model

Nothing new. `cook_notes.cookId` has been there since 0001 and is written only by the finish
sheet; this spec lets a note be added to a cook after the fact.

## API contract

**`POST /api/recipes/:recipeId/notes`** (0015) accepts an optional `cookId`, which must name
a cook of this recipe; one that does not is `400 VALIDATION_FAILED` with
`fields.cookId: UNKNOWN_COOK`, and nothing is written. `stepId` and `cookId` may both be
absent; a note with a `cookId` shows under that cook.

**`GET /api/recipes/:recipeId/cooks`** (0014) is unchanged and is read for the first time by
the app.

No new endpoints, no new error codes.

## UI

**Header.** On the right, for a recipe you own: a share icon, only when the recipe is ready,
which does exactly what the Share button did, and a three-dots icon that opens the platform's
own action sheet with Edit, Mark as ready for a draft, Stop sharing when there is a link, and
Delete, which still asks first. Each icon carries a label for a screen reader. The buttons
those actions had leave the body of the screen, as does the "Shared by link" line: the share
icon shows filled when a link exists and outlined when not, and the sheet says which.

**Cook.** A bar pinned to the bottom of the screen, above the tab bar, with Cook or Continue
cooking, whatever is scrolled. It is there only when the recipe has steps, exactly as the
button was. The body scrolls under it and ends with enough room that the last line is never
hidden behind it.

**Notes and history.** Add a note leaves the recipe screen; "Your notes" stays, read-only, as
decided on approval: the notes are useful while deciding what to cook, and only writing one
moves. The line "Made 3
times · last on 14 September" becomes a link, "Made 3 times · last on 14 September ›", opening
the History screen; a recipe never made shows nothing there. A note written at the end of a
cook still rides with that cook (0015), and a step's notes still show while cooking that step.

**History screen**, `(app)/(tabs)/(recipes)/recipes/[id]/history`, titled History. Newest cook
first, each as a card: the date, how long it took, what was left out if anything, and the notes
written on that cook. Under each card, Add a note, which opens the same composer the recipe
screen had and saves with that cook's id. Notes that belong to no cook, which is any written
from the recipe screen before this spec or on a step, sit under a last heading, "Other notes",
with the step named where there is one. A cook finished but not yet sent (0014) shows as a card
too, without Add a note, since it has no id on the server yet. States: loading; the list; the
usual error state with Retry; offline with a cached list shows the list.

All new strings go through `t()`, in English and Latvian. `ActionMenu`, `HeaderIcon`, `CookBar`
and `CookCard` follow the one-folder-per-component layout, with gallery entries.

## Acceptance criteria

- [ ] `pnpm typecheck`, `pnpm lint` and `pnpm test` pass across all three workspaces.
- [ ] `POST .../notes` with a `cookId` of this recipe stores it and the detail returns the note
      with that `cookId`; with a `cookId` of another recipe's cook, or a made-up one, 400 with
      `fields.cookId: UNKNOWN_COOK` and nothing written, asserted end to end.
- [ ] The recipe screen's body holds no Edit, Delete, Share, Stop sharing, Mark as ready or Add
      a note button, and still lists the notes; the three-dots sheet lists Edit and Delete, adds Mark as ready for a draft
      and Stop sharing when shared, and Delete still asks; the share icon is present for a ready
      recipe and absent for a draft, asserted in a test.
- [ ] Cook, or Continue cooking, is rendered outside the scrolling body, present with steps and
      absent without, asserted in a test.
- [ ] The made line opens History when there is a cook, and is plain text or absent when there
      is none, asserted in a test.
- [ ] History lists the cooks newest first with their notes, a pending cook without Add a note,
      unattached notes under Other notes, and Add a note on a cook sends the body with that
      `cookId`, asserted in a test.
- [ ] On the simulator: the soup's header shows the share and menu icons; the menu's Delete asks;
      Cook stays put while the body scrolls; the made line opens History showing the two seeded
      cooks and their notes; a note added to the first cook appears under it.
- [ ] The Latvian file lists every new key.

Manual follow-up, not gating: a VoiceOver pass over the header icons, the action sheet and the
pinned bar, per the Accessibility section of CLAUDE.md.

## Open questions

None. Decided on approval: Mark as ready goes in the three-dots menu, and the recipe screen
keeps its notes read-only.
