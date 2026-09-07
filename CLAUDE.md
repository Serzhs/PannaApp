# CLAUDE.md

**Cappums** is a cooking assistant app. Users write recipes as a graph of steps, so independent work can happen
in parallel while something cooks, and share them via private link. Recipes can also be imported
as JSON produced by the user's own AI assistant from a video or a web page.

## Non-negotiable rules

1. **No code without a spec.** Every change must trace to a file in `specs/`. If the user asks for something not covered, write or update the spec first, get approval, then implement.
2. **If the spec is ambiguous, stop and ask.** Do not invent product decisions, extra fields, extra endpoints or extra screens.
3. **No scope creep.** Do not add libraries, abstractions, caching layers, feature flags or "future-proofing" that the spec does not ask for.
4. **Local only.** No cloud services, no deployment config, no CI, no analytics, no crash reporting. Everything runs on the developer machine.
5. Read `specs/README.md` before starting any task.

## How to talk to me

Plain language. Short sentences. Explain things the way you would to a colleague over coffee, not in
a design document.

- Say what changed and why it matters. Skip the detail that does not change a decision.
- Use a technical term only when there is no simpler word for it, and say what it means the first
  time it comes up.
- Lead with the answer. Put the reasoning after it, and only as much as is needed.
- When there is a choice to make, describe the options in everyday terms and say which one you would
  pick. Do not lay out every consideration and leave the decision hanging.
- Keep summaries short. A few lines beats a long list.

None of this means hiding problems. If something is broken, wrong, or a bad idea, say so directly -
just say it simply.

## Stack

| Layer | Choice |
| --- | --- |
| Monorepo | pnpm workspaces (no Turborepo yet) |
| Backend | NestJS, TypeScript strict |
| ORM | Drizzle ORM + drizzle-kit migrations |
| DB | PostgreSQL 16 via docker compose |
| Validation | Zod, shared between API and mobile |
| API contract | `ts-rest` - one Zod contract in `packages/shared`, both sides typed from it |
| Config | `@nestjs/config` with a Zod schema. The API refuses to start on a bad env |
| Logging | `nestjs-pino`, structured, one request id per request |
| Git hooks | husky + lint-staged + commitlint |
| Auth | JWT access token (15 min) + refresh token (30 days), argon2 password hashing |
| Mobile | Expo (managed workflow, prebuild only when required) |
| Routing | Expo Router (file based) |
| Data fetching | TanStack Query v5 |
| Styling | react-native-unistyles |
| Animation | react-native-reanimated + react-native-gesture-handler |
| Haptics | expo-haptics |
| i18n | `i18next` + `react-i18next`, locale detection via `expo-localization` |
| Offline | TanStack Query cache persisted to `expo-sqlite/kv-store` |
| Component browser | `@storybook/react-native`, on device only |
| Rate limiting | `@nestjs/throttler` |
| Language | TypeScript everywhere, strict (see below), no `any` |
| Lint | ESLint 9 flat config, `typescript-eslint` strict-type-checked |
| Format | Prettier, with `eslint-config-prettier` disabling all conflicting rules |

Explicitly **not** used: CSS Modules (does not work in React Native), NativeWind, styled-components, Redux, Prisma, TypeORM, GraphQL, Moti (Reanimated directly is enough for what this app does), `react-native-skia` (revisit only if the cooking view in 0010 genuinely outgrows Reanimated).

## TypeScript strictness

One `tsconfig.base.json` at the root, extended by every workspace. Beyond `strict: true`:

`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride`,
`noFallthroughCasesInSwitch`, `noUnusedLocals`, `noUnusedParameters`, `verbatimModuleSyntax`.

`any` is banned, including implicit. When a type genuinely cannot be known, use `unknown` and narrow
it. A cast is a last resort and carries a comment saying why the compiler cannot see what you can.

`@ts-expect-error` is allowed with a reason on the same line. `@ts-ignore` is not: it stays silent
when the underlying error goes away.

## Lint and format

ESLint 9 flat config in `eslint.config.js` at the root, one shared base with per-workspace overrides.

- `typescript-eslint` `strictTypeChecked` and `stylisticTypeChecked`, type-aware, on every workspace.
- Mobile also gets `eslint-plugin-react-hooks` and `eslint-config-expo`.
- `eslint-plugin-import` for `import/order`, so import blocks are grouped and sorted the same way
  everywhere and diffs stop churning on import lines.
