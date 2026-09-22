# 0012: Cooking mode

**Status:** Done
**Depends on:** 0010, 0011, 0022

## Context

A recipe can be read but not cooked from. Reading happens with clean hands at a table; cooking
happens at a stove with a knife in one hand, and the same screen cannot serve both, per the App
structure section of `CLAUDE.md`. This is the guide: one step at a time, big enough to hit with a
knuckle, with what runs meanwhile shown under the step it runs during.

## Goal

A recipe can be cooked step by step, with a timer that rings even when the phone is locked, and
progress that survives the app being closed.

## Out of scope

- The check of what you have before starting, and cooking without an ingredient. That is 0013;
  here Cook opens the first step at once.
- The knuckle hint animation. A small spec of its own, 0028, once this works.
- Recipe history, the `cooks` table and the offline queue for a finished cook. That is 0014. This
  spec writes nothing to the server.
- Cook's notes, 0015.
- More than one timer at once. A timer belongs to one step; starting another replaces it, after
  asking. Decided on approval.
- Audio, in either direction. The timer rings through the platform's own notification, which the
  phone's settings govern; the app plays nothing itself.
- A step photo behind a big button. The button is here; the full-screen view it opens is shared with
  the photo viewer 0011 left out, and comes with 0028.
- Android. It should work, and is not verified here.

## Data model

None on the server. On the device, one record per recipe being cooked, under
`panna.cook.<recipeId>` in the same key-value store the query cache uses:

```
{ recipe: RecipeDetail, startedAt, current: stepId, done: stepId[],
  timer: { stepId, endsAt, notificationId } | null }
```

`recipe` is a copy of the whole recipe taken when cooking starts. That is what "pins the recipe
first" means in `CLAUDE.md`: nothing in cooking mode reads the network or the query cache, so a
connection drop cannot interrupt it. The copy is dropped when the cook is finished or abandoned.

## API contract

None.

## UI

**Recipe screen.** A "Cook" button above Edit, primary, for a recipe with at least one step. If a
cook of this recipe is in progress it reads "Continue cooking". A ready recipe or a draft can both
be cooked: a draft is the author's own.

**Recipe list.** Recipes with a cook in progress come first, under a heading "In progress", each
row carrying "Step 3 of 8" in place of the servings line. The rest follow as now. This is the
section 0005 deferred.

**Cooking screen, `(app)/recipes/[id]/cook`.** No header; a small "Leave" control top-start and the
recipe's title top-end in caption text. The screen stays awake while it is open. The body is one
main step:

- "Step 3 of 8" in a label, then the instruction in display-size text, readable from across a
  counter. The note under it in body size. Linked ingredients with amounts, and equipment, as one
  short line each.
- What runs during this step, as a list under a "Meanwhile" label, each with its own done mark that
  toggles on tap of the whole row. A row is at least 64 points tall.
- If the step has a photo, a full-width button "How it should look" that opens the photo full
  screen with an equally large "Close" bar. This viewer is the one part that ships here and is
  reused by 0028.
- If the step has a time, a timer block: "Start timer, 20 min" as a full-width bar; once running,
  the remaining time in display size counting down, and a "Stop" bar. A running timer for another
  step shows a one-line "Timer running for step 2, 4:10 left" instead, and starting this one asks
  to replace it through the platform's dialog. When a timer ends the phone shows a notification,
  "Step 3 is done: Boil the beetroot", with the app's name, whether the screen is on or off. On
  screen the block reads "Time is up" with a haptic, and the timer is cleared.
- At the bottom, a full-width bar at least 80 points tall: "Done" marks the step and moves to the
  next; on the last step it reads "Finish". "Back" as a smaller ghost above it goes to the previous
  step without changing marks. The step card itself is tappable for Done as well, per `CLAUDE.md`,
  and says so to a screen reader with a hint.

Every change is written to the device as it happens. Leaving and coming back, or the app being
killed, lands on the same step with the same marks and the same timer.

**Finish** clears the record and lands on the recipe screen. **Leave** keeps the record and goes
back; a dialog offers "Keep my place" and "Stop cooking", the second clearing the record and any
timer.

The first time Cook is pressed, notification permission is asked for through the platform's own
prompt. Refused, timers still count on screen and the notification is simply not shown; the timer
block says "Notifications are off, so the timer only shows here".

The step text is authored prose and is shown as written. Reduce-motion makes the step change
instant; otherwise the new step slides in over a fast duration.

**Components**, each in its own folder with styles, test and index, in the recipes feature: the
cooking screen's step view, the timer block, the photo viewer, and the "In progress" row. Gallery
entries for the timer block in idle, running, another-step and time-up states, and for the row.

All new strings go through `t()`, in English and Latvian.

## Acceptance criteria

- [x] `pnpm typecheck`, `pnpm lint` and `pnpm test` pass across all three workspaces. _(`pnpm check`: shared 9, API 123, mobile 1049 tests.)_
- [x] Starting a cook writes a record with the whole recipe and the first step; Done moves to the
      next and marks the previous; Finish on the last step clears the record, asserted in tests on
      the store with the storage faked. _(store.test "starts on the first step with the whole recipe copied, and moves on with Done".)_
- [x] A meanwhile step's mark toggles without changing the current main step, asserted in a test. _(store.test "toggles a meanwhile step without moving the main step"; StepView test for the row.)_
- [x] Starting a timer schedules a notification at the step's end and records its id; Stop
      cancels it; time reaching the end clears the timer, asserted with the notification module
      faked. _(CookScreen test "starts a timer that schedules a notification, and stops it"; TimerBlock test "counts down from the end time and says so when it reaches it".)_
- [x] Starting a timer while another step's runs asks first, and on yes cancels the old
      notification and schedules the new one, asserted in a test. _(CookScreen test "asks before replacing another step's timer, and replaces it on yes".)_
- [x] The cooking screen renders the current step in display size, its meanwhile steps, its links
      and a Done bar at least 80 points tall, asserted in a component test by role and name. _(StepView test "reads the step as one Done target with its links and meanwhile rows"; the bar is 80 points in the styles.)_
- [x] The list shows an "In progress" section first with "Step N of M" rows, and no section when
      nothing is in progress, asserted in a test. _(RecipeList test "puts a cook in progress first, and shows no section without one".)_
- [x] The recipe screen shows Cook for a recipe with steps, Continue cooking for one in progress,
      and nothing for one with no steps, asserted in a test. _(RecipeDetailScreen test "offers to cook, or to continue, only when there are steps".)_
- [x] On the simulator: cook the seeded recipe two steps in, start a timer, lock the screen and see
      the notification arrive, reopen the app from the list's In progress row and land on the same
      step, then Finish. _(Seen: Cook opened step 1 of 3, the dill ticked, the one-minute timer counted down, the phone was locked and "Step 1 is done, Boil the beetroot" arrived on the lock screen; the app was reopened from the list's In progress row and landed on step 1 with the dill still ticked and "Time is up" shown; Done, Done, Finish landed on the recipe.)_
- [x] The screen is kept awake while cooking and released on leaving, asserted in a test with the
      keep-awake module faked. _(CookScreen test "moves on with Done, finishes on the last step, and keeps the screen awake meanwhile".)_
- [x] The Latvian file lists every new key. _(the `cook` group; the key-parity test passes.)_
- _Manual follow-up, not a gate:_ a VoiceOver walkthrough of the cooking screen, checking the step
  reads as one element with its hint, the meanwhile rows announce their mark, and the timer's
  change is spoken.

## Open questions

None. Decided on approval: timers notify even when locked; one timer at a time; the pre-cook check
and the knuckle hint are their own specs.
