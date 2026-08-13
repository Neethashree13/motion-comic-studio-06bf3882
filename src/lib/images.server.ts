// import { characterDescriptor, type CharacterDetail } from "./characters.server";

// type CharacterRow = CharacterDetail;

// type SceneRow = {
//   scene_number: number;
//   title: string;
//   narration: string | null;
//   dialogue: string | null;
// };

// type ProjectRow = {
//   title: string;
//   genre: string;
//   art_style: string;
//   logline: string | null;
// };

// export function characterSheet(characters: CharacterRow[]) {
//   return characters.map((character) => characterDescriptor(character)).join("\n");
// }


// /**
//  * Builds a scene image prompt that repeats every locked character trait verbatim so
//  * appearance, clothing, hair and colour palette stay identical across the whole comic.
//  */
// export function buildScenePrompt(
//   project: ProjectRow,
//   scene: SceneRow,
//   characters: CharacterRow[],
//   variantHint?: string,
//   referencedNames: string[] = [],
// ) {
//   const sheet = characterSheet(characters);
//   return [
//     `A single comic book panel illustration in ${project.art_style} style for the ${project.genre} comic "${project.title}".`,
//     `Scene ${scene.scene_number}: ${scene.title}.`,
//     scene.narration ? `Action: ${scene.narration}` : "",
//     scene.dialogue ? `Spoken beat (do not render text): ${scene.dialogue}` : "",
//     sheet
//       ? `Character continuity — render these exact appearances, clothing, hairstyles and colours without deviation:\n${sheet}`
//       : "",
//     referencedNames.length
//       ? `Approved character reference sheets are attached for: ${referencedNames.join(
//           ", ",
//         )}. Copy their faces, hair, clothing, accessories and colours from the attached references exactly; the references define identity, this scene defines only pose, setting and mood.`
//       : "",
//     `Consistent colour palette, consistent line weight and inking across the series. Cinematic composition, dramatic lighting, wide 4:3 comic panel framing.`,
//     "No speech bubbles, no captions, no lettering, no watermarks.",
//     variantHint ? `Alternate take: ${variantHint}` : "",
//   ]
//     .filter(Boolean)
//     .join("\n");
// }


// export const VARIANT_HINTS = [
//   "different camera angle, wider establishing shot",
//   "tight dramatic close-up on the main character",
//   "low angle hero shot with heavier shadows",
//   "over-the-shoulder framing with deeper background detail",
//   "high angle bird's-eye staging with stronger colour contrast",
// ];

// export function bytesToDataUrl(bytes: Uint8Array, mime = "image/png") {
//   let binary = "";
//   for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]!);
//   return `data:${mime};base64,${btoa(binary)}`;
// }

// /**
//  * Generates an image. When reference data URLs are supplied they are attached to the
//  * request so the model conditions the character's identity on approved reference art.
//  */
// export async function generateImageBytes(prompt: string, apiKey: string, references: string[] = []) {
//   const content = references.length
//     ? [
//         { type: "text", text: prompt },
//         ...references.map((url) => ({ type: "image_url", image_url: { url } })),
//       ]
//     : prompt;

//   const response = await fetch("https://ai.gateway.lovable.dev/v1/images/generations", {
//     method: "POST",
//     headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
//     body: JSON.stringify({
//       model: "google/gemini-3.1-flash-image",
//       messages: [{ role: "user", content }],
//       modalities: ["image", "text"],
//       stream: false,
//     }),
//   });


//   if (!response.ok) {
//     const text = await response.text();
//     if (response.status === 429) throw new Error("Image service is rate limited. Try again shortly.");
//     if (response.status === 402) throw new Error("AI credits are exhausted. Add credits to keep generating.");
//     throw new Error(`Image generation failed (${response.status}): ${text.slice(0, 200)}`);
//   }

//   const payload = (await response.json()) as { data?: { b64_json?: string; url?: string }[] };
//   const first = payload.data?.[0];
//   if (first?.b64_json) {
//     const binary = atob(first.b64_json);
//     const bytes = new Uint8Array(binary.length);
//     for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
//     return bytes;
//   }
//   if (first?.url) {
//     const remote = await fetch(first.url);
//     if (!remote.ok) throw new Error("Could not download the generated image.");
//     return new Uint8Array(await remote.arrayBuffer());
//   }
//   throw new Error("The image service returned no image data.");
// }
// Optional character detail interface for prompt building
export type CharacterDetail = {
  id: string;
  name: string;
  description?: string | null;
  appearance?: string | null;
  clothing?: string | null;
  hair?: string | null;
  color_palette?: string | null;
  is_locked?: boolean;
};

