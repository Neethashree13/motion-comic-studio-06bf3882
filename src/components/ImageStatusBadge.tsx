export type SceneImage = {
  id: string;
  project_id: string;
  scene_id: string;
  image_prompt: string;
  version: number;
  status: string;
  error_message: string | null;
  is_selected: boolean;
  created_at: string;
  url: string | null;
};

export function ImageStatusBadge({ status }: { status: string }) {
  const label =
    status === "ready"
      ? "Image ready"
      : status === "failed"
        ? "Failed generation"
        : status === "generating"
          ? "Generating image…"
          : status === "queued"
            ? "Queued"
            : "Not started";
  const tone =
    status === "ready"
      ? "border-primary/60 text-primary"
      : status === "failed"
        ? "border-destructive/60 text-destructive"
        : status === "generating" || status === "queued"
          ? "border-border text-muted-foreground animate-pulse"
          : "border-border text-muted-foreground";

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-sm border px-2 py-1 text-[10px] uppercase tracking-[0.2em] ${tone}`}
    >
      {label}
    </span>
  );
}
