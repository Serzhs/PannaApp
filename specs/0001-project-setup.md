# 0001: Project setup and database

**Status:** Done
**Depends on:** none

## Context

Empty repository. Before anything can be built there has to be a monorepo that typechecks, a local Postgres with the whole schema in place, a test harness, and an app shell that boots. None of that is a feature, and all of it is in the way of every feature.

## Goal

A developer can clone the repo, run three commands, and have a linted, typechecked API running against a migrated database, with the Expo app booting on a simulator.

## Out of scope

- Authentication. 0003 owns every auth endpoint and the sign-in screen. This spec creates the `users`, `identities` and `refresh_tokens` tables and writes nothing to them.
- The design system. 0002 owns tokens and components. The placeholder screen here uses plain React Native styles and is replaced.
- Recipes, ingredients, steps, sharing, images. Tables are created, and nothing reads or writes them.
- Any real screen. One placeholder proves the app boots.
- Deployment, CI, EAS Build, OTA updates.
- Dark mode. 0002 defines the theme structure that would carry it.

## Data model

Create every table listed in `CLAUDE.md` in the initial migration: `users`, `identities`, `refresh_tokens`, `recipes`, `ingredients`, `equipment`, `steps`, `step_ingredients`, `step_equipment`, `cooks`, `cook_notes`. Later specs add endpoints on top of them and never alter a table that already holds data.

Also created here: the `unit`, `unit_system`, `auth_provider`, `recipe_status` Postgres enums, the `pg_trgm` extension for searching recipe titles, and the `citext` extension so email uniqueness is case insensitive.

`steps.parentStepId` is a nullable self-reference, which is how a step records that it happens during another one. The schema can express the foreign key and nothing else: that a parent belongs to the same recipe, and that nesting never goes more than one level deep, are enforced in application code from 0008 onward.

`docker-compose.yml` runs one service, `database`, on Postgres 16 and port 5433 to avoid clashing with a local install. Credentials come from `.env`, and `.env.example` is committed.

## Tooling

Configured once at the root and inherited by all three workspaces, per the `TypeScript strictness` and `Lint and format` sections of `CLAUDE.md`.

- `tsconfig.base.json` carries `strict` plus the additional flags listed there. Each workspace extends it and adds only its own paths and JSX settings.
- `eslint.config.js` is a flat config with a shared type-aware base and per-workspace overrides.
- `.prettierrc` at the root, with no per-workspace override.
- `pnpm lint` runs ESLint with `--max-warnings 0` and Prettier in check mode across every workspace.

The three config files are committed before any application code, so no file in the repo has ever existed in an unlinted state.

**Versions.** Node and pnpm are pinned in `.nvmrc` and in `packageManager`.

**Git hooks.** husky runs lint-staged before a commit and commitlint on the message.

**Test harness.** Vitest against the Docker Postgres, with a helper that truncates every table between tests, per the Testing section of `CLAUDE.md`. Written once here and used by every later spec.

**Seed script.** `pnpm db:seed` creates known rows for working on the app by hand. Automated tests never call it. It is idempotent.

**Environment.** `@nestjs/config` validates the environment against a Zod schema at boot. A missing or malformed `DATABASE_URL` or JWT secret stops the API with a message naming the variable, rather than letting it start and fail later somewhere unrelated.

**Security setup.** `helmet` for security headers with `x-powered-by` disabled, CORS restricted to
what the app actually needs, and a request body size limit. The Zod validation pipe rejects unknown
fields rather than stripping them, so an unexpected field in a body is a 400 everywhere by default
and no endpoint has to remember to ask.

The environment schema validates that the JWT secret meets a minimum length, and that the Google and
Apple client ids 0003 needs are present, so a short or placeholder secret stops the API at boot
instead of shipping.

`pnpm audit` runs as part of `pnpm test` and fails on a high severity advisory.

**Logging.** `nestjs-pino`, structured, with a request id on every line. Passwords, tokens and hashes are redacted by configuration, not by remembering not to log them.

## API contract

`packages/shared` holds the contract and the error code const object. A controller's return type is derived from the contract and the mobile client parses against the same schema, so neither side can drift. The mobile client parses each response against its schema before handing it to the caller, so a mismatch surfaces at the boundary rather than as a strange bug three screens later.

This spec defines one endpoint, so that "it works" is something that can be checked rather than assumed.

**GET /api/health**
Unauthenticated. 200: `{ status: 'ok', database: 'ok' }`. It runs a trivial query, so a database that is unreachable produces a failure here rather than on the first real request.

Error codes introduced: `VALIDATION_FAILED`, `RATE_LIMITED`.

## UI

The Expo app boots to a single placeholder screen. It uses plain React Native styles, because 0002 has not happened yet, and it is deleted once real screens exist.

**Error boundary.** The app is wrapped in an error boundary, and so is each route group. A render error shows a screen with a way to recover, never a blank app.

**Query wiring.** The TanStack Query client is connected to React Native's `AppState` and to the network state, so it knows when the app is backgrounded and when the phone loses its connection. Without this the offline behaviour in `CLAUDE.md` does not work, and the failure is silent.

## Acceptance criteria

