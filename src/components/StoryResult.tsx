import type { GeneratedStory } from "@/lib/story.functions";

export function StoryResult({ story }: { story: GeneratedStory }) {
  return (
    <section className="mt-16 animate-fade-in">
      <p className="text-xs font-semibold uppercase tracking-[0.35em] text-primary">Step 3</p>
      <h2 className="mt-3 text-5xl">{story.title}</h2>
      <p className="mt-3 text-lg text-muted-foreground">{story.logline}</p>

      <h3 className="mt-12 text-3xl">Characters</h3>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {story.characters.map((character) => (
          <article key={character.name} className="panel rounded-sm p-5">
            <h4 className="font-display text-2xl tracking-wide">{character.name}</h4>
            <p className="text-xs uppercase tracking-[0.2em] text-primary">{character.role}</p>
            <p className="mt-2 text-sm text-muted-foreground">{character.appearance}</p>
          </article>
        ))}
      </div>

      <h3 className="mt-12 text-3xl">Outline</h3>
      <ol className="mt-4 space-y-2">
        {story.outline.map((beat, index) => (
          <li key={index} className="flex gap-3 text-sm text-muted-foreground">
            <span className="font-display text-lg text-primary">{index + 1}</span>
            <span>{beat}</span>
          </li>
        ))}
      </ol>

      <h3 className="mt-12 text-3xl">Scene breakdown</h3>
      <div className="mt-4 space-y-4">
        {story.scenes.map((scene, index) => (
          <article key={index} className="panel rounded-sm p-6">
            <header className="flex items-baseline gap-3">
              <span className="font-display text-3xl text-primary">
                {String(index + 1).padStart(2, "0")}
              </span>
              <h4 className="font-display text-2xl tracking-wide">{scene.title}</h4>
            </header>
            <dl className="mt-4 space-y-3 text-sm">
              <Row term="Panel prompt" value={scene.panelPrompt} />
              <Row term="Narration" value={scene.narration} />
              <Row term="Dialogue" value={scene.dialogue} />
              <Row term="Music" value={scene.music} />
            </dl>
          </article>
        ))}
      </div>

      <h3 className="mt-12 text-3xl">Ending</h3>
      <p className="mt-3 text-muted-foreground">{story.ending}</p>
    </section>
  );
}

function Row({ term, value }: { term: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{term}</dt>
      <dd className="mt-1">{value}</dd>
    </div>
  );
}
