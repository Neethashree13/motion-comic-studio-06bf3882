import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { CharacterCard, type CharacterRecord, type ReferenceImage } from "@/components/CharacterCard";
import { ImageLightbox } from "@/components/ImageLightbox";
import { downloadImage, slugify } from "@/lib/download-image";
import { VIEW_LABELS, REFERENCE_VIEWS, type ReferenceView } from "@/lib/characters.server";
import {
  approveReferenceImage,
  deleteReferenceImage,
  generateCharacterSheet,
  generateReferenceImage,
  listCharacterLibrary,
  setCharacterLock,
  updateCharacter,
} from "@/lib/characters.functions";

export const Route = createFileRoute("/character/$characterId")({
  head: () => ({
    meta: [
      { title: "Character editor — ComicVerse AI" },
      {
        name: "description",
        content:
          "Edit hair, clothing, colours and visual traits, generate front, side, portrait and expression reference sheets, and lock a character's look across every scene.",
      },
      { property: "og:title", content: "Character editor — ComicVerse AI" },
      { property: "og:description", content: "Reference sheets and locked visual traits for consistent comic art." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CharacterEditorPage,
});

const TEXT_FIELDS = [
  ["role", "Role"],
  ["age", "Age"],
  ["hair", "Hair style"],
  ["hair_color", "Hair colour"],
  ["eye_color", "Eye colour"],
  ["clothing", "Clothing"],
  ["accessories", "Accessories"],
  ["colors", "Colour palette"],
] as const;

type Draft = {
  name: string;
  role: string;
  age: string;
  hair: string;
  hair_color: string;
  eye_color: string;
  clothing: string;
  accessories: string;
  colors: string;
  appearance: string;
  personality: string;
  backstory: string;
  traits: string;
};

function toDraft(character: CharacterRecord): Draft {
  return {
    name: character.name,
    role: character.role ?? "",
    age: character.age ?? "",
    hair: character.hair ?? "",
    hair_color: character.hair_color ?? "",
    eye_color: character.eye_color ?? "",
    clothing: character.clothing ?? "",
    accessories: character.accessories ?? "",
    colors: character.colors ?? "",
    appearance: character.appearance ?? "",
    personality: character.personality ?? "",
    backstory: character.backstory ?? "",
    traits: (Array.isArray(character.traits) ? (character.traits as string[]) : []).join(", "),
  };
}

function CharacterEditorPage() {
  const { characterId } = Route.useParams();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busyView, setBusyView] = useState<ReferenceView | "all" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<ReferenceImage | null>(null);

  const load = useServerFn(listCharacterLibrary);
  const save = useServerFn(updateCharacter);
  const lock = useServerFn(setCharacterLock);
  const makeRef = useServerFn(generateReferenceImage);
  const makeSheet = useServerFn(generateCharacterSheet);
  const approve = useServerFn(approveReferenceImage);
  const dropRef = useServerFn(deleteReferenceImage);

  const query = useQuery({
    queryKey: ["character-library"],
    queryFn: () => load({ data: {} }),
  });

  const characters = (query.data ?? []) as unknown as CharacterRecord[];
  const character = characters.find((item) => item.id === characterId) ?? null;

  useEffect(() => {
    if (character && !draft) setDraft(toDraft(character));
  }, [character, draft]);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["character-library"] });

  const saveMutation = useMutation({
    mutationFn: () =>
      save({
        data: {
          characterId,
          fields: {
            name: draft?.name || "Unnamed",
            role: draft?.role || null,
            age: draft?.age || null,
            hair: draft?.hair || null,
            hair_color: draft?.hair_color || null,
            eye_color: draft?.eye_color || null,
            clothing: draft?.clothing || null,
            accessories: draft?.accessories || null,
            colors: draft?.colors || null,
            appearance: draft?.appearance || null,
            personality: draft?.personality || null,
            backstory: draft?.backstory || null,
            traits: (draft?.traits ?? "")
              .split(",")
              .map((value) => value.trim())
              .filter(Boolean),
          },
        },
      }),
    onSuccess: refresh,
  });

  const lockMutation = useMutation({
    mutationFn: (locked: boolean) => lock({ data: { characterId, locked } }),
    onSuccess: refresh,
  });
  const approveMutation = useMutation({
    mutationFn: (input: { referenceId: string; approved: boolean }) => approve({ data: input }),
    onSuccess: refresh,
  });
  const deleteMutation = useMutation({
    mutationFn: (referenceId: string) => dropRef({ data: { referenceId } }),
    onSuccess: refresh,
  });

  async function runView(view: ReferenceView) {
    setError(null);
    setBusyView(view);
    try {
      await makeRef({ data: { characterId, view } });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reference generation failed.");
    } finally {
      setBusyView(null);
      await refresh();
    }
  }

  async function runSheet() {
    setError(null);
    setBusyView("all");
    try {
      const result = await makeSheet({ data: { characterId } });
      const failed = result.results.filter((entry) => !entry.ok);
      if (failed.length) setError(`${failed.length} view(s) failed: ${failed[0]?.error ?? ""}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Character sheet generation failed.");
    } finally {
      setBusyView(null);
      await refresh();
    }
  }

  if (query.isLoading || !draft) {
    return (
      <div className="min-h-screen">
        <SiteHeader />
        <p className="mx-auto max-w-6xl px-5 py-16 text-sm text-muted-foreground">Loading character…</p>
      </div>
    );
  }

  if (!character) {
    return (
      <div className="min-h-screen">
        <SiteHeader />
        <p className="mx-auto max-w-6xl px-5 py-16 text-sm text-destructive">This character could not be found.</p>
      </div>
    );
  }

  const cast = characters.filter(
    (item) => item.project_id === character.project_id && item.id !== character.id,
  );

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-5 py-12">
        <Link
          to="/project/$projectId"
          params={{ projectId: character.project_id }}
          className="text-[10px] uppercase tracking-[0.3em] text-primary"
        >
          ← Back to project
        </Link>
        <h1 className="mt-3 text-4xl sm:text-6xl">{character.name}</h1>
        <p className="mt-2 text-muted-foreground">
          {character.role ?? "character"}
          {character.project ? ` · ${character.project.title} · ${character.project.art_style}` : ""}
        </p>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => lockMutation.mutate(!character.is_locked)}
            className={`rounded-sm px-5 py-3 text-xs uppercase tracking-[0.2em] ${
              character.is_locked
                ? "bg-primary text-primary-foreground"
                : "border border-border text-muted-foreground hover:border-primary hover:text-primary"
            }`}
          >
            {character.is_locked ? "Appearance locked" : "Lock appearance"}
          </button>
          <p className="max-w-md text-xs text-muted-foreground">
            When locked, approved reference art is attached to every future scene image so the face, hair,
            clothing and colours carry over.
          </p>
        </div>

        {error ? <p className="mt-4 text-sm text-destructive">{error}</p> : null}

        <section className="mt-12 grid gap-8 lg:grid-cols-[1fr_1.1fr]">
          <div className="panel rounded-sm bg-card p-6">
            <h2 className="text-3xl">Character editor</h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="sm:col-span-2 block text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Name
                <input
                  value={draft.name}
                  onChange={(event) => setDraft({ ...draft, name: event.target.value })}
                  className="mt-2 w-full rounded-sm border border-border bg-background px-3 py-2 text-sm normal-case tracking-normal text-foreground"
                />
              </label>
              {TEXT_FIELDS.map(([key, label]) => (
                <label key={key} className="block text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  {label}
                  <input
                    value={draft[key]}
                    onChange={(event) => setDraft({ ...draft, [key]: event.target.value })}
                    className="mt-2 w-full rounded-sm border border-border bg-background px-3 py-2 text-sm normal-case tracking-normal text-foreground"
                  />
                </label>
              ))}
              {(
                [
                  ["appearance", "Appearance"],
                  ["personality", "Personality"],
                  ["backstory", "Backstory"],
                  ["traits", "Visual traits (comma separated)"],
                ] as const
              ).map(([key, label]) => (
                <label
                  key={key}
                  className="sm:col-span-2 block text-xs uppercase tracking-[0.2em] text-muted-foreground"
                >
                  {label}
                  <textarea
                    value={draft[key]}
                    rows={key === "backstory" ? 4 : 3}
                    onChange={(event) => setDraft({ ...draft, [key]: event.target.value })}
                    className="mt-2 w-full rounded-sm border border-border bg-background px-3 py-2 text-sm normal-case tracking-normal text-foreground"
                  />
                </label>
              ))}
            </div>
            <div className="mt-5 flex flex-wrap items-center gap-4">
              <button
                type="button"
                disabled={saveMutation.isPending}
                onClick={() => saveMutation.mutate()}
                className="rounded-sm bg-primary px-6 py-3 font-display text-lg tracking-wider text-primary-foreground disabled:opacity-40"
              >
                {saveMutation.isPending ? "Saving…" : "Save character"}
              </button>
              <button
                type="button"
                onClick={() => setDraft(toDraft(character))}
                className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground hover:text-primary"
              >
                Reset
              </button>
              {saveMutation.isError ? (
                <span className="text-sm text-destructive">{saveMutation.error.message}</span>
              ) : null}
            </div>
          </div>

          <div>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 className="text-3xl">Reference sheet</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Front, side, portrait and expression views. The approved image of each view defines the
                  character's identity in scene art.
                </p>
              </div>
              <button
                type="button"
                disabled={busyView !== null}
                onClick={() => void runSheet()}
                className="rounded-sm border border-primary/60 px-5 py-3 text-xs uppercase tracking-[0.2em] text-primary disabled:opacity-40"
              >
                {busyView === "all"
                  ? "Drawing sheet…"
                  : character.references.length
                    ? "Regenerate sheet"
                    : "Generate sheet"}
              </button>
            </div>

            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              {REFERENCE_VIEWS.map((view) => {
                const versions = character.references
                  .filter((ref) => ref.view_type === view)
                  .sort((a, b) => a.version - b.version);
                const active = versions.find((ref) => ref.is_approved) ?? versions[versions.length - 1] ?? null;
                const busy = busyView === view || busyView === "all";
                return (
                  <article key={view} className="panel flex flex-col overflow-hidden rounded-sm bg-card">
                    <div className="relative aspect-square w-full bg-secondary">
                      {active?.url && active.status === "ready" ? (
                        <button
                          type="button"
                          onClick={() => setLightbox(active)}
                          className="h-full w-full"
                          aria-label={`View ${VIEW_LABELS[view]} full screen`}
                        >
                          <img
                            src={active.url}
                            alt={`${character.name} — ${VIEW_LABELS[view]}`}
                            loading="lazy"
                            className="h-full w-full object-cover"
                          />
                        </button>
                      ) : (
                        <div className="halftone flex h-full w-full items-center justify-center p-4 text-center text-xs text-muted-foreground">
                          {busy
                            ? "Drawing…"
                            : active?.status === "failed"
                              ? (active.error_message ?? "Generation failed.")
                              : "Not generated yet"}
                        </div>
                      )}
                      {active?.is_approved ? (
                        <span className="absolute right-2 top-2 rounded-sm bg-primary px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-primary-foreground">
                          Approved
                        </span>
                      ) : null}
                    </div>
                    <div className="flex flex-1 flex-col gap-3 border-t border-border p-4">
                      <h3 className="text-xl">{VIEW_LABELS[view]}</h3>
                      {versions.length > 1 ? (
                        <div className="flex flex-wrap gap-2">
                          {versions.map((ref) => (
                            <button
                              key={ref.id}
                              type="button"
                              onClick={() =>
                                approveMutation.mutate({ referenceId: ref.id, approved: true })
                              }
                              className={`h-10 w-10 overflow-hidden rounded-sm border ${
                                ref.is_approved ? "border-primary" : "border-border opacity-70"
                              }`}
                              title={`Version ${ref.version}`}
                            >
                              {ref.url ? (
                                <img src={ref.url} alt={`v${ref.version}`} className="h-full w-full object-cover" />
                              ) : (
                                <span className="text-[10px]">v{ref.version}</span>
                              )}
                            </button>
                          ))}
                        </div>
                      ) : null}
                      <div className="mt-auto flex flex-wrap gap-x-4 gap-y-2 text-[10px] uppercase tracking-[0.2em]">
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void runView(view)}
                          className="text-primary disabled:opacity-40"
                        >
                          {busy ? "Generating…" : active ? "Regenerate" : "Generate"}
                        </button>
                        {active?.url ? (
                          <>
                            <button
                              type="button"
                              onClick={() =>
                                void downloadImage(
                                  active.url as string,
                                  `${slugify(character.name) || "character"}-${view}-v${active.version}.png`,
                                )
                              }
                              className="text-muted-foreground hover:text-primary"
                            >
                              Download
                            </button>
                            {!active.is_approved ? (
                              <button
                                type="button"
                                onClick={() =>
                                  approveMutation.mutate({ referenceId: active.id, approved: true })
                                }
                                className="text-muted-foreground hover:text-primary"
                              >
                                Approve
                              </button>
                            ) : null}
                            <button
                              type="button"
                              onClick={() => deleteMutation.mutate(active.id)}
                              className="text-muted-foreground hover:text-destructive"
                            >
                              Delete
                            </button>
                          </>
                        ) : null}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        {cast.length ? (
          <section className="mt-14">
            <h2 className="text-3xl">Rest of the cast</h2>
            <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {cast.map((item) => (
                <CharacterCard key={item.id} character={item} />
              ))}
            </div>
          </section>
        ) : null}
      </main>

      {lightbox?.url ? (
        <ImageLightbox
          url={lightbox.url}
          title={`${character.name} — ${VIEW_LABELS[lightbox.view_type]} v${lightbox.version}`}
          narration={lightbox.image_prompt}
          dialogue={null}
          onClose={() => setLightbox(null)}
        />
      ) : null}
    </div>
  );
}
