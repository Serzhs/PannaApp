# Cappums specs

The spec is the source of truth. Code follows the spec, never the other way around. If reality diverges, update the spec in the same PR.

## Index

| # | Title | Status | Goal |
| --- | --- | --- | --- |
| [0001](0001-foundation.md) | Foundation, database and auth | Draft | Clone, run three commands, register, stay logged in across restarts. |
| [0002](0002-recipe-crud.md) | Recipe CRUD | Draft | Create, view, edit and delete your own recipes, as metadata only. |
| [0003](0003-design-system.md) | Design system and tokens | Draft | Build any screen from semantic tokens and shared components, with no raw values. |
| 0004 | Ingredients | Not written | Add, edit, remove and reorder the ingredients of a recipe. |
| 0005 | Steps and the dependency graph | Not written | Write steps and declare which must finish before which. |
| 0006 | Step to ingredient links | Not written | Attach ingredients to the step that uses them. |
| 0007 | Cooking mode | Not written | Cook a recipe, seeing everything available to do right now. |
| 0008 | JSON recipe import | Not written | Paste AI-generated JSON and get a working recipe. |
| 0009 | Sharing | Not written | Share a recipe read-only by private link, and revoke it. |
| 0010 | Images | Not written | Cover and per-step images. |

Numbers are identifiers, not a build order. 0003 is implemented before 0002's screens, which is why
0002 depends on it despite the lower number.

Keep this table in step with the specs. A spec whose status changes updates its row in the same PR.

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