- `eslint-plugin-react-native-a11y` on the mobile workspace, so the mechanical accessibility rules -
  a touchable with no role, an image with no label - fail the build instead of relying on review.
- `eslint-config-prettier` last, so formatting is Prettier's job alone and never a lint error.

Prettier config is committed at the root and is not overridden per workspace:
`singleQuote: true`, `semi: true`, `trailingComma: "all"`, `printWidth: 100`.

A pre-commit hook runs lint-staged over the staged files, and commitlint checks the message. The
conventional commit rule is enforced by a hook rather than by memory, because a rule only a person
enforces is a rule that lapses on a busy day.

Node and pnpm versions are pinned, in `.nvmrc` and in `packageManager` in the root `package.json`,
so the project builds the same way on another machine.

Lint and format are checked in `pnpm lint`, which fails on warnings. There is no rule-by-rule
negotiation during implementation: if a rule is wrong for this codebase, it is turned off in the
config in its own commit, with a reason, not suppressed inline at each call site.

## Comments

Few comments, and every one of them answers **why**.

The code already says what it does. A comment that restates it adds nothing and starts lying the
moment someone edits the line above it. Most code needs no comment at all.

Write one when the reason is not visible in the code:

- A constraint that is not obvious, for example why a query is ordered a particular way.
- Something that looks wrong but is deliberate, so nobody "fixes" it.
- A workaround, with what forced it.
- A rule from a spec that the code enforces, naming the spec.

Do not write one that names the function, restates the line below, describes a parameter the type
already describes, or records who changed what and when. That is what git is for.

No commented-out code. Delete it.

## Repo layout

```
apps/
  api/                NestJS backend
    src/
      modules/        one folder per domain (auth, users, recipes, sharing)
      db/
        schema/       Drizzle table definitions, one file per table group
        migrations/   generated by drizzle-kit, never hand-edited
    drizzle.config.ts
  mobile/             Expo app
    app/              Expo Router routes
    src/
      features/       one folder per domain, mirrors api modules
        recipes/
          components/ components used only by this feature, same folder rule
          queries.ts
      components/     shared UI primitives, one folder each
        Button/
          Button.tsx            the component
          Button.styles.ts      its unistyles stylesheet
          Button.stories.tsx    its Storybook stories
          Button.test.tsx       its tests
          index.ts              re-exports Button
      api/            typed fetch client + TanStack Query hooks
      styles/         tokens, unistyles theme, breakpoints
      i18n/           translation files, one namespace per feature
packages/
  shared/             Zod schemas and inferred types used by both apps
specs/                source of truth for behaviour
docker-compose.yml    postgres only
```

**Everything a component owns lives in the component's own folder.** Its styles, its tests, its
sub-components, any hook or helper only it uses. Nothing belonging to `Button` is anywhere but
`Button/`, so deleting the folder deletes the component completely and leaves nothing orphaned.

Stories are part of that ownership. A component without a `.stories.tsx` file is a component nobody
can look at in isolation, so it is not finished.

A file moves out of the folder the moment a second component needs it, and not before. Anticipating
that second use is how a shared directory fills up with things used once.

The per-component `index.ts` re-exports that one component, so imports read
`from '@/components/Button'`. There is no `components/index.ts` re-exporting everything: a barrel
over the whole directory is what turns one import into a graph of them, and it is the usual source
of circular imports in a codebase shaped like this one.

`packages/shared` also owns the error code list as a const object, not as loose strings. The API
throws with a code from it and the mobile client derives its translation keys from the same object,
so a typo on either side is a type error rather than an error message that silently renders in the
wrong language.

`packages/shared` is the single place where request/response shapes are defined. The API derives its DTOs from those Zod schemas, and the mobile client derives its types from the same schemas. Never duplicate a shape by hand on either side.

## Data model

Tables live in `apps/api/src/db/schema/`. All ids are `uuid` with `defaultRandom()`. All tables have `createdAt` and `updatedAt` as `timestamptz`.

**users**: id, email (unique, citext), passwordHash, displayName, locale (varchar 5, nullable), unitSystem (enum: `metric` | `imperial`, nullable), createdAt, updatedAt

