/**
 * Image-to-video generation through the Lovable AI Gateway (Veo).
 *
 * Turns a generated comic panel into a short animated shot with real character
 * motion. Generation is an async job: create -> poll -> download the MP4.
 * Server-only: reads LOVABLE_API_KEY inside each call.
 */
import type { Emotion, Shot } from "./types";

const GATEWAY = "https://ai.gateway.lovable.dev/v1/videos";

export const CLIP_MODEL = "google/veo-3.1-lite";
/** Veo only accepts "4" | "6" | "8". */
export type ClipSeconds = "4" | "6" | "8";

export type ClipJob = {
  id: string;
  status: "queued" | "in_progress" | "completed" | "failed" | string;
  progress?: number;
  error?: { code?: string; message?: string } | null;
};

function apiKey() {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new Error("AI video generation is not configured on this server.");
  return key;
}

async function readError(response: Response) {
  const body = (await response.json().catch(() => null)) as { message?: string } | null;
  return body?.message ?? `Video generation failed (${response.status}).`;
}

const CAMERA_HINT: Record<Shot["camera"], string> = {
  static: "locked-off camera, subtle ambient motion only",
  push_in: "slow cinematic push-in toward the subject",
  pull_out: "slow pull-out revealing the surroundings",
  pan_left: "smooth camera pan to the left",
  pan_right: "smooth camera pan to the right",
  pan_up: "smooth camera pan upward",
  pan_down: "smooth camera pan downward",
  tilt_up: "gentle tilt up",
  tilt_down: "gentle tilt down",
  shake: "handheld shake, tense energy",
};

const EMOTION_HINT: Record<Emotion, string> = {
  neutral: "natural, grounded mood",
  calm: "calm, gentle atmosphere",
  tense: "tense, suspenseful atmosphere",
  sad: "melancholic, quiet mood",
  hopeful: "warm, hopeful light",
  angry: "aggressive, high-energy mood",
  fearful: "uneasy, fearful mood",
  triumphant: "epic, triumphant mood",
  mysterious: "mysterious, moody atmosphere",
};

/**
 * Builds an animation prompt that keeps the panel's art style but adds life:
 * character movement, secondary motion (hair, cloth, particles) and one camera move.
 */
export function buildClipPrompt(input: {
  title: string;
  narration: string | null;
  dialogue: string | null;
  emotion: Emotion;
  shot: Shot | undefined;
  artStyle: string | null;
}) {
  const beats = [
    `Animate this illustration as a ${input.artStyle ?? "cinematic anime"} motion-comic shot.`,
    `Scene: ${input.title}.`,
    input.narration ? `Action: ${input.narration.slice(0, 320)}` : null,
    input.dialogue ? `The character is speaking: ${input.dialogue.slice(0, 200)}` : null,
    "The characters move naturally: believable body movement, walking or gesturing, blinking eyes, subtle facial expression change, hair and clothing drifting with the air.",
    "Add living environment motion: light flicker, drifting particles, moving background elements, reflections.",
    input.shot ? `Camera: ${CAMERA_HINT[input.shot.camera]}.` : "Camera: slow cinematic push-in.",
    `Mood: ${EMOTION_HINT[input.emotion]}.`,
    "Keep the exact character design, colors, framing and art style of the source image. No text, no captions, no watermarks, no morphing or extra characters.",
  ].filter(Boolean);
  return beats.join(" ");
}

/** Creates a Veo job from a source panel image. Returns the job id. */
export async function createClipJob(input: {
  prompt: string;
  imageBytes: Uint8Array;
  imageMime: string;
  seconds: ClipSeconds;
  model?: string;
}): Promise<ClipJob> {
  const base64 = Buffer.from(input.imageBytes).toString("base64");
  const response = await fetch(GATEWAY, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: input.model ?? CLIP_MODEL,
      prompt: input.prompt,
      seconds: input.seconds,
      size: "1280x720",
      input_reference: `data:${input.imageMime};base64,${base64}`,
    }),
  });
  if (!response.ok) throw new Error(await readError(response));
  return (await response.json()) as ClipJob;
}

export async function getClipJob(jobId: string): Promise<ClipJob> {
  const response = await fetch(`${GATEWAY}/${jobId}`, {
    headers: { Authorization: `Bearer ${apiKey()}` },
  });
  if (!response.ok) throw new Error(await readError(response));
  return (await response.json()) as ClipJob;
}

/** Downloads the finished MP4 (the gateway 302-redirects to a short-lived URL). */
export async function downloadClip(jobId: string): Promise<Uint8Array> {
  const response = await fetch(`${GATEWAY}/${jobId}/content`, {
    headers: { Authorization: `Bearer ${apiKey()}` },
  });
  if (!response.ok) throw new Error(await readError(response));
  return new Uint8Array(await response.arrayBuffer());
}

export function clipKey(projectId: string, sceneId: string, jobId: string) {
  return `clips/${projectId}/${sceneId}-${jobId}.mp4`;
}
