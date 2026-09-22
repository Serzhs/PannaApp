# 0011: Images

**Status:** Done
**Depends on:** 0022, 0025

## Context

A recipe is words only. A cover photo is what makes one recognisable in a list of twenty, and a
picture of a finished step is the fastest answer to "is this what it should look like".
`recipes.coverImageKey` and `steps.imageKey` have been in the tables since 0001 with nothing
writing them.

## Goal

A recipe can carry a cover photo and each step a photo of its result, stored beside the API and
shown in the list, on the recipe screen and in the editor.

## Out of scope

- Photos in cooking mode. 0012 shows the step photo behind a large button; here the recipe screen
  shows it small, because reading happens with clean hands.
- The camera. Photos come from the library; on a phone the library already holds what the camera
  took, and the simulator has no camera at all.
- Cropping, filters, more than one photo per step, or a photo on an ingredient.
- Photos on shared recipes. Sharing is 0017, and the files live on one machine.
- Sweeping uploads that were never attached, for example a photo chosen and then Cancel pressed.
  The file stays on disk. A sweep of files no row names is a small later spec.
- Any store but the local disk. The column holds a key so that can change without touching rows.

## Data model

None. The two columns exist. A key is 32 lowercase hex characters, and the file behind it is
always a JPEG, whatever was uploaded.

## API contract

**`POST /api/images`**, authenticated, multipart with one field, `file`, up to 12 MB. The image is
turned upright by its orientation tag, resized to fit within 1600 pixels on its long side, re-encoded
as JPEG, and stored with no metadata at all: EXIF, and the GPS inside it, never reaches the disk.
Answers `201 { key }`. Errors: `400 IMAGE_UNSUPPORTED` when the bytes are not a JPEG, PNG or WebP
the resizer can read, or the field is missing; `413 PAYLOAD_TOO_LARGE` over 12 MB.

**`GET /api/images/:key`**, unauthenticated, serves the JPEG with a long immutable cache header,
since a key's bytes never change. A key is opaque and unguessable, which is what stands in for a
permission check, as the Images section of `CLAUDE.md` describes. `404 IMAGE_NOT_FOUND` for a key
that is not 32 hex characters or has no file.

**Recipes.** `recipeSchema` gains `coverImageKey: string | null`, and each step and nested step
gains `imageKey: string | null`. `POST` and `PATCH /api/recipes/:recipeId` accept `coverImageKey`
and a step's `imageKey`, each nullable and optional. A key with no file behind it is
`400 VALIDATION_FAILED` with `fields` naming the path, `coverImageKey` or `steps.2.imageKey`,
as `UNKNOWN_IMAGE`. When a key is replaced or cleared, when a step carrying one is deleted, and
when a recipe is deleted, the files behind the dropped keys are deleted after the transaction
commits, so a failed write never loses a file the rows still name.

**Configuration.** `IMAGE_DIR` says where files live and defaults to `~/.panna/images`, outside
the repo, created on first use. Tests point it at a temporary directory.

## UI

**Recipe page and tab.** Under servings, "Cover photo": a preview when there is one, and
"Choose photo" or "Change photo" plus "Remove". Choosing opens the platform's photo library,
uploads at once, and shows the result; the key travels with the recipe on Continue or Save. Offline,
choosing fails at once with the offline message.

**Step card.** After the note, "Photo of the result", the same control. A settled step's row
shows the photo as a small thumbnail beside its text.

**Recipe list.** A row with a cover photo shows it as a square thumbnail at the start of the row.
Decorative: the row's accessible name does not change.

**Recipe screen.** The cover photo sits above the title, full width. A step with a photo shows it
small under its text, described to a screen reader as "photo of the result".

**Component:** one photo field in the recipes feature, its own folder with styles, test and index,
and a gallery entry showing empty, chosen and uploading.

All new strings go through `t()`, in English and Latvian.

## Acceptance criteria

- [x] `pnpm typecheck`, `pnpm lint` and `pnpm test` pass across all three workspaces. _(`pnpm check`: shared 9, API 123, mobile 953 tests.)_
- [x] Uploading a 3000-pixel-wide PNG with an orientation tag stores a JPEG no wider than 1600 with
      no EXIF, and `GET` serves it with an immutable cache header, asserted end to end. _(images.e2e "stores an upload shrunk, upright and stripped, and serves it for good".)_
- [x] A text file uploaded as `file` returns 400 `IMAGE_UNSUPPORTED` and writes nothing; a
      malformed key returns 404 `IMAGE_NOT_FOUND`, asserted end to end. _(images.e2e "refuses bytes that are not an image, and a key that names nothing"; a path with dots included.)_
- [x] `PATCH` with an unknown `coverImageKey` returns 400 naming it; with a real one the detail
      carries it; replacing it deletes the old file; deleting the recipe deletes the cover and
      every step photo, asserted end to end. _(images.e2e "attaches a cover and step photos, drops the files it replaces, and all of them on delete"; Bob's PATCH is a 404 that touches no file.)_
- [x] Uploading needs a session: without a token, 401, asserted end to end. _(images.e2e "needs a session to upload".)_
- [x] The photo field shows Choose when empty, uploads on pick and calls back with the key, shows
      Change and Remove when set, and shows the offline message instead of picking when offline,
      asserted in a test with the picker faked. _(PhotoField tests, picker and upload faked.)_
- [x] A row with a cover key renders the thumbnail and one without does not, asserted in a test. _(RecipeRow test "shows the cover photo as a thumbnail when there is one".)_
- [x] On the simulator: choose a cover photo from the library on a new recipe, see it on the first
      page, in the list and on the recipe screen. _(Seen: the library opened, the flowers uploaded and previewed on the first page, then showed as a thumbnail in the list and as the header on the recipe screen. Two things surfaced on the way and are fixed: Expo's fetch needs a File part, and the simulator's photos are HEIC. Serving from `~/.panna` also needed the file sent relative to its root, since Express refuses dotfile paths; the test directory is now a dotfile path too.)_
- [x] The Latvian file lists every new key. _(the `photo` group, `steps.photo`, `steps.photoAlt`, `common:offline.upload`; the key-parity test passes.)_

## Open questions

None. Decided while the author was away, for review: photos come from the library only; the read
screen shows step photos small; unattached uploads are left for a later sweep; `IMAGE_DIR` defaults
to `~/.panna/images` so no `.env` change is needed.
