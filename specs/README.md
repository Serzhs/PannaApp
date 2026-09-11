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
| 0007 | Ingredients and equipment | Not written | Add, edit, remove and reorder what a recipe needs. |
| 0008 | Steps and nesting | Not written | Write steps, and nest the ones that happen during a wait. |
| 0009 | Step links | Not written | Attach ingredients and equipment to the step that uses them. |
| 0010 | Images | Not written | A cover photo, and a picture of how each step should look. |
| 0011 | Cooking mode | Not written | Cook a recipe, seeing what else you could do during each wait. |
| 0012 | Cooking without an ingredient | Not written | Check off what you have, and cook it without the carrots. |
| 0013 | Recipe history | Not written | See when you cooked something, and what you changed each time. |
| 0014 | Cook's notes | Not written | Record what you learned, and see it next time you cook. |
| 0015 | JSON recipe import | Not written | Paste AI-generated JSON and get a working recipe. |
| 0016 | Sharing | Not written | Share a recipe read-only by private link, and revoke it. |

Numbers run in build order, and each spec depends only on lower-numbered ones. That holds today because
nothing below 0007 is written yet and the order has been kept tidy; it will stop being true the first
time something has to be inserted after a spec is approved.

A number is fixed once its spec is **Approved**. Draft specs can still be renumbered, because nothing
has been built against them yet and a tidy order is worth more than an untouched number. Once a spec
is approved its number never changes and is never reused.

## Known problems in unwritten specs

Things already identified that have no spec to live in yet. Each one is a decision that must be made
when its spec is written, and none of them should be discovered then for the first time.

**0007 Ingredients and equipment both carry a note.** "Carrots, not too long", "flour, plain not
self-raising", "roasting tin, at least 30cm". It goes in its own field rather than in the name, so the
name stays usable for a shopping list and the same ingredient does not read as three different ones.

**0007 Equipment sits beside ingredients, not inside them.** A recipe lists the pans, tins and gadgets
it needs, each optionally marked optional, and equipment links to the steps that use it the same way
ingredients do. It is a separate table because equipment has no amount and no unit.

Equipment belongs in the check before cooking at least as much as ingredients do: a missing herb can be
improvised, a stand mixer cannot, and finding out halfway through is worse.

**0010 Images - one storage decision, made once.** A step can carry a picture of what it
should look like when done, which is what makes a shared recipe worth reading. Cooking mode shows it
behind a large button rather than inline, with an equally large button to close, so the instruction
keeps the screen.

Cover photos ship in the same spec rather than at the end, because they share the only hard part: the
files need somewhere to live, and under rule 4 that means the developer machine, which nobody else can
reach. Solving that twice, seven specs apart, would be the same work done badly. Sharing recipes with
pictures depends on the same decision as sharing itself.

**0011 Cooking mode - progress is stored on the device.** Which steps are done lives in local storage so cooking never needs the network, and several recipes can be in progress at once. This spec also adds the in-progress section to the home screen and the Cook button to the recipe screen, both deferred from 0005.

**0011 Cooking mode - it is used with dirty hands.** Targets far larger than the accessibility
minimum, text readable from across a counter, screen kept awake, and no audio in either direction: a
kitchen defeats speech recognition, and a microphone listening in someone's home needs a better reason
than this app has. None of it is a mode to switch on - nobody enables "dirty hands" once their hands
are dirty.

The first open shows a short animation of tapping with the back of a finger, which stays cleaner than
the pad. It plays once and is dismissible. It also needs a text equivalent and a still-image form for
reduce-motion, because an animation alone excludes people - see the Accessibility section of
`CLAUDE.md`.

**0011 Cooking mode - timers stop when the phone locks.** A kitchen timer that only runs while the
screen is on is not a timer. This needs local notifications and a keep-awake, both additions to the
stack, and it needs deciding what happens when several timers are running at once.

**0012 Cooking without an ingredient - the step text cannot be rewritten.** Before cooking, the reader
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

**0013 Recipe history - the one place an offline queue is allowed.** A `cooks` row per time somebody
made a recipe: when, whether they finished, and what they left out. The recipe screen can then say
"made 6 times, last on 12 Jan", and each note links to the cook it came from.

