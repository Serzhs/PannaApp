# 0008: Steps and nesting

**Status:** Done
**Depends on:** 0006, 0007

**Changed by 0022:** nesting moved out of the step cards to the Flow view; the steps editor is a flat list.

**Changed by 0020:** `temperatureCelsius` and its field are gone, the note sits behind an "Add a note" button, and lines move by buttons only.

## Context

A recipe now knows what it needs but not what to do. The `steps` table has waited since 0001, and it is the reason the app exists: a step can be nested inside another to say "this happens while that cooks", which is what tells someone at the stove what else they could be getting on with. Nothing after this - links in 0010, cooking in 0012, the import in 0016 - has anything to work on until steps exist.

## Goal

An author writes a recipe's steps in order, nesting under a step whatever can be done during it, and a reader sees the steps numbered with the nested ones marked as things to do meanwhile.

## Out of scope

- Linking a step to the ingredients and equipment it uses. That is 0010, and it is why steps keep their ids across an edit.
- Cooking mode, timers, ticking steps off, keeping the screen awake. 0012.
- A picture of what a step should look like. `imageKey` stays null; 0011.
- Cook's notes on a step. `steps.note` is the author's tip and part of the recipe; the cook's own dated notes are 0015 and a different table.
- More than one level of nesting. A nested step cannot itself have nested steps, per the Data model section of `CLAUDE.md`, and the request shape below makes a second level impossible to express rather than merely refused.
- Converting a temperature written into a step's text. Only the `temperatureCelsius` column is converted, per 0006; prose is the author's and is never rewritten.
- Moving a step by dragging it into or out of a parent. A step moves within its level by drag or buttons; changing its level is a button, because a drag that can also re-parent is two gestures pretending to be one.
- Reading steps aloud, voice input, or any audio. Ruled out for the whole app in `CLAUDE.md`.
- Scaling durations or amounts by servings.
- The review page of the create flow and marking a recipe ready. That is the next spec, a short one, before step links.

## Data model

No new tables and no new columns. `steps` from 0001 is used as it is, so there is no migration.

A step with a null `parentStepId` is a main step, done in sequence. A step with a `parentStepId` happens _during_ that step. The author decides this by nesting, and nothing else: two steps that merely have nothing to do with each other are not parallel.

`position` is a zero-based integer, unique among siblings: among the main steps, and among the children of one parent. Reordering rewrites every position in one transaction. Nothing relies on insertion order.

`body` is the instruction, short enough to read at a glance with a knife in the other hand. `note` is anything extra worth knowing while doing it. They stay apart so the instruction stays short.

`durationSeconds` is how long the step takes, or null when it is not timed. `temperatureCelsius` is the oven or pan temperature, or null; it is stored in Celsius whatever the author's unit system, and converted only for reading.

**Total time is derived from here on.** `recipes.totalTimeMinutes` becomes the sum of the main steps' durations, rounded up to a whole minute, and null when no main step is timed. Nested steps happen inside a main step's time and add nothing, which is the whole point of nesting them. The column stays, recomputed on every write to the steps, so the list screen can show it without a join. It leaves the create and edit forms, as 0005 decided, and a body that still sends it is refused.

**Deleting a main step promotes its nested steps** to main steps at its position, in order. It does not delete them. Losing four steps because one was removed is the kind of thing people do not forgive.

## API contract

All routes require a valid access token and answer 401 without one. Ownership goes through the guard 0005 added: a recipe that does not exist and one that belongs to someone else both answer 404 with `RECIPE_NOT_FOUND`, with identical bodies.

**Field rules** for a step:

- `body`: string, trimmed, 1 to 2000 characters.
- `note`: string or null, trimmed, up to 500 characters.
- `durationSeconds`: integer or null, 1 to 86400.
- `temperatureCelsius`: integer or null, -50 to 500.

A recipe holds at most 60 main steps, and a main step at most 20 nested steps.

**Step shape**, in every response that carries it, nested one level so the structure is visible rather than reconstructed from ids:

```
{ id, position, body, note, durationSeconds, temperatureCelsius,
  children: [ { id, position, body, note, durationSeconds, temperatureCelsius } ] }
```

Main steps are ordered by `position`, and so are the children within each one.

**GET /api/recipes/:recipeId** gains `steps`, an array of main steps in that shape, `[]` for a recipe with none. The list endpoint does not carry steps.

