# 0007: Ingredients and equipment

**Status:** Draft
**Depends on:** 0005, 0006

## Context

A recipe is still only a title, a description and two numbers. The `ingredients` and `equipment` tables have existed since 0001 with nothing in them, and nothing else in the roadmap can start until they fill: steps link to ingredients in 0009, the check before cooking in 0012 ticks them off, and the JSON import in 0015 has to have somewhere to put them.

## Goal

An author lists what a recipe needs - ingredients with amounts, and the pans and gadgets - and a reader sees that list in the units they think in.

## Out of scope

- Linking an ingredient or a piece of equipment to a step. That is 0009, and it is why rows keep their ids across an edit, so the links have something to hold on to.
- Steps of any kind. 0008.
- The check before cooking, ticking ingredients off, or going without one. 0011 and 0012.
- Scaling a recipe to a different number of servings. Amounts are shown as written; the servings number and the amounts are not yet connected.
- A shopping list, combining ingredients across recipes, or grouping ingredients into sections such as "for the sauce".
- Autocomplete, an ingredient database, nutrition, allergens, or any notion of two recipes sharing the same ingredient. An ingredient is a line of text the author wrote.
- Translating ingredient or equipment names. They are recipe content, in the author's language, per the Internationalisation section of `CLAUDE.md`.
- Converting a volume into a mass, or a mass into a volume. 0006 settled this: it needs the ingredient's density, and a guess is a confidently wrong recipe.
- Images of ingredients or equipment.
- The JSON import shape. 0015 defines the document; it will reuse the field rules below, but the document itself is not designed here.
- Drag-to-reorder gestures, unless the open question below is answered that way.

## Data model

No new tables and no new columns. `ingredients` and `equipment` from 0001 are used as they are, so there is no migration.

Both carry `position`, a zero-based integer unique within the recipe, and the app never relies on insertion order or `createdAt` for display order. Reordering rewrites every position in one transaction, per the Data model section of `CLAUDE.md`.

`note` on both is the qualifier that does not belong in the name: "not too long", "plain not self-raising", "at least 30 cm". It is a separate field so the name stays the name, which is what a shopping list and 0009's links depend on.

An ingredient's `amount` is stored exactly as the author entered it, in the `unit` they chose. Null `unit` with an amount is a bare count, "2 eggs". Null `amount` is an unmeasured quantity, "salt, to taste". A `unit` with no `amount` is meaningless and is refused.

`equipment.optional` marks something the recipe is better with but can be done without. It is shown as a word, never as a colour alone.

## API contract

All routes require a valid access token and answer 401 without one. Ownership goes through the guard 0005 added: a recipe that does not exist and a recipe that belongs to someone else both answer 404 with `RECIPE_NOT_FOUND`, with identical bodies.

**Field rules** for an ingredient:

- `name`: string, trimmed, 1 to 120 characters.
- `note`: string or null, trimmed, up to 200 characters.
- `amount`: number or null, greater than 0, at most 99999.99, with at most two decimal places.
- `unit`: one of the fourteen values of the `unit` enum, or null. Requires `amount`.

For a piece of equipment:

- `name` and `note`: as above.
- `optional`: boolean, default false.

A recipe holds at most 100 ingredients and at most 50 pieces of equipment. Above that is a 400, because 0015 will feed pasted, untrusted documents through the same rules.

**Ingredient and equipment shapes**, in every response that carries them:

`{ id, position, name, note, amount, unit }` and `{ id, position, name, note, optional }`. Rows are ordered by `position`.

**GET /api/recipes/:recipeId** gains two arrays, `ingredients` and `equipment`, in position order. An empty recipe answers `[]` for both. The list endpoint does not carry them: a list of forty recipes does not need four hundred ingredients.

**PATCH /api/recipes/:recipeId** accepts two further optional fields, `ingredients` and `equipment`, each the complete list in the order it should have. This is the one write path for the lists, and it is the same request that edits the metadata, so the whole recipe is written in one transaction per the API conventions in `CLAUDE.md`.

Each row in the body is `{ id?, name, note?, amount?, unit? }` or `{ id?, name, note?, optional? }`:

- A row with an `id` that belongs to this recipe is updated in place, and keeps that id. This is what lets 0009's links survive an edit that only fixes a typo.
- A row with no `id` is inserted.
- A row that was in the recipe and is absent from the body is deleted. Deleting it cascades to its links, which is the intended meaning of removing an ingredient.
- `position` is not sent. It is the row's index in the array.

The response is the same shape as `GET`, with both arrays, whether or not the body carried them.

400 with `VALIDATION_FAILED` and a `fields` object, and nothing written, when: any field breaks its rule, a `unit` is sent without an `amount`, an `id` appears twice, an `id` is not one of this recipe's rows, or a list is over its cap. A `fields` key names the row, as in `ingredients.3.amount`, so the editor can mark the right line. The metadata rules and codes from 0005 are unchanged; sending only metadata leaves both lists untouched, and sending only a list leaves the metadata untouched.

Error codes this spec can return: `AUTH_TOKEN_INVALID`, `AUTH_TOKEN_EXPIRED`, `RECIPE_NOT_FOUND`, `VALIDATION_FAILED`.

## UI

**Recipe screen, `(app)/recipes/[id]`.** Below the description, a section "What you need" with the ingredients and then the equipment. Each ingredient shows its amount and unit as 0006's converter renders them for the reader's unit system - an imperial reader sees "about 1 cup" for 250 ml, marked approximate - then the name, then the note in secondary text. A bare count shows the number and the name. An unmeasured ingredient shows the name alone. Each piece of equipment shows its name, "optional" as a word where set, and its note. When a list is empty the section says so in one line rather than vanishing, so an author can see what is missing.

