import { COUNT_UNITS, IMPORT_SCHEMA_VERSION, MASS_UNITS, VOLUME_UNITS } from '@panna/shared';

/** The language the recipe should be written in, named in English for the model. */
function languageName(tag: string): string {
  try {
    return new Intl.DisplayNames(['en'], { type: 'language' }).of(tag) ?? tag;
  } catch {
    return tag;
  }
}

/**
 * The real work of 0016. It teaches a stranger's model the whole content model,
 * nesting most of all, because a vague prompt returns flat recipes. It asks for the
 * recipe text rather than promising a link works: a video link is often unreadable,
 * and a model handed one tends to invent a plausible recipe rather than refuse.
 */
export function buildImportPrompt(languageTag: string): string {
  const language = languageName(languageTag);
  const units = [...MASS_UNITS, ...VOLUME_UNITS, ...COUNT_UNITS].join(', ');
  return `You are turning a recipe into a JSON document for a cooking app called Panna.

I will paste the recipe below: its text, the caption or transcript of a video, or my own notes. If I only give you a link, try to read it, but if you cannot read the actual recipe, say so and ask me for the text instead of guessing.

Answer with ONE JSON document and nothing else: no explanation before it, no comment after it, no code fences.

Write every piece of recipe text (title, description, ingredient names, notes, step instructions) in ${language}.

The document:

{
  "schemaVersion": ${String(IMPORT_SCHEMA_VERSION)},
  "title": "short name of the dish",
  "description": "one or two sentences, or omit",
  "servings": 4,
  "ingredients": [
    { "name": "beetroot", "amount": 500, "unit": "g", "note": "raw, leaves cut off" },
    { "name": "salt", "note": "to taste" }
  ],
  "equipment": [
    { "name": "large pot" },
    { "name": "blender", "note": "for a smoother soup", "optional": true }
  ],
  "steps": [
    {
      "body": "Boil the beetroot whole until a knife slides in easily",
      "note": "Do not peel it first",
      "minutes": 45,
      "ingredients": ["beetroot"],
      "equipment": ["large pot"],
      "meanwhile": [
        { "body": "Boil the eggs hard", "minutes": 9, "ingredients": ["eggs"] },
        { "body": "Chop the dill", "ingredients": ["dill"] }
      ]
    },
    { "body": "Grate the cooled beetroot", "ingredients": ["beetroot"] }
  ]
}

Rules:
- "servings" is a whole number of portions.
- "amount" is a plain number, never text: write 0.5, not "1/2". Leave it out when there is no amount ("salt, to taste").
- "unit" must be exactly one of: ${units}. Leave it out for a bare count ("2 eggs") or when there is no amount. Never invent another unit.
- "note" on an ingredient is what does not belong in the name: "plain, not self-raising".
- "steps" are the main steps, in order. Each "body" is one instruction, short enough to read at a glance while cooking. Put tips in "note".
- "minutes" is how long a step takes, only when the recipe says or clearly implies it.
- A step's "ingredients" and "equipment" list, by exact name from the lists above, what that step uses.
- "meanwhile" is the important part. When a step is a wait - something roasts, boils, rests, chills - put the things a cook can do during that wait inside its "meanwhile" list, instead of as main steps. Only one level: a meanwhile step has no "meanwhile" of its own.
- Do not add steps, ingredients or amounts the recipe does not have. If something is unclear, leave it out rather than guess.

Here is the recipe:
`;
}
