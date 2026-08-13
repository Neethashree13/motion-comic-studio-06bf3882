import { ComicPanel, type PanelRecord } from "@/components/ComicPanel";
import type { SceneImage } from "@/components/ImageStatusBadge";
import { ImageStatusBadge } from "@/components/ImageStatusBadge";
import { SceneAudioPlayer } from "@/components/SceneAudioPlayer";
import type { SceneAudioRecord } from "@/lib/narration.functions";

export function ComicReader({
  panels,
  sceneTitle,
  narration,
  dialogue,
  sceneImage,
  audio,
  audioBusy,
  onNarrate,
  onRenarrate,
  index,
  total,
  onClose,
  onPrev,
  onNext,
}: {
  panels: PanelRecord[];
  sceneTitle: string;
  narration?: string | null;
  dialogue?: string | null;
  sceneImage?: SceneImage | null;
  audio?: SceneAudioRecord | null;
  audioBusy?: boolean;
  onNarrate?: () => Promise<void> | void;
  onRenarrate?: () => Promise<void> | void;
  index: number;
  total: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-background/98 backdrop-blur">
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.3em] text-primary">
              Scene {index + 1} of {total}
            </p>
            <h2 className="mt-1 text-2xl sm:text-3xl">{sceneTitle}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-sm border border-border px-3 py-2 text-[10px] uppercase tracking-[0.2em] hover:border-primary hover:text-primary"
          >
            Close
          </button>
        </div>

        <figure className="panel mt-6 overflow-hidden rounded-sm bg-card">
          <div className="relative aspect-4/3 w-full bg-secondary">
            {sceneImage?.url && sceneImage.status === "ready" ? (
              <img src={sceneImage.url} alt={sceneTitle} className="h-full w-full object-contain" />
            ) : (
              <div className="halftone flex h-full w-full items-center justify-center p-6">
                <ImageStatusBadge status={sceneImage?.status ?? "pending"} />
              </div>
            )}
          </div>
          {narration || dialogue ? (
            <figcaption className="space-y-2 border-t border-border p-4">
              {narration ? <p className="text-sm leading-relaxed text-muted-foreground">{narration}</p> : null}
              {dialogue ? <p className="text-sm italic">{dialogue}</p> : null}
            </figcaption>
          ) : null}
        </figure>

        {onNarrate ? (
          <div className="panel mt-4 rounded-sm bg-card p-4">
            <SceneAudioPlayer
              audio={audio ?? null}
              busy={Boolean(audioBusy)}
              onGenerate={onNarrate}
              onRegenerate={onRenarrate ?? onNarrate}
            />
          </div>
        ) : null}

        {panels.length > 0 ? (
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {panels.map((panel) => (
              <ComicPanel key={panel.id} panel={panel} compact />
            ))}
          </div>
        ) : null}

        <div className="sticky bottom-0 mt-8 flex gap-3 bg-background/90 py-4">
          <button
            type="button"
            onClick={onPrev}
            disabled={index === 0}
            className="flex-1 rounded-sm border border-border px-4 py-3 text-xs uppercase tracking-[0.2em] disabled:opacity-30"
          >
            Previous
          </button>
          <button
            type="button"
            onClick={onNext}
            disabled={index >= total - 1}
            className="flex-1 rounded-sm bg-primary px-4 py-3 text-xs uppercase tracking-[0.2em] text-primary-foreground disabled:opacity-30"
          >
            Next scene
          </button>
        </div>
      </div>
    </div>
  );
}
