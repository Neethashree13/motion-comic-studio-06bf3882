// import { useState } from "react";

// export type PanelRecord = {
//   id: string;
//   panel_number: number;
//   image_prompt: string;
//   caption: string | null;
//   image_url: string | null;
//   image_status: string;
//   scene_id: string;
// };

// export function ComicPanel({
//   panel,
//   onRegenerate,
//   regenerating,
//   compact,
// }: {
//   panel: PanelRecord;
//   onRegenerate?: (panelId: string) => void;
//   regenerating?: boolean;
//   compact?: boolean;
// }) {
//   const [showPrompt, setShowPrompt] = useState(false);

//   return (
//     <figure className="panel group relative flex flex-col overflow-hidden rounded-sm bg-card">
//       <div className="relative aspect-4/3 w-full overflow-hidden bg-secondary">
//         {panel.image_url ? (
//           <img
//             src={panel.image_url}
//             alt={panel.caption ?? `Panel ${panel.panel_number}`}
//             loading="lazy"
//             className="h-full w-full object-cover"
//           />
//         ) : (
//           <div className="halftone flex h-full w-full flex-col justify-between p-4">
//             <span className="text-[10px] font-semibold uppercase tracking-[0.3em] text-muted-foreground">
//               Panel {panel.panel_number} · art {panel.image_status}
//             </span>
//             <p
//               className={`text-xs leading-relaxed text-muted-foreground ${
//                 showPrompt ? "" : "line-clamp-4"
//               }`}
//             >
//               {panel.image_prompt}
//             </p>
//           </div>
//         )}
//         <span className="absolute left-0 top-0 bg-foreground px-2 py-1 font-display text-sm tracking-widest text-background">
//           {panel.panel_number}
//         </span>
//       </div>

//       <figcaption className="flex flex-1 flex-col gap-3 border-t border-border p-4">
//         <p className="text-sm leading-relaxed">{panel.caption}</p>
//         {!compact ? (
//           <div className="mt-auto flex flex-wrap gap-3 text-[10px] uppercase tracking-[0.2em]">
//             <button
//               type="button"
//               onClick={() => setShowPrompt((value) => !value)}
//               className="text-muted-foreground hover:text-primary"
//             >
//               {showPrompt ? "Hide prompt" : "View prompt"}
//             </button>
//             {onRegenerate ? (
//               <button
//                 type="button"
//                 disabled={regenerating}
//                 onClick={() => onRegenerate(panel.id)}
//                 className="text-primary disabled:opacity-40"
//               >
//                 {regenerating ? "Regenerating…" : "Regenerate"}
//               </button>
//             ) : null}
//           </div>
//         ) : null}
//       </figcaption>
//     </figure>
//   );
// }

import { useState } from "react";
import type { PanelRecord } from "../types";
import { objectUrl } from "../utils/url";
import { RefreshCw, Eye, EyeOff, AlertTriangle, Image as ImageIcon } from "lucide-react";

export function ComicPanel({
  panel,
  onRegenerate,
  regenerating,
  compact,
}: {
  key?: string | number;
  panel: PanelRecord;
  onRegenerate?: (panelId: string) => void;
  regenerating?: boolean;
  compact?: boolean;
}) {
  const [showPrompt, setShowPrompt] = useState(false);
  const [imgError, setImgError] = useState(false);

  // Safely derive public URL for panel image
  const resolvedUrl = panel.image_url ? objectUrl(panel.image_url) : null;
  const isReady = panel.image_status === "ready" && resolvedUrl && !imgError;

  return (
    <figure className="panel group relative flex flex-col overflow-hidden rounded-lg border border-slate-700 bg-slate-900 shadow-xl transition-all duration-200 hover:border-slate-500">
      {/* Panel Image Container */}
      <div className="relative aspect-4/3 w-full overflow-hidden bg-slate-950">
        {isReady ? (
          <img
            src={resolvedUrl}
            alt={panel.caption ?? `Panel ${panel.panel_number}`}
            loading="lazy"
            onError={() => {
              console.error(`[ComicPanel] Image failed to load at ${resolvedUrl}`);
              setImgError(true);
            }}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="halftone flex h-full w-full flex-col justify-between p-5 text-slate-300">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-indigo-400">
                <ImageIcon className="h-3.5 w-3.5" />
                Panel {panel.panel_number} · {panel.image_status}
              </span>
              {imgError && (
                <span className="flex items-center gap-1 text-[10px] text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800">
                  <AlertTriangle className="h-3 w-3" /> Image 404 / error
                </span>
              )}
            </div>

            <div className="my-auto py-2">
              <p className="text-xs leading-relaxed text-slate-400 font-mono">
                {showPrompt ? panel.image_prompt : `${panel.image_prompt.slice(0, 110)}...`}
              </p>
            </div>

            {onRegenerate && (
              <button
                type="button"
                disabled={regenerating}
                onClick={() => {
                  setImgError(false);
                  onRegenerate(panel.id);
                }}
                className="mt-2 inline-flex items-center justify-center gap-2 rounded bg-indigo-600 hover:bg-indigo-500 px-3 py-2 text-xs font-semibold text-white shadow transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${regenerating ? "animate-spin" : ""}`} />
                {regenerating ? "Generating Panel Art..." : "Generate Panel Image"}
              </button>
            )}
          </div>
        )}

        {/* Panel Badge */}
        <span className="absolute left-0 top-0 bg-indigo-600 px-3 py-1 font-mono text-xs font-bold tracking-widest text-white shadow-md">
          #{panel.panel_number}
        </span>
      </div>

      {/* Caption & Controls */}
      <figcaption className="flex flex-1 flex-col gap-3 border-t border-slate-800 bg-slate-900/90 p-4 text-slate-200">
        {panel.caption && (
          <p className="text-sm font-medium leading-relaxed text-slate-100">
            "{panel.caption}"
          </p>
        )}

        {!compact && (
          <div className="mt-auto flex items-center justify-between pt-2 text-xs border-t border-slate-800/80">
            <button
              type="button"
              onClick={() => setShowPrompt((prev) => !prev)}
              className="inline-flex items-center gap-1 text-slate-400 hover:text-indigo-400 transition-colors"
            >
              {showPrompt ? (
                <>
                  <EyeOff className="h-3.5 w-3.5" /> Hide Prompt
                </>
              ) : (
                <>
                  <Eye className="h-3.5 w-3.5" /> View Prompt
                </>
              )}
            </button>

            {onRegenerate && panel.image_status === "ready" && (
              <button
                type="button"
                disabled={regenerating}
                onClick={() => {
                  setImgError(false);
                  onRegenerate(panel.id);
                }}
                className="inline-flex items-center gap-1 text-indigo-400 hover:text-indigo-300 font-medium disabled:opacity-40 transition-colors"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${regenerating ? "animate-spin" : ""}`} />
                {regenerating ? "Regenerating..." : "Regenerate Art"}
              </button>
            )}
          </div>
        )}
      </figcaption>
    </figure>
  );
}
