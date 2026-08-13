import type { Shot } from "./types";

/**
 * Camera solver: turns a shot + progress (0-1) into the source rectangle to
 * sample from the panel image. Pure and framework-free so it can be unit tested
 * and reused by both live playback and export rendering.
 */

export type SourceRect = { sx: number; sy: number; sw: number; sh: number };

export function easeInOut(t: number) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

/** Per-move drift of the focus point across the beat, in normalized units. */
function driftFor(camera: Shot["camera"]): { dx: number; dy: number } {
  switch (camera) {
    case "pan_left":
      return { dx: -0.14, dy: 0 };
    case "pan_right":
      return { dx: 0.14, dy: 0 };
    case "pan_up":
    case "tilt_up":
      return { dx: 0, dy: -0.12 };
    case "pan_down":
    case "tilt_down":
      return { dx: 0, dy: 0.12 };
    default:
      return { dx: 0, dy: 0 };
  }
}

function zoomFor(shot: Shot, eased: number) {
  switch (shot.camera) {
    case "push_in":
      return shot.zoomStart + (Math.max(shot.zoomEnd, shot.zoomStart + 0.08) - shot.zoomStart) * eased;
    case "pull_out":
      return Math.max(shot.zoomStart, shot.zoomEnd + 0.12) - (Math.max(shot.zoomStart, shot.zoomEnd + 0.12) - shot.zoomEnd) * eased;
    case "static":
      return Math.max(1.01, shot.zoomStart);
    default:
      return shot.zoomStart + (shot.zoomEnd - shot.zoomStart) * eased;
  }
}

/**
 * Solve the crop rectangle for a shot.
 * `progress` is 0-1 within the beat; `elapsedMs` only matters for shake.
 */
export function solveCamera(
  shot: Shot,
  progress: number,
  image: { width: number; height: number },
  canvas: { width: number; height: number },
  elapsedMs = 0,
): SourceRect {
  const t = clamp01(progress);
  const eased = easeInOut(t);
  const zoom = Math.max(1, zoomFor(shot, eased));

  // Cover fit: the visible window is the largest rect with the canvas aspect
  // that fits inside the image, then divided by the zoom factor.
  const canvasAspect = canvas.width / canvas.height;
  let baseW = image.width;
  let baseH = image.width / canvasAspect;
  if (baseH > image.height) {
    baseH = image.height;
    baseW = image.height * canvasAspect;
  }

  const sw = baseW / zoom;
  const sh = baseH / zoom;

  const drift = driftFor(shot.camera);
  const focusX = clamp01(shot.focusX + drift.dx * (eased - 0.5) * 2);
  const focusY = clamp01(shot.focusY + drift.dy * (eased - 0.5) * 2);

  let sx = focusX * image.width - sw / 2;
  let sy = focusY * image.height - sh / 2;

  if (shot.camera === "shake") {
    const amp = Math.min(image.width, image.height) * 0.006;
    sx += Math.sin(elapsedMs / 38) * amp;
    sy += Math.cos(elapsedMs / 27) * amp;
  }

  sx = Math.min(Math.max(sx, 0), Math.max(0, image.width - sw));
  sy = Math.min(Math.max(sy, 0), Math.max(0, image.height - sh));

  return { sx, sy, sw, sh };
}

/** Splits a scene duration across its shots using their relative weights. */
export function distributeShotDurations(shots: Shot[], totalMs: number): number[] {
  const weights = shots.map((shot) => (shot.weight > 0 ? shot.weight : 1));
  const sum = weights.reduce((acc, value) => acc + value, 0) || 1;
  return weights.map((weight) => (weight / sum) * totalMs);
}
