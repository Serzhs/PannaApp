# 0032: The New menu

**Status:** In progress
**Depends on:** 0016, 0029

## Context

New opens the manual form, and the way to paste a recipe from an AI is a link at the top of
that form. So the two ways in are not equals: one is the door and the other a sign inside it.
They are two different jobs, writing and pasting, and the choice belongs before either screen.

## Goal

New asks which way first: write it yourself, or paste one from your AI, and each opens its own
screen.

## Out of scope

- Any change to what either screen does once open.
- A third way in, such as a photo of a recipe or a URL. The app never fetches anything.
- Remembering the last choice.

## Data model

Nothing.

## API contract

No endpoints, no changes.

## UI

**New** in the list header, and the empty list's "New recipe" button, open the platform's own
menu (the sheet 0029 introduced) titled "New recipe" with two actions: "Write it myself" and
"Paste from your AI", then Cancel. The first opens the manual form, the second the import
screen. The link "Paste one from your AI instead" leaves the manual form: the choice was made
one tap earlier.

All new strings go through `t()`, in English and Latvian. No new components.

## Acceptance criteria

- [ ] `pnpm typecheck`, `pnpm lint` and `pnpm test` pass across all three workspaces.
- [ ] New opens the menu with the two actions; each lands on its screen; the manual form no
      longer carries the import link, asserted in tests.
- [ ] The empty list's button opens the same menu, asserted in a test.
- [ ] On the simulator: New shows the sheet; "Paste from your AI" opens the import screen;
      "Write it myself" opens the form without the link.
- [ ] The Latvian file lists every new key.

## Open questions

None.
