# Cappums specs

The spec is the source of truth. Code follows the spec, never the other way around. If reality diverges, update the spec in the same PR.

## Index

| # | Title | Status | Goal |
| --- | --- | --- | --- |
| [0001](0001-project-setup.md) | Project setup and database | Draft | Clone, run three commands, get a linted API on a migrated database. |
| [0002](0002-design-system.md) | Design system: tokens and primitives | Draft | Build a form screen from tokens and components, with no raw values. |
| [0003](0003-auth.md) | Authentication | Draft | Create an account or sign in from one screen, and stay signed in. |
| [0004](0004-design-system-components.md) | Design system: display and feedback | Draft | Build a list screen's loading, empty and error states. |
| [0005](0005-recipe-crud.md) | Recipe CRUD | Draft | Create, view, edit and delete your own recipes, as metadata only. |
| [0006](0006-i18n.md) | Internationalisation | Draft | Run the app in another language, with correct plurals, formats and units. |
| 0007 | Ingredients | Not written | Add, edit, remove and reorder the ingredients of a recipe. |
| 0008 | Steps and the dependency graph | Not written | Write steps and declare which must finish before which. |
| 0009 | Step to ingredient links | Not written | Attach ingredients to the step that uses them. |
| 0010 | Cooking mode | Not written | Cook a recipe, seeing everything available to do right now. |
| 0011 | JSON recipe import | Not written | Paste AI-generated JSON and get a working recipe. |
| 0012 | Sharing | Not written | Share a recipe read-only by private link, and revoke it. |
| 0013 | Images | Not written | Cover and per-step images. |

Numbers run in build order, and each spec depends only on lower-numbered ones. That is a convenience
rather than a rule, and it will stop being true the first time something is inserted.

A number is fixed once its spec is **Approved**. Draft specs can still be renumbered, because nothing
has been built against them yet and a tidy order is worth more than an untouched number. Once a spec
is approved its number never changes and is never reused.

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
