import { spawn } from "node:child_process";
import { mkdtemp, rm, writeFile, readFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import type { VideoTimelineEntry } from "./timeline.server";

/**
 * Phase C renderer — turns a scene timeline into a single MP4 with FFmpeg.
 *
 * Deliberately modular so later phases can extend it without a rewrite:
 *  - Phase D (subtitles): add a `subtitlesPath` option and append a `subtitles=`
 *    filter to SEGMENT_VIDEO_FILTER / the concat pass.
 *  - Phase E (background music): add a `musicPath` option and mix it in the
 *    concat pass with `amix`.
 *  - Phase F (social export): change `RenderOptions.width/height/fps` per target
 *    (e.g. 1080x1920 for TikTok) — nothing else in the pipeline is size-aware.
 */

export type RenderOptions = {
  width: number;
  height: number;
  fps: number;
  /** Cross-scene fade length in seconds. */
  fadeSeconds: number;
};

export const DEFAULT_RENDER_OPTIONS: RenderOptions = {
  width: 1280,
  height: 720,
  fps: 24,
  fadeSeconds: 0.4,
};

export type RenderProgress = (payload: { done: number; total: number; label: string }) => void | Promise<void>;

export type RenderResult = {
  bytes: Uint8Array;
  durationMs: number;
};

function run(command: string, args: string[]): Promise<{ code: number; stderr: string; stdout: string }> {
  return new Promise((resolve, reject) => {
    let child;
    try {
      child = spawn(command, args);
    } catch (error) {
      reject(error);
      return;
    }
    let stderr = "";
    let stdout = "";
    child.stderr.on("data", (chunk) => {
      stderr += String(chunk);
    });
    child.stdout.on("data", (chunk) => {
      stdout += String(chunk);
    });
    child.on("error", reject);
    child.on("close", (code) => resolve({ code: code ?? 1, stderr, stdout }));
  });
}

async function ffmpeg(args: string[]) {
  const { code, stderr } = await run("ffmpeg", args);
  if (code !== 0) {
    throw new Error(`FFmpeg failed: ${stderr.split("\n").slice(-6).join(" ").slice(0, 400)}`);
  }
}

/** Media duration in milliseconds, via ffprobe. */
export async function probeDurationMs(filePath: string): Promise<number | null> {
  const { code, stdout } = await run("ffprobe", [
    "-v",
    "error",
    "-show_entries",
    "format=duration",
    "-of",
    "default=noprint_wrappers=1:nokey=1",
    filePath,
  ]);
  if (code !== 0) return null;
  const seconds = Number.parseFloat(stdout.trim());
  return Number.isFinite(seconds) ? Math.round(seconds * 1000) : null;
}

export async function assertFfmpegAvailable() {
  try {
    const { code } = await run("ffmpeg", ["-version"]);
    if (code !== 0) throw new Error("non-zero exit");
  } catch {
    throw new Error(
      "FFmpeg is not available in this runtime, so video rendering cannot run here. Deploy the app to a Node host with FFmpeg installed.",
    );
  }
}

function extensionFor(key: string, fallback: string) {
  const extension = key.split(".").pop()?.toLowerCase();
  return extension && extension.length <= 4 ? extension : fallback;
}

/**
 * Renders the timeline to an MP4 buffer.
 * `readObject` is injected so the renderer never talks to the storage layer directly.
 */
export async function renderTimeline(
  entries: VideoTimelineEntry[],
  readObject: (key: string) => Promise<Uint8Array | null>,
  onProgress?: RenderProgress,
  options: RenderOptions = DEFAULT_RENDER_OPTIONS,
): Promise<RenderResult> {
  if (entries.length === 0) throw new Error("Nothing to render — no scene has both an image and narration.");
  await assertFfmpegAvailable();

  const workDir = await mkdtemp(path.join(tmpdir(), "comic-video-"));
  try {
    const segmentsDir = path.join(workDir, "segments");
    await mkdir(segmentsDir, { recursive: true });

    const segments: string[] = [];
    let totalMs = 0;

    for (const [index, entry] of entries.entries()) {
      const [imageBytes, audioBytes] = await Promise.all([
        readObject(entry.imagePath),
        readObject(entry.audioPath),
      ]);
      if (!imageBytes) throw new Error(`Scene ${entry.sceneNumber}: the generated image file is missing.`);
      if (!audioBytes) throw new Error(`Scene ${entry.sceneNumber}: the narration audio file is missing.`);

      const imagePath = path.join(workDir, `scene-${index}.${extensionFor(entry.imagePath, "png")}`);
      const audioPath = path.join(workDir, `scene-${index}.${extensionFor(entry.audioPath, "mp3")}`);
      await writeFile(imagePath, imageBytes);
      await writeFile(audioPath, audioBytes);

      const probed = await probeDurationMs(audioPath);
      const durationMs = Math.max(probed ?? entry.durationMs ?? 4000, 1000);
      totalMs += durationMs;
      const seconds = durationMs / 1000;
      const fade = Math.min(options.fadeSeconds, seconds / 3);
      const fadeOutStart = Math.max(seconds - fade, 0).toFixed(3);

      const segmentPath = path.join(segmentsDir, `segment-${String(index).padStart(3, "0")}.mp4`);
      await ffmpeg([
        "-y",
        "-loop",
        "1",
        "-i",
        imagePath,
        "-i",
        audioPath,
        "-filter_complex",
        [
          `[0:v]scale=${options.width}:${options.height}:force_original_aspect_ratio=decrease`,
          `pad=${options.width}:${options.height}:(ow-iw)/2:(oh-ih)/2:color=black`,
          "setsar=1",
          `fps=${options.fps}`,
          `fade=t=in:st=0:d=${fade.toFixed(3)}`,
          `fade=t=out:st=${fadeOutStart}:d=${fade.toFixed(3)}[v]`,
        ].join(","),
        "-map",
        "[v]",
        "-map",
        "1:a",
        "-t",
        seconds.toFixed(3),
        "-c:v",
        "libx264",
        "-preset",
        "veryfast",
        "-pix_fmt",
        "yuv420p",
        "-c:a",
        "aac",
        "-b:a",
        "160k",
        "-ar",
        "44100",
        "-ac",
        "2",
        "-movflags",
        "+faststart",
        segmentPath,
      ]);
      segments.push(segmentPath);

      await onProgress?.({
        done: index + 1,
        total: entries.length,
        label: `Rendered scene ${entry.sceneNumber}`,
      });
    }

    const listPath = path.join(workDir, "segments.txt");
    await writeFile(listPath, segments.map((file) => `file '${file}'`).join("\n"));

    const outputPath = path.join(workDir, "final.mp4");
    await ffmpeg([
      "-y",
      "-f",
      "concat",
      "-safe",
      "0",
      "-i",
      listPath,
      "-c:v",
      "libx264",
      "-preset",
      "veryfast",
      "-pix_fmt",
      "yuv420p",
      "-c:a",
      "aac",
      "-b:a",
      "160k",
      "-movflags",
      "+faststart",
      outputPath,
    ]);

    const bytes = new Uint8Array(await readFile(outputPath));
    const measured = await probeDurationMs(outputPath);
    return { bytes, durationMs: measured ?? totalMs };
  } finally {
    await rm(workDir, { recursive: true, force: true }).catch(() => {});
  }
}
