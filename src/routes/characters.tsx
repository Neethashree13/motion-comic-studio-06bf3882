import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { CharacterCard, type CharacterRecord } from "@/components/CharacterCard";
import { listCharacterLibrary } from "@/lib/characters.functions";

export const Route = createFileRoute("/characters")({
  head: () => ({
    meta: [
      { title: "Character library — ComicVerse AI" },
      {
        name: "description",
        content:
          "Every character across your comic projects with appearance traits, lock status and generated reference sheets.",
      },
      { property: "og:title", content: "Character library — ComicVerse AI" },
      { property: "og:description", content: "Search, review and lock your comic cast in one place." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CharacterLibraryPage,
});

function CharacterLibraryPage() {
  const [search, setSearch] = useState("");
  const load = useServerFn(listCharacterLibrary);
  const query = useQuery({
    queryKey: ["character-library"],
    queryFn: () => load({ data: {} }),
  });

  const characters = (query.data ?? []) as unknown as CharacterRecord[];
  const term = search.trim().toLowerCase();
  const filtered = term
    ? characters.filter((character) =>
        [character.name, character.role ?? "", character.appearance ?? "", character.project?.title ?? ""]
          .join(" ")
          .toLowerCase()
          .includes(term),
      )
    : characters;

  const locked = characters.filter((character) => character.is_locked).length;

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-5 py-12">
        <h1 className="text-4xl sm:text-6xl">Character library</h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Every character you have created, with their reference sheets and locked appearance traits.
        </p>

        <div className="mt-6 flex flex-wrap items-center gap-4">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search characters, roles or projects"
            className="w-full max-w-md rounded-sm border border-border bg-background px-4 py-3 text-sm"
          />
          <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            {characters.length} characters · {locked} locked
          </span>
        </div>

        {query.isLoading ? (
          <p className="mt-10 text-sm text-muted-foreground">Loading characters…</p>
        ) : filtered.length === 0 ? (
          <p className="mt-10 text-sm text-muted-foreground">
            {characters.length === 0
              ? "No characters yet — generate a story to create your first cast."
              : "No characters match that search."}
          </p>
        ) : (
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {filtered.map((character) => (
              <CharacterCard key={character.id} character={character} showProject />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
