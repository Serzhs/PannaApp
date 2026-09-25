# 0031: A warm look

**Status:** Done
**Depends on:** 0002, 0004, 0029

## Context

The app works, and it looks like an office form: grey on grey, a blue-grey accent that was a
placeholder from 0002, every list a column of text with no shape. The recipe screen in
particular reads as pasted text: title, lines, lines, lines. Nobody wants to stand in a
kitchen with a spreadsheet.

The guidance is not mysterious. Apple's layout guidance says to group related content with
negative space, background shapes and separators, and to carry hierarchy through type size,
weight and colour. Recipe UX writing says the same in the domain's terms: the photo first, the
quick facts above the fold, ingredients you can scan, numbered steps with visual breaks. This
spec does that, and warms the palette so the app feels like food rather than paperwork.

## Goal

The app gets a warm palette and rounded, shaped surfaces, and the recipe screen becomes a
sequence of clear modules: photo, facts, ingredients, equipment, steps, notes.

## Out of scope

- Dark mode. The token structure allows it; this spec picks one look.
- Any change to what a screen does, what it fetches, or what it sends. This is looks only.
- Illustrations, icons for every ingredient, or a custom font. System font, a few Ionicons.
- Animation beyond what exists.
- The sign-in screen's provider buttons, which follow Google's and Apple's rules.
- Cook mode's layout, which 0012 designed for dirty hands and which stays as it is, taking
  only the new colours.

## Data model

Nothing.

## API contract

No endpoints, no changes.

## UI

**Palette.** The accent becomes a terracotta, `#B8472A`, which clears 4.5:1 as text on every
surface and carries white text; the darker `#8E3520` for pressed and emphasis, a pale `#FBE9E1`
for tinted fills. The background becomes a warm cream, `#FBF6EF`; cards stay white; the raised
surface is `#F6EFE6`. Neutrals shift warmer to match. Every pair the contrast test checks keeps
its ratio; the test is the proof. Radii grow: cards and fields `12`, large surfaces `20`, so the
shapes read as soft rather than boxy. Cards drop their 1 point border for a faint shadow on a
cream ground, which is what makes them read as cards rather than fenced text.

**Recipe screen**, top to bottom, each a module with `space6` between them:

- The cover photo, full width with rounded corners, or nothing when there is none.
- The title in `display` size, then a **facts row**: three small tiles, each an icon, a number
  and a word: servings, total time, times made. The made tile is the link to History (0029).
  A tile that has nothing to say is left out; a recipe never made shows two.
- The description, when there is one.
- **Ingredients** as a card: a heading with the count, then one row per line, the amount in a
  fixed-width column in the accent colour and medium weight, the name beside it, the note in
  small text under the name; a hairline between rows. Unmeasured lines leave the column empty
  so the names stay aligned.
- **Equipment** as a card of the same shape; an optional tool carries a small "optional" tag
  after its name instead of brackets.
- **Steps**: each main step its own card with a numbered circle in the accent colour at the
  start, the instruction in `bodyStrong`, and under it small rows with an icon each: a clock
  for the time, a basket for what it uses, a pan for what it needs. The author's note sits in a
  tinted callout at the bottom of the card. Nested steps live inside their parent's card under
  a "Meanwhile" label, with lettered circles in the pale accent.
- **Your notes** as a card with the existing list.
- Cook stays pinned (0029).

Every accessible name and label stays exactly what it is: the tests that query by role and
name keep passing, and a screen reader hears the same recipe. Only the eye sees the change.

**Everywhere else**, the palette and radii apply through the tokens with no per-screen work:
the list rows, the featured tab, the You tab, the editors and cook mode all take the new
colours. Chips in the accent tint; the tab bar's active colour is the accent.

`FactTile`, `IngredientRow`, `StepCard` follow the one-folder-per-component layout under the
recipes feature, with gallery entries. No new strings except "optional" reused.

Three adjustments on the first look. At the largest text size a fixed amount column broke
"600 g" into "60" over "0 g"; the row now wraps, so the name drops under the amount instead. The equipment card has no amounts, so it has no amount
column: an empty column read as an indent. And the made tile shows a short date under the
count; the full "last on" line is what a screen reader hears.

## Acceptance criteria

- [x] `pnpm typecheck`, `pnpm lint` and `pnpm test` pass across all three workspaces,
      including the contrast test over the new tokens and the literal test over the new styles.
      _(`pnpm check`: shared 9, API 138, mobile 1355 tests. The contrast test passes over the new
      palette; the generator that wrote the tokens asserted every pair first.)_
- [x] The recipe screen renders the facts row, the ingredient rows with the amount column, the
      numbered step cards and the tinted note; every existing accessible name in
      NeedsSection.test.tsx and StepsSection.test.tsx still resolves, asserted in a test.
      _(FactTile, IngredientRow and StepCard each have a test; the section tests keep every
      accessible label. Three assertions there queried by joined text, "500 g Beetroot" and
      "Step 1", which the amount column and the number circle now split; they query by label.)_
- [x] The facts row omits the time when there is none and the made tile when never made,
      asserted in a test. _(`says how often and how recently it was made` in
      RecipeDetailScreen.test.tsx: the made tile is the link when there is a cook and absent when
      not; the time tile follows the fixture's null total.)_
- [x] On the simulator: the list, the recipe, the featured tab, the You tab, an editor and cook
      mode all carry the warm palette; the recipe screen reads as modules; nothing is clipped at
      the largest text size. _(Done on the iPhone 17 Pro simulator, 25 September 2026.)_

Manual follow-up, not gating: look at every screen with a fresh eye a day later. Colour is a
thing one stops seeing after an hour.

## Open questions

None. Terracotta was chosen on approval.
