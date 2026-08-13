import { createFileRoute } from "@tanstack/react-router";

const CONTENT_TYPES: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
  mp3: "audio/mpeg",
  wav: "audio/wav",
  mp4: "video/mp4",
};

export const Route = createFileRoute("/api/public/files/$")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const key = decodeURIComponent((params as { _splat?: string })._splat ?? "");
        if (!key) return new Response("Not found", { status: 404 });

        const { getObject } = await import("@/lib/storage.server");
        let bytes: Uint8Array | null = null;
        try {
          bytes = await getObject(key);
        } catch {
          return new Response("Bad request", { status: 400 });
        }
        if (!bytes) return new Response("Not found", { status: 404 });

        const extension = key.split(".").pop()?.toLowerCase() ?? "";
        return new Response(bytes as unknown as BodyInit, {
          headers: {
            "content-type": CONTENT_TYPES[extension] ?? "application/octet-stream",
            "cache-control": "public, max-age=31536000, immutable",
          },
        });
      },
    },
  },
});
