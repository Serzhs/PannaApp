---
name: spec
description: Work with Panna specs - draft a new one from the template with the next number, or verify an existing spec's acceptance criteria one by one before merging. Use when asked to write, draft, review, verify or close a spec.
---

# Spec workflow

`specs/README.md` is the authority. This skill exists so its workflow is followed rather than
merely available.

## Choosing a mode

- "write / draft / add a spec for X" -> **Draft**.
- "verify / check / close spec NNNN", or finishing an implementation branch -> **Verify**.
- Anything else about specs: read `specs/README.md` and answer from it.

## Draft

1. Read `specs/README.md` for the template and rules, and `CLAUDE.md` for the stack and data model.
   Read the specs this one will depend on. Do not skip this because the request seems small.
2. Take the next unused number from the index table in `specs/README.md`. Numbers are never reused.
   If the roadmap already reserves a number for this slice, use that one.
3. Write `specs/NNNN-slug.md` from the template, in the same voice as the existing specs: prose that
   explains why, not bullet fragments.
4. Requirements that are not negotiable:
   - **Out of scope is the most important section.** Populate it aggressively. A spec whose out of
     scope list is short is a spec that has not been thought about.
   - Every acceptance criterion must be checkable by running something. "The list feels fast" is not
     a criterion. Include failure paths, not only the happy path.
   - Any spec that adds a screen includes a screen reader walkthrough criterion, per the
     Accessibility section of `CLAUDE.md`.
   - Any spec that adds an endpoint lists every error `code` it can return.
   - Any spec that adds a component states that it follows the one-folder-per-component layout.
   - If the slice looks like more than about a day of work, say so and propose a split instead of
     writing one large spec.
5. **Do not invent product decisions.** Where a decision is genuinely the user's, put it in Open
   questions and say what the options are and what each costs. A spec with open questions cannot be
   approved, which is the correct outcome - it is not a failure to have them.
6. Add the row to the index table in `specs/README.md`, status `Draft`.
7. Report what you wrote, and lead with the open questions rather than burying them.

## Verify

1. Read the spec. Work through its acceptance criteria **in order, one at a time**.
2. For each, actually run the thing: the command, the test, the request. Do not reason about whether
   it would pass. A criterion you did not execute is unverified, and reporting it as met is the one
   failure this skill exists to prevent.
3. Record each as met, unmet, or unverifiable-as-written. If a criterion cannot be checked as
   phrased, that is a defect in the spec: say so and propose the rewording.
4. Any unmet criterion blocks the merge. Report them plainly, with the output that proves it, and do
   not soften the summary.
5. Only when every criterion is met: set the spec's status to `Done`, update its index row, and say
   which commit verified it.

## Reminders

- Implementation follows the spec. If reality diverged, the spec is updated in the same change, not
  quietly left behind.
- One spec, one branch, one PR: `spec/NNNN-slug`.
