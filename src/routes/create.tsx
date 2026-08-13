import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { OptionGrid } from "@/components/OptionGrid";
import { StoryResult } from "@/components/StoryResult";
import { ART_STYLES, DURATIONS, GENRES, LENGTHS, VOICES } from "@/lib/comic-options";
import { generateStory, type GeneratedStory } from "@/lib/story.functions";
import { saveProject } from "@/lib/projects.functions";


export const Route = createFileRoute("/create")({
  head: () => ({
    meta: [
      { title: "Create a comic story — ComicVerse AI" },
      {
        name: "description",
        content:
          "Enter your idea, choose genre, length, art style, duration and narrator voice, then generate a full comic-story treatment.",
      },
      { property: "og:title", content: "Create a comic story — ComicVerse AI" },
      {
        property: "og:description",
        content: "Idea in, script and scene breakdown out. Nine genres, four narrator voices.",
      },
    ],
  }),
  component: CreatePage,
});

const EXAMPLE = "A haunted mansion where a girl discovers ghosts living inside mirrors.";

function CreatePage() {
  const [idea, setIdea] = useState("");
  const [genre, setGenre] = useState<string>("horror");
  const [length, setLength] = useState<string>("medium");
  const [artStyle, setArtStyle] = useState<string>("inked-noir");
  const [duration, setDuration] = useState<string>("60s");
  const [voice, setVoice] = useState<string>("horror");

  const navigate = useNavigate();
  const run = useServerFn(generateStory);
  const persist = useServerFn(saveProject);
  const mutation = useMutation<GeneratedStory, Error>({
    mutationFn: () => run({ data: { idea, genre, length, artStyle, duration, voice } }),
    onSuccess: (data) => {
      console.log("✅ Story mutation succeeded:", data);
      console.log("📊 Data keys:", Object.keys(data));
    },
    onError: (error) => {
      console.error("❌ Story mutation error:", error);
    },
  });

  const saveMutation = useMutation<{ projectId: string }, Error, GeneratedStory>({
    mutationFn: async (story) => {
      return persist({
        data: {
          idea,
          genre,
          length,
          artStyle,
          duration,
          voice,
          story: {
            title: story.title,
            logline: story.logline,
            ending: story.ending,
            characters: story.characters,
            scenes: story.scenes,
          },
        },
      });
    },
    onSuccess: ({ projectId }) => navigate({ to: "/project/$projectId", params: { projectId } }),
  });

  const canSubmit = idea.trim().length > 8 && !mutation.isPending;


  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-5 py-14">
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-primary">Step 1</p>
        <h1 className="mt-3 text-5xl">Your story idea</h1>

        <textarea
          value={idea}
          onChange={(event) => setIdea(event.target.value)}
          rows={3}
          placeholder={EXAMPLE}
          className="panel mt-6 w-full resize-none rounded-sm bg-card p-5 text-lg outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
        />
        <button
          type="button"
          onClick={() => setIdea(EXAMPLE)}
          className="mt-3 text-xs uppercase tracking-[0.2em] text-muted-foreground underline-offset-4 hover:text-primary hover:underline"
        >
          Use the example
        </button>

        <p className="mt-14 text-xs font-semibold uppercase tracking-[0.35em] text-primary">Step 2</p>
        <h2 className="mt-3 text-4xl">Set the mood</h2>

        <div className="mt-8 space-y-8">
          <OptionGrid label="Genre" options={GENRES} value={genre} onChange={setGenre} columns={3} />
          <OptionGrid label="Story length" options={LENGTHS} value={length} onChange={setLength} columns={3} />
          <OptionGrid label="Art style" options={ART_STYLES} value={artStyle} onChange={setArtStyle} columns={2} />
          <OptionGrid label="Video duration" options={DURATIONS} value={duration} onChange={setDuration} columns={3} />
          <OptionGrid label="Narrator voice" options={VOICES} value={voice} onChange={setVoice} columns={2} />
        </div>

        <button
          type="button"
          disabled={!canSubmit}
          onClick={() => mutation.mutate()}
          className="mt-12 w-full rounded-sm bg-primary px-8 py-5 font-display text-2xl tracking-wider text-primary-foreground panel-glow transition-opacity disabled:opacity-40"
        >
          {mutation.isPending ? "Writing your comic…" : "Generate story"}
        </button>

        {mutation.isError ? (
          <p className="mt-4 rounded-sm border border-destructive/60 bg-destructive/10 p-4 text-sm text-destructive-foreground">
            {mutation.error.message}
          </p>
        ) : null}

        {mutation.data ? (
          <>
            <div style={{ padding: "20px", backgroundColor: "#f0f0f0", marginTop: "20px", borderRadius: "5px", color: "#000" }}>
              <p>DEBUG: Story loaded successfully</p>
              <p>mutation.isPending: {String(mutation.isPending)}</p>
              <p>mutation.data exists: {String(!!mutation.data)}</p>
              <p>Story title: {mutation.data?.title}</p>
            </div>
            <button
              type="button"
              disabled={saveMutation.isPending}
              onClick={() => saveMutation.mutate(mutation.data)}
              className="mt-8 w-full rounded-sm border border-primary/60 px-8 py-4 font-display text-xl tracking-wider text-primary transition-colors hover:bg-primary hover:text-primary-foreground disabled:opacity-40"
            >
              {saveMutation.isPending ? "Saving project…" : "Save project & board the panels"}
            </button>
            {saveMutation.isError ? (
              <p className="mt-3 text-sm text-destructive">{saveMutation.error.message}</p>
            ) : null}
            <StoryResult story={mutation.data} />
          </>
        ) : null}

      </main>
    </div>
  );
}
