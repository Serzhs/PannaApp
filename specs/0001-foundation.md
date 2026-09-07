# 0001: Foundation, database and auth

**Status:** Draft
**Depends on:** none

## Context

Empty repository. Before any recipe feature can be built there needs to be a working monorepo, a local Postgres with the schema in place, and a way for a user to have an account, because every recipe belongs to an author.

## Goal

A developer can clone the repo, run three commands, register an account in the Expo app on a simulator, and stay logged in after restarting the app, in a workspace where typecheck, lint and format all pass from the first commit.

## Out of scope

- Recipes, ingredients, steps, sharing. Tables are created, but no endpoints or screens for them.
- Image upload of any kind.
- Password reset, Sign in with Apple, Google sign-in.
- Choosing a language or a unit system in the app. 0004 owns that. This spec follows the device
  locale, and creates the columns that will hold an explicit choice later.
- Email verification. It is the mitigation that would close the enumeration tradeoff below, and it
  needs a mail transport, which rule 4 in `CLAUDE.md` does not allow. Revisit only if that rule changes.
- Separate login and register screens. There is one combined screen, described under UI.
- Deployment, CI, EAS Build, OTA updates.
- Profile editing, avatars, account deletion.
- The design system. 0003 owns tokens, scales and shared components. 0001 ships only the handful of
  values the two auth screens need, in the file layout 0003 will grow into.
- Dark mode. Define the theme structure, ship one light theme.

## Data model

Create all tables listed in `CLAUDE.md`, including `recipes`, `ingredients`, `steps`, `step_dependencies` and `step_ingredients`, in the initial migration. Later specs only add endpoints on top of them.

Used in this spec: `users`, `refresh_tokens`. The recipe tables are created empty and no code reads or writes them yet, but they are created now so that no later spec has to alter a table that already holds data.

The initial migration also creates the `unit` and `unit_system` Postgres enums, and the `users`
columns `locale` and `unitSystem`, both nullable and both unwritten by this spec. 0004 owns the
endpoints that set them.

`step_dependencies` carries the constraints that can be expressed in the schema - composite primary key, both columns cascading on step deletion, and a check that `stepId <> dependsOnStepId`. Same-recipe membership and acyclicity cannot be expressed as constraints and are enforced in application code from 0005 onward, so this spec creates the table and nothing else.

`docker-compose.yml` runs Postgres 16 only, on port 5433 to avoid clashing with a local install. Credentials come from `.env`, and `.env.example` is committed.

The `citext` extension is enabled in the first migration so email uniqueness is case insensitive.

## Tooling

Configured once at the root and inherited by all three workspaces, per the `TypeScript strictness`
and `Lint and format` sections of `CLAUDE.md`.

- `tsconfig.base.json` carries `strict` plus the additional flags listed there. Each workspace
  extends it and adds only its own paths and JSX settings.
- `eslint.config.js` is a flat config with a shared type-aware base and per-workspace overrides.
- `.prettierrc` at the root, with no per-workspace override.
- `pnpm lint` runs ESLint with `--max-warnings 0` and Prettier in check mode across every workspace.
  A warning fails the command, so warnings cannot accumulate.

The three config files are committed before any application code, so no file in the repo has ever
existed in an unlinted state.

**Test harness.** Vitest is configured against the Docker Postgres, with a helper that truncates
every table between tests, per the Testing section of `CLAUDE.md`. The helper is written once here
and used by every later spec, so no spec has to reinvent isolation.

**Seed script.** `pnpm db:seed` creates a known set of users, and from 0005 onward, recipes. It is
for working on the app by hand; automated tests never call it and build the state they need. It is
idempotent, so running it twice does not produce duplicates.

**Shared error codes.** `packages/shared` exports the error code list as a const object. The API
throws with codes from it, the mobile client derives translation keys from it, and neither side can
write a code the other does not know about without failing typecheck.

## Security posture

This app tells anyone who asks whether an email has an account here. That is a deliberate decision,
not an oversight, and it is written down so nobody later mistakes it for one.

