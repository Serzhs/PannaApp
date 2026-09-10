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
| `ReadRecipe.dc.html` | Read a recipe, with the Cook button |
| `WriteRecipe.dc.html` | Write a recipe, showing nesting |
| `Cook.dc.html` | Cooking, with the meanwhile list |
| `Settings.dc.html` | Language, units, sign out |

`canvas.json` places them on a canvas and holds the sticky notes. Open any `.dc.html` in a browser to
see that screen on its own.

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
