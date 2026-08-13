import { Link } from "@tanstack/react-router";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-border/70 bg-background/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-4">
        <Link to="/" className="flex items-baseline gap-2">
          <span className="font-display text-2xl tracking-wide">COMICVERSE</span>
          <span className="ember-text font-display text-2xl">AI</span>
        </Link>
        <nav className="flex items-center gap-4 text-xs font-semibold uppercase tracking-[0.18em]">
          <Link to="/dashboard" className="text-muted-foreground hover:text-primary">
            Projects
          </Link>
          <Link to="/characters" className="text-muted-foreground hover:text-primary">
            Characters
          </Link>
          <Link
            to="/create"
            className="rounded-sm border border-primary/50 px-4 py-2 text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
          >
            Start a story
          </Link>
        </nav>
      </div>
    </header>
  );
}
