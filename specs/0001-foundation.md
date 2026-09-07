# 0001: Foundation, database and auth

**Status:** Draft
**Depends on:** none

## Context

Empty repository. Before any recipe feature can be built there needs to be a working monorepo, a local Postgres with the schema in place, and a way for a user to have an account, because every recipe belongs to an author.

## Goal

A developer can clone the repo, run three commands, register an account in the Expo app on a simulator, and stay logged in after restarting the app.

## Out of scope

- Recipes, ingredients, steps, sharing. Tables are created, but no endpoints or screens for them.
- Image upload of any kind.
- Password reset, email verification, Sign in with Apple, Google sign-in.
- Deployment, CI, EAS Build, OTA updates.
- Profile editing, avatars, account deletion.
- Dark mode. Define the theme structure, ship one light theme.

## Data model

Create all tables listed in `CLAUDE.md`, including `recipes`, `ingredients`, `steps` and `step_ingredients`, in the initial migration. Later specs only add endpoints on top of them.

Used in this spec: `users`, `refresh_tokens`.

`docker-compose.yml` runs Postgres 16 only, on port 5433 to avoid clashing with a local install. Credentials come from `.env`, and `.env.example` is committed.

The `citext` extension is enabled in the first migration so email uniqueness is case insensitive.

## API contract

All bodies validated by Zod schemas from `packages/shared`.

**POST /api/auth/register**
Body: `{ email, password, displayName }`. Password minimum 10 characters.
201: `{ user: { id, email, displayName }, accessToken, refreshToken }`
409 if the email is taken. 400 on validation failure.

**POST /api/auth/login**
Body: `{ email, password }`
200: same shape as register.
401 on wrong email or wrong password. The message must be identical in both cases so the endpoint does not reveal which emails exist.

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

- `(auth)/login`: email, password, submit, link to register. Shows inline field errors and a single form-level error for 401.
- `(auth)/register`: email, password, display name, submit, link to login.
- `(app)/index`: placeholder home screen showing the logged-in display name and a logout button. Recipes come later.

The root layout decides which group to show based on whether a session exists. While that check is running, show a splash state rather than flashing the login screen.

Tokens are stored in `expo-secure-store`. The fetch client attaches the access token, and on a 401 it attempts one refresh, retries the original request once, and on failure clears the session and sends the user to login. Concurrent 401s must trigger only one refresh call, not one per request.

## Acceptance criteria

- [ ] `pnpm db:up && pnpm --filter api db:migrate && pnpm --filter api dev` starts the API against a clean database with no manual steps.
- [ ] `pnpm typecheck` passes across all three workspaces.
- [ ] Registering with an email that already exists returns 409 and creates no user row.
- [ ] Login with a wrong password and login with an unknown email return byte-identical response bodies.
- [ ] Using a refresh token twice fails the second time with 401.
- [ ] `GET /api/me` returns 401 without a token and 401 with an expired access token.
- [ ] The app restores the session after a full app restart without showing the login screen.
- [ ] Two API requests firing at the same time with an expired access token result in exactly one call to `/api/auth/refresh`.
- [ ] `passwordHash` and `tokenHash` never appear in any HTTP response.

## Open questions

None.