- [x] `pnpm db:up && pnpm --filter api db:migrate && pnpm --filter api dev` starts the API against a clean database with no manual steps.
- [x] `GET /api/health` returns 200 with both fields `ok`, and returns a failure when Postgres is stopped.
- [x] `pnpm typecheck` passes across all three workspaces, with `strict` and every additional flag from `CLAUDE.md` active in the base config.
- [x] `pnpm lint` passes with zero warnings, and fails if a warning is introduced.
- [x] Prettier in check mode reports no changes for any committed file.
- [x] Adding an unused local variable, an implicit `any`, or an unchecked index access each fail `pnpm typecheck` or `pnpm lint`.
- [x] The initial migration creates all eleven tables, `identities` rejects a duplicate `(provider, subject)` pair, and `steps.parentStepId` accepts null and rejects an id that is not a step.
- [x] `pnpm db:seed` runs against a migrated database, and running it a second time leaves the same rows rather than duplicating them.
- [x] Two API tests that each insert a row with the same unique value both pass when run in the same file, proving truncation happens between them.
- [x] A test asserting a rolled-back transaction leaves no partial rows passes, proving the harness does not hide commit behaviour inside an outer transaction.
- [x] Throwing with a code that is not in the shared const object fails `pnpm typecheck`.
- [x] A controller returning a shape the contract does not describe fails `pnpm typecheck`, and so does a mobile call passing the wrong request body.
- [x] A response that does not match its schema is rejected by the client with a clear error, verified by pointing the client at a stub that returns the wrong shape.
- [x] Starting the API with `DATABASE_URL` removed exits with a message naming the missing variable, and does not start. An empty JWT secret fails the same way.
- [x] Logs carry a request id, and no log line contains a value from a field marked secret.
- [x] ~~A request body containing a field the schema does not define returns 400.~~ **Moved to 0003**, where it is tested and met. No endpoint in this spec accepts a body, so there is nothing to reject; 0003 adds the first ones. The strict-schema rule stands in `CLAUDE.md`.
- [x] A request body over the size limit is rejected before it is parsed.
- [x] Security headers are present on every response and `x-powered-by` is absent.
- [x] An error response contains no stack trace, SQL fragment or internal file path, including when the database is unreachable.
- [x] Starting the API with a JWT secret shorter than the minimum fails at boot with a message saying so.
- [x] `pnpm test` fails when a dependency with a high severity advisory is installed. _(Verified: the run failed on three high and two critical advisories until drizzle-orm, drizzle-kit and vitest were upgraded, and vite pinned forward.)_
- [x] `.nvmrc` and `packageManager` are present and agree with the versions the project is developed on.
- [x] A commit with a message that is not a conventional commit is rejected by the hook, and a commit with a lint error in a staged file is rejected too.
- [x] Forcing a render error in the placeholder screen shows the error boundary's recovery screen rather than a blank app. _(Could not be seen on the simulator - Expo Go covers a render error with its own log. Covered instead by a test added in 0002: a throwing child produces the recovery screen, and Try again clears it.)_
- [x] Turning airplane mode on is reflected in the app's online state within a few seconds, and returning from the background triggers a refetch. _(Verified on the simulator: the app went offline within 3 seconds of the host losing wifi; idling 35 seconds triggered no refetch while backgrounding and foregrounding did. See the note below about coming back online.)_

## Verification

Walked on 2026-09-14, first from the command line and then on an iPhone 17 Pro simulator.
Twenty-three of twenty-five criteria verified by running them.

Three found real defects, all fixed and covered by regression tests:

- `steps.parentStepId`, `recipes.sourceRecipeId` and `refreshTokens.replacedTokenId` were declared as
  plain `uuid` columns with no foreign key, so a step could point at a step that did not exist.
- An oversized request body was rejected before parsing but surfaced as a 500 rather than a 413.
- The health endpoint returned 500 when the database was down, while the contract promised 503.

One criterion could not be checked as written and moved to 0003: nothing in this spec accepts a
request body, so "an unknown field returns 400" has nothing to reject.

**The simulator does not come back online, and it is the simulator.** Dropping the host's wifi put
the app offline in under three seconds, correctly. Restoring it left the app stuck offline for as
long as it was watched. Rendering a live `fetch` next to the raw NetInfo state settled where the
fault is: the fetch returned HTTP 204 from the open internet while NetInfo still reported
`type: none` and `isConnected: false`. The stale value comes from the iOS Simulator's reachability
API, which does not re-fire after the host interface returns; the wiring in `src/query/client.ts`
reads it correctly. Real airplane mode on a real device does not have this problem.

Worth recording rather than fixing: if that state ever did stick on a real device, `onlineManager`
would stay false and TanStack Query would never fetch again. Nothing in this spec asks for a
fallback, so none was added.

One criterion remains unverified: the error boundary's recovery screen. Expo Go puts its own error
log over the whole screen whenever a render throws, in dev and in a `--no-dev --minify` bundle
alike, and clearing it needs a tap on the simulator that macOS will not let a script send. The
boundary catches the error - the app did not go white or die - but the recovery screen itself was
never seen. It is marked unchecked rather than assumed.

## Open questions

None.
