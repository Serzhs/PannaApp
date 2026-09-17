# 0021: Move buttons in the card

**Status:** Done
**Depends on:** 0020

## Context

0020 left the move arrows in a column beside each card. Beside is still outside: the column
narrows every card, and a bare arrow says nothing about what it moves. The card already has a
header line - "Step 1", "Step 2" - with room at its end.

## Goal

The move controls sit inside the card, on its first line, and say what they do.

## Out of scope

- Any change to how lines are reordered underneath. The list still reports "from here to there".
- Moving a step between levels. That stays with the buttons 0008 gave it.
- Dragging. 0020 removed it and it stays removed.

## Data model

None.

## API contract

None.

## UI

The reorderable list no longer draws a column. It hands each row a ready-made control: an up
button reading "↑ Move up" and a down button reading "↓ Move down", in small text, the first
line without up and the last without down, and a line on its own with neither. Each button is a
44-point target. The owner of the list places the control where its card wants it.

**Steps.** The control sits on the header line, after "Step 1" or "Step 2a, during step 2",
aligned to the end. Nested steps get the same line as main ones.

**Ingredients and equipment.** Their cards have no header line, so the control sits on a line of
its own at the top of the card, aligned to the end. A card with nothing to move has no such line.

To a screen reader each button still announces which line it moves, as before: "Move Beetroot
up", never just "Move up".

## Acceptance criteria

- [x] `pnpm typecheck`, `pnpm lint` and `pnpm test` pass across all three workspaces. _(`pnpm check`: shared 9, API 118, mobile 819 tests.)_
- [x] In a rendered list of three, the first line has a "Move down" button and no "Move up", the
      last the reverse, the middle both, and a list of one has neither, asserted in a test. _(ReorderableList tests, by accessible name and by the visible words.)_
- [x] Pressing "Move down" on the first line reports a move from 0 to 1, asserted in a test. _(ReorderableList test "reports a move as from and to".)_
- [x] On the simulator the arrows and their words sit on the "Step N" line inside each step card,
      main and nested, and at the top of each ingredient card, with no column beside the cards. _(Seen: "↓ Move down" at the top of the beetroot card, "↑ Move up" on the "Step 2" line, cards at full width.)_
- [x] The gallery's reorderable list entry shows the control inside a card. _(The entry places the control inside its card.)_
- [x] The Latvian file lists the two new labels. _(`needs.up` "Augšup", `needs.down` "Lejup"; the key-parity test passes.)_

## Open questions

None.