`locale` and `unitSystem` are null until the user chooses. Null means "follow the device", which is a different state from having picked the value the device happens to report, and the two must not be collapsed: a user who explicitly chose metric keeps metric on a device set to imperial.

**refresh_tokens**: id, userId (fk users, cascade), tokenHash, expiresAt, revokedAt (nullable)

**recipes**: id, authorId (fk users, cascade), title, description (nullable), language (varchar 5), servings (int), totalTimeMinutes (int, nullable), coverImageKey (nullable), visibility (enum: `private` | `unlisted`, default `private`), shareToken (varchar 12, unique, nullable), createdAt, updatedAt

**ingredients**: id, recipeId (fk recipes, cascade), position (int), name, amount (numeric 10,2, nullable), unit (enum, nullable)

The `unit` enum, grouped by dimension, because conversion only ever happens within a dimension:

- Mass: `g`, `kg`, `oz`, `lb`
- Volume: `ml`, `l`, `tsp`, `tbsp`, `cup`, `floz`
- Count: `piece`, `pinch`, `clove`, `slice`

Null `unit` with a non-null `amount` means a bare count. Null `amount` means an unmeasured quantity, as in "salt, to taste".

**steps**: id, recipeId (fk recipes, cascade), position (int), body (text), durationSeconds (int, nullable), temperatureCelsius (int, nullable), imageKey (nullable)

**step_dependencies**: stepId (fk steps, cascade), dependsOnStepId (fk steps, cascade), composite primary key. A step is ready to cook once every step it depends on is done. Two steps with no path between them can therefore be cooked at the same time, which is what makes "cut the carrots while the water boils" expressible.

**step_ingredients**: stepId (fk steps, cascade), ingredientId (fk ingredients, cascade), composite primary key. Links an ingredient to the step where it is used, so the step-by-step cooking view can show only what is needed right now.

Ordering rules: `position` is a zero-based integer, unique per recipe. Reordering rewrites all positions in one transaction. Never rely on insertion order or `createdAt` for display order.

**Display order and execution order are different things, and confusing them is a bug.** `position` is display order: how steps are listed when reading or editing the recipe. `step_dependencies` is execution order: what has to be finished before a step can start. The cooking view derives what is available right now from the dependency graph and never from `position`.

Dependency graph rules, enforced on every write inside the same transaction:

- A step may not depend on itself.
- Both steps in a dependency row must belong to the same recipe.
- The graph must stay acyclic. A write that would close a cycle is rejected, and nothing is written.
- Deleting a step removes the dependency rows on both sides via cascade. Steps that depended on it do not inherit its dependencies; they simply lose that edge.
- A recipe with no dependency rows at all is a plain linear recipe, read in `position` order. That is the default a recipe starts in.

`shareToken` is null until the user shares the recipe for the first time. Generating it sets `visibility` to `unlisted`. Revoking sharing sets `shareToken` back to null and `visibility` to `private`.

## API conventions

- **Every endpoint is defined once, in the `ts-rest` contract in `packages/shared`.** The controller will not compile if it does not match the contract, and the mobile client is generated from the same contract. Neither side can drift, because there is only one description of the endpoint.
- **The mobile client parses every response against its schema before using it.** Types disappear when the code runs, so a type alone only proves what the server *should* send. Parsing proves what it did send, and turns a silent wrong-shape bug into an obvious error at the boundary.
- Base path `/api`. Resource routes are plural and nested: `/api/recipes/:recipeId/steps`.
- Public share route is unauthenticated and separate: `GET /api/shared/:shareToken`.
- Errors use NestJS built-in HTTP exceptions, with one addition: every error body carries a stable `code`. Response body: `{ statusCode, error, message, code }`.
- `code` is `SCREAMING_SNAKE_CASE`, namespaced by domain, for example `AUTH_EMAIL_TAKEN` or `RECIPE_NOT_FOUND`. It is part of the API contract, so every spec lists the codes its endpoints can return, and a code is never renamed once shipped.
- `message` is English, for logs and for developers. **It is never shown to a user and nothing matches on its text.** The client translates `code`, which is why rewording a message can never break a client.
- Validation failures return `VALIDATION_FAILED` plus a `fields` object keyed by field name, each value a code such as `TOO_SHORT`. A form needs to know which field is wrong in the user's language, which a single top-level message cannot express.
- A recipe and all its ingredients and steps are written in a single transaction. Partial writes are a bug.
- Never return `passwordHash`, `tokenHash` or another user's email.
- Authorization is checked in a guard, not inside service methods scattered around.

