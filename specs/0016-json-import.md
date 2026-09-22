# 0016: JSON import

**Status:** In progress
**Depends on:** 0025, 0022

## Context

A recipe seen in a video or on a page has to be typed in by hand. The app is not going to fetch
that video: it never follows a user's URL, per the Security section of `CLAUDE.md`, and the
roadmap's test showed a video link is often unreadable anyway. What the user does have is their
own AI. The app hands out a prompt, the user gives it to their model with the recipe text, and
pastes back what comes out.

## Goal

A prompt the user can copy, and a paste box that turns their model's answer into a draft recipe,
keeping everything it can read and saying what it could not.

## Out of scope

- Fetching anything. No URL is ever requested by the app or the API.
- Calling a model from the app. The user's own AI does the work, whichever one they have.
- Importing photos. The document is text; photos come from the library as before.
- Importing into an existing recipe. An import is always a new draft.
- Reading formats other than the app's own JSON document. YAML, Markdown tables and free text
  are left to the model, which the prompt tells how to answer.

## Data model

None. An imported recipe is an ordinary recipe, created as a draft through the endpoints that exist.

**The document**, version 1, in `packages/shared` as `importDocumentSchema`:

```
{ "schemaVersion": 1, "title", "description"?, "servings",
  "ingredients": [{ "name", "amount"?, "unit"?, "note"? }],
  "equipment": [{ "name", "note"?, "optional"? }],
  "steps": [{ "body", "note"?, "minutes"?, "ingredients"?: [name], "equipment"?: [name],
              "meanwhile"?: [{ "body", "note"?, "minutes"?, "ingredients"?, "equipment"? }] }] }
```

Steps nest by containment, not by id, so there is no reference to check. Links name ingredients
and equipment by their `name` in the same document. `unit` is one of the app's fourteen units.

## API contract

None new. The import is `POST /api/recipes` with the lists, then `PATCH` with the steps and their
links, both from the app. Every cap the schemas carry applies unchanged.

## UI

**New recipe.** The first page gains "Paste one from your AI instead" at the top, which opens the
import screen, `(app)/recipes/import`.

**Import screen.** Three parts. A short line saying how it works. "Copy prompt", which puts the
prompt on the clipboard and confirms it in a line under the button. A large paste box with an
"Import" button under it. The prompt is in English, tells the model to write the recipe's text in
the user's language, names the language, carries `schemaVersion: 1`, spells out the document with
an example, explains main steps and steps done meanwhile, lists the units, and asks for the recipe
**text** rather than promising a link works.

**Import** reads the box forgivingly: the JSON is found inside code fences and prose. Then it
reads what it can: a line without a name, a step without an instruction, are dropped; an unknown
unit becomes none; an amount that is not a number becomes none; a link to a name not in the
document is dropped; a list past its cap is cut. Each of these is a problem in a list. The recipe
is created as a draft, then its steps are written, and the screen shows "Imported as a draft"
with the problems, if any, and a button "Check it" that opens the edit screen. Nothing at all to
read, an unknown `schemaVersion`, or no title, is refused with one line saying which.

Offline, Import fails at once with the offline message and keeps the text.

**Component**: none shared. The screen is composed from existing components.

All new strings go through `t()`, in English and Latvian.

## Acceptance criteria

- [ ] `pnpm typecheck`, `pnpm lint` and `pnpm test` pass across all three workspaces.
- [ ] The reader finds the document inside code fences and surrounding prose; refuses text with
      no JSON, invalid JSON, `schemaVersion: 2` and a missing title, each with its own reason,
      asserted in a test.
- [ ] A document with an unknown unit, a non-numeric amount, a nameless ingredient, a bodiless
      step and a link to an unknown name imports everything else and lists five problems; a step
      done meanwhile nests under its step, asserted in a test.
- [ ] A document with 101 ingredients imports 100 and says so, asserted in a test.
- [ ] Copy prompt puts the prompt on the clipboard, and the prompt names the language, the
      version and every unit, asserted in a test.
- [ ] Import creates the recipe with its lists, then writes the steps with links mapped to the
      created ids, and offers to open the editor; offline it shows the message and keeps the
      text, asserted in a test with the API faked.
- [ ] On the simulator: paste a model-style answer with fences and a pleasantry, import, see the
      draft with its steps and a meanwhile step on the recipe screen.
- [ ] The Latvian file lists every new key.

## Open questions

None.
