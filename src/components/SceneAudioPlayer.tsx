import { useEffect, useRef } from "react";
import type { SceneAudioRecord } from "@/lib/narration.functions";

const LABELS: Record<string, string> = {
  completed: "Narration ready",
  generating: "Narrating…",
  pending: "Queued",
  failed: "Narration failed",
  none: "No narration yet",
};

function tone(status: string) {
  if (status === "completed") return "border-primary/60 text-primary";
  if (status === "failed") return "border-destructive/60 text-destructive";
  if (status === "generating" || status === "pending") return "border-border text-muted-foreground animate-pulse";
  return "border-border text-muted-foreground";
}

export function SceneAudioPlayer({
  audio,
  busy,
  onGenerate,
  onRegenerate,
  compact,
}: {
  audio: SceneAudioRecord | null;
  busy: boolean;
  /** Generates narration when it does not exist yet; resolves once the clip is stored. */
  onGenerate: () => Promise<void> | void;
  onRegenerate: () => Promise<void> | void;
  compact?: boolean;
}) {
  const ref = useRef<HTMLAudioElement | null>(null);
  const wantsPlay = useRef(false);
  const status = busy ? "generating" : (audio?.status ?? "none");
  const ready = audio?.status === "completed" && Boolean(audio.url);

  useEffect(() => {
    if (ready && wantsPlay.current && ref.current) {
      wantsPlay.current = false;
      void ref.current.play().catch(() => undefined);
    }
  }, [ready, audio?.url]);

  async function handlePlay() {
    if (ready && ref.current) {
      void ref.current.play().catch(() => undefined);
      return;
    }
    wantsPlay.current = true;
    await onGenerate();
  }

  return (
    <div className="flex flex-col gap-2 border-t border-border pt-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span
          className={`inline-flex items-center rounded-sm border px-2 py-1 text-[10px] uppercase tracking-[0.2em] ${tone(status)}`}
        >
          {LABELS[status] ?? LABELS["none"]}
        </span>
        {ready && audio?.duration_ms ? (
          <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            ~{Math.round(audio.duration_ms / 1000)}s
          </span>
        ) : null}
      </div>

      {ready ? (
        <audio ref={ref} controls preload="none" src={audio?.url ?? undefined} className="w-full">
          <track kind="captions" />
        </audio>
      ) : null}

      {audio?.status === "failed" && audio.error_message ? (
        <p className="text-xs text-destructive">{audio.error_message}</p>
      ) : null}

      {!compact ? (
        <div className="flex flex-wrap gap-x-4 gap-y-2 text-[10px] uppercase tracking-[0.2em]">
          <button
            type="button"
            disabled={busy}
            onClick={() => void handlePlay()}
            className="text-primary disabled:opacity-40"
          >
            {busy ? "Narrating…" : "Play narration"}
          </button>
          {audio ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => void onRegenerate()}
              className="text-muted-foreground hover:text-primary disabled:opacity-40"
            >
              Regenerate narration
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
