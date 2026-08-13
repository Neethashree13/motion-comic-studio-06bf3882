import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { deleteProject, duplicateProject, listProjects } from "@/lib/projects.functions";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Your comic projects — ComicVerse AI" },
      {
        name: "description",
        content: "Continue, duplicate, search or delete your saved AI comic-story projects.",
      },
      { property: "og:title", content: "Your comic projects — ComicVerse AI" },
      { property: "og:description", content: "Every saved story, scene breakdown and comic panel set." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");

  const load = useServerFn(listProjects);
  const remove = useServerFn(deleteProject);
  const copy = useServerFn(duplicateProject);

  const projects = useQuery({ queryKey: ["projects"], queryFn: () => load() });

  const removeMutation = useMutation({
    mutationFn: (projectId: string) => remove({ data: { projectId } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["projects"] }),
  });
  const copyMutation = useMutation({
    mutationFn: (projectId: string) => copy({ data: { projectId } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["projects"] }),
  });

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const rows = projects.data ?? [];
    if (!term) return rows;
    return rows.filter((project) =>
      [project.title, project.logline, project.genre].join(" ").toLowerCase().includes(term),
    );
  }, [projects.data, search]);

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-5 py-12">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-primary">Studio</p>
            <h1 className="mt-3 text-5xl">Your projects</h1>
          </div>
          <Link
            to="/create"
            className="rounded-sm bg-primary px-6 py-3 font-display text-lg tracking-wider text-primary-foreground"
          >
            New story
          </Link>
        </div>

        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by title, logline or genre"
          className="panel mt-8 w-full rounded-sm bg-card px-5 py-4 text-sm outline-none focus:ring-2 focus:ring-ring"
        />

        {projects.isLoading ? (
          <p className="mt-10 text-sm text-muted-foreground">Loading your projects…</p>
        ) : null}
        {projects.isError ? (
          <p className="mt-10 text-sm text-destructive">Could not load your projects.</p>
        ) : null}

        {projects.data && filtered.length === 0 ? (
          <p className="mt-10 text-sm text-muted-foreground">
            {projects.data.length === 0
              ? "No projects yet — generate your first comic story."
              : "No projects match that search."}
          </p>
        ) : null}

        <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((project) => (
            <article key={project.id} className="panel flex flex-col rounded-sm bg-card p-5">
              <span className="text-[10px] uppercase tracking-[0.3em] text-primary">
                {project.genre} · {project.status}
              </span>
              <h2 className="mt-2 text-2xl leading-tight">{project.title}</h2>
              <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{project.logline}</p>
              <div className="mt-5 flex flex-wrap gap-3 text-[10px] uppercase tracking-[0.2em]">
                <button
                  type="button"
                  onClick={() =>
                    navigate({ to: "/project/$projectId", params: { projectId: project.id } })
                  }
                  className="text-primary"
                >
                  Continue
                </button>
                <button
                  type="button"
                  disabled={copyMutation.isPending}
                  onClick={() => copyMutation.mutate(project.id)}
                  className="text-muted-foreground hover:text-foreground disabled:opacity-40"
                >
                  Duplicate
                </button>
                <button
                  type="button"
                  disabled={removeMutation.isPending}
                  onClick={() => {
                    if (confirm(`Delete "${project.title}"? This cannot be undone.`)) {
                      removeMutation.mutate(project.id);
                    }
                  }}
                  className="text-destructive disabled:opacity-40"
                >
                  Delete
                </button>
              </div>
            </article>
          ))}
        </div>
      </main>
    </div>
  );
}