**PATCH /api/recipes/:recipeId** accepts a further optional field, `steps`, the complete list in the order it should have, in the same nested shape without `position`. It is written in the same transaction as the metadata and the lists from 0007, and the rules are the ones 0007 established:

- A row with an `id` that belongs to this recipe is updated in place and keeps its id, wherever it now sits: a step may move to another position, under another parent, or from nested to main and back, and stays the same step. This is what keeps 0010's links alive through an edit.
- A row with no `id` is inserted.
- A row absent from the body is deleted. A main step absent from the body whose children are present elsewhere in the body keeps those children, which is how the promotion rule is expressed: the client lists the orphaned steps as main steps, and the server never deletes a row the body still names.
- `position` is not sent; it is the index in its array. A child's `parentStepId` is the step it is listed under.
- A child carrying a `children` field is a 400: the shape has no second level.

After the write, `totalTimeMinutes` is recomputed from the main steps and returned. `totalTimeMinutes` is no longer accepted in the `POST /api/recipes` or `PATCH` body: sending it is an unknown field, a 400.

400 with `VALIDATION_FAILED` and a `fields` object, and nothing written, when any field breaks its rule, an `id` appears twice, an `id` is not one of this recipe's steps, or a cap is passed. A `fields` key names the step, as in `steps.2.body` or `steps.2.children.1.durationSeconds`.

Error codes this spec can return: `AUTH_TOKEN_INVALID`, `AUTH_TOKEN_EXPIRED`, `RECIPE_NOT_FOUND`, `VALIDATION_FAILED`.

## UI

**Recipe screen, `(app)/recipes/[id]`.** Below "What you need", a section "Steps". Main steps are numbered from 1. Each shows its body, then its duration and temperature on one line when set - the temperature through 0006's converter, so an imperial reader sees 356°F for 180 - then the note in secondary text. Nested steps sit indented under their parent with a label saying they can be done meanwhile, numbered within the parent as 2a, 2b. A recipe with no steps says so in one line. The total time in the header is now the derived one.

To a screen reader a step is one element: its number, body, timing and note read together, and a nested step announces that it belongs to its parent.

**Edit screen, `(app)/recipes/[id]/edit`.** Below the lists from 0007, the steps. A main step is a card with body, note, duration and temperature, and under it its nested steps as smaller cards. The duration is picked with the platform's own time picker, reading hours and minutes, per the Platform behaviour section of `CLAUDE.md`, never a text field of seconds. iOS also has a countdown picker made for durations, but it ignores the value it is handed, so an existing time would always reopen at one minute; the time picker honours it. The temperature field is labelled with the author's unit system and takes that unit: an imperial author types 350 into a field marked °F, it is stored as 177 °C, and it reads back as 351 °F. A degree of drift per round trip is accepted; see Decided. The total time field from 0005 is gone from this screen and from the create flow.

Lines move within their level by drag handle or by move up and move down buttons, using the reorderable list 0007 built. A main step has "Add a step to do meanwhile", which adds a nested step under it. A nested step has "Make this a main step", which moves it to the main list just after its parent. A main step with nothing nested and a main step before it has "Do this during the previous step", which nests it. Removing a main step that has nested steps promotes them in place, mirroring the server rule, so the editor never shows a state the server would refuse.

Save sends one `PATCH` with the fields, both lists and the steps. Field errors from the server land on the step and field they name. Offline, nothing is sent and everything typed stays.

**Create flow.** After "What you need", a third page, "Steps", with the same editor, Done and Skip. Done saves and lands on the recipe. 0007's Done now continues here instead of landing on the recipe.

**Components** added, each in its own folder with styles, test and index per the Repo layout section of `CLAUDE.md`: a step line editor, a duration field wrapping the platform picker, a temperature field, the steps editor, and the read-only steps section. Each gets a design gallery entry.

All new strings go through `t()`, in English and Latvian.

## Acceptance criteria

