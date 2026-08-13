import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/** Phase C — comic-to-video server functions. Same status pattern as images/narration. */
export type VideoRenderRecord = {
  id: string;
  project_id: string;
  status: string;
  progress: number;
  error_message: string | null;
  duration_ms: number | null;
  created_at: string;
  updated_at: string;
  url: string | null;
};

export type ProjectVideoState = {
  video: VideoRenderRecord | null;
  readyScenes: number;
  totalScenes: number;
  issues: { sceneNumber: number; title: string; missing: string[] }[];
};

function toRecord(
  row: {
    id: string;
    project_id: string;
    status: string;
    progress: number;
    error_message: string | null;
    duration_ms: number | null;
    created_at: Date;
    updated_at: Date;
    video_url: string | null;
  },
  url: string | null,
): VideoRenderRecord {
  return {
    id: row.id,
    project_id: row.project_id,
    status: row.status,
    progress: row.progress,
    error_message: row.error_message,
    duration_ms: row.duration_ms,
    created_at: row.created_at.toISOString(),
    updated_at: row.updated_at.toISOString(),
    url,
  };
}

export const getProjectVideo = createServerFn({ method: "POST" })
  .validator((input: unknown) => z.object({ projectId: z.string() }).parse(input))
  .handler(async ({ data }): Promise<ProjectVideoState> => {
    const { getDb } = await import("./db.server");
    const { objectUrl } = await import("./storage.server");
    const { buildProjectTimeline } = await import("./video/timeline.server");
    const db = getDb();

    const [row, timeline, totalScenes] = await Promise.all([
      db.videoRender.findFirst({
        where: { project_id: data.projectId },
        orderBy: { created_at: "desc" },
      }),
      buildProjectTimeline(db, data.projectId),
      db.scene.count({ where: { project_id: data.projectId } }),
    ]);

    return {
      video: row ? toRecord(row, objectUrl(row.video_url)) : null,
      readyScenes: timeline.entries.length,
      totalScenes,
      issues: timeline.issues.map((issue) => ({
        sceneNumber: issue.sceneNumber,
        title: issue.title,
        missing: issue.missing,
      })),
    };
  });

export const generateProjectVideo = createServerFn({ method: "POST" })
  .validator((input: unknown) => z.object({ projectId: z.string() }).parse(input))
  .handler(async ({ data }): Promise<VideoRenderRecord> => {
    const { getDb } = await import("./db.server");
    const { getObject, objectUrl, putObject } = await import("./storage.server");
    const { buildProjectTimeline, videoKey } = await import("./video/timeline.server");
    const { renderTimeline } = await import("./video/render.server");
    const db = getDb();

    const project = await db.project.findUnique({ where: { id: data.projectId } });
    if (!project) throw new Error("Project not found.");

    // One active render row per project: reuse the latest, otherwise create it.
    const existing = await db.videoRender.findFirst({
      where: { project_id: data.projectId },
      orderBy: { created_at: "desc" },
    });
    if (existing?.status === "processing") {
      return toRecord(existing, objectUrl(existing.video_url));
    }

    const row = existing
      ? await db.videoRender.update({
          where: { id: existing.id },
          data: { status: "processing", progress: 0, error_message: null },
        })
      : await db.videoRender.create({
          data: { project_id: data.projectId, status: "processing", progress: 0 },
        });

    try {
      const { entries, issues } = await buildProjectTimeline(db, data.projectId);
      if (entries.length === 0) {
        throw new Error(
          issues.length > 0
            ? "Every scene still needs both a generated image and narration audio before a video can be rendered."
            : "This project has no scenes yet.",
        );
      }

      const result = await renderTimeline(entries, getObject, async ({ done, total }) => {
        // Rendering is 90% of the job; upload/finalise is the last 10%.
        const progress = Math.round((done / total) * 90);
        await db.videoRender.update({ where: { id: row.id }, data: { progress } });
      });

      const key = videoKey(data.projectId);
      await putObject(key, result.bytes);

      const updated = await db.videoRender.update({
        where: { id: row.id },
        data: {
          status: "completed",
          progress: 100,
          video_url: key,
          duration_ms: result.durationMs,
          error_message: null,
        },
      });
      return toRecord(updated, objectUrl(updated.video_url));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Video rendering failed.";
      const failed = await db.videoRender.update({
        where: { id: row.id },
        data: { status: "failed", error_message: message },
      });
      console.error("[video] render failed", { projectId: data.projectId, message });
      return toRecord(failed, objectUrl(failed.video_url));
    }
  });

export const deleteProjectVideo = createServerFn({ method: "POST" })
  .validator((input: unknown) => z.object({ videoId: z.string() }).parse(input))
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const { getDb } = await import("./db.server");
    const { removeObjects } = await import("./storage.server");
    const db = getDb();

    const row = await db.videoRender.findUnique({ where: { id: data.videoId } });
    if (!row) return { ok: true };
    if (row.video_url) await removeObjects([row.video_url]);
    await db.videoRender.delete({ where: { id: row.id } });
    return { ok: true };
  });
