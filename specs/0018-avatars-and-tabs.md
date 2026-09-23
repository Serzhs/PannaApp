# 0018: Avatars and the tab bar

**Status:** Done
**Depends on:** 0006, 0011

## Context

The app is one stack off the recipe list, with settings behind a header button and sign out at
the bottom of it. The name on the list header is whatever Google or Apple sent on the first
sign-in, and cannot be changed. `users.avatarImageKey` has been in the table since 0001 and
nothing has ever written it.

CLAUDE.md describes three tabs. This is where the app gains them, and where the person gets a
face and a name of their own choosing.

## Goal

The app gets a tab bar, and the You tab shows an avatar and a name the person can change.

## Out of scope

- Featured recipes. Decided on approval: two tabs now, and 0019 adds the Featured tab together
  with its content, so nothing ships empty.
- Changing the email, linking a second provider, or deleting the account.
- Showing the avatar anywhere but the You tab: not on the recipe list header, not on a shared
  recipe, not on a cook. One place first.
- Cropping, rotating or editing the photo beyond what the system picker offers. The picker's own
  square crop is enough.
- The knuckle hint's "show again" entry, which 0028 adds to this tab.
- Any change to the sign-in screen or to what a provider sends.

## Data model

Nothing new. `users.avatarImageKey` (varchar 255, nullable) is written for the first time. The
file behind it is stored, resized and stripped exactly like a recipe photo (0011), and is deleted
when replaced or removed, so nothing leaks on disk.

## API contract

**`PATCH /api/me`** (0006) accepts one more field: `avatarImageKey`, an image key or null. The
key must name an upload that exists, checked the same way a recipe's `coverImageKey` is; an
unknown one is `400 VALIDATION_FAILED` with `fields.avatarImageKey: UNKNOWN_IMAGE`. Setting a new
key or null removes the previous file after the row is written, never before. Uploading goes
through the existing `POST /api/images`.

The session user (`sessionUserSchema`) gains `avatarImageKey: string | null`, so sign-in,
refresh, `GET /api/me` and this endpoint all carry it. The mobile client renders it through
`GET /api/images/:key` like any other key.

No new endpoints, no new error codes.

## UI

**Tab bar.** Two tabs at the bottom of every screen: Recipes and You, each with an icon and a
label. Each tab keeps its own stack, so opening a
recipe from the list keeps the bar, as CLAUDE.md asks. The one exception is cook mode, which sits
above the tabs and hides the bar, because that screen needs the bottom of the display for the
done bar. The iOS swipe back and the Android back button work inside a tab as they do today.

The Settings button leaves the list header; the You tab is where that went. New stays in the
header of the list.

**Recipes tab.** The list and everything stacked on it today: new, import, detail, edit, steps,
flow, review, and the shared screen a link opens.

**You tab.** From the top:

- The avatar, a circle. With no photo it shows the first letter of the name, so the space is
  never blank. Under it "Change photo", and "Remove photo" when there is one. Choosing a photo
  uploads it at once and saves the key, with the same offline and failure lines as a recipe
  photo (0011).
- The name, in a field with Save. Blank is refused before anything is sent; the same 1 to 80
  character rule the API enforces. Saving replaces the stored user, so the list header changes
  with it.
- Language and Units, exactly as settings has them today.
- Sign out.
- In a development build only, a way into the design gallery, which today is reachable only by
  typing its path.

The email is shown under the name, read-only, so the person can see which account this is.

Two things found while building. Hermes, the JavaScript engine in the app, has no
`Intl.Segmenter`, so the avatar's initial is the first code point rather than the first grapheme.
And a screen above the tabs, which is only cook mode, must leave by popping back: replacing from
there lands in the tab's stack with nothing beneath it, and the back button is gone.

The tab bar and the tab icons come from `@react-navigation/bottom-tabs` through Expo Router's
own `Tabs`, and `@expo/vector-icons`, both Expo's standard choices and both widely used. They
are added as direct dependencies of the mobile app, per the Metro note in CLAUDE.md.

All new strings go through `t()`, in English and Latvian. The You screen's components follow
the one-folder-per-component layout.

## Acceptance criteria

- [x] `pnpm typecheck`, `pnpm lint` and `pnpm test` pass across all three workspaces. _(`pnpm check`:
      shared 9, API 134, mobile 1202 tests.)_
- [x] `PATCH /api/me` with an uploaded key stores it and answers the user with it; with null it
      clears it; an unknown key is 400 with `fields.avatarImageKey: UNKNOWN_IMAGE`; replacing or
      clearing removes the old file from disk and leaves the new one, asserted end to end.
      _(`stores an avatar, replaces it, clears it, and removes the files it no longer needs` and
      `refuses an avatar key with no file behind it, by field` in users.e2e.test.ts.)_
- [x] Sign-in and `GET /api/me` carry `avatarImageKey`, asserted end to end. _(The same two tests,
      and `starts with both preferences null, meaning follow the device, and no avatar`.)_
- [x] The You screen shows the name, the email, and the first letter when there is no photo, and
      the photo when there is; Save sends the trimmed name and a blank name is refused without a
      request; Change photo uploads then saves the key; Remove photo sends null, asserted in a
      test. _(YouScreen.test.tsx, four tests.)_
- [x] The list header no longer offers Settings, asserted in a test. _(ListHeader.test.tsx.)_
- [x] On the simulator: the tab bar shows on the list, on a recipe and on the You tab, and is
      gone in cook mode; a photo chosen on You appears as the avatar and survives a cold start;
      a changed name shows on the list header. _(Done on the iPhone 17 Pro simulator, 23 September 2026. Leaving cook mode now pops back to the recipe rather than replacing it, since a replace
      from above the tabs left the recipes stack with nothing beneath.)_
- [x] The Latvian file lists every new key. _(The key-parity test in i18n passes.)_

Manual follow-up, not gating: a VoiceOver walkthrough of the tab bar and the You screen, per the
Accessibility section of CLAUDE.md.

## Open questions

None. The Featured tab question was decided on approval: two tabs now.
