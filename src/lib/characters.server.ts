export type CharacterDetail = {
  name: string;
  role: string | null;
  appearance: string | null;
  hair: string | null;
  hair_color: string | null;
  eye_color: string | null;
  clothing: string | null;
  accessories: string | null;
  colors: string | null;
  age: string | null;
  personality: string | null;
  backstory: string | null;
  traits: unknown;
  is_locked: boolean;
};

export const REFERENCE_VIEWS = ["front", "side", "portrait", "expressions"] as const;
export type ReferenceView = (typeof REFERENCE_VIEWS)[number];

export const VIEW_LABELS: Record<ReferenceView, string> = {
  front: "Front view",
  side: "Side view",
  portrait: "Portrait",
  expressions: "Expression sheet",
};

const VIEW_DIRECTIVES: Record<ReferenceView, string> = {
  front: "Full-body front-facing character turnaround view, T-pose-like neutral stance, feet visible, flat neutral background.",
  side: "Full-body side profile turnaround view facing right, neutral stance, flat neutral background.",
  portrait: "Head-and-shoulders portrait, three-quarter angle, neutral expression, flat neutral background.",
  expressions:
    "Expression sheet: a clean grid of six head-only expressions of the SAME character — neutral, happy, angry, afraid, sad, determined — evenly spaced on a flat neutral background.",
};

/** One canonical, repeatable description of a character used in every prompt. */
export function characterDescriptor(character: CharacterDetail) {
  const traits = Array.isArray(character.traits) ? (character.traits as string[]) : [];
  return [
    `${character.name}${character.role ? ` (${character.role})` : ""}`,
    character.age ? `age: ${character.age}` : "",
    character.appearance ? `appearance: ${character.appearance}` : "",
    character.hair ? `hair style: ${character.hair}` : "",
    character.hair_color ? `hair colour: ${character.hair_color}` : "",
    character.eye_color ? `eye colour: ${character.eye_color}` : "",
    character.clothing ? `clothing: ${character.clothing}` : "",
    character.accessories ? `accessories: ${character.accessories}` : "",
    character.colors ? `colour palette: ${character.colors}` : "",
    traits.length ? `locked visual traits: ${traits.join(", ")}` : "",
  ]
    .filter(Boolean)
    .join(" | ");
}

export function buildReferencePrompt(
  character: CharacterDetail,
  view: ReferenceView,
  artStyle: string,
  genre: string,
) {
  return [
    `Character reference sheet artwork in ${artStyle} comic style for a ${genre} comic.`,
    VIEW_DIRECTIVES[view],
    `Character specification — render exactly, no deviation:\n${characterDescriptor(character)}`,
    "Clean model-sheet lighting, consistent line weight, consistent colour palette, full character visible, no cropping.",
    "No text, no labels, no captions, no watermarks, no speech bubbles, no background scenery.",
  ].join("\n");
}
