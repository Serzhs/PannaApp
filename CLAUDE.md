# CLAUDE.md

**Panna** is a cooking assistant app. Users write recipes as steps, nesting the ones that can be done
while something else cooks, so that while the pork roasts you know what else you could get on with.
Recipes are shared via private link, and can be brought in as JSON that the user's own AI produced
from a video or a web page - the app hands out the prompt and never fetches anything itself.

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

| Layer          | Choice                                                                                          |
| -------------- | ----------------------------------------------------------------------------------------------- |
| Monorepo       | pnpm workspaces (no Turborepo yet)                                                              |
| Backend        | NestJS, TypeScript strict                                                                       |
| ORM            | Drizzle ORM + drizzle-kit migrations                                                            |
| DB             | PostgreSQL 16 via docker compose                                                                |
| Validation     | Zod, shared between API and mobile                                                              |
| API contract   | One Zod contract in `packages/shared`, hand-rolled, both sides typed from it                    |
| Config         | `@nestjs/config` with a Zod schema. The API refuses to start on a bad env                       |
| Logging        | `nestjs-pino`, structured, one request id per request                                           |
| Git hooks      | husky + lint-staged + commitlint                                                                |
| Auth           | Sign in with Google and Apple only. Our own JWT access token (15 min) + refresh token (30 days) |
| Mobile         | Expo, built locally with Xcode because sign-in needs it; `ios/` is generated, never committed   |
| Routing        | Expo Router (file based)                                                                        |
| Data fetching  | TanStack Query v5                                                                               |
| Forms          | `react-hook-form` with its Zod resolver                                                         |
| Keyboard       | `react-native-keyboard-controller`                                                              |
| Styling        | React Native `StyleSheet` over a typed theme module in `src/styles`                             |
| Animation      | react-native-reanimated + react-native-gesture-handler                                          |
| Haptics        | expo-haptics                                                                                    |
| i18n           | `i18next` + `react-i18next`, locale detection via `expo-localization`                           |
| Offline        | TanStack Query cache persisted to `expo-sqlite/kv-store`                                        |
| Design gallery | A development-only `/design` route in the app itself. No Storybook                              |
| Rate limiting  | `@nestjs/throttler`                                                                             |
| Language       | TypeScript everywhere, strict (see below), no `any`                                             |
| Lint           | ESLint 9 flat config, `typescript-eslint` strict-type-checked                                   |
| Format         | Prettier, with `eslint-config-prettier` disabling all conflicting rules                         |

Explicitly **not** used: CSS Modules (does not work in React Native), **react-native-unistyles**, NativeWind, styled-components, Redux, Prisma, TypeORM, GraphQL, Moti (Reanimated directly is enough for what this app does), `react-native-skia` (revisit only if the cooking view in 0011 genuinely outgrows Reanimated).

**Why unistyles is out.** It was the original choice and it needs `react-native-nitro-modules`,
which is native code Expo Go does not carry. Running it meant building the app locally, which at
the time did not compile under Xcode 26.3. It now does, through two local patches described under
Building for iOS, but the reason below still stands on its own. A typed theme module reached through
`StyleSheet` gives the same guarantee - one place to change a value, no literals in components,
checked by the compiler - with no native code at all. Revisit if a dev build becomes necessary for
another reason and Expo has shipped the fix.

## Choosing a dependency

Prefer packages that are widely used and actively maintained. A package with millions of weekly
downloads and recent commits has had far more eyes on it than a clever one with four hundred.

Before adding anything not already named in the Stack table, check: weekly downloads, when it was last
published, whether the repository is active, and how many dependencies it drags in. A name that merely
looks plausible is not enough - typosquatting and abandoned-then-sold packages are how supply chain
attacks reach a project like this one.

Prefer a few well-known packages over many small ones, and prefer doing it yourself over adding a
dependency for something short. Every package is code you did not read running with your project's
permissions.

`pnpm audit` runs as part of `pnpm test` and fails on a high severity advisory, but that only catches
what has already been reported. The judgement above is the part that catches the rest.

**Metro only sees packages the mobile workspace names.** pnpm keeps a package's own dependencies out
of the top-level `node_modules`, and Metro does not follow the links pnpm leaves behind, so a library
that imports a sibling package it depends on fails at launch with "unable to resolve module". Jest
follows the links and passes. When that happens, add the sibling as a direct dependency of
`apps/mobile` at the same version, and restart Metro, which caches its module map.

## TypeScript strictness

One `tsconfig.base.json` at the root, extended by every workspace. Beyond `strict: true`:

`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride`,
`noFallthroughCasesInSwitch`, `noUnusedLocals`, `noUnusedParameters`, `verbatimModuleSyntax`.

