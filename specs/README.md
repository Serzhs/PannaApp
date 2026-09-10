# Panna specs

The spec is the source of truth. Code follows the spec, never the other way around. If reality diverges, update the spec in the same PR.

## Index

| # | Title | Status | Goal |
| --- | --- | --- | --- |
| [0001](0001-project-setup.md) | Project setup and database | Draft | Clone, run three commands, get a linted API on a migrated database. |
| [0002](0002-design-system.md) | Design system: tokens and primitives | Draft | Build a form screen from tokens and components, with no raw values. |
| [0003](0003-auth.md) | Sign in with Google and Apple | Draft | Sign in with one tap, no passwords, and stay signed in. |
| [0004](0004-design-system-components.md) | Design system: display and feedback | Draft | Build a list screen's loading, empty and error states. |
| [0005](0005-recipe-crud.md) | Recipe CRUD | Draft | Create, view, edit and delete your own recipes, with a draft state. |
| [0006](0006-i18n.md) | Internationalisation | Draft | Run the app in another language, with correct plurals, formats and units. |
| 0007 | Ingredients | Not written | Add, edit, remove and reorder the ingredients of a recipe. |
| 0008 | Steps and nesting | Not written | Write steps, and nest the ones that happen during a wait. |
| 0009 | Step to ingredient links | Not written | Attach ingredients to the step that uses them. |
| 0010 | Cooking mode | Not written | Cook a recipe, seeing what else you could do during each wait. |
| 0011 | Cooking without an ingredient | Not written | Check off what you have, and cook it without the carrots. |
| 0012 | JSON recipe import | Not written | Paste AI-generated JSON and get a working recipe. |
| 0013 | Sharing | Not written | Share a recipe read-only by private link, and revoke it. |
| 0014 | Images | Not written | Cover and per-step images. |

Numbers run in build order, and each spec depends only on lower-numbered ones. That is a convenience
rather than a rule, and it will stop being true the first time something is inserted.

A number is fixed once its spec is **Approved**. Draft specs can still be renumbered, because nothing
has been built against them yet and a tidy order is worth more than an untouched number. Once a spec
is approved its number never changes and is never reused.

## Known problems in unwritten specs

Things already identified that have no spec to live in yet. Each one is a decision that must be made
when its spec is written, and none of them should be discovered then for the first time.

**0010 Cooking mode - progress is stored on the device.** Which steps are done lives in local storage so cooking never needs the network, and several recipes can be in progress at once. This spec also adds the in-progress section to the home screen and the Cook button to the recipe screen, both deferred from 0005.

**0010 Cooking mode - timers stop when the phone locks.** A kitchen timer that only runs while the
screen is on is not a timer. This needs local notifications and a keep-awake, both additions to the
stack, and it needs deciding what happens when several timers are running at once.

**0011 Cooking without an ingredient - the step text cannot be rewritten.** Before cooking, the reader
ticks off what they have and can mark an ingredient as one they are going without. A step whose only
ingredients were excluded is hidden entirely and the numbering closes up; a step that also uses other
ingredients stays and simply does not list the excluded one.

The limit is authored prose: if a step reads "chop the carrots and celery", that sentence still says
carrots, and no amount of linking fixes it. Because skipped steps disappear silently, cooking mode
must carry a visible marker of what is being left out - otherwise the reader is cooking an altered
recipe with nothing on screen admitting it, and a step still mentioning carrots reads as a bug.

The estimate only moves when a **main** step drops. Nested steps happen inside a main step's time, so
skipping one changes nothing. That falls out of the nesting model and is correct, but it means a
reader will sometimes exclude something and see the time stay put, which needs saying rather than
hiding. Exclusions are chosen before cooking starts and are part of the device-local session, not the
recipe: leaving the carrots out today does not change the recipe for next time.

**0012 JSON import - the prompt is the hard part, not the parser.**

The flow: tapping + offers two ways to add a recipe, writing one or pasting one. The paste view holds
a big input and a **Copy prompt** button. The user takes that prompt to their own AI, adds a TikTok or
YouTube link on the end, and pastes back what comes out. **The app never fetches the URL** - the
user's AI watches the video - so there is no scraping, no terms-of-service question, and no
user-supplied URL for the API to follow.

