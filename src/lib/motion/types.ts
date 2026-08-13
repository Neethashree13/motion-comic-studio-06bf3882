/**
 * Shared motion-comic vocabulary.
 *
 * This module is client-safe: the AI Director (server) writes these shapes into
 * `scenes.shot_list`, and the canvas engine (browser) reads them back. Keeping
 * the contract in one place means new camera moves or transitions only need to
 * be added here plus one branch in `camera.ts` / `engine.ts`.
 */

export const CAMERA_MOVES = [
  "static",
  "push_in",
  "pull_out",
  "pan_left",
  "pan_right",
  "pan_up",
  "pan_down",
  "tilt_up",
  "tilt_down",
  "shake",
] as const;
export type CameraMove = (typeof CAMERA_MOVES)[number];

export const TRANSITIONS = ["cut", "fade", "dissolve", "slide", "whip", "flash"] as const;
export type Transition = (typeof TRANSITIONS)[number];

export const EMOTIONS = [
  "neutral",
  "calm",
  "tense",
  "sad",
  "hopeful",
  "angry",
  "fearful",
  "triumphant",
  "mysterious",
] as const;
export type Emotion = (typeof EMOTIONS)[number];

/** One camera beat inside a scene. */
export type Shot = {
  camera: CameraMove;
  /** Point of interest in normalized image space (0-1). */
  focusX: number;
  focusY: number;
  /** Zoom factor at the start and end of the beat (1 = fit, >1 = closer). */
  zoomStart: number;
  zoomEnd: number;
  /** Share of the scene's total duration, 0-1. Normalized at playback time. */
  weight: number;
  /** Optional on-screen text tied to this beat. */
  caption?: string | null;
  /** Speaker name when this beat is a dialogue line — drives the speech bubble. */
  speaker?: string | null;
  dialogue?: string | null;
  note?: string | null;
};

export type SceneDirection = {
  emotion: Emotion;
  transition: Transition;
  shots: Shot[];
};

export const DEFAULT_SHOT: Shot = {
  camera: "push_in",
  focusX: 0.5,
  focusY: 0.45,
  zoomStart: 1.02,
  zoomEnd: 1.14,
  weight: 1,
  caption: null,
  speaker: null,
  dialogue: null,
  note: null,
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

/** Defensive parse: shot lists come from an LLM and from older rows without one. */
export function normalizeShots(raw: unknown): Shot[] {
  if (!Array.isArray(raw) || raw.length === 0) return [{ ...DEFAULT_SHOT }];

  const shots = raw.slice(0, 6).map((item) => {
    const value = (item ?? {}) as Record<string, unknown>;
    const camera = CAMERA_MOVES.includes(value["camera"] as CameraMove)
      ? (value["camera"] as CameraMove)
      : DEFAULT_SHOT.camera;
    const num = (key: string, fallback: number, min: number, max: number) => {
      const parsed = Number(value[key]);
      return Number.isFinite(parsed) ? clamp(parsed, min, max) : fallback;
    };
    const text = (key: string) => {
      const parsed = value[key];
      return typeof parsed === "string" && parsed.trim() ? parsed.trim() : null;
    };

    return {
      camera,
      focusX: num("focusX", 0.5, 0, 1),
      focusY: num("focusY", 0.45, 0, 1),
      zoomStart: num("zoomStart", DEFAULT_SHOT.zoomStart, 1, 2.2),
      zoomEnd: num("zoomEnd", DEFAULT_SHOT.zoomEnd, 1, 2.2),
      weight: num("weight", 1, 0.05, 10),
      caption: text("caption"),
      speaker: text("speaker"),
      dialogue: text("dialogue"),
      note: text("note"),
    } satisfies Shot;
  });

  return shots.length > 0 ? shots : [{ ...DEFAULT_SHOT }];
}

export function normalizeEmotion(raw: unknown): Emotion {
  return EMOTIONS.includes(raw as Emotion) ? (raw as Emotion) : "neutral";
}

export function normalizeTransition(raw: unknown): Transition {
  return TRANSITIONS.includes(raw as Transition) ? (raw as Transition) : "fade";
}

/** Narration steering per emotion — used by the TTS layer and shown in the UI. */
export const EMOTION_VOICE_STYLE: Record<Emotion, string> = {
  neutral: "Read clearly and naturally, with an even storytelling pace.",
  calm: "Read gently and slowly, warm and unhurried, with soft pauses.",
  tense: "Read low and clipped, building pressure, slightly faster than normal.",
  sad: "Read softly and slowly, heavy with regret, letting phrases fall away.",
  hopeful: "Read with lift and warmth, gradually brightening toward the end.",
  angry: "Read hard and forceful, sharp consonants, controlled fury.",
  fearful: "Read hushed and unsteady, breathy, with nervous pauses.",
  triumphant: "Read bold and expansive, full-voiced, celebratory.",
  mysterious: "Read quietly and deliberately, withholding, almost a whisper.",
};

/** Rough audio mood tag per emotion — the sound-design layer maps this to a bed. */
export const EMOTION_AMBIENCE: Record<Emotion, string> = {
  neutral: "room-tone",
  calm: "soft-pad",
  tense: "low-drone",
  sad: "slow-strings",
  hopeful: "warm-pad",
  angry: "percussive",
  fearful: "sub-rumble",
  triumphant: "swell",
  mysterious: "shimmer",
};
