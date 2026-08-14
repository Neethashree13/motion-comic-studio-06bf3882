/**
 * AI Director — turns a written scene into a camera plan.
 *
 * Server-only helpers: prompt construction and defensive parsing. The server
 * function in `director.functions.ts` owns persistence, so this file stays
 * easy to unit test and swap models in.
 */
import {
  CAMERA_MOVES,
  EMOTIONS,
  TRANSITIONS,
  normalizeEmotion,
  normalizeShots,
  normalizeTransition,
  type SceneDirection,
} from "./motion/types";

export type DirectableScene = {
  scene_number: number;
  title: string;
  narration: string | null;
  dialogue: string | null;
  music: string | null;
};

export function buildDirectorPrompt(options: {
  projectTitle: string;
  genre: string;
  artStyle: string;
  logline: string | null;
  characters: { name: string; role: string | null }[];
  scene: DirectableScene;
}) {
  const { scene } = options;
  return [
    `Story: ${options.projectTitle} (${options.genre}, art style: ${options.artStyle})`,
    options.logline ? `Logline: ${options.logline}` : "",
    options.characters.length
      ? `Characters: ${options.characters.map((c) => `${c.name}${c.role ? ` (${c.role})` : ""}`).join(", ")}`
      : "",
    "",
    `Scene ${scene.scene_number}: ${scene.title}`,
    scene.narration ? `Narration: ${scene.narration}` : "",
    scene.dialogue ? `Dialogue: ${scene.dialogue}` : "",
    scene.music ? `Music cue: ${scene.music}` : "",
    "",
    "Direct this scene as a motion comic beat. The scene is ONE still panel image;",
    "movement comes only from camera moves over that image, so plan 2-4 beats that",
    "read cinematically (establish, then push into the emotional focus, etc.).",
    "focusX/focusY are normalized coordinates (0-1) of the point of interest in the panel.",
    "zoomStart/zoomEnd are between 1.0 and 1.8. weight is the relative time share of the beat.",
    "Attach the dialogue line to the beat where it is spoken (speaker = character name,",
    "dialogue = spoken words only), and use caption for narration fragments.",
    "",
    `Allowed camera values: ${CAMERA_MOVES.join(", ")}.`,
    `Allowed transition values: ${TRANSITIONS.join(", ")}.`,
    `Allowed emotion values: ${EMOTIONS.join(", ")}.`,
    "",
    "Reply with ONLY raw JSON (no markdown fence, no commentary):",
    `{
  "emotion": string,
  "transition": string,   // how we cut INTO this scene from the previous one
  "shots": [{
    "camera": string,
    "focusX": number,
    "focusY": number,
    "zoomStart": number,
    "zoomEnd": number,
    "weight": number,
    "caption": string | null,
    "speaker": string | null,
    "dialogue": string | null,
    "note": string | null
  }]
}`,
  ]
    .filter(Boolean)
    .join("\n");
}

/** Strips code fences and validates the model output into a safe direction. */
export function parseDirection(raw: string): SceneDirection {
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/, "")
    .trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start === -1 || end <= start) throw new Error("The director returned malformed JSON.");
    parsed = JSON.parse(cleaned.slice(start, end + 1));
  }

  const value = (parsed ?? {}) as Record<string, unknown>;
  return {
    emotion: normalizeEmotion(value["emotion"]),
    transition: normalizeTransition(value["transition"]),
    shots: normalizeShots(value["shots"]),
  };
}

/**
 * Deterministic fallback plan used when no model output is available, so the
 * motion engine always has something sensible to play.
 */
export function heuristicDirection(scene: DirectableScene): SceneDirection {
  const speaker = scene.dialogue?.match(/^\s*([A-Za-z0-9_ '-]+)\s*:/)?.[1]?.trim() ?? null;
  const line = scene.dialogue?.replace(/^\s*[A-Za-z0-9_ '-]+\s*:/, "").trim() || null;

  return {
    emotion: "neutral",
    transition: scene.scene_number === 1 ? "fade" : "dissolve",
    shots: normalizeShots([
      {
        camera: "push_in",
        focusX: 0.5,
        focusY: 0.45,
        zoomStart: 1.02,
        zoomEnd: 1.16,
        weight: 1.2,
        caption: scene.narration ?? null,
      },
      {
        camera: line ? "static" : "pan_right",
        focusX: 0.5,
        focusY: 0.5,
        zoomStart: 1.16,
        zoomEnd: 1.22,
        weight: 1,
        speaker,
        dialogue: line,
      },
    ]),
  };
}
