# 0025: Three parts

**Status:** Draft
**Depends on:** 0022, 0023, 0024

## Context

A recipe is edited on one long screen: title, servings, two lists, every step and the flow, all in
a row. Creating one walks five pages, the first of which asks only for a title and a number.
Clicking through after 0024 made the shape plain: a recipe has three parts worth a page each,
what it is and needs, how it is made, and what runs during what. Servings, meanwhile, is a number
field for a value that is almost always 1, 2, 4 or 6.

## Goal

A recipe is written and edited in three parts, Recipe, Steps and Flow, and servings is picked with
a tap.

## Out of scope

- The app's own tab bar from `CLAUDE.md`, Recipes, Featured and You. That is 0018; the tabs here
  are inside one screen.
- The review page. It stays the last page of creating, unchanged.
- The recipe screen. It reads the same as before.
- Any change to what a recipe can hold.

## Data model

None.

## API contract

`POST /api/recipes` also accepts `ingredients` and `equipment`, the same optional arrays and caps
`PATCH` takes, and writes the recipe and both lists in one transaction, per the API conventions in
`CLAUDE.md`. It answers with the recipe detail, lists included, rather than the bare recipe. A bad
line fails the whole request with `400 VALIDATION_FAILED` naming the line, and nothing is created.
No new error codes.

## UI

**Creating: four pages.** The first, "Recipe", holds the title, description and servings, then the
ingredient and equipment lists from 0023. Its button, "Continue", creates the recipe with its lists
in that one request and goes on to "Steps" from 0024, then "Flow" from 0022, then the review from 0009. The old "What you need" page and its route are gone; nothing links to it.

**Editing: one screen, three tabs.** A row of tabs under the header, "Recipe", "Steps" and "Flow",
each showing its part and nothing else. Recipe holds the same fields and lists as the first page of
creating; Steps the steps editor; Flow the flow list and its chart. Every part is one draft, so a
step renamed on Steps reads renamed on Flow, and the single "Save changes" button sits under
whichever tab is open. A field the server refuses switches to the tab that holds it.

The tabs are a new shared component, one folder with styles, test and index, with a gallery
entry: the tab row reads as tabs to a screen reader, the open one selected, and a tab is a 44-point
target. It is chosen by tapping; the OS swipe-back gesture stays what it is.

**Servings** becomes a row of choices, 1, 2, 4 and 6, and "Other". Tapping a number picks it;
tapping Other opens a number field for anything else, up to the 100 the schema allows. A recipe
whose servings is none of the four opens with Other chosen and the field filled. One choice at a
time, read as radio buttons. This is a new component in the recipes feature, in its own folder,
with a gallery entry showing a picked number and Other with its field.

All new strings go through `t()`, in English and Latvian.

## Acceptance criteria

- [ ] `pnpm typecheck`, `pnpm lint` and `pnpm test` pass across all three workspaces.
- [ ] `POST /api/recipes` with two ingredients and one piece of equipment creates all of them and
      answers with the detail; with a bad line it returns 400 naming `ingredients.1.name` and no
      recipe exists afterwards, asserted end to end.
- [ ] The first page of creating shows the fields and both lists, and Continue sends one request
      carrying the lists, asserted in a test.
- [ ] The edit screen shows three tabs, the open one selected; switching shows only that part and
      the Save button stays, asserted in a test.
- [ ] Picking 4 sets servings to 4; picking Other shows the field; a recipe with 3 servings opens on
      Other with 3 in the field, asserted in a test.
- [ ] On the simulator: create a recipe with a title, 4 servings and one ingredient on the first
      page, reach the steps page, then open the recipe for editing and switch between the three
      tabs.
- [ ] No route or link to the old "What you need" page remains.
- [ ] The Latvian file lists every new key.
- _Manual follow-up, not a gate:_ a VoiceOver or TalkBack walkthrough of the edit screen's tabs
  and of the servings row.

## Open questions

None.