The combined auth screen has to know whether it is signing you in or signing you up before it can
ask for the right fields, so `POST /api/auth/check-email` answers that question. The tradeoff is
accepted because the alternative that actually closes it - confirm nothing, send a verification
email - needs a mail transport this project does not have, and because an account list on a recipe
app is low-value to an attacker.

What follows from accepting it:

- Enumeration is confined to endpoints that are rate limited. `check-email` and `register` are both
  throttled per IP, and `login` keeps byte-identical responses for a wrong password and an unknown
  email. That last rule survives from the original spec, but for a different reason than before: not
  because existence is secret, but because `login` must not become an unthrottled way around the
  one endpoint that is throttled.
- `check-email` is a hint for the UI and never a security boundary. The server re-checks on every
  write, and the client is not trusted to have asked first.

## API contract

All bodies validated by Zod schemas from `packages/shared`.

Every error response carries a `code`, per the API conventions in `CLAUDE.md`. The codes this spec
introduces, and the complete set its endpoints may return:

`VALIDATION_FAILED`, `AUTH_EMAIL_TAKEN`, `AUTH_INVALID_CREDENTIALS`, `AUTH_TOKEN_INVALID`,
`AUTH_TOKEN_EXPIRED`, `AUTH_TOKEN_REVOKED`, `RATE_LIMITED`.

`AUTH_INVALID_CREDENTIALS` covers both a wrong password and an unknown email, which is what makes
the two indistinguishable. Splitting it into two codes would reintroduce through the code field
exactly the leak the identical message was there to prevent.

**POST /api/auth/check-email**
Body: `{ email }`
200: `{ exists: boolean }`. Matching is case insensitive, per the `citext` column.
400 if the value is not a well formed email address.
429 when the caller exceeds 10 requests per minute or 100 per hour from one IP.
This endpoint is unauthenticated, returns nothing but the boolean, and never reveals a display name,
a creation date, or anything else about a matching account.

**POST /api/auth/register**
Body: `{ email, password, displayName }`. Password minimum 10 characters.
201: `{ user: { id, email, displayName }, accessToken, refreshToken }`
409 if the email is taken. 400 on validation failure. 429 under the same throttle as `check-email`.

A 409 here is expected in normal use, not only under attack: `check-email` can answer `false` and
somebody else can register that address before the form is submitted. The client handles 409 by
switching to the password prompt for an existing account, not by showing a crash or a dead end.

**POST /api/auth/login**
Body: `{ email, password }`
200: same shape as register.
401 with `AUTH_INVALID_CREDENTIALS` on wrong email or wrong password. The message, status and code must be identical in both cases, so that `login` cannot be used as an unthrottled substitute for the rate limited `check-email`. The timing of the two paths should not differ meaningfully either: a missing user still costs one password verification against a dummy hash, so the response time does not give the answer away.

**POST /api/auth/refresh**
Body: `{ refreshToken }`
200: `{ accessToken, refreshToken }`. The old refresh token is revoked and a new one issued on every use.
401 if the token is unknown, expired or already revoked.

**POST /api/auth/logout**
Auth required. Revokes the refresh token belonging to the caller. 204.

**GET /api/me**
Auth required. 200: `{ id, email, displayName }`. 401 without a valid access token.

Refresh tokens are stored hashed. A raw refresh token is never written to the database or to logs.

## UI

Expo Router with two route groups: `(auth)` and `(app)`.

**`(auth)/index`** is one screen with one primary button, which changes label as the screen learns
what it is doing. There is no login screen and no register screen, and no link between them.

*Identify.* Email field, button labelled `Continue`. Submitting calls `check-email`.

*Returning user* (`exists: true`). A password field animates in below the email. The button becomes
`Log in`. The email stays visible and editable; editing it collapses the screen back to Identify,
because the answer it was built on is no longer the answer to the question being asked.

*New user* (`exists: false`). A password field and a display name field animate in. The button
becomes `Create account`. A short line explains that this email is new here, so nobody types their
password into what they assumed was a login form and gets an account instead.