- [x] `pnpm typecheck`, `pnpm lint` and `pnpm test` pass across all three workspaces. _(Passes.)_
- [x] `GET /api/recipes/:recipeId` returns `steps` as `[]` for a recipe with none, and `GET /api/recipes` carries no steps. _(Tested.)_
- [x] A `PATCH` with three main steps, the second with two nested, stores main positions 0, 1, 2 and nested positions 0, 1 under the second, and `GET` returns the same nesting and order. _(Tested.)_
- [x] A `PATCH` that reorders the main steps and the nested steps rewrites every position and keeps every id. _(Tested.)_
- [x] A `PATCH` that lists a nested step as a main step, and one that lists a main step under another, each move the same id rather than creating a new row. _(Tested.)_
- [x] A `PATCH` that omits a main step and lists its former children as main steps keeps those children with their ids: the delete promoted rather than cascaded. _(Tested. The first run of this test caught the delete cascading before the children were detached, which is now done first.)_
- [x] A `PATCH` that omits a main step and its children deletes all of them. _(Tested.)_
- [x] A body with a nested step that itself carries `children` returns 400 and writes nothing. _(Tested.)_
- [x] A `PATCH` whose third step's nested second step has a blank body returns 400 with `fields` naming `steps.2.children.1.body`, and writes nothing. _(Tested.)_
- [x] `durationSeconds` of `0`, of `90000` and of `1.5`, and `temperatureCelsius` of `501`, each return 400. _(Tested.)_
- [x] A `PATCH` with 61 main steps, and one with 21 nested steps under one main step, each return 400 and write nothing. _(Tested.)_
- [x] `totalTimeMinutes` is the sum of the main steps' durations rounded up to a minute after a `PATCH`, is null when no main step is timed, ignores nested steps' durations, and updates when a step's duration changes. _(Tested, and seen in the recipe header on the simulator.)_
- [x] `POST /api/recipes` and `PATCH /api/recipes/:recipeId` with `totalTimeMinutes` in the body return 400. _(Tested.)_
- [x] A `PATCH` carrying a step `id` from another user's recipe returns 400 and changes neither recipe; a `PATCH` on another user's recipe returns 404 with the same body as an unknown id. _(Tested.)_
- [x] The recipe screen numbers main steps from 1, shows nested steps indented and labelled as meanwhile with 2a-style numbers, and shows 180 as 356°F to an imperial reader, asserted in a component test. _(Tested, and seen on an iPhone 17 Pro simulator.)_
- [x] The recipe screen reads each step as one element carrying its number, body, timing and note, asserted by querying the accessible name. _(Tested.)_
- [x] The total time field is absent from the create and edit forms, asserted in a test, and the recipe screen's total is the derived one. _(Tested, and seen on the simulator.)_
- [x] In the app, adding a main step, nesting a step under it, promoting it back, moving steps within a level and removing a main step with nested steps all behave as the UI section says, and saving shows the result on the recipe screen without a manual refresh. _(Adding, nesting, removing and saving seen on the simulator; nesting, promoting, moving and removing with promotion are tested in the editor. A blank step is marked in place, also seen.)_
- [x] After "What you need" in the create flow, the app continues to "Steps"; Done saves and lands on the recipe; Skip lands on the recipe with no steps. _(Superseded by 0025 and 0026: the page before Steps is now the recipe with its lists, Done continues to Flow and then Review, and Review's Save lands on the list. Walked on the iPhone 17 Pro simulator on 23 September 2026 as the app now is: basics and Salt, Continue, a step linked to Salt, Done, Flow, Done, Review showing all of it, Save.)_
- [x] Every new component appears in the design gallery in every state. _(Entries added.)_
- [x] The Latvian file lists every new key, and switching language changes the section headings and the meanwhile label. _(The key test passes; the Latvian is a draft for the owner to correct, as 0006 decided.)_
- _Manual follow-up, not a gate:_ A VoiceOver or TalkBack walkthrough of the recipe screen's steps and of the editor, checking that a nested step announces its parent and that nesting and promoting are announced.

## Closed out

Nesting is no longer done in the steps editor: 0022 writes steps flat and moves "during what" to
its own Flow page, and 0024 settles each step like a list line. The API rules above are
unchanged and still tested. Marked Done on 23 September 2026.

## Open questions

None.

## Decided

**One spec.** Two days rather than one, but a read view of steps nothing in the app can create is not
a shippable slice, and splitting would have meant a second spec that was mostly this one's editor.

**The temperature field takes the author's own unit.** Celsius is stored either way. An author on
imperial units types Fahrenheit into a field marked °F and it is converted on save; reading it back
converts it again, so 350 becomes 177 becomes 351. A degree of drift is accepted over asking a US
author to convert in their head every time.

**Mark as ready is the next spec.** The create flow's fourth page, a review with the ready switch,
was always the intended place. It is small and separate, and this spec is large enough.
