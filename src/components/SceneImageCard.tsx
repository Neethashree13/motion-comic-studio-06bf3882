import { useState } from "react";
import { ImageStatusBadge, type SceneImage } from "@/components/ImageStatusBadge";
import { downloadImage, slugify } from "@/lib/download-image";
import { SceneAudioPlayer } from "@/components/SceneAudioPlayer";
import type { SceneAudioRecord } from "@/lib/narration.functions";

export type SceneRecord = {
  id: string;
  scene_number: number;
  title: string;
  narration: string | null;
  dialogue: string | null;
  music: string | null;
};

export function SceneImageCard({
  scene,
  images,
  busy,
  onGenerate,
  onAlternate,
  onSelect,
  onDelete,
  onFullscreen,
  audio,
  audioBusy,
  onNarrate,
  onRenarrate,
  compact,
}: {
  scene: SceneRecord;
  images: SceneImage[];
  busy: boolean;
  onGenerate: (sceneId: string) => void;
  onAlternate: (sceneId: string) => void;
  onSelect: (imageId: string) => void;
  onDelete: (imageId: string) => void;
  onFullscreen: (url: string, scene: SceneRecord) => void;
  audio?: SceneAudioRecord | null;
  audioBusy?: boolean;
  onNarrate?: (sceneId: string) => Promise<void> | void;
  onRenarrate?: (sceneId: string) => Promise<void> | void;
  compact?: boolean;
}) {
  const [showPrompt, setShowPrompt] = useState(false);
  const active = images.find((image) => image.is_selected) ?? images[images.length - 1];
  const status = active?.status ?? "none";

  return (
    <article className="panel flex flex-col overflow-hidden rounded-sm bg-card">
      <div className="relative aspect-4/3 w-full overflow-hidden bg-secondary">
        {active?.url && active.status === "ready" ? (
          <button
            type="button"
            onClick={() => onFullscreen(active.url as string, scene)}
            className="h-full w-full"
            aria-label={`View scene ${scene.scene_number} full screen`}
          >
            <img
              src={active.url}
              alt={`${scene.title} — comic panel`}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-500 hover:scale-105"
            />
          </button>
        ) : (
          <div className="halftone flex h-full w-full flex-col justify-between p-4">
            <span className="text-[10px] font-semibold uppercase tracking-[0.3em] text-muted-foreground">
              Scene {scene.scene_number}
            </span>
            <p className="line-clamp-4 text-xs leading-relaxed text-muted-foreground">
              {status === "failed"
                ? (active?.error_message ?? "Image generation failed.")
                : status === "generating"
                  ? "Drawing this scene…"
                  : status === "queued"
                    ? "This scene is queued for drawing…"
                  : "No artwork yet for this scene."}
            </p>
          </div>
        )}
        <span className="absolute left-0 top-0 bg-foreground px-2 py-1 font-display text-sm tracking-widest text-background">
          {scene.scene_number}
        </span>
        {active && images.length > 1 ? (
          <span className="absolute right-2 top-2 rounded-sm bg-background/85 px-2 py-1 text-[10px] uppercase tracking-[0.2em]">
            v{active.version}
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col gap-3 border-t border-border p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-xl">{scene.title}</h3>
          <ImageStatusBadge status={status === "none" ? "pending" : status} />
        </div>
        {scene.narration ? (
          <p className="text-sm leading-relaxed text-muted-foreground">{scene.narration}</p>
        ) : null}
        {scene.dialogue ? <p className="text-sm italic">{scene.dialogue}</p> : null}

        {onNarrate ? (
          <SceneAudioPlayer
            audio={audio ?? null}
            busy={Boolean(audioBusy)}
            onGenerate={() => onNarrate(scene.id)}
            onRegenerate={() => (onRenarrate ?? onNarrate)(scene.id)}
            compact={compact ?? false}
          />
        ) : null}

        {!compact ? (
          <>
            {images.length > 1 ? (
              <div className="flex flex-wrap gap-2">
                {images.map((image) => (
                  <button
                    key={image.id}
                    type="button"
                    onClick={() => onSelect(image.id)}
                    className={`h-12 w-12 overflow-hidden rounded-sm border ${
                      image.is_selected ? "border-primary" : "border-border opacity-70"
                    }`}
                    title={`Version ${image.version}`}
                  >
                    {image.url ? (
                      <img src={image.url} alt={`Version ${image.version}`} className="h-full w-full object-cover" />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center text-[10px]">
                        v{image.version}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            ) : null}

            <div className="mt-auto flex flex-wrap gap-x-4 gap-y-2 text-[10px] uppercase tracking-[0.2em]">
              <button
                type="button"
                disabled={busy}
                onClick={() => onGenerate(scene.id)}
                className="text-primary disabled:opacity-40"
              >
                {busy && status === "none" ? "Starting…" : busy ? "Generating…" : active ? "Regenerate" : "Generate image"}
              </button>
              {active ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => onAlternate(scene.id)}
                  className="text-muted-foreground hover:text-primary disabled:opacity-40"
                >
                  Alternate version
                </button>
              ) : null}
              {active?.url ? (
                <>
                  <button
                    type="button"
                    onClick={() => onFullscreen(active.url as string, scene)}
                    className="text-muted-foreground hover:text-primary"
                  >
                    Full screen
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      void downloadImage(
                        active.url as string,
                        `scene-${scene.scene_number}-${slugify(scene.title) || "panel"}.png`,
                      )
                    }
                    className="text-muted-foreground hover:text-primary"
                  >
                    Download
                  </button>
                </>
              ) : null}
              {active ? (
                <button
                  type="button"
                  onClick={() => onDelete(active.id)}
                  className="text-muted-foreground hover:text-destructive"
                >
                  Delete
                </button>
              ) : null}
              {active ? (
                <button
                  type="button"
                  onClick={() => setShowPrompt((value) => !value)}
                  className="text-muted-foreground hover:text-primary"
                >
                  {showPrompt ? "Hide prompt" : "View prompt"}
                </button>
              ) : null}
            </div>

            {showPrompt && active ? (
              <p className="whitespace-pre-wrap rounded-sm border border-border p-3 text-xs leading-relaxed text-muted-foreground">
                {active.image_prompt}
              </p>
            ) : null}
          </>
        ) : null}
      </div>
    </article>
  );
}
