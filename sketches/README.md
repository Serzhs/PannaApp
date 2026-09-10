# Sketches

Pencil wireframes of the six screens in `CLAUDE.md`'s App structure section. Black and white on
purpose: the accent colour is still an open question in 0002, and colour would only distract from
whether the layouts are right.

These are drawings, not decisions. Where a sketch and a spec disagree, the spec wins.

## Files

One file per screen, each a self-contained HTML document.

| File | Screen |
| --- | --- |
| `SignIn.dc.html` | Google and Apple sign-in |
| `Main.dc.html` | Home: cooking now, then your recipes |
| `ReadRecipe.dc.html` | Read a recipe: ingredients, equipment, steps, history |
| `WriteRecipe.dc.html` | Write a recipe, showing nesting |
| `Paste.dc.html` | Import: copy the prompt, paste the JSON back |
| `Checklist.dc.html` | Before you start: tick what you have, go without |
| `KnuckleHint.dc.html` | The once-only hint about tapping with a knuckle |
| `Cook.dc.html` | Cooking: meanwhile list, past notes, the photo button |
| `StepImage.dc.html` | How it should look, full screen |
| `Settings.dc.html` | Language, units, sign out |

Ten drawings, six screens. Paste is a state of the create screen, and the hint, the checklist and the
photo view are all states of cooking, per the App structure section of `CLAUDE.md`.

`ReadRecipe` is drawn taller than the others because it shows the whole scrolling page rather than one
phone screen's worth.

`index.html` shows them all side by side with notes on each. Open it in a browser and start there.

`canvas.json` places them on a shared pan-and-zoom canvas. Open any `.dc.html` on its own to see that
screen full size.

## What the sketches assume

Three things were drawn ahead of the specs and should be read as proposals:

- Total time on the write screen is shown as calculated rather than typed, which is the answer 0005's
  open question is leaning towards.
- The home screen shows a progress bar and a line of what is happening now for each recipe in
  progress. 0005 does not ship that section; 0010 adds it.
- Sign-in buttons are drawn plain. Real ones must follow Google's and Apple's branding rules.

No status bar or battery icon is drawn. The phone draws its own over the layout, and a painted one
looks doubled up.

## Changing them

Edit the `.dc.html` files directly. To rebuild the shared canvas, re-seed them with the `design`
skill and republish to the same artifact so the link keeps working.