## Design system

Every raw value lives in `apps/mobile/src/styles/tokens.ts`. That file is the only place in the repo
where a hex colour, a spacing number, a radius or a font size literal may appear. Everything else
refers to it by name.

Tokens come in two layers, and the distinction is not decoration:

- **Primitives** are the raw scales: `slate900`, `space4`, `text16`. They describe what a value *is*.
- **Semantics** map primitives to roles: `surface`, `textPrimary`, `borderSubtle`, `danger`. They
  describe what a value is *for*.

Components use semantic tokens only. A component that reaches for a primitive is a component that
will break the first time the palette changes, which is the whole reason the layer exists.

There are no CSS variables. React Native has no cascade and no custom properties, which is the same
reason `CLAUDE.md` rules out CSS Modules. The token module plus the unistyles theme gives the same
guarantee - one place to change a value, no literals in components - through TypeScript instead of
CSS syntax, and with type checking that CSS variables do not have.

Shared components live in `apps/mobile/src/components/`. A component earns a place there once a
second feature needs it, not in anticipation of one.

## Accessibility

The target is WCAG 2.2 AA. Accessibility is a property of each component, checked where the component
is built, and not an audit somebody schedules later.

- Every interactive element has an `accessibilityRole` and an accessible name. An icon-only control
  carries an `accessibilityLabel`, because its meaning is otherwise carried entirely by a picture.
- State travels through `accessibilityState` - `disabled`, `selected`, `checked`, `busy`, `expanded` -
  never through appearance alone.
- Touch targets are at least 44 by 44 points. Where the visual is deliberately smaller, `hitSlop`
  makes up the difference; the target grows, the design does not have to.
- Contrast meets 4.5:1 for body text and 3:1 for large text, icons and control boundaries. This is
  enforced by a test over the semantic token pairs, not by eye, because the eye is unreliable and the
  palette changes.
- **Colour is never the only carrier of meaning.** An error field changes its border *and* shows a
  message. A completed step gets a mark, not just a green tint.
- Font scaling is always on. `allowFontScaling={false}` is banned outright. A `maxFontSizeMultiplier`
  is permitted only where a layout genuinely cannot stretch, with a comment saying why, and it is
  treated as a design bug with a deadline rather than a solution.
- Anything that changes without the user acting - a timer finishing, a save completing, an error
  arriving - is announced to the screen reader. Silent change is invisible change.
- On navigation, focus moves to the new screen's heading, so a screen reader user is not left where
  the previous screen was.
- Decorative images are hidden from the accessibility tree. A composite like a recipe row is one
  element with one sensible label, not five separate stops.
- **Tests query by accessible role and name**, not by `testID`, for anything a user can perceive.
  This is the rule that makes the others hold: a component that is awkward to query in a test is a
  component that is awkward to use with a screen reader, and the test fails first.

**Every spec that adds a screen carries a screen reader walkthrough as an acceptance criterion.**
The automated checks above catch missing labels and failing contrast; they cannot tell that a
reading order is nonsense, that focus is trapped, or that a control is labelled "button". Those need
a person with VoiceOver or TalkBack on, moving through the screen without looking at it. It costs
about ten minutes per screen, and it is the only part of accessibility that cannot be delegated to
a test.

The walkthrough covers: reaching every interactive element in an order that makes sense, every
element announcing what it is and what it does, no element announced twice or not at all, and every
state change spoken.

## Offline

This app is used standing in a kitchen, on bad wifi, with dirty hands. A dropped connection is the
normal case, not the exception, and losing your place fifteen minutes into a recipe is the worst
thing the app can do to someone.

- The TanStack Query cache is persisted, so any recipe already opened stays readable with no network.
- **Entering cooking mode pins the whole recipe first** - every step, ingredient and dependency
  edge - and refuses to start until it has. After that, a connection drop cannot interrupt cooking,
  because nothing in cooking mode needs the network. This is a guarantee by construction, not a
  cache that usually happens to be warm.
- Writes require a connection. There is no mutation queue and no offline editing. A write attempted
  offline fails immediately with a clear message and keeps the user's input, so nothing is lost and
  nothing is silently pending.
- Offline is a visible state, never a spinner that never resolves.

## Motion

