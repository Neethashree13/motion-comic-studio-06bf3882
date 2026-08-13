import { useEffect } from "react";
import { downloadImage, slugify } from "@/lib/download-image";

export function ImageLightbox({
  url,
  title,
  narration,
  dialogue,
  onClose,
}: {
  url: string;
  title: string;
  narration?: string | null;
  dialogue?: string | null;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-60 flex flex-col bg-background/97 backdrop-blur">
      <div className="flex items-center justify-between gap-4 border-b border-border px-5 py-4">
        <h3 className="truncate text-xl sm:text-2xl">{title}</h3>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => void downloadImage(url, `${slugify(title) || "scene"}.png`)}
            className="rounded-sm border border-border px-3 py-2 text-[10px] uppercase tracking-[0.2em] hover:border-primary hover:text-primary"
          >
            Download
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-sm border border-border px-3 py-2 text-[10px] uppercase tracking-[0.2em] hover:border-primary hover:text-primary"
          >
            Close
          </button>
        </div>
      </div>
      <div className="flex flex-1 items-center justify-center overflow-auto p-4">
        <img src={url} alt={title} className="max-h-full max-w-full object-contain" />
      </div>
      {narration || dialogue ? (
        <div className="border-t border-border px-5 py-4 text-sm">
          {narration ? <p className="text-muted-foreground">{narration}</p> : null}
          {dialogue ? <p className="mt-2 italic">{dialogue}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