The transition between stages animates the fields in and the button label across, per the Motion
section of `CLAUDE.md`. It does not remount the email field, so the keyboard never dismisses and
reopens mid-flow.

Errors: field-level errors render against the field. A 401 renders once at form level. A 409 on
create switches the screen to the returning-user stage with an explanation, rather than surfacing
the raw conflict. A 429 shows a plain "too many attempts, try again shortly" and disables the button
until the window passes.

**`(app)/index`**: placeholder home screen showing the logged-in display name and a logout button.
Recipes come later.

The root layout decides which group to show based on whether a session exists. While that check is running, show a splash state rather than flashing the login screen.

Tokens are stored in `expo-secure-store`. The fetch client attaches the access token, and on a 401 it attempts one refresh, retries the original request once, and on failure clears the session and sends the user to login. Concurrent 401s must trigger only one refresh call, not one per request.

## Acceptance criteria

- [ ] `pnpm db:up && pnpm --filter api db:migrate && pnpm --filter api dev` starts the API against a clean database with no manual steps.
- [ ] `pnpm typecheck` passes across all three workspaces, with `strict` and every additional flag from `CLAUDE.md` active in the base config.
- [ ] `pnpm lint` passes with zero warnings, and fails if a warning is introduced.
- [ ] Prettier in check mode reports no changes for any committed file.
- [ ] Adding an unused local variable, an implicit `any`, or an unchecked index access each fail `pnpm typecheck` or `pnpm lint`.
- [ ] `pnpm db:seed` runs against a migrated database, and running it a second time leaves the same rows rather than duplicating them.
- [ ] Two API tests that each create a user with the same email both pass when run in the same file, proving truncation happens between them.
- [ ] A test asserting a rolled-back transaction leaves no partial rows passes, proving the harness does not hide commit behaviour inside an outer transaction.
- [ ] Throwing with a code that is not in the shared const object fails `pnpm typecheck`.
- [ ] The initial migration creates all seven tables, and `step_dependencies` rejects a row where `stepId` equals `dependsOnStepId`.
- [ ] Registering with an email that already exists returns 409 and creates no user row.
- [ ] Every error response from every endpoint carries a `code` from the list above, and no endpoint returns an error without one.
- [ ] A validation failure returns `VALIDATION_FAILED` with a `fields` object naming each invalid field, so a form can mark the right field without parsing English.
- [ ] No user-visible string in the two auth screens is a literal; every one resolves through `t()`, and switching the device to Latvian changes all of them.
- [ ] Login with a wrong password and login with an unknown email return byte-identical response bodies, including an identical `code`, and their response times do not differ enough to distinguish the two cases over 100 samples.
- [ ] `check-email` returns `{ exists: true }` for a registered address in any capitalisation, and `{ exists: false }` for an unregistered one.
- [ ] `check-email` returns 429 on the eleventh request within a minute from one IP, and `register` is throttled by the same rule.
- [ ] `check-email` for an existing account returns a body containing exactly one key, `exists`.
- [ ] Entering a new email, then editing that email, returns the screen to the Identify stage rather than leaving a stale password field on screen.
- [ ] Submitting the create form for an email registered in the meantime shows the returning-user stage, not an unhandled error.
- [ ] With reduce motion enabled, the stage transition resolves instantly and every field remains reachable.
- [ ] A VoiceOver or TalkBack walkthrough of the auth screen reaches the email field, the password field once revealed, and the button in that order; the button announces its current label; and the stage change from Identify to a revealed password field is announced rather than happening silently.
- [ ] Using a refresh token twice fails the second time with 401.
- [ ] `GET /api/me` returns 401 without a token and 401 with an expired access token.
- [ ] The app restores the session after a full app restart without showing the login screen.
- [ ] Two API requests firing at the same time with an expired access token result in exactly one call to `/api/auth/refresh`.
- [ ] `passwordHash` and `tokenHash` never appear in any HTTP response.

## Open questions

None. The enumeration tradeoff was a question and is now a recorded decision, under Security posture.