Animation runs on Reanimated's UI thread, never on the JS thread. An animation that stutters while
data loads is worse than no animation, and stuttering under load is exactly what React Native's own
`Animated` does.

- Every duration and easing comes from a motion token. No numeric literals in animation calls.
- Motion has to mean something: it shows where a thing came from, what it turned into, or that a
  boundary was reached. Decoration carrying no information gets cut.
- Anything the user drags or presses uses a spring, because a fixed duration on a gesture feels
  detached from the finger. Anything that merely appears or leaves uses a duration and an easing.
- The OS reduce-motion setting is honoured everywhere. Transitions resolve instantly to their end
  state, rather than being skipped in a way that strands content off screen.
- Haptics accompany a state change the user caused and would otherwise have to look at to confirm:
  a step completed, a timer finished, a destructive action confirmed. Never on scroll, never on
  ordinary navigation, never as decoration.

## Internationalisation

Two languages ship, English and Latvian, and the app is built so a third costs a translation file
and nothing else.

- No user-visible string literal appears in a component. Everything goes through `t()`, with keys
  namespaced by feature: `recipes.list.empty.title`.
- Plurals use i18next's plural categories, never a hand-written `n === 1` check. Latvian has three
  forms including a distinct zero form, so the naive check is wrong in the app's second language,
  not in some hypothetical future one.
- Dates, times and numbers are formatted with `Intl`, never by string concatenation.
- **Layout uses `start` and `end`, never `left` and `right`.** `marginStart`, `paddingEnd`,
  `textAlign: 'start'`. This costs nothing today and is what makes a right-to-left language a
  translation file rather than a sweep through every component in the app. No RTL language ships yet;
  the discipline is what is being kept, not the feature.
- Recipe content - titles, ingredient names, step bodies - is authored by a user in their own
  language and is **never** translated, machine or otherwise. `recipes.language` records what that
  language is so a reader can be told, not so the app can rewrite it.
- Units convert within a dimension only: mass to mass, volume to volume, Celsius to Fahrenheit.
  Volume to mass is never attempted, because it needs the density of the specific ingredient and
  guessing it produces confidently wrong recipes.

## Mobile conventions

- One TanStack Query hook file per feature, e.g. `src/features/recipes/queries.ts`. Query keys are exported constants, never inline string arrays.
- Mutations invalidate query keys explicitly. No blanket `invalidateQueries()`.
- Screens live in `app/`, and contain routing and layout only. Real logic lives in `src/features/*`.
- Unistyles: all colours, spacing and typography come from semantic theme tokens. No hardcoded hex values or magic numbers in components, and no primitive tokens either.
- No inline `style={{ ... }}` objects except for values computed at runtime.
- An error boundary wraps the app and each route group. A render error shows a recoverable screen, never a white screen the user has to force-quit out of.
- TanStack Query is wired to React Native's `AppState` and to the network state, so it knows when the phone goes offline and when the app returns from the background. Without this it keeps believing it is online and the offline behaviour above does not work.

## Commands

```bash
pnpm db:up            # docker compose up -d postgres
pnpm --filter api dev
pnpm --filter mobile start
pnpm --filter mobile storybook   # component browser, on a simulator
pnpm --filter api db:generate   # drizzle-kit generate
pnpm --filter api db:migrate    # drizzle-kit migrate
pnpm typecheck        # every workspace
pnpm lint
pnpm test
```

## Testing

- API: Vitest. Service-level tests for business rules (ownership, ordering, share token lifecycle). One e2e test per endpoint group against a real Postgres in docker.
- **Tests isolate by truncating every table between tests**, not by wrapping each test in a transaction that is rolled back. Rolling back is faster, but service code already runs inside transactions, so those would become savepoints nested under the test's transaction and no test would ever exercise a real commit. Since `CLAUDE.md` calls a partial write a bug, the tests have to be able to catch one.
- A seed script populates a known set of users and recipes for manual testing, and is never used by automated tests, which build the exact state they need.
- Mobile: Vitest + React Native Testing Library for hooks and non-trivial components. No snapshot tests.
- Do not write tests that only assert a mock was called.

## Git

- Conventional commits: `feat(recipes): add step reordering`.
- One spec, one branch, one PR. Branch name matches the spec number: `spec/0002-recipe-crud`.
- Do not commit generated migrations without running them locally first.
