# 0015: Cook's notes

**Status:** In progress
**Depends on:** 0014

## Context

The author's `note` on a step is part of the recipe and changes only when the recipe does. What
the cook learns is different: "needed ten minutes longer in my oven", dated, one per time it was
made, and it must never overwrite last winter's. The `cook_notes` table has waited since 0001,
and the guide is where the two kinds of note pay off side by side.

## Goal

A cook can leave a dated note on the recipe when finishing, or on a step or the recipe at any
time, and sees every note again on the recipe screen and, for a step, while cooking it.

## Out of scope

- Editing or deleting a note. They build up; a wrong one is answered by a newer one.
- Notes on shared recipes. Notes are personal and never travel; sharing is 0017.
- Any queued write but the one at finish. A note written later needs a connection, per the
  Offline section of `CLAUDE.md`, and keeps its text when the write fails.
- Photos in a note.

## Data model

`cook_notes` as defined in `CLAUDE.md`. A note's `stepId`, when set, must belong to the same
recipe; a `cookId`, when set, likewise. Both are checked on write in the same transaction.

## API contract

**`POST /api/recipes/:recipeId/cooks`** from 0014 gains an optional `note`, up to 2000
characters, trimmed, and empty means none. When the cook is created, the note is written in the
same transaction with the cook's id; when the cook already existed, nothing is written, so a
resent record cannot add a second note.

**`POST /api/recipes/:recipeId/notes`**, owner only. Body `{ body, stepId? }`, strict; `body`
1 to 2000 characters after trimming, `stepId` a uuid of one of this recipe's steps or absent.
Answers `201` with the note. A step of another recipe, or none at all, is `400 VALIDATION_FAILED`
naming `stepId` as `UNKNOWN_ID`.

**`GET /api/recipes/:recipeId`** gains `notes`, every note newest first, each
`{ id, stepId, cookId, body, createdAt }`. The guide's recipe copy carries them too.

Deleting a recipe or a step cascades to its notes; deleting nothing else touches them.

## UI

**Finishing a cook.** Finish opens a sheet, "Anything for next time?", with a multiline field
and two bars: "Save and finish" and "Finish without a note". Either records the cook as 0014
does; the first puts the note in the same queued record, so both reach the server together or
wait together.

**Recipe screen.** A section "Your notes" under the steps. Each note shows its date, formatted
through `Intl`, "On step 2" when it belongs to a step, and its text; newest first. Under them
"Add a note", which opens a field with Save. Saving needs a connection: offline, the offline
message and the text stays; a failure likewise. On success the note appears at the top.

**The guide.** Under a step's author note, the cook's own notes on that step, each with its
date, in the same card. Under them "Add a note", opening a field and Save as above; on success
the note joins the card at once.

**The check** shows nothing new: notes are for reading with a step, not for shopping.

**Components**: a note list, and a note composer used in both places, each in its own folder
with styles, test and index, with gallery entries.

All new strings go through `t()`, in English and Latvian.

## Acceptance criteria

- [ ] `pnpm typecheck`, `pnpm lint` and `pnpm test` pass across all three workspaces.
- [ ] Recording a cook with a note writes the note with the cook's id; the same record again
      writes no second note; the detail lists notes newest first, asserted end to end.
- [ ] `POST notes` writes a recipe note and a step note; a step of another recipe returns 400
      naming `stepId`; another user's request is 404; a blank body is 400, asserted end to end.
- [ ] Finish with text queues the cook with the note; without text, without one, asserted in a
      test on the cook screen.
- [ ] The recipe screen lists notes with dates and step references and adds one on Save; offline
      it shows the message and keeps the text, asserted in a test.
- [ ] The guide shows a step's notes under the author's note and adds one, asserted in a test.
- [ ] On the simulator: the seeded soup shows two notes; add one from the recipe screen; cook to
      the end and finish with a note; see three notes.
- [ ] The Latvian file lists every new key.

## Open questions

None.