export function characterDescriptor(character: CharacterDetail) {
  const parts = [
    character.name ? `Character: ${character.name}` : "",
    character.appearance ? `Appearance: ${character.appearance}` : "",
    character.clothing ? `Clothing: ${character.clothing}` : "",
    character.hair ? `Hair: ${character.hair}` : "",
    character.color_palette ? `Colors: ${character.color_palette}` : "",
    character.description ? `Notes: ${character.description}` : "",
  ].filter(Boolean);
  return parts.join("; ");
}

type CharacterRow = CharacterDetail;

type SceneRow = {
  scene_number: number;
  title: string;
  narration: string | null;
  dialogue: string | null;
};

type ProjectRow = {
  title: string;
  genre: string;
  art_style: string;
  logline: string | null;
};

export function characterSheet(characters: CharacterRow[]) {
  return characters.map((character) => characterDescriptor(character)).join("\n");
}

/**
 * Builds a scene image prompt that repeats every locked character trait verbatim so
 * appearance, clothing, hair and colour palette stay identical across the whole comic.
 */
export function buildScenePrompt(
  project: ProjectRow,
  scene: SceneRow,
  characters: CharacterRow[],
  variantHint?: string,
  referencedNames: string[] = []
) {
  const sheet = characterSheet(characters);
  return [
    `A single comic book panel illustration in ${project.art_style} style for the ${project.genre} comic "${project.title}".`,
    `Scene ${scene.scene_number}: ${scene.title}.`,
    scene.narration ? `Action: ${scene.narration}` : "",
    scene.dialogue ? `Spoken beat (do not render text): ${scene.dialogue}` : "",
    sheet
      ? `Character continuity — render these exact appearances, clothing, hairstyles and colours without deviation:\n${sheet}`
      : "",
    referencedNames.length
      ? `Approved character reference sheets are attached for: ${referencedNames.join(
          ", "
        )}. Copy their faces, hair, clothing, accessories and colours from the attached references exactly; the references define identity, this scene defines only pose, setting and mood.`
      : "",
    `Consistent colour palette, consistent line weight and inking across the series. Cinematic composition, dramatic lighting, wide 4:3 comic panel framing.`,
    "No speech bubbles, no captions, no lettering, no watermarks.",
    variantHint ? `Alternate take: ${variantHint}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

export const VARIANT_HINTS = [
  "different camera angle, wider establishing shot",
  "tight dramatic close-up on the main character",
  "low angle hero shot with heavier shadows",
  "over-the-shoulder framing with deeper background detail",
  "high angle bird's-eye staging with stronger colour contrast",
];

export function bytesToDataUrl(bytes: Uint8Array, mime = "image/png") {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]!);
  return `data:${mime};base64,${btoa(binary)}`;
}

/**
 * Generates image bytes using Pollinations AI (free, no API key required).
 * Simple and fast image generation for comic panels.
 */
export async function generateImageBytes(
  prompt: string,
  apiKey: string,
  references: string[] = []
): Promise<Uint8Array> {
  // Build enhanced prompt with reference context if available
  let enhancedPrompt = prompt;
  if (references.length > 0) {
    enhancedPrompt = `${prompt}\n[Comic panel with reference character consistency]`;
  }

  // Encode prompt for URL
  const encodedPrompt = encodeURIComponent(enhancedPrompt);
  const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}`;

  try {
    console.log("[generateImageBytes] Requesting image from Pollinations AI...");
    const response = await fetch(imageUrl);

    if (!response.ok) {
      throw new Error(
        `Pollinations API returned ${response.status}: ${response.statusText}`
      );
    }

    const arrayBuffer = await response.arrayBuffer();
    console.log("[generateImageBytes] ✅ Image generated successfully");
    return new Uint8Array(arrayBuffer);
  } catch (error) {
    const errorMsg =
      error instanceof Error ? error.message : String(error);
    console.error("[generateImageBytes] ❌ Failed to generate image:", errorMsg);
    throw new Error(`Failed to generate image with Pollinations AI: ${errorMsg}`);
  }
}
