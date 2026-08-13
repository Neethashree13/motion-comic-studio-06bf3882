import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { GENRES } from "@/lib/comic-options";
import heroImage from "@/assets/hero-comic.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ComicVerse AI — Comic story videos from one idea" },
      {
        name: "description",
        content:
          "Type an idea, pick a genre, and ComicVerse AI writes the script, characters, panels, narration and music for your comic-story video.",
      },
      { property: "og:title", content: "ComicVerse AI — Comic story videos from one idea" },
      {
        property: "og:description",
        content: "Nine genres. Full script, panels, narration and music from a single line of story.",
      },
    ],
  }),
  component: Index,
});

const PIPELINE = [
  { step: "01", title: "Story", body: "Title, characters, outline and ending." },
  { step: "02", title: "Scenes", body: "Beat-by-beat breakdown with panel prompts." },
  { step: "03", title: "Narration", body: "Voice-ready narration and dialogue." },
  { step: "04", title: "Score", body: "Genre-matched royalty-free music cues." },
];

function Index() {
  return (
    <div className="min-h-screen">
      <SiteHeader />

      <main>
        <section className="hero-surface relative overflow-hidden border-b border-border">
          <div className="halftone absolute inset-0 opacity-60" aria-hidden />
          <div className="relative mx-auto grid max-w-6xl gap-10 px-5 py-20 lg:grid-cols-[1.05fr_1fr] lg:items-center lg:py-28">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-primary">
                Motion comics, generated
              </p>
              <h1 className="mt-5 text-6xl leading-[0.92] sm:text-7xl lg:text-8xl">
                One idea in.
                <br />
                <span className="ember-text">A comic story out.</span>
              </h1>
              <p className="mt-6 max-w-lg text-lg text-muted-foreground">
                Describe a haunted mansion, a doomed romance, a heist on Mars. ComicVerse AI
                builds the script, the cast, the panels, the narration and the score.
              </p>
              <Link
                to="/create"
                className="mt-9 inline-block rounded-sm bg-primary px-8 py-4 font-display text-xl tracking-wider text-primary-foreground panel-glow transition-transform hover:-translate-y-0.5"
              >
                Generate my story
              </Link>
            </div>

            <div className="panel overflow-hidden rounded-sm">
              <img
                src={heroImage}
                alt="Comic panels showing a haunted mansion, a ghost in a mirror and a caped figure"
                width={1600}
                height={1008}
                className="h-full w-full object-cover"
              />
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-5 py-20">
          <h2 className="text-4xl">The pipeline</h2>
          <div className="mt-8 grid gap-px overflow-hidden rounded-sm border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
            {PIPELINE.map((item) => (
              <div key={item.step} className="bg-card p-6">
                <span className="font-display text-3xl text-primary">{item.step}</span>
                <h3 className="mt-3 text-2xl">{item.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{item.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="border-y border-border bg-card/40">
          <div className="mx-auto max-w-6xl px-5 py-20">
            <h2 className="text-4xl">Nine genres, nine moods</h2>
            <p className="mt-3 max-w-xl text-muted-foreground">
              Each genre reshapes the palette, the pacing, the narrator and the score.
            </p>
            <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {GENRES.map((genre) => (
                <li key={genre.id} className="panel rounded-sm p-5">
                  <h3 className="text-2xl">{genre.label}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{genre.blurb}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="mx-auto max-w-3xl px-5 py-24 text-center">
          <h2 className="text-5xl">Your first panel is one sentence away</h2>
          <Link
            to="/create"
            className="mt-8 inline-block rounded-sm bg-primary px-8 py-4 font-display text-xl tracking-wider text-primary-foreground panel-glow"
          >
            Start creating
          </Link>
        </section>
      </main>

      <footer className="border-t border-border py-8 text-center text-xs uppercase tracking-[0.25em] text-muted-foreground">
        ComicVerse AI
      </footer>
    </div>
  );
}
