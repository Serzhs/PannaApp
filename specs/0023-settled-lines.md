# 0023: Settled lines

**Status:** Draft
**Depends on:** 0007, 0020, 0021

## Context

On the "What you need" page, and on the edit screen, adding an ingredient opens a card of empty
fields and leaves it there. Nothing says whether the line counts yet, and a half-typed line looks
the same as a finished one. Clicking through after 0022 made it plain: a line should be approved
by its author before it sits in the list.

## Goal

An ingredient or piece of equipment is either being written, with Add and Cancel, or settled in
the list as one line with Edit and Remove.

## Out of scope

- Saving a line to the server on Add. Add settles the line on screen; Done and Save changes still
  send the whole recipe, as 0007 and 0009 built it. A line can therefore still not be linked from a
  step until the recipe is saved, per 0010.
- Steps. They keep their cards from 0020 and 0022; a step is written in the card it lives in.
- Any change to the data model, the API, or what a line can hold.
- Reordering settled lines by anything other than the move buttons from 0021.

## Data model

None.

## API contract

None.

## UI

**Both lists, on the create page and the edit screen.** A line is in one of two states.

_Open_: the card of fields from 0007, name, amount, unit and note for an ingredient, name, note and
the optional switch for equipment, with two buttons under them, "Add" and "Cancel". "Add ingredient"
and "Add equipment" open a fresh card at the end of the list. Add checks the line the way Done
does, a name at least and a decimal amount if any, shows the field's error and stays open if it
fails, and otherwise settles the line. Cancel on a new line removes it; on a reopened line it puts
the values back as they were and settles it again.

_Settled_: one row reading the line as the recipe screen will, "500 g beetroot" with the note under
it, or "grater, optional" with its note, and two buttons, "Edit" and "Remove". Edit reopens the
card with the current values. Remove takes the line out, as before. The move buttons from 0021 sit
on the row's first line as they do on every card.

A line loaded from a saved recipe starts settled. A line the author has just added starts open.

**Done and Save changes** send every line, open or settled, so nothing typed is lost; an open line
that would fail is flagged in place exactly as it is today. A line the server refuses after a save
reopens with its error, so the author can see what to fix.

**Component**: the settled row is a new component in its own folder with styles, test and index,
with a gallery entry showing an ingredient row, an equipment row with the optional mark, and one
with a note. The line editors and the needs editor change in place.

All new strings go through `t()`, in English and Latvian.

## Acceptance criteria

- [ ] `pnpm typecheck`, `pnpm lint` and `pnpm test` pass across all three workspaces.
- [ ] "Add ingredient" opens a card with Add and Cancel; Add with an empty name shows the name error
      and keeps the card open; Add with a name settles it into a row reading the amount, unit and
      name, asserted in a test.
- [ ] Cancel on a new line removes it; Edit on a settled row reopens it with its values; Cancel
      after an edit restores the old values, asserted in a test.
- [ ] A recipe loaded for editing shows every line settled, asserted in a test.
- [ ] Done on the create page with one line settled and one still open sends both, asserted in a
      test on the validation helper the page uses.
- [ ] On the simulator: add two ingredients and one piece of equipment, settle them, edit one, save,
      and the recipe screen shows the three lines.
- [ ] The Latvian file lists every new key.

## Open questions

None.