To a screen reader an ingredient row is one element: amount, unit, name and note read together.

**Edit screen, `(app)/recipes/[id]/edit`.** The whole recipe on one screen, as 0005 established. Below the four fields, two editable lists. Each ingredient line has name, amount, unit and note; each equipment line has name, note and an optional switch. A line can be added at the end, removed, and moved. Amount takes a decimal keyboard. Unit is chosen from a list of the fourteen units grouped by dimension, in the reader's language, with "none" for a bare count. The author edits in whatever units they type; conversion is for reading, never for editing.

Save sends one `PATCH` with the fields and both lists. Field-level errors from the server land on the line and field they name; a failure that is not about a field shows once. Offline, nothing is sent, the message says so, and everything typed stays, per the Offline section of `CLAUDE.md`. On success the app returns to the recipe screen showing the new lists.

**Create flow, `(app)/recipes/new`.** 0005 built the first page and said the flow grows into a wizard. This spec adds the second page, "What you need": after the basics are saved as a draft, the app goes on to the same two editors for that draft, with Done saving them and landing on the recipe. Skip is offered, because a recipe can be written down before its shopping is known. Whether this page ships here or waits is the first open question.

**Components** added, each in its own folder with its styles, test and index, per the Repo layout section of `CLAUDE.md`: an ingredient line editor, an equipment line editor, and the unit picker. Each gets an entry in the design gallery.

All new strings go through `t()`, in English and Latvian, and the lint rule from 0006 holds.

## Acceptance criteria

- [ ] `pnpm typecheck`, `pnpm lint` and `pnpm test` pass across all three workspaces.
- [ ] `GET /api/recipes/:recipeId` returns `ingredients` and `equipment` as `[]` for a recipe with none, and `GET /api/recipes` carries neither array.
- [ ] A `PATCH` with three ingredients and two pieces of equipment stores them with positions 0, 1, 2 and 0, 1, and `GET` returns them in that order regardless of the order they were inserted.
- [ ] A `PATCH` that reorders the lists rewrites every position, and the rows keep their ids.
- [ ] A `PATCH` that omits a row that was in the recipe deletes it, and a `PATCH` with a row carrying no `id` inserts it.
- [ ] A `PATCH` with only metadata leaves both lists untouched, and a `PATCH` with only `ingredients` leaves the metadata and `equipment` untouched, and both refresh `updatedAt`.
- [ ] A `PATCH` whose fourth ingredient has a blank name returns 400 with `fields` naming `ingredients.3.name`, and writes nothing: the first three are not stored either.
- [ ] A `PATCH` with a `unit` and no `amount`, with an amount of `0`, of `-1`, of `1.005`, and of `100000`, each return 400.
- [ ] A `PATCH` with 101 ingredients, and one with 51 pieces of equipment, each return 400 and write nothing.
- [ ] A `PATCH` carrying an ingredient `id` from another user's recipe returns 400 and changes neither recipe; a `PATCH` on another user's recipe returns 404 with the same body as an unknown id.
- [ ] A `PATCH` with the same `id` twice returns 400.
- [ ] Every new endpoint behaviour returns 401 with no token and with an expired one.
- [ ] The recipe screen shows `250 ml` as "about 1 cup" to an imperial reader and as "250 ml" to a metric reader, and shows "2 eggs" and "salt" for a bare count and an unmeasured ingredient, asserted in a component test.
- [ ] The recipe screen reads each ingredient as one element to a screen reader, carrying amount, unit, name and note, asserted by querying the accessible name.
- [ ] Optional equipment shows the word, not only a style, asserted in a test.
- [ ] In the app, adding, removing and moving lines on the edit screen and saving shows the new lists on the recipe screen without a manual refresh.
- [ ] Saving with a blank ingredient name marks that line and sends nothing, and saving offline keeps every line typed and shows the offline message.
- [ ] Every new component appears in the design gallery in every state, and the unit picker lists all fourteen units grouped by dimension in both languages.
- [ ] The Latvian file lists every new key, and switching language changes the section headings, the unit names and the word "optional".
- _Manual follow-up, not a gate:_ A VoiceOver or TalkBack walkthrough of the recipe screen's new section and of the edit screen's lists, checking that each line reads as one element and that moving a line is announced.

## Open questions

1. **Does the second create page ship here?** Building the editors once and reusing them on the create flow is a few hours on top of the edit screen. Shipping it makes the wizard real one page earlier; leaving it out keeps this spec to about a day and means a new recipe still lands on its screen straight after the basics, with ingredients added through Edit. Either is coherent; the cost is the day.
2. **How does a line move?** Move up and move down buttons on each line are simple, work with a screen reader as they are, and need no library. Drag handles feel better with twenty ingredients and are what people expect, but need a gesture-driven list on top of reanimated and gesture-handler, and their accessibility has to be built by hand. Buttons now and drag later is possible, since the contract does not care.
3. **How is an amount typed?** A decimal keyboard accepts `1.5`; it does not accept `1/2`, which is how people write half a cup. Accepting fractions means parsing text and deciding what `1 1/2` and `1,5` mean. The simplest rule is decimals only, with the unit picker offering the spoon and cup sizes that make halves rare; the friendlier one costs a small parser and a test per form.
