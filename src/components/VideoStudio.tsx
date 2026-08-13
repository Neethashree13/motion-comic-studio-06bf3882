import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  deleteProjectVideo,
  generateProjectVideo,
  getProjectVideo,
} from "@/lib/video.functions";

const STATUS_STYLES: Record<string, string> = {
  pending: "border-border text-muted-foreground",
  processing: "border-primary/60 text-primary",
  completed: "border-primary text-primary",
  failed: "border-destructive text-destructive",
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`rounded-sm border px-3 py-2 text-[10px] uppercase tracking-[0.2em] ${
        STATUS_STYLES[status] ?? "border-border text-muted-foreground"
      }`}
    >
      {status}
    </span>
  );
}

export function VideoStudio({ projectId }: { projectId: string }) {
  const queryClient = useQueryClient();
  const load = useServerFn(getProjectVideo);
  const render = useServerFn(generateProjectVideo);
  const drop = useServerFn(deleteProjectVideo);

  const videoQuery = useQuery({
    queryKey: ["project-video", projectId],
    queryFn: () => load({ data: { projectId } }),
    refetchInterval: (query) => (query.state.data?.video?.status === "processing" ? 2_000 : false),
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["project-video", projectId] });

  const renderMutation = useMutation({
    mutationFn: () => render({ data: { projectId } }),
    onSettled: refresh,
  });
  const deleteMutation = useMutation({
    mutationFn: (videoId: string) => drop({ data: { videoId } }),
    onSettled: refresh,
  });

  const state = videoQuery.data;
  const video = state?.video ?? null;
  const busy = renderMutation.isPending || video?.status === "processing";
  const progress = busy ? Math.max(video?.progress ?? 0, 3) : (video?.progress ?? 0);
  const canRender = (state?.readyScenes ?? 0) > 0;

  return (
    <section className="mt-14">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl">Comic video</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Every scene image is held on screen for the length of its narration, with a fade between
            scenes, and stitched into one MP4.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {video ? <StatusBadge status={video.status} /> : null}
          {state ? (
            <span className="rounded-sm border border-border px-3 py-2 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              {state.readyScenes}/{state.totalScenes} scenes ready
            </span>
          ) : null}
          <button
            type="button"
            disabled={busy || !canRender}
            onClick={() => renderMutation.mutate()}
            className="rounded-sm bg-primary px-6 py-3 font-display text-lg tracking-wider text-primary-foreground disabled:opacity-40"
          >
            {busy
              ? `Rendering… ${progress}%`
              : video?.status === "completed"
                ? "Re-render video"
                : "Generate video"}
          </button>
        </div>
      </div>

      {busy ? (
        <div className="mt-5 h-1.5 w-full overflow-hidden rounded-sm bg-muted">
          <div
            className="h-full bg-primary transition-[width] duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      ) : null}

      {!canRender && state ? (
        <p className="mt-5 text-sm text-muted-foreground">
          Generate an image and narration for at least one scene to unlock video rendering.
        </p>
      ) : null}

      {state && state.issues.length > 0 ? (
        <ul className="mt-5 space-y-1 text-xs text-muted-foreground">
          {state.issues.map((issue) => (
            <li key={issue.sceneNumber}>
              Scene {issue.sceneNumber} — {issue.title}: missing {issue.missing.join(" and ")} (it will be
              skipped).
            </li>
          ))}
        </ul>
      ) : null}

      {video?.status === "failed" ? (
        <p className="mt-5 rounded-sm border border-destructive/50 px-4 py-3 text-sm text-destructive">
          {video.error_message ?? "Video rendering failed."} You can try again.
        </p>
      ) : null}

      {video?.status === "completed" && video.url ? (
        <div className="mt-6 space-y-4">
          <video
            key={video.updated_at}
            src={video.url}
            controls
            className="w-full rounded-sm border border-border bg-black"
          />
          <div className="flex flex-wrap items-center gap-3">
            <a
              href={video.url}
              download="comic-video.mp4"
              className="rounded-sm border border-primary/60 px-6 py-3 text-xs uppercase tracking-[0.2em] text-primary hover:bg-primary hover:text-primary-foreground"
            >
              Download video
            </a>
            {video.duration_ms ? (
              <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                {Math.round(video.duration_ms / 1000)}s
              </span>
            ) : null}
            <button
              type="button"
              disabled={deleteMutation.isPending}
              onClick={() => deleteMutation.mutate(video.id)}
              className="rounded-sm border border-border px-6 py-3 text-xs uppercase tracking-[0.2em] text-muted-foreground hover:border-destructive hover:text-destructive disabled:opacity-40"
            >
              Delete video
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