Cooking ends where a connection is least likely, and a lost history row cannot be recovered by asking
the user to try again, so a finished cook is written to the device and sent when the app is next
online. That is the single exception to the no-mutation-queue rule in `CLAUDE.md`, and it is only safe
because history is append-only: rows are never edited or deleted, so there is nothing to merge. The
exception must not be widened to anything that can be changed after the fact.

`excluded` stores ingredient names rather than ids, because history records what happened and must not
change when the recipe is edited later.

**0014 Cook's notes - writing one needs a connection.** After cooking, and at any time from the recipe
screen, the cook can add a dated note to a step or to the recipe as a whole. They build up rather than
being overwritten, so a note from last winter is still there.

Storage has a seam worth getting right. Notes live on the server so they survive a new phone, but
finishing a meal is exactly when someone is least likely to have signal. **A note written as part of
finishing a cook rides in the same queued record as the cook itself** (0014), because both are created
in that one moment and it would be absurd for one to survive and the other to fail. A note added later
from the recipe screen is an ordinary write and needs a connection; if it fails it keeps its text and
can be sent again.

The payoff is in cooking mode, where a step shows the author's `note` and the cook's own notes
together. That pairing is the reason the two are separate columns rather than one field.

**0015 JSON import - a link may not be readable by the user's AI.** Tested on 2026-09-11: fetching a
`tiktok.com` video URL returns an empty shell with no caption, transcript or text to anything that is
not a logged-in browser. Assistants that browse hit the same wall, and the failure is not loud - a
model handed an unreadable link tends to produce a plausible recipe rather than refuse, so the user
gets confident nonsense.

What follows: the prompt must not promise that a link works. It should ask for the recipe **text** -
the caption, the transcript, or what the user typed out - and treat a link as a best effort that often
will not resolve. Worth re-testing per platform before writing the spec, since YouTube and ordinary
web pages behave differently from TikTok.

**0015 JSON import - the prompt is the hard part, not the parser.**

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

**0016 Sharing - a reader cannot cook without saving first.** A share link is read-only: to cook it you
press Add to my recipes, which copies it into your list. One clear action, at the cost of a recipe you
tried once staying in your list.

This is load-bearing for the schema. Because cooking requires owning, `cooks` needs no `userId` and
`cook_notes` needs no `authorId` - the person is always `recipes.authorId`. **If cooking straight from
a link is ever allowed, both columns have to come back**, because nothing else would record who
actually cooked or wrote the note.

**0016 Sharing - Add to my recipes makes a copy.** A reader who opens a share link can view the recipe.
Pressing Add to my recipes duplicates it into their account: a new `recipes` row they own, with the
ingredients, equipment, steps and both join tables copied. No shared row, no ongoing relationship.

That keeps "one user owns everything" true, with the shared read as the single deliberate exception
rather than a permission system growing inside the schema. It also means the author cannot change or
withdraw a recipe someone has already kept, at the cost of the reader never seeing later improvements.

The work is in the id remapping: steps point at each other through `parentStepId`, and both join tables
point at step, ingredient and equipment ids. The copy builds a map from old id to new and rewrites
every reference inside one transaction - a half-copied recipe is worse than a failed copy.

**Images are the open part.** A copy that reuses the original's `coverImageKey` and `imageKey` breaks
when the author deletes their recipe and its files. Duplicating the files avoids that and doubles
storage. Which one depends on where files end up living, which 0010 has to settle first.

**0016 Sharing - the API has to be reachable by the reader.** A share link is useless if the recipe
lives on a machine the reader cannot reach, so this feature cannot work under rule 4 as written. A
tappable link that opens the app, or the App Store when the app is missing, additionally needs a
domain and two files hosted on it; a `panna://` link cannot do it, and most messaging apps will not
even make it tappable. The alternative that stays local is exporting a recipe as a file the reader
imports with 0015, without the cook's notes, which never travel, which is a copy rather than a link and cannot be revoked. Deferred deliberately.

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