`any` is banned, including implicit. When a type genuinely cannot be known, use `unknown` and narrow
it. A cast is a last resort and carries a comment saying why the compiler cannot see what you can.

`@ts-expect-error` is allowed with a reason on the same line. `@ts-ignore` is not: it stays silent
when the underlying error goes away.

**Every package is ESM, and every strict flag is on everywhere.** `apps/api` and `packages/shared` were
briefly CommonJS with `verbatimModuleSyntax` disabled; NestJS 12 ships as `"type": "module"`, so that
exception is gone and relative imports carry `.js` extensions as ESM requires.

**Node is 22, and everything in the stack depends on that.** React Native needs `^22.13`, nestjs-pino 5
needs `>=22.12`, and vitest 5 and vite 8 want the same. Node 20 blocked all of them and forced pinned-back
versions of each; raising it removed the whole class of problem at once. Check `engines` before
upgrading anything, and do not drop Node below 22.13.

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
          Button.styles.ts      its stylesheet
          Button.test.tsx       its tests
          index.ts              re-exports Button
      api/            typed fetch client + TanStack Query hooks
      styles/       tokens and the theme
      i18n/           translation files, one namespace per feature
packages/
  shared/             Zod schemas and inferred types used by both apps
specs/                source of truth for behaviour
docker-compose.yml    the database only
```

**Everything a component owns lives in the component's own folder.** Its styles, its tests, its
sub-components, any hook or helper only it uses. Nothing belonging to `Button` is anywhere but
`Button/`, so deleting the folder deletes the component completely and leaves nothing orphaned.

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

Tables live in `apps/api/src/db/schema/`. All ids are `uuid` with `defaultRandom()`. **Every table has `createdAt` and `updatedAt` as `timestamptz`**, join tables included - a uniform rule is cheaper to keep than an exception nobody remembers.

**users**: id, email (unique, citext), displayName, avatarImageKey (varchar 255, nullable), locale (varchar 5, nullable), unitSystem (enum: `metric` | `imperial`, nullable), createdAt, updatedAt

There is no password column. The app has no passwords at all, so it stores nothing that can be
cracked, reused or reset.

**identities**: id, userId (fk users, cascade), provider (enum: `google` | `apple`), subject (varchar, the provider's stable id for this person), email (citext, nullable), emailVerified (boolean), createdAt, updatedAt. Unique on (provider, subject).

One user can have several identities, which is what makes signing in with Google today and Apple
tomorrow land in the same account. `subject` is the only reliable key: an email address can change,
and Apple may give a private relay address instead of a real one.

`locale` and `unitSystem` are null until the user chooses. Null means "follow the device", which is a
different state from having picked the value the device happens to report, and the two must not be
collapsed: a user who explicitly chose metric keeps metric on a device set to imperial.

**Resolving a locale, in order: the explicit choice, then the device, then English.** Null does not
mean English - a Latvian on a Latvian phone who never opened settings gets Latvian. English is the
last resort, for when the device asks for a language the app does not ship. Collapsing that into
"null means English" would give most non-English users the wrong language by default.

`unitSystem` resolves the same way, ending at metric rather than English.

**refresh_tokens**: id, userId (fk users, cascade), tokenHash, expiresAt, revokedAt (nullable)

**recipes**: id, authorId (fk users, cascade), sourceRecipeId (fk recipes, set null, nullable), title, description (nullable), status (enum: `draft` | `ready`, default `draft`), featured (boolean, default false), servings (int), totalTimeMinutes (int, nullable), coverImageKey (nullable), shareToken (varchar 12, unique, nullable), createdAt, updatedAt

**ingredients**: id, recipeId (fk recipes, cascade), position (int), name, note (text, nullable), amount (numeric 10,2, nullable), unit (enum, nullable)

The `unit` enum, grouped by dimension, because conversion only ever happens within a dimension:

- Mass: `g`, `kg`, `oz`, `lb`
- Volume: `ml`, `l`, `tsp`, `tbsp`, `cup`, `floz`
- Count: `piece`, `pinch`, `clove`, `slice`

Null `unit` with a non-null `amount` means a bare count. Null `amount` means an unmeasured quantity, as in "salt, to taste".

**equipment**: id, recipeId (fk recipes, cascade), position (int), name, note (text, nullable), optional (boolean, default false)

`note` on both is the qualifier that does not belong in the name: "carrots, not too long", "flour,
plain not self-raising", "roasting tin, at least 30cm". Putting it in `name` makes the shopping list
read badly and makes the same ingredient look like a different one; a separate field keeps the name
the name.

The pans, tins and gadgets a recipe needs. Kept apart from `ingredients` because equipment has no
amount and no unit, and folding the two together would mean a kind column and a row of nulls on every
piece of equipment.

Called `equipment` rather than `tools` on purpose: this codebase already uses "tools" for the API
contract and for AI tool calling, and a `tools` table would be read wrong.

**steps**: id, recipeId (fk recipes, cascade), parentStepId (fk steps, nullable), position (int), body (text), note (text, nullable), durationSeconds (int, nullable), temperatureCelsius (int, nullable), imageKey (nullable)

**step_equipment**: stepId (fk steps, cascade), equipmentId (fk equipment, cascade), createdAt, updatedAt. Composite primary key on the two ids. Says which step needs the mandoline, so cooking mode can tell you before you reach for it.

**Why these are tables and not arrays on `steps`.** Postgres cannot put a foreign key on ids inside an
array, so `steps.ingredientIds` would let a step keep pointing at an ingredient the author deleted -
silently, with nothing to clean it up. A join row cascades away on its own. Two further reasons: "which
steps use the carrots?" is one query here and a scan-and-unpack against arrays, and 0012 needs exactly
that question; and copying a recipe rewrites every id, which is easier to get right inserting mapped
rows than parsing, remapping and re-serialising JSON.

**And two tables rather than one with a `kind` column**, because a single `targetId` would point at
`ingredients` sometimes and `equipment` other times, and a foreign key can only name one table. One
table would trade both guarantees for one fewer name in the schema.

**step_ingredients**: stepId (fk steps, cascade), ingredientId (fk ingredients, cascade), createdAt, updatedAt. Composite primary key on the two ids. Links an ingredient to the step where it is used, so the step-by-step cooking view can show only what is needed right now.

**cooks**: id, recipeId (fk recipes, cascade), startedAt, finishedAt (nullable), excluded (jsonb, ingredient names as text), createdAt, updatedAt

One row per time somebody cooked a recipe. A null `finishedAt` is a cook that was abandoned, which is
worth knowing rather than hiding.

**There is no `userId`.** Cooking requires the recipe to be in your own list, and saving a shared
recipe copies it, so the cook is always `recipes.authorId`. A second column for the same person could
only ever disagree with the first.

That holds only while cooking requires saving. If a reader is ever allowed to cook straight from a
share link, the cook and the author become different people and this column has to come back - there
would be nothing else recording who actually did it.

`excluded` stores the **names** of ingredients left out, not their ids. History is a snapshot of what
happened, so it must not change or break when the recipe is later edited and an ingredient is deleted.

**cook_notes**: id, recipeId (fk recipes, cascade), stepId (fk steps, cascade, nullable), cookId (fk cooks, set null, nullable), body (text), createdAt, updatedAt

What the cook learned, as opposed to what the author instructed. A null `stepId` is a note on the
whole recipe; a set one is a note on that step, and it must belong to that recipe.

`steps.note` and `cook_notes` are deliberately different things and must not be merged. The first is
part of the recipe - "do not let the garlic brown" - and changes only when the recipe changes. The
second accumulates: "needed 10 minutes longer in my oven", dated, one per cook. They appear together
while cooking, which is the point: the author's tip and what you found out last time, side by side.

A note written during or just after a cook carries that `cookId`, so history can show what you thought
each time you made it. A note added later from the recipe screen has none.

**`recipeId` stays; `authorId` does not.** `cookId` looks like it implies the recipe, but it does not:
it is nullable, so a note added from the recipe screen has nothing to derive from, and it is
`on delete set null`, so deleting a cook would orphan every note attached to it. Deriving the recipe
through a join on every read to save one column is the wrong trade.

`authorId` is a different case and goes, for the same reason as `cooks.userId`: notes only exist on
recipes you own, so the author is always `recipes.authorId`.

`recipeId` and `cookId` can still disagree - a note naming cook X and recipe Y - so they are checked
against each other on write, in the same transaction, like the other same-recipe rules above.

Notes are personal. They belong to the cook, never travel with a shared recipe, and are never visible
to anyone else.

Ordering rules: `position` is a zero-based integer, unique within a parent. Reordering rewrites all
positions in one transaction. Never rely on insertion order or `createdAt` for display order.

**Nesting is how parallel work is expressed.** A step with a null `parentStepId` is a main step, done
in sequence. A step with a `parentStepId` is something that can be done _during_ that step, while the
oven heats or the pork roasts. When cooking, a main step with nested steps under it shows them as
things you could get on with meanwhile.

The author decides this, not the app. Two steps that merely have nothing to do with each other are
not parallel; a step is parallel because a person who understands the recipe said it can happen during
a particular wait. That is also why steps carry no "needs your attention" flag: the author has already
made that judgement by nesting or not nesting.

**Nothing in the schema stops a step in one recipe from linking an ingredient in another.** A foreign
key constrains the target row's existence, not which recipe it belongs to. The same hole exists for
`steps.parentStepId`, `step_equipment`, and `cook_notes.stepId`. All of them are checked in application
code on write, inside the same transaction.

The database-level fix is a composite foreign key carrying `recipeId` on both sides, which would make
it impossible rather than merely checked. That is worth doing if this ever bites; it is not worth the
extra column and index on every child table before it has.

Rules:

- **One level only.** A nested step cannot itself have nested steps. Recipes that need more than that
  are rare, and the second level costs more in confusion than it returns.
- A step's parent must belong to the same recipe.
- Deleting a main step **promotes** its nested steps to main steps at its position. It does not delete
  them. Losing four steps because one was removed is the kind of thing people do not forgive.
- A recipe with no nesting at all is an ordinary linear recipe. That is where every recipe starts.
- Total time is the sum of the main steps' durations. Nested steps happen inside those and add
  nothing, which is the whole point of nesting them.

`imageKey` is what the step should look like when done. It is never shown inline while cooking - it
sits behind a button, described under Cooking with dirty hands.

`body` is the instruction. `note` is anything extra worth knowing while doing it - "do not let the
garlic brown", "it should smell nutty by now". Keeping them apart means the instruction stays short
enough to read at a glance with a knife in your hand, and the detail is there when wanted.

**Saving a shared recipe copies it.** Someone who opens a share link and presses Add to my recipes gets
a new `recipes` row of their own, with its ingredients, equipment, steps and links duplicated. There is
no shared row and no ongoing relationship: from that moment the two recipes are strangers. The author
cannot edit it under them, revoking the share cannot take it away, and they can change whatever they
disagree with - which is the whole point of keeping a recipe.

What is copied: the recipe, its ingredients, its equipment, its steps, and both join tables. What is
not: `cooks` and `cook_notes`, which are the author's own history and nobody else's; and `shareToken`
and `featured`, so the copy starts unshared and unfeatured.

The fiddly part is that steps reference each other through `parentStepId`, and both join tables
reference step, ingredient and equipment ids. A copy has to build a map from old id to new and rewrite
every reference, all inside one transaction. A half-copied recipe is worse than a failed copy.

`sourceRecipeId` is provenance only - it records where a copy came from so the app can say "saved from
a link", and is set to null if the original is deleted. It grants no access to anything.

`status` starts at `draft`. A recipe becomes `ready` when its author says so, not when the app decides
it looks complete. Drafts are visible to their author with a chip, and are otherwise ordinary recipes.

`shareToken` is null until the user shares the recipe, and null again the moment they revoke. **A
revoked link is gone for good**: sharing again generates a new token and a new URL, and anything
already sent stops working. Revoked means revoked, with nothing to explain.

**Nothing a user writes is ever publicly listed.** A recipe is theirs, and the only way anyone else
sees it is a link they send. That is why there is no moderation, no report button, and no cap on how
many recipes somebody may keep: there is no public surface to spam.

`featured` marks a recipe that belongs in the Featured tab. It is set directly in the database, never
by the app, and the recipes carrying it are ones we wrote so people have somewhere to start. A featured
recipe is readable by anyone signed in; saving one copies it like any other.

**There is no `visibility` column.** Shared is exactly `shareToken IS NOT NULL`, so a second column
could only repeat that or contradict it, and `featured` is a separate fact only we can set. One would
be needed if a token could exist while switched off - what reviving a link across a revoke requires -
or the day a user can list a recipe publicly, when `featured` and "the author published this" stop
being the same thing.

## API conventions

- **Every endpoint is defined once, in the contract in `packages/shared`.** A controller's return type is derived from it, so it will not compile if it answers with the wrong shape, and the mobile client parses against the same schema. Neither side can drift, because there is only one description of the endpoint. This is about sixty lines we own rather than a dependency: ts-rest was the obvious candidate and had not shipped a stable release in fifteen months.
- **The mobile client parses every response against its schema before using it.** Types disappear when the code runs, so a type alone only proves what the server _should_ send. Parsing proves what it did send, and turns a silent wrong-shape bug into an obvious error at the boundary.
- Base path `/api`. Resource routes are plural and nested: `/api/recipes/:recipeId/steps`.
- Public share route is unauthenticated and separate: `GET /api/shared/:shareToken`.
- Errors use NestJS built-in HTTP exceptions, with one addition: every error body carries a stable `code`. Response body: `{ statusCode, error, message, code }`.
- `code` is `SCREAMING_SNAKE_CASE`, namespaced by domain, for example `AUTH_EMAIL_TAKEN` or `RECIPE_NOT_FOUND`. It is part of the API contract, so every spec lists the codes its endpoints can return, and a code is never renamed once shipped.
- `message` is English, for logs and for developers. **It is never shown to a user and nothing matches on its text.** The client translates `code`, which is why rewording a message can never break a client.
- Validation failures return `VALIDATION_FAILED` plus a `fields` object keyed by field name, each value a code such as `TOO_SHORT`. A form needs to know which field is wrong in the user's language, which a single top-level message cannot express.
- A recipe and all its ingredients and steps are written in a single transaction. Partial writes are a bug.
- Never return `tokenHash`, a provider `subject`, a provider token, or another user's email.
- Authorization is checked in a guard, not inside service methods scattered around.

## Design system

Every raw value lives in `apps/mobile/src/styles/tokens.ts`. That file is the only place in the repo
where a hex colour, a spacing number, a radius or a font size literal may appear. Everything else
refers to it by name.

Tokens come in two layers, and the distinction is not decoration:

- **Primitives** are the raw scales: `slate900`, `space4`, `text16`. They describe what a value _is_.
- **Semantics** map primitives to roles: `surface`, `textPrimary`, `borderSubtle`, `danger`. They
  describe what a value is _for_.

Components use semantic tokens only. A component that reaches for a primitive is a component that
will break the first time the palette changes, which is the whole reason the layer exists.

There are no CSS variables. React Native has no cascade and no custom properties, which is the same
reason `CLAUDE.md` rules out CSS Modules. The token module plus the theme gives the same
guarantee - one place to change a value, no literals in components - through TypeScript instead of
CSS syntax, and with type checking that CSS variables do not have.

Shared components live in `apps/mobile/src/components/`. A component earns a place there once a
second feature needs it, not in anticipation of one.

**The design system is browsed at `/design`, inside the app.** It is an ordinary
development-only route listing every semantic colour with its measured contrast ratio, the
spacing scale, the type ramp and every component in every state. Because it is the app, what
it shows is what ships - which is the whole point, and the reason Storybook was dropped rather
than run in a browser through a different renderer.

`__DEV__` is false in a release build and the route renders nothing, so the gallery cannot be
reached by guessing the path.

A component without an entry in the gallery is a component nobody can look at in isolation.
Add it when you add the component.

## Security

OWASP Top 10 and the API Security Top 10 are the reference. The rules below are the ones that apply
to this app; they are not a summary of the lists.

**Access control**

- Ownership is checked in a guard, never scattered through service methods.
- A resource belonging to another user returns **404, not 403**, and the body is identical to a 404
  for an id that does not exist. A 403 confirms the thing exists, which is an answer nobody asked for.
- **Every spec that adds an endpoint carries an access-control test**: another user's request returns
  404 and changes nothing. This is the most common serious bug in an app shaped like this one, and it
  is invisible in manual testing because the developer is always logged in as the owner.

**Input**

- Every request body, query and param is parsed by a Zod schema in `packages/shared`.
- Schemas are **strict**: an unknown field is a 400, not something quietly dropped. Silently ignoring
  an unexpected `authorId` is how mass assignment bugs survive review.
- Request bodies are size limited. Pasted import JSON is untrusted input and additionally carries its
  own caps on element counts and text length.
- Drizzle parameterises queries. Never build SQL by string interpolation, including inside `sql`.

**Identity from a provider**

The app never sees a password, so the whole question is whether a token from Google or Apple is
genuine. Everything rests on verifying it properly.

- The provider's ID token is verified against that provider's published signing keys, fetched and
  cached by their documented lifetime. **Never decode it and trust the contents.**
- Issuer, audience, expiry and issued-at are all checked. The audience must be our own client id, or
  a token minted for a different app is accepted as if it were ours.
- The `nonce` must match the one the client generated for this attempt, so an old token cannot be
  replayed.
- An access token is never accepted where an ID token is required. They are not interchangeable and
  an access token proves nothing about who the user is.
- `email` is trusted only when the provider says it is verified. Linking an account on an unverified
  email is account takeover with extra steps.
- Nothing the client says about identity is trusted, only the token. The one exception is a display
  name on first sign-in, which is not identity and is treated as a user-supplied string.

**Our own tokens**

- Refresh tokens are 256 bits of cryptographic randomness, stored as a SHA-256 hash. They are already
  high entropy, so a slow hash buys nothing here.
- **Refresh token reuse is treated as theft.** Using a token that was already used revokes every token
  in that chain, not just the one presented. Without this, a stolen refresh token keeps working after
  the victim's own rotation fails.
- Access tokens are short lived and carry no secret in their payload. A JWT is signed, not encrypted -
  anyone holding it can read it.
- The JWT secret is validated at boot for minimum length. A short secret is a brute-forceable one.

**Responses and headers**

- `helmet` for security headers. `x-powered-by` off.
- CORS allows only what is actually needed.
- No stack trace, SQL fragment, library name or internal path ever reaches a response body. `message`
  is for developers reading logs, and the client shows `code`.

**Logging**

- Authentication events are logged: failed logins, rate limit hits, refresh token reuse. These are the
  only evidence that anything is being attacked.
- Passwords, tokens and hashes are redacted by logger configuration, not by remembering.

**Dependencies**

- The lockfile is committed. `pnpm audit` runs as part of `pnpm test`, and a high severity advisory
  fails it.

**Not applicable, and why**

- No endpoint fetches a URL supplied by a user, so there is no SSRF surface. If one is ever added, that
  changes and this line stops being true.
- The app renders no user-supplied HTML, so there is no XSS surface in React Native.

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
- **Colour is never the only carrier of meaning.** An error field changes its border _and_ shows a
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

**Every spec that adds a screen carries a screen reader walkthrough as a manual follow-up, not as
an acceptance criterion.** The automated checks above catch missing labels and failing contrast;
they cannot tell that a reading order is nonsense, that focus is trapped, or that a control is
labelled "button". Those need a person with VoiceOver or TalkBack on, moving through the screen
without looking at it. It costs about ten minutes per screen, and it is the only part of
accessibility that cannot be delegated to a test. It is written beneath the criteria rather than
among them because nobody on the project can run it on demand, and a gate nobody can pass leaves
every spec with a screen permanently open while saying nothing about whether the screen works.

The walkthrough covers: reaching every interactive element in an order that makes sense, every
element announcing what it is and what it does, no element announced twice or not at all, and every
state change spoken.

## Images

Files live on disk beside the API, in a directory outside the repo, and are served back by it. The
column holds a **key**, never a URL, so where files live can change without touching a single row.

- Upload is authenticated and goes through the API. `GET /api/images/:key` serves the file.
- **Every upload is resized and re-encoded before it is stored.** A phone photo is 3 to 12 MB, and a
  list screen showing ten of them at full size is unusable. The original is not kept.
- **EXIF is stripped, always.** Phone photos carry GPS coordinates, and a recipe shared by link would
  otherwise carry the author's kitchen with it. Orientation is applied before stripping, or half the
  photos arrive sideways.
- A key is opaque and unguessable, so knowing one image key tells you nothing about any other.
- Deleting a recipe or a step deletes its files. Orphaned files are a slow leak that nobody notices
  until the disk is full.

Nothing about this survives the machine it runs on, which is the same limit sharing has. Moving to a
real object store later is one adapter, which is the reason the column holds a key rather than a path.

## Offline

This app is used standing in a kitchen, on bad wifi, with dirty hands. A dropped connection is the
normal case, not the exception, and losing your place fifteen minutes into a recipe is the worst
thing the app can do to someone.

- The TanStack Query cache is persisted, so any recipe already opened stays readable with no network.
- **Entering cooking mode pins the whole recipe first** - every step, ingredient and dependency
  edge - and refuses to start until it has. After that, a connection drop cannot interrupt cooking,
  because nothing in cooking mode needs the network. This is a guarantee by construction, not a
  cache that usually happens to be warm.
- Writes require a connection. There is no general mutation queue and no offline editing. A write
  attempted offline fails immediately with a clear message and keeps the user's input, so nothing is
  lost and nothing is silently pending.
- **One exception: a finished cook.** Cooking ends exactly where a connection is least likely, and a
  lost history row cannot be recreated by asking the user to try again. So a finished cook is written
  to the device and sent when the app is next online. This stays simple because history is
  append-only - rows are never edited or deleted, so there is nothing to merge and no conflict to
  resolve. That property is what makes the exception safe, and it is the reason it does not generalise
  to anything else.
- Offline is a visible state, never a spinner that never resolves.

**Cooking progress lives on the device, not the server.** Which steps are done, and when a timed step
was started, are written to local storage as they happen. Nothing about cooking touches the network.

This is not a shortcut, it is what makes the guarantee above true: if ticking off a step were a
server write, cooking would break the moment the wifi dropped, which in a kitchen is most of the time.
Several recipes can be in progress at once, each with its own stored progress, and closing the app or
having it killed loses nothing.

The cost is that progress does not follow you to another phone. For a session that lasts an hour and
happens in one room, that is a fair trade.

## Platform behaviour

One design on both platforms, and native behaviour on each.

The look is ours: the same colours, spacing, type and components on iOS and Android. Nobody compares
this app to Apple's apps side by side, so a second design system would double the work for a
difference users do not look for.

Behaviour is theirs. People do not notice that a button's corners differ from the platform's own.
They notice immediately when swiping back does nothing.

Always native, never rebuilt:

- Back navigation. The iOS swipe-back gesture and the Android back gesture and button both work
  everywhere, including out of a modal.
- Date, time and duration pickers. A custom picker is worse than the phone's on both platforms, and
  it loses the accessibility the system one has for free.
- The share sheet, the keyboard and its avoidance, scroll physics, text selection and context menus.
- Alerts and confirmations use the platform's own dialog.
- Sign-in buttons follow Google's and Apple's own branding rules. They are the one place the app's
  design does not win, because both providers require their button to look the way they say.
- The system font, which resolves to San Francisco on iOS and Roboto on Android with no work.
- Safe areas on all four edges, the notch and the home indicator, handled once in `Screen`. The bottom edge is not optional: without it the last row of a screen sits under the home indicator.

React Native gives most of this by default. It is lost only by building a replacement for something
the platform already provides, so the rule in practice is: check whether the OS already does it
before building it.

Where a platform genuinely differs and both options are native, follow the platform rather than
picking one for both.

## App structure

Three tabs, and screens that stack inside them.

| Tab      | Screen                  | What it is for                                                       |
| -------- | ----------------------- | -------------------------------------------------------------------- |
| Recipes  | `(app)/(tabs)/index`    | Yours. In progress at the top, then everything else, drafts chipped. |
| Featured | `(app)/(tabs)/featured` | Recipes we wrote, to start from. Searchable; nothing user-generated. |
| You      | `(app)/(tabs)/you`      | Your avatar and name, language, units, sign out.                     |

Stacked on top of whichever tab you are in:

| Screen                    | What it is for                                                         |
| ------------------------- | ---------------------------------------------------------------------- |
| `(auth)/index`            | Sign in with Google or Apple. The only screen when signed out.         |
| `(app)/recipes/[id]`      | Read a recipe: ingredients, equipment, steps, history.                 |
| `(app)/recipes/new`       | Create: four pages, or paste one from your AI.                         |
| `(app)/recipes/[id]/edit` | Edit: the whole recipe on one screen.                                  |
| `(app)/recipes/[id]/cook` | The guide. Opens on a check of what you have, then one step at a time. |

**The tab bar is hidden in cook mode.** Cooking needs the bottom of the screen for a bar big enough to
hit with a knuckle, and there is nowhere to go from it but out. Every other screen keeps it.

The check of what you have is the first state of cooking, not a screen. Tapping Cook lands there: tick
off the ingredients, mark anything you are going without, then start. Choosing to cook without
something is part of that session and never changes the recipe.

Reading and cooking are deliberately separate. Reading happens before shopping and while deciding what
to make; cooking happens with wet hands at a stove. The same screen cannot be good at both.

## Cooking with dirty hands

Cook mode is used with wet or greasy hands, from arm's length, with a knife in the other hand. It is
the one screen where ordinary touch design is not enough.

- **Targets are far bigger than the 44pt minimum.** The primary action is a full-width bar deep enough
  to hit with a knuckle without looking, and the step card itself is tappable. Nothing important is a
  small control.
- Text is sized to be read from across a counter, not from reading distance.
- The screen stays awake for the whole cook.
- **This is not a mode.** Nobody switches on "dirty hands" once their hands are dirty, so cook mode is
  always built this way.
- **No audio, in either direction.** No listening, no reading aloud. A kitchen is loud enough that
  speech recognition fails exactly when it is needed, and a microphone listening in someone's home
  needs a better reason than this.
- **"How it should look" is a button, not an inline image.** A step with a picture shows a large
  button; pressing it fills the screen with the image, and an equally large button closes it. Cooking
  needs big text and big targets, and an inline photo pushes the instruction off the screen for
  something you only want to check once.
- **The knuckle hint.** The first time someone opens cook mode, a short animation shows tapping with
  the back of a finger rather than the pad, because that side stays cleaner. It plays once, is
  dismissible, and never appears again unless asked for from settings.

  An animation alone excludes people. It carries a text equivalent, and with reduce-motion on it shows
  a still image and the words instead of moving. Per the Accessibility section, this is not optional.

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
  language and is **never** translated, machine or otherwise. The recipe does not record which
  language that is: nothing reads it. A reader can see what language a recipe is in by reading it, and
  a shared recipe goes to someone who can already read it. A `language` column would come back only
  for language-aware search, reading aloud, or translation, none of which exist.
- Units convert within a dimension only: mass to mass, volume to volume, Celsius to Fahrenheit.
  Volume to mass is never attempted, because it needs the density of the specific ingredient and
  guessing it produces confidently wrong recipes.

## Mobile conventions

- Forms use `react-hook-form`, validated by the same Zod schema the API validates with, taken from `packages/shared`. A form that accepts something the API rejects is a bug in the wiring, not a difference of opinion between two sets of rules.
- No screen writes its own keyboard avoidance. `react-native-keyboard-controller` handles it once, so the field being typed into is never behind the keyboard.
- One TanStack Query hook file per feature, e.g. `src/features/recipes/queries.ts`. Query keys are exported constants, never inline string arrays.
- Mutations invalidate query keys explicitly. No blanket `invalidateQueries()`.
- Screens live in `app/`, and contain routing and layout only. Real logic lives in `src/features/*`.
- Styling: all colours, spacing and typography come from semantic theme tokens. No hardcoded hex values or magic numbers in components, and no primitive tokens either.
- No inline `style={{ ... }}` objects except for values computed at runtime.
- An error boundary wraps the app and each route group. A render error shows a recoverable screen, never a white screen the user has to force-quit out of.
- TanStack Query is wired to React Native's `AppState` and to the network state, so it knows when the phone goes offline and when the app returns from the background. Without this it keeps believing it is online and the offline behaviour above does not work.

## Commands

```bash
pnpm dev              # database, migrations, then the API. Enables the development sign-in.
pnpm mobile           # Metro. Serves the JavaScript to the Xcode build (or to Expo Go).

pnpm check            # lint, typecheck and test. Run before committing.
pnpm build

pnpm specs:status     # renders specs/status.html: every spec's criteria, done and not
pnpm db:studio        # browse the data in a browser
pnpm db:reset         # wipe, migrate and seed from nothing
pnpm db:up            # waits for the healthcheck, so nothing races it
pnpm db:down
pnpm db:generate      # after changing the schema
pnpm db:migrate
pnpm db:seed
```

Every one of these is a root script, so it has a run button beside it in an editor that
shows them. `pnpm dev` starts the database and applies migrations first, so it works from
a cold machine rather than assuming something is already up.

**`pnpm check` and `pnpm test` empty the development database.** The API's end-to-end tests run
against the same Postgres the dev server uses and truncate every table between tests, seeded users
included. Run `pnpm db:seed` afterwards, and sign in again in the app: the session it kept names a
user that no longer exists, so the first request answers 401 and the list shows an error.

**Every script that starts a dev server frees its port first**, in the workspace that owns
the server rather than in the root wrapper, so it happens however the server is started -
`pnpm dev`, `pnpm mobile`, `npm run ios` inside `apps/mobile`, or an editor's run button. Metro and `nest start`
both spawn children that outlive the terminal they were started from, so a stale listener
is the normal case, and `EADDRINUSE` names a port rather than a thing to do about it.
`scripts/free-port.mjs` kills only the process _listening_ on the port, never one merely
connected to it - a simulator holding an open socket is not what is in the way.

## Building for iOS

Google and Apple sign-in do not work in Expo Go, so the app runs as its own build.
`cd apps/mobile && npx expo prebuild -p ios` generates `ios/`, then open `ios/Panna.xcworkspace`
in Xcode and press Run with `pnpm mobile` already going. Rerun prebuild after changing
`app.config.ts`, `app.json`, a native package, or `GOOGLE_CLIENT_ID_IOS` in `.env`, which is
built into the app.

`npx expo run:ios` refuses until an Apple Developer team is set on the project, because the Sign in
with Apple entitlement needs a signing certificate. Xcode does not ask for one on the simulator.

**Expo SDK 57 needs two patches under Xcode 26.3**, in `patches/`. `expo-modules-jsi` is built in
Swift 5 mode, and `expo-modules-core` gets a small `EventEmitter` change the newer compiler accepts.
Because of the first, Expo's precompiled modules no longer link against it - the app dies at launch
on a missing symbol - so `app.config.ts` compiles every module from source. Builds are slower for
it. Drop both patches and that setting together once Expo ships a release that builds cleanly.

## Testing

- API: Vitest. Service-level tests for business rules (ownership, ordering, share token lifecycle). One e2e test per endpoint group against a real Postgres in docker.
- **Tests isolate by truncating every table between tests**, not by wrapping each test in a transaction that is rolled back. Rolling back is faster, but service code already runs inside transactions, so those would become savepoints nested under the test's transaction and no test would ever exercise a real commit. Since `CLAUDE.md` calls a partial write a bug, the tests have to be able to catch one.
- **Mobile is the one workspace not on Vitest.** React Native ships untranspiled Flow, which the
  bundler behind Vitest cannot read, and the only community plugin bridging the two was abandoned
  in 2024. `jest-expo` applies the same transform Metro does, is what React Native Testing Library
  supports, and needs no configuration we maintain ourselves.
- A seed script populates a known set of users and recipes for manual testing, and is never used by automated tests, which build the exact state they need.
- Mobile: **Jest via `jest-expo`**, with React Native Testing Library, for hooks and non-trivial components. No snapshot tests.
- Do not write tests that only assert a mock was called.

## Git

- Conventional commits: `feat(recipes): add step reordering`.
- One spec, one branch, one PR. Branch name matches the spec number: `spec/0002-recipe-crud`.
- Do not commit generated migrations without running them locally first.
