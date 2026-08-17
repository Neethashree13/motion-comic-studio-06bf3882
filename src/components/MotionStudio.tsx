import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getMotionTimeline, type MotionTimeline } from "@/lib/motion.functions";
import { directProject, updateSceneDirection } from "@/lib/director.functions";
import { MotionEngine, type EngineState } from "@/lib/motion/engine";
import { EMOTIONS, TRANSITIONS } from "@/lib/motion/types";
import { Button } from "@/components/ui/button";

const CANVAS_WIDTH = 1280;
const CANVAS_HEIGHT = 720;

function formatTime(ms: number) {
  const total = Math.max(0, Math.round(ms / 1000));
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

export function MotionStudio({ projectId }: { projectId: string }) {
  const queryClient = useQueryClient();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<MotionEngine | null>(null);

  const [state, setState] = useState<EngineState>({
    playing: false,
    timeMs: 0,
    totalMs: 0,
    sceneIndex: 0,
  });
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);

  const timelineQuery = useQuery({
    queryKey: ["motion-timeline", projectId],
    queryFn: () => getMotionTimeline({ data: { projectId } }) as Promise<MotionTimeline>,
  });

  const scenes = useMemo(() => timelineQuery.data?.scenes ?? [], [timelineQuery.data]);

  // One engine per mounted canvas.
  useEffect(() => {
    if (!canvasRef.current) return;
    const engine = new MotionEngine(canvasRef.current);
    engine.onState = setState;
    engineRef.current = engine;
    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, []);

  // Reload media whenever the timeline changes.
  useEffect(() => {
    const engine = engineRef.current;
    if (!engine || scenes.length === 0) return;
    void engine.load(
      scenes.map((scene) => ({
        sceneId: scene.sceneId,
        sceneNumber: scene.sceneNumber,
        title: scene.title,
        imageUrl: scene.imageUrl,
        audioUrl: scene.audioUrl,
        durationMs: scene.durationMs,
        shots: scene.shots,
        transition: scene.transition,
        emotion: scene.emotion,
        narration: scene.narration,
      })),
    );
  }, [scenes]);

  const direct = useMutation({
    mutationFn: () => directProject({ data: { projectId } }),
    onSuccess: async () => {
      toast.success("AI Director planned the camera beats.");
      await queryClient.invalidateQueries({ queryKey: ["motion-timeline", projectId] });
    },
    onError: (error: unknown) =>
      toast.error(error instanceof Error ? error.message : "Directing failed."),
  });

  const updateDirection = useMutation({
    mutationFn: (input: { sceneId: string; emotion?: string; transition?: string }) =>
      updateSceneDirection({ data: input }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["motion-timeline", projectId] });
    },
    onError: (error: unknown) =>
      toast.error(error instanceof Error ? error.message : "Could not update the scene."),
  });

  const handleExport = async () => {
    const engine = engineRef.current;
    if (!engine || scenes.length === 0) return;
    setExporting(true);
    setExportProgress(0);
    try {
      const blob = await engine.export({ onProgress: setExportProgress });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${timelineQuery.data?.projectTitle ?? "motion-comic"}.webm`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success("Motion comic exported.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Export failed.");
    } finally {
      setExporting(false);
    }
  };

  const activeScene = scenes[state.sceneIndex];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl">Motion Studio</h2>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            Camera moves, speech bubbles and narration are composited live on canvas. What you see
            here is exactly what gets exported.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button
            variant="outline"
            onClick={() => direct.mutate()}
            disabled={direct.isPending || scenes.length === 0}
          >
            {direct.isPending ? "Directing…" : "Direct with AI"}
          </Button>
          <Button onClick={handleExport} disabled={exporting || scenes.length === 0}>
            {exporting ? `Exporting ${Math.round(exportProgress * 100)}%` : "Export WebM"}
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-sm border border-border bg-black">
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className="block w-full"
        />
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <Button
          variant="outline"
          onClick={() => engineRef.current?.toggle()}
          disabled={scenes.length === 0}
        >
          {state.playing ? "Pause" : "Play"}
        </Button>
        <span className="font-mono text-xs text-muted-foreground">
          {formatTime(state.timeMs)} / {formatTime(state.totalMs)}
        </span>
        <input
          type="range"
          min={0}
          max={Math.max(1, state.totalMs)}
          value={state.timeMs}
          onChange={(event) => engineRef.current?.seek(Number(event.target.value))}
          className="h-1 flex-1 min-w-[200px] cursor-pointer accent-primary"
          aria-label="Scrub timeline"
        />
        {activeScene ? (
          <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Scene {activeScene.sceneNumber} · {activeScene.title}
          </span>
        ) : null}
      </div>

      {timelineQuery.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading timeline…</p>
      ) : scenes.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No scenes yet. Generate a story, scene images and narration first.
        </p>
      ) : (
        <div className="grid gap-3">
          {scenes.map((scene) => (
            <div
              key={scene.sceneId}
              className="flex flex-wrap items-center gap-3 rounded-sm border border-border px-4 py-3"
            >
              <span className="w-40 shrink-0 truncate text-sm">
                {scene.sceneNumber}. {scene.title}
              </span>
              <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                {scene.shots.length} shots · {Math.round(scene.durationMs / 100) / 10}s
                {scene.imageUrl ? "" : " · no image"}
                {scene.audioUrl ? "" : " · no narration"}
              </span>
              <div className="ml-auto flex gap-2">
                <select
                  value={scene.emotion}
                  onChange={(event) =>
                    updateDirection.mutate({
                      sceneId: scene.sceneId,
                      emotion: event.target.value,
                    })
                  }
                  className="rounded-sm border border-border bg-background px-2 py-1 text-xs"
                  aria-label={`Emotion for scene ${scene.sceneNumber}`}
                >
                  {EMOTIONS.map((emotion) => (
                    <option key={emotion} value={emotion}>
                      {emotion}
                    </option>
                  ))}
                </select>
                <select
                  value={scene.transition}
                  onChange={(event) =>
                    updateDirection.mutate({
                      sceneId: scene.sceneId,
                      transition: event.target.value,
                    })
                  }
                  className="rounded-sm border border-border bg-background px-2 py-1 text-xs"
                  aria-label={`Transition for scene ${scene.sceneNumber}`}
                >
                  {TRANSITIONS.map((transition) => (
                    <option key={transition} value={transition}>
                      {transition}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
