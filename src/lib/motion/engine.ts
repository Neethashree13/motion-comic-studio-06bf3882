/**
 * Motion comic playback engine.
 *
 * Browser-only. Composites the selected panel image for each scene through the
 * camera solver, layers speech bubbles / captions / cinematic grade on top, and
 * cross-fades between scenes using the scene's transition.
 *
 * The same render path is reused for MediaRecorder export, so what you preview
 * is exactly what you download.
 */
import { drawCaption, drawGrade, drawSpeechBubble } from "./bubbles";
import { distributeShotDurations, solveCamera } from "./camera";
import type { Emotion, Shot, Transition } from "./types";

export type MotionScene = {
  sceneId: string;
  sceneNumber: number;
  title: string;
  imageUrl: string | null;
  /** AI-animated clip for this scene. When present it replaces the still panel. */
  videoUrl?: string | null;
  audioUrl: string | null;
  /** Total on-screen time for this scene. */
  durationMs: number;
  shots: Shot[];
  transition: Transition;
  emotion: Emotion;
  narration: string | null;
};

export type EngineState = {
  playing: boolean;
  timeMs: number;
  totalMs: number;
  sceneIndex: number;
};

const TRANSITION_MS = 520;

type Segment = {
  scene: MotionScene;
  startMs: number;
  endMs: number;
  shotDurations: number[];
};

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Could not load panel image: ${url}`));
    image.src = url;
  });
}

/** Loads an animated clip and keeps it paused, ready to be sampled per frame. */
function loadVideo(url: string): Promise<HTMLVideoElement> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.crossOrigin = "anonymous";
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";
    video.loop = true;
    video.oncanplay = () => resolve(video);
    video.onerror = () => reject(new Error(`Could not load scene clip: ${url}`));
    video.src = url;
    video.load();
  });
}

function transitionMsFor(transition: Transition) {
  if (transition === "cut") return 0;
  if (transition === "flash" || transition === "whip") return 260;
  return TRANSITION_MS;
}

export class MotionEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private scenes: MotionScene[] = [];
  private segments: Segment[] = [];
  private images = new Map<string, HTMLImageElement>();
  private videos = new Map<string, HTMLVideoElement>();
  /** True while the timeline advances in real time (playback or export). */
  private driving = false;
  private audios = new Map<string, HTMLAudioElement>();
  private raf = 0;
  private lastTick = 0;
  private timeMs = 0;
  private playing = false;
  private activeAudio: HTMLAudioElement | null = null;
  private activeAudioScene: string | null = null;

  onState: ((state: EngineState) => void) | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D context unavailable.");
    this.ctx = ctx;
  }

  get totalMs() {
    const last = this.segments[this.segments.length - 1];
    return last ? last.endMs : 0;
  }

  get state(): EngineState {
    return {
      playing: this.playing,
      timeMs: this.timeMs,
      totalMs: this.totalMs,
      sceneIndex: Math.max(0, this.segmentIndexAt(this.timeMs)),
    };
  }

  /** Loads scenes, preloads media and renders the first frame. */
  async load(scenes: MotionScene[]) {
    this.pause();
    this.scenes = scenes;
    this.timeMs = 0;

    let cursor = 0;
    this.segments = scenes.map((scene) => {
      const duration = Math.max(1_200, scene.durationMs || 3_500);
      const segment: Segment = {
        scene,
        startMs: cursor,
        endMs: cursor + duration,
        shotDurations: distributeShotDurations(scene.shots, duration),
      };
      cursor += duration;
      return segment;
    });

    await Promise.all(
      scenes.map(async (scene) => {
        if (!scene.videoUrl || this.videos.has(scene.videoUrl)) return;
        try {
          this.videos.set(scene.videoUrl, await loadVideo(scene.videoUrl));
        } catch {
          /* falls back to the still panel */
        }
      }),
    );

    await Promise.all(
      scenes.map(async (scene) => {
        if (!scene.imageUrl || this.images.has(scene.imageUrl)) return;
        try {
          this.images.set(scene.imageUrl, await loadImage(scene.imageUrl));
        } catch {
          /* scene renders as a placeholder card */
        }
      }),
    );

    for (const scene of scenes) {
      if (!scene.audioUrl || this.audios.has(scene.sceneId)) continue;
      const audio = new Audio(scene.audioUrl);
      audio.preload = "auto";
      audio.crossOrigin = "anonymous";
      this.audios.set(scene.sceneId, audio);
    }

    this.renderAt(0);
    this.emit();
  }

  play() {
    if (this.playing || this.segments.length === 0) return;
    if (this.timeMs >= this.totalMs) this.timeMs = 0;
    this.playing = true;
    this.driving = true;
    this.lastTick = performance.now();
    this.loop();
    this.emit();
  }

  pause() {
    this.playing = false;
    this.driving = false;
    this.videos.forEach((video) => video.pause());
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
    this.stopAudio();
    this.emit();
  }

  toggle() {
    if (this.playing) this.pause();
    else this.play();
  }

  seek(timeMs: number) {
    this.timeMs = Math.min(Math.max(0, timeMs), this.totalMs);
    this.stopAudio();
    this.renderAt(this.timeMs);
    this.emit();
  }

  destroy() {
    this.pause();
    this.audios.forEach((audio) => {
      audio.pause();
      audio.src = "";
    });
    this.audios.clear();
    this.videos.forEach((video) => {
      video.pause();
      video.src = "";
    });
    this.videos.clear();
    this.images.clear();
    this.onState = null;
  }

  private emit() {
    this.onState?.(this.state);
  }

  private loop = () => {
    if (!this.playing) return;
    const now = performance.now();
    const delta = now - this.lastTick;
    this.lastTick = now;
    this.timeMs += delta;

    if (this.timeMs >= this.totalMs) {
      this.timeMs = this.totalMs;
      this.renderAt(this.timeMs);
      this.pause();
      return;
    }

    this.syncAudio();
    this.renderAt(this.timeMs);
    this.emit();
    this.raf = requestAnimationFrame(this.loop);
  };

  private stopAudio() {
    if (this.activeAudio) {
      this.activeAudio.pause();
      this.activeAudio.currentTime = 0;
    }
    this.activeAudio = null;
    this.activeAudioScene = null;
  }

  private syncAudio() {
    const index = this.segmentIndexAt(this.timeMs);
    const segment = this.segments[index];
    if (!segment) return;
    if (this.activeAudioScene === segment.scene.sceneId) return;

    this.stopAudio();
    const audio = this.audios.get(segment.scene.sceneId);
    this.activeAudioScene = segment.scene.sceneId;
    if (!audio) return;
    this.activeAudio = audio;
    audio.currentTime = Math.max(0, (this.timeMs - segment.startMs) / 1000);
    void audio.play().catch(() => {
      /* autoplay blocked until the user interacts */
    });
  }

  private segmentIndexAt(timeMs: number) {
    for (let i = 0; i < this.segments.length; i += 1) {
      const segment = this.segments[i]!;
      if (timeMs < segment.endMs) return i;
    }
    return Math.max(0, this.segments.length - 1);
  }

  /**
   * Keeps a clip in sync with the timeline. During real-time playback the clip
   * plays natively (smooth motion) and only gets nudged when it drifts; while
   * paused or scrubbing it is sampled by seeking.
   */
  private syncVideo(video: HTMLVideoElement, localMs: number) {
    const clipDuration = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : 0;
    if (clipDuration === 0) return;
    const target = (localMs / 1000) % clipDuration;

    if (this.driving) {
      if (video.paused) void video.play().catch(() => undefined);
      if (Math.abs(video.currentTime - target) > 0.35) video.currentTime = target;
    } else {
      if (!video.paused) video.pause();
      if (Math.abs(video.currentTime - target) > 0.04) video.currentTime = target;
    }
  }

  /** Renders a single composited frame at an absolute timeline position. */
  renderAt(timeMs: number) {
    const { width, height } = this.canvas;
    const ctx = this.ctx;
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "#08080b";
    ctx.fillRect(0, 0, width, height);

    const index = this.segmentIndexAt(timeMs);
    const segment = this.segments[index];
    if (!segment) return;

    const previous = this.segments[index - 1];
    const transitionMs = transitionMsFor(segment.scene.transition);
    const intoScene = timeMs - segment.startMs;
    const blending = Boolean(previous) && transitionMs > 0 && intoScene < transitionMs;
    const progress = blending ? Math.min(1, Math.max(0, intoScene / transitionMs)) : 1;

    if (blending && previous) {
      this.drawSegment(previous, previous.endMs - 1, 1, 0);
      this.applyTransition(segment.scene.transition, progress, () =>
        this.drawSegment(segment, timeMs, 1, 0),
      );
    } else {
      this.drawSegment(segment, timeMs, 1, 0);
    }

    drawGrade(ctx, width, height, 0.85);
  }

  private applyTransition(transition: Transition, progress: number, draw: () => void) {
    const ctx = this.ctx;
    const { width, height } = this.canvas;
    ctx.save();
    switch (transition) {
      case "slide": {
        ctx.translate(width * (1 - progress), 0);
        draw();
        break;
      }
      case "whip": {
        ctx.globalAlpha = progress;
        ctx.translate(width * 0.25 * (1 - progress), 0);
        ctx.filter = `blur(${(1 - progress) * 14}px)`;
        draw();
        ctx.filter = "none";
        break;
      }
      case "flash": {
        ctx.globalAlpha = progress;
        draw();
        ctx.globalAlpha = Math.sin(progress * Math.PI) * 0.9;
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, width, height);
        break;
      }
      case "dissolve":
      case "fade":
      default: {
        ctx.globalAlpha = progress;
        draw();
        break;
      }
    }
    ctx.restore();
  }

  /** Draws one scene (image + camera + overlays) at an absolute timeline position. */
  private drawSegment(segment: Segment, timeMs: number, alpha: number, _depth: number) {
    const ctx = this.ctx;
    const { width, height } = this.canvas;
    const local = Math.min(
      Math.max(0, timeMs - segment.startMs),
      segment.endMs - segment.startMs,
    );

    // Which shot are we in, and how far through it?
    let cursor = 0;
    let shotIndex = 0;
    for (let i = 0; i < segment.shotDurations.length; i += 1) {
      const duration = segment.shotDurations[i]!;
      if (local < cursor + duration || i === segment.shotDurations.length - 1) {
        shotIndex = i;
        break;
      }
      cursor += duration;
    }
    const shotDuration = segment.shotDurations[shotIndex] ?? 1;
    const shotProgress = Math.min(1, Math.max(0, (local - cursor) / Math.max(1, shotDuration)));
    const shot = segment.scene.shots[shotIndex] ?? segment.scene.shots[0];

    ctx.save();
    ctx.globalAlpha = alpha;

    const video = segment.scene.videoUrl ? this.videos.get(segment.scene.videoUrl) : undefined;
    const image = segment.scene.imageUrl ? this.images.get(segment.scene.imageUrl) : undefined;

    if (video && video.videoWidth > 0) {
      // The clip already carries the performance; the camera solver only adds a
      // gentle framing move on top of it.
      this.syncVideo(video, local);
      const source = { width: video.videoWidth, height: video.videoHeight };
      const rect = shot
        ? solveCamera(
            { ...shot, zoomStart: 1 + (shot.zoomStart - 1) * 0.35, zoomEnd: 1 + (shot.zoomEnd - 1) * 0.35 },
            shotProgress,
            source,
            { width, height },
            local,
          )
        : solveCamera(
            { camera: "static", focusX: 0.5, focusY: 0.5, zoomStart: 1, zoomEnd: 1, weight: 1 },
            0,
            source,
            { width, height },
          );
      ctx.drawImage(video, rect.sx, rect.sy, rect.sw, rect.sh, 0, 0, width, height);
    } else if (image && shot) {
      const rect = solveCamera(shot, shotProgress, image, { width, height }, local);
      ctx.drawImage(image, rect.sx, rect.sy, rect.sw, rect.sh, 0, 0, width, height);
    } else {
      ctx.fillStyle = "#111117";
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = "#6b6b76";
      ctx.font = `500 ${Math.round(width / 42)}px "Segoe UI", system-ui, sans-serif`;
      ctx.textAlign = "center";
      ctx.fillText(
        `Scene ${segment.scene.sceneNumber} — image not generated yet`,
        width / 2,
        height / 2,
      );
      ctx.textAlign = "left";
    }

    // Overlays fade in/out inside their own beat so text never pops.
    const overlayAlpha =
      Math.min(1, shotProgress / 0.12) * Math.min(1, (1 - shotProgress) / 0.12);

    if (shot?.dialogue) {
      drawSpeechBubble(ctx, {
        text: shot.dialogue,
        speaker: shot.speaker ?? null,
        anchorX: shot.focusX,
        anchorY: shot.focusY,
        canvasWidth: width,
        canvasHeight: height,
        style: segment.scene.emotion === "angry" ? "shout" : "speech",
        opacity: Math.max(0, overlayAlpha) * alpha,
      });
    }

    const caption = shot?.caption ?? null;
    if (caption) {
      drawCaption(ctx, {
        text: caption,
        canvasWidth: width,
        canvasHeight: height,
        opacity: Math.max(0, overlayAlpha) * alpha,
      });
    }

    ctx.restore();
  }

  /**
   * Renders the whole timeline to a WebM blob in the browser.
   * Server-side ffmpeg is unavailable in this runtime, so export runs here with
   * MediaRecorder over the live canvas stream plus mixed narration audio.
   */
  async export(options?: { fps?: number; onProgress?: (ratio: number) => void }): Promise<Blob> {
    const fps = options?.fps ?? 30;
    this.pause();
    this.seek(0);

    this.driving = true;
    const stream = this.canvas.captureStream(fps);

    // Mix every scene's narration into a single audio track.
    // Dedicated elements: createMediaElementSource() permanently re-routes an
    // element, so the preview players must stay untouched.
    let audioContext: AudioContext | null = null;
    const sources = new Map<string, { audio: HTMLAudioElement; gain: GainNode }>();
    try {
      const Ctor: typeof AudioContext | undefined =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      const withAudio = this.scenes.filter((scene) => scene.audioUrl);
      if (Ctor && withAudio.length > 0) {
        audioContext = new Ctor();
        const destination = audioContext.createMediaStreamDestination();
        for (const scene of withAudio) {
          const audio = new Audio(scene.audioUrl!);
          audio.crossOrigin = "anonymous";
          audio.preload = "auto";
          const source = audioContext.createMediaElementSource(audio);
          const gain = audioContext.createGain();
          gain.gain.value = 0;
          source.connect(gain).connect(destination);
          sources.set(scene.sceneId, { audio, gain });
        }
        destination.stream.getAudioTracks().forEach((track) => stream.addTrack(track));
        await audioContext.resume().catch(() => undefined);
      }
    } catch {
      audioContext = null;
    }

    const mimeType = ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"].find(
      (type) => MediaRecorder.isTypeSupported(type),
    );
    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    const chunks: BlobPart[] = [];
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunks.push(event.data);
    };

    const done = new Promise<Blob>((resolve) => {
      recorder.onstop = () => resolve(new Blob(chunks, { type: mimeType ?? "video/webm" }));
    });

    recorder.start(200);

    const total = this.totalMs;
    const frameMs = 1000 / fps;
    let time = 0;
    let currentSceneId: string | null = null;

    while (time <= total) {
      const index = this.segmentIndexAt(time);
      const segment = this.segments[index];
      if (segment && segment.scene.sceneId !== currentSceneId) {
        currentSceneId = segment.scene.sceneId;
        sources.forEach(({ gain, audio }) => {
          gain.gain.value = 0;
          audio.pause();
        });
        const entry = sources.get(segment.scene.sceneId);
        if (entry) {
          entry.gain.gain.value = 1;
          entry.audio.currentTime = 0;
          void entry.audio.play().catch(() => undefined);
        }
      }


      this.renderAt(time);
      options?.onProgress?.(total > 0 ? time / total : 1);
      // Real time is required: MediaRecorder samples the live canvas.
      // eslint-disable-next-line no-await-in-loop
      await new Promise((resolve) => setTimeout(resolve, frameMs));
      time += frameMs;
    }

    sources.forEach(({ audio }) => audio.pause());
    this.driving = false;
    this.videos.forEach((video) => video.pause());
    recorder.stop();
    const blob = await done;
    stream.getTracks().forEach((track) => track.stop());
    if (audioContext) await audioContext.close().catch(() => undefined);
    options?.onProgress?.(1);
    this.seek(0);
    return blob;
  }
}
