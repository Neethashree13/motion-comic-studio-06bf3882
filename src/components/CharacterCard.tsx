import { Link } from "@tanstack/react-router";
import { VIEW_LABELS, type ReferenceView } from "@/lib/characters.server";

export type ReferenceImage = {
  id: string;
  view_type: ReferenceView;
  version: number;
  status: string;
  error_message: string | null;
  is_approved: boolean;
  image_prompt: string;
  created_at: string;
  url: string | null;
};

export type CharacterRecord = {
  id: string;
  project_id: string;
  name: string;
  role: string | null;
  appearance: string | null;
  hair: string | null;
  hair_color: string | null;
  eye_color: string | null;
  clothing: string | null;
  accessories: string | null;
  colors: string | null;
  age: string | null;
  personality: string | null;
  backstory: string | null;
  traits: unknown;
  is_locked: boolean;
  project?: { id: string; title: string; genre: string; art_style: string } | null;
  references: ReferenceImage[];
};

export function CharacterCard({
  character,
  showProject,
}: {
  character: CharacterRecord;
  showProject?: boolean;
}) {
  const approved = character.references.filter((ref) => ref.is_approved && ref.status === "ready");
  const hero = approved.find((ref) => ref.view_type === "portrait") ?? approved[0] ?? null;
  const traits = Array.isArray(character.traits) ? (character.traits as string[]) : [];

  return (
    <article className="panel flex flex-col overflow-hidden rounded-sm bg-card">
      <div className="relative aspect-square w-full overflow-hidden bg-secondary">
        {hero?.url ? (
          <img
            src={hero.url}
            alt={`${character.name} character reference`}
            loading="lazy"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="halftone flex h-full w-full items-center justify-center p-4 text-center text-xs text-muted-foreground">
            No reference sheet yet
          </div>
        )}
        {character.is_locked ? (
          <span className="absolute right-2 top-2 rounded-sm bg-primary px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-primary-foreground">
            Locked
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col gap-3 border-t border-border p-4">
        <div>
          <h3 className="font-display text-2xl tracking-wide">{character.name}</h3>
          <p className="text-[10px] uppercase tracking-[0.25em] text-primary">
            {character.role ?? "character"}
            {showProject && character.project ? ` · ${character.project.title}` : ""}
          </p>
        </div>
        {character.appearance ? (
          <p className="line-clamp-3 text-sm text-muted-foreground">{character.appearance}</p>
        ) : null}

        {traits.length ? (
          <ul className="flex flex-wrap gap-2">
            {traits.slice(0, 5).map((trait) => (
              <li
                key={trait}
                className="rounded-sm border border-border px-2 py-1 text-[10px] uppercase tracking-[0.15em] text-muted-foreground"
              >
                {trait}
              </li>
            ))}
          </ul>
        ) : null}

        <div className="flex flex-wrap gap-2 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          {(["front", "side", "portrait", "expressions"] as ReferenceView[]).map((view) => {
            const has = approved.some((ref) => ref.view_type === view);
            return (
              <span
                key={view}
                className={`rounded-sm border px-2 py-1 ${
                  has ? "border-primary/60 text-primary" : "border-border opacity-60"
                }`}
              >
                {VIEW_LABELS[view]}
              </span>
            );
          })}
        </div>

        <Link
          to="/character/$characterId"
          params={{ characterId: character.id }}
          className="mt-auto inline-block rounded-sm border border-primary/60 px-4 py-2 text-center text-[10px] uppercase tracking-[0.2em] text-primary hover:bg-primary hover:text-primary-foreground"
        >
          Open character
        </Link>
      </div>
    </article>
  );
}
