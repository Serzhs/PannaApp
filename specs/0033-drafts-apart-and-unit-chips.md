# 0033: Drafts apart, and unit chips

**Status:** Done
**Depends on:** 0023, 0027

## Context

Two things that get in the way of writing a recipe. The list mixes drafts in with finished
recipes, so a half-written plov sits between two dinners you could cook tonight. And picking a
unit means opening a sheet of fourteen and reading down it, when nine times out of ten the
answer is grams, millilitres or a spoon.

## Goal

Drafts sit in their own section under the finished recipes, and the ingredient card offers
the common units as chips with the full sheet one tap away.

## Out of scope

- A separate Drafts tab or screen. A section is enough for a list this size.
- Hiding drafts, or a count badge.
- Changing which fourteen units exist, or how amounts convert.
- Remembering the last unit used.

## Data model

Nothing.

## API contract

No endpoints, no changes.

## UI

**The list.** Three sections in this order, each with a small heading and only when it has
rows: In progress (0012), then the ready recipes with no heading when there is nothing else,
then Drafts. A ready recipe keeps its New chip; a draft loses its Draft chip, since the
heading says it. The empty state is unchanged. A recipe's accessible name keeps "draft" in it.

**The unit field** on the ingredient card becomes a row of chips: None, g, kg, ml, l, tsp,
tbsp, piece, then Other. The chosen unit is the selected chip; a unit not in the row, such as
cup or clove, shows as a selected chip in Other's place with its own name, so the chosen value
is always visible. Other opens the sheet the field used to open, with every unit under its
dimension. The chips are a radio group, one per unit, named by the unit.

The unit chips take the full width under the amount rather than sharing a row with it: nine
chips do not fit beside a field. All new strings go through `t()`, in English and Latvian. No new components: `UnitPicker`
changes shape and the list gains a section.

## Acceptance criteria

- [x] `pnpm typecheck`, `pnpm lint` and `pnpm test` pass across all three workspaces. _(`pnpm check`:
      shared 9, API 138, mobile 1361 tests.)_
- [x] The list shows drafts under a Drafts heading after the ready recipes, no heading when
      there are no drafts, and no Draft chip on a row under that heading, asserted in a test.
      _(`puts drafts under a Drafts heading after the ready recipes` in RecipeList.test.tsx.)_
- [x] The unit field shows the eight chips and Other; tapping a chip reports the unit; Other
      opens the sheet; a unit outside the row shows selected in Other's place, asserted in a
      test. _(Three tests in UnitPicker.test.tsx.)_
- [x] On the simulator: the list shows Plovs under Drafts; an ingredient card shows the chips;
      tapping "g" selects it; Other opens the sheet and choosing "cup" shows it selected. _(Done on
      the iPhone 17 Pro simulator, 25 September 2026, in Latvian: "krūze" took Cita's place.)_
- [x] The Latvian file lists every new key. _(The key-parity test in i18n passes.)_

## Open questions

None. The eight chips were approved as proposed.
