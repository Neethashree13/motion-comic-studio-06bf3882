import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { MotionStudio } from "@/components/MotionStudio";

export const Route = createFileRoute("/motion/$projectId")({
  head: () => ({
    meta: [
      { title: "Motion Studio — Animate your comic" },
      {
        name: "description",
        content:
          "Direct camera moves, emotions and transitions on your comic panels, preview the motion comic live and export it as video.",
      },
      { property: "og:title", content: "Motion Studio — Animate your comic" },
      {
        property: "og:description",
        content:
          "Direct camera moves, emotions and transitions on your comic panels, preview live and export video.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MotionStudioPage,
});

function MotionStudioPage() {
  const { projectId } = Route.useParams();

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-5 py-12">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-4xl sm:text-5xl">Motion Studio</h1>
          <Link
            to="/project/$projectId"
            params={{ projectId }}
            className="rounded-sm border border-border px-5 py-3 text-xs uppercase tracking-[0.2em] hover:border-primary hover:text-primary"
          >
            Back to project
          </Link>
        </div>
        <div className="mt-10">
          <MotionStudio projectId={projectId} />
        </div>
      </main>
    </div>
  );
}