JSON rather than YAML: models emit valid JSON reliably and mangle YAML indentation often enough to
matter, and Zod already speaks JSON.

The prompt is the real work. It has to teach a stranger's model the whole content model - main steps
against nested ones, durations, which ingredients belong to which step, the unit enum - because a
vague prompt returns flat recipes with no nesting, which is the one thing this app exists to express.
It should also name the language to write in, from the user's locale, so a Latvian user gets a Latvian
recipe. It carries the `schemaVersion` it was written for.

Every document carries `schemaVersion`. The prompt will change and older output will still be in
circulation, so an import states which version it was reading and refuses one it does not know.

The paste box is forgiving by design. Real model output arrives wrapped in code fences, under "Here's
your recipe!" and above a closing pleasantry; the box finds the JSON inside that rather than rejecting
it.

**Partial imports are accepted.** Everything valid comes in, and whatever could not be read is flagged
for fixing in the editor. One bad unit should not cost the whole recipe.

**Imported recipes land as `draft`.** A model will get something wrong, and the draft state already
exists for exactly this: review and correct before it counts as a real recipe.

Pasted input is untrusted. It needs hard caps on step and ingredient counts and on text length, and
every `parentStepId` must be checked to point at a main step in the same document before anything
reaches the database.

**0013 Sharing - the API has to be reachable by the reader.** A share link is useless if the recipe
lives on a machine the reader cannot reach, so this feature cannot work under rule 4 as written. A
tappable link that opens the app, or the App Store when the app is missing, additionally needs a
domain and two files hosted on it; a `panna://` link cannot do it, and most messaging apps will not
even make it tappable. The alternative that stays local is exporting a recipe as a file the reader
imports with 0012, which is a copy rather than a link and cannot be revoked. Deferred deliberately.

**0014 Images - the files need somewhere to live.** `coverImageKey` and `imageKey` imply a store.
Under rule 4 that means files on the developer machine served by the API, which works for development
and shares the reachability problem above the moment anyone else needs to see them.

## Workflow

1. **Write the spec.** Human writes the intent, or asks Claude to draft it from a rough description. Nothing gets implemented at this stage.
2. **Review it.** Read the acceptance criteria out loud. If a criterion cannot be verified by running the app or a test, it is not a criterion yet, it is a wish.
3. **Freeze it.** Change status to `Approved`. Only now does implementation start.
4. **Implement.** Claude implements only what the spec says, in one branch named `spec/NNNN-slug`.
5. **Verify.** Walk the acceptance criteria one by one. Anything unchecked blocks the merge.
6. **Close.** Status becomes `Done`. Later changes get a new spec, they do not rewrite history in an old one.

## Rules

- One spec per shippable slice. If a spec takes more than about a day of work, split it.
- Numbers are sequential and never reused: `0001`, `0002`, and so on.
- Specs describe **behaviour and contracts**, not implementation. Say "the list is ordered by position", not "use `orderBy(asc(steps.position))`".
- Exception: data model and API contracts are part of the spec, because both apps depend on them.
- "Out of scope" is the most important section. Use it aggressively.
- If Claude needs an answer to proceed, it stops and asks instead of guessing. A guessed decision that lands in code is harder to undo than a question.

## Status values

`Draft` -> `Approved` -> `In progress` -> `Done`

## Template

Copy this into `specs/NNNN-slug.md`.

```markdown
# NNNN: Title

**Status:** Draft
**Depends on:** NNNN (or none)

## Context

Why this exists. Two or three sentences. What the user cannot do today.

## Goal

One sentence. If it needs two sentences, the spec is too big.

## Out of scope

Explicit list of things that look related but are not included. This section is not optional.

## Data model

New tables or columns, with types and constraints. Migration notes if existing data is affected.

## API contract

Method, path, auth requirement, request shape, response shape, error cases with status codes.

## UI

Screens and states: loading, empty, error, populated. Navigation between them. No pixel specs, no colours.

## Acceptance criteria

- [ ] Written so that each one can be checked by running something.
- [ ] Includes the failure paths, not just the happy path.

## Open questions

Anything unresolved. A spec with open questions cannot be Approved.
```
