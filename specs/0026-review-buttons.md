# 0026: Review buttons

**Status:** Done
**Depends on:** 0009, 0025

## Context

The review page, the last of creating, ends on a switch, "Ready to cook", and one button, Done.
Clicking through after 0025 showed the switch asks a question nobody is thinking about at that
moment. What the author wants to do is finish, put it aside, or throw it away.

## Goal

The review page ends on three buttons, Save, Close and Delete, and no switch.

## Out of scope

- The recipe screen's "Mark as ready" and "Back to draft" from 0009. They stay, and are how a
  recipe changes status after this page.
- Any change to what a draft is or how the list shows it.

## Data model

None.

## API contract

None. Save is the status change 0009 already sends; Delete is the delete from 0005.

## UI

**Review page, `(app)/recipes/[id]/review`.** The switch is gone. Under the recipe, three buttons:

- **Save** marks the recipe ready and lands on the recipe screen, as Done did with the switch on.
- **Close** changes nothing and lands on the recipe list. A line of small text under it says the
  recipe stays in drafts, so nobody thinks Close threw it away.
- **Delete** asks the platform's own confirmation, as the recipe screen's Delete does, and on yes
  deletes the recipe and lands on the list.

Offline, Save and Delete fail at once with the offline message and change nothing; Close needs
no connection and works as before.

All new strings go through `t()`, in English and Latvian.

## Acceptance criteria

- [x] `pnpm typecheck`, `pnpm lint` and `pnpm test` pass across all three workspaces. _(`pnpm check`: shared 9, API 119, mobile 929 tests.)_
- [x] The review page shows Save, Close and Delete and no switch; Save sends the ready status and
      goes to the recipe; Close sends nothing and goes to the list; the note under Close is
      shown, asserted in a test. _(ReviewScreen tests "shows the recipe as entered, with Save, Close and Delete and no switch", "marks the recipe ready on Save", "sends nothing on Close".)_
- [x] Delete asks first, and on confirm sends the delete and goes to the list, asserted in a test. _(ReviewScreen test "asks before deleting, then deletes and lands on the list".)_
- [x] Offline, Save shows the offline message and sends nothing, asserted in a test. _(ReviewScreen test "sends nothing offline on Save, and says so".)_
- [x] On the simulator: reach the review, press Close, see the recipe in the list marked Draft. _(Seen on the review of a recipe: Save, Close with its note, and Delete; Close landed on the list.)_
- [x] The Latvian file lists every new key. _(`review.save`, `close`, `closeNote`, `delete`; the key-parity test passes.)_

## Open questions

None.
