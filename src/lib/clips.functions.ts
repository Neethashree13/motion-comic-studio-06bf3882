import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * Phase G — AI-animated scene clips.
 * Each scene's selected panel image is turned into a short animated shot
 * (real character motion) with Veo, stored locally and played back by the
 * motion engine in place of the static panel.
 */
export type SceneClipRecord = {
  id: string;
  scene_id: string;
  scene_number: number;
  title: string;
  status: string;
  progress: number;
  error_message: string | null;
  duration_ms: number | null;
  url: string | null;
  has_image: boolean;
};

const MIME_BY_EXTENSION: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
};

export const getSceneClips = createServerFn({ method: "POST" })
  .validator((input: unknown) => z.object({ projectId: z.string() }).parse(input))
  .handler(async ({ data }): Promise<SceneClipRecord[]> => {
    const { getDb } = await import("./db.server");
    const { objectUrl } = await import("./storage.server");
    const { listSceneClips } = await import("./clips.server");
    const db = getDb();
    return (await listSceneClips(db, data.projectId)).map((row) => ({
      ...row,
      url: objectUrl(row.videoKey),
    }));
  });

/** Starts one Veo job for a scene. Returns immediately; the client polls. */
export const animateScene = createServerFn({ method: "POST" })
  .validator((input: unknown) =>
    z
      .object({
        sceneId: z.string(),
        seconds: z.enum(["4", "6", "8"]).optional(),
        prompt: z.string().max(2000).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }): Promise<{ clipId: string; status: string }> => {
    const { getDb } = await import("./db.server");
    const { getObject } = await import("./storage.server");
    const { buildClipPrompt, createClipJob, CLIP_MODEL } = await import("./motion/veo.server");
    const { normalizeEmotion, normalizeShots } = await import("./motion/types");
    const { selectedSceneImageKey } = await import("./clips.server");
    const db = getDb();

    const scene = await db.scene.findUnique({ where: { id: data.sceneId } });
    if (!scene) throw new Error("Scene not found.");

    const running = await db.sceneClip.findFirst({
      where: { scene_id: scene.id, status: { in: ["pending", "generating"] } },
    });
    if (running) return { clipId: running.id, status: running.status };

    const project = await db.project.findUnique({ where: { id: scene.project_id } });
    const imageKey = await selectedSceneImageKey(db, scene.id);
    if (!imageKey) throw new Error(`Scene ${scene.scene_number} has no generated image to animate yet.`);
    const imageBytes = await getObject(imageKey);
    if (!imageBytes) throw new Error(`Scene ${scene.scene_number}: the panel image file is missing.`);

    const shots = normalizeShots(scene.shot_list);
    const prompt =
      data.prompt?.trim() ||
      buildClipPrompt({
        title: scene.title,
        narration: scene.narration,
        dialogue: scene.dialogue,
        emotion: normalizeEmotion(scene.emotion),
        shot: shots[0],
        artStyle: project?.art_style ?? null,
      });

    const row = await db.sceneClip.create({
      data: {
        project_id: scene.project_id,
        scene_id: scene.id,
        prompt,
        model: CLIP_MODEL,
        status: "pending",
        progress: 0,
      },
    });

    try {
      const extension = imageKey.split(".").pop()?.toLowerCase() ?? "png";
      const job = await createClipJob({
        prompt,
        imageBytes,
        imageMime: MIME_BY_EXTENSION[extension] ?? "image/png",
        seconds: data.seconds ?? "8",
      });
      const updated = await db.sceneClip.update({
        where: { id: row.id },
        data: { job_id: job.id, status: "generating", progress: job.progress ?? 5 },
      });
      return { clipId: updated.id, status: updated.status };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not start the animation.";
      await db.sceneClip.update({
        where: { id: row.id },
        data: { status: "failed", error_message: message },
      });
      throw new Error(message);
    }
  });

/**
 * Polls every in-flight job for a project. Completed jobs are downloaded and
 * stored immediately (gateway download URLs expire) and marked selected.
 */
export const pollSceneClips = createServerFn({ method: "POST" })
  .validator((input: unknown) => z.object({ projectId: z.string() }).parse(input))
  .handler(async ({ data }): Promise<SceneClipRecord[]> => {
    const { getDb } = await import("./db.server");
    const { objectUrl, putObject } = await import("./storage.server");
    const { downloadClip, getClipJob, clipKey } = await import("./motion/veo.server");
    const { listSceneClips } = await import("./clips.server");
    const db = getDb();

    const pending = await db.sceneClip.findMany({
      where: { project_id: data.projectId, status: { in: ["pending", "generating"] } },
    });

    for (const row of pending) {
      if (!row.job_id) continue;
      try {
        const job = await getClipJob(row.job_id);
        if (job.status === "completed") {
          const bytes = await downloadClip(row.job_id);
          const key = clipKey(row.project_id, row.scene_id, row.job_id);
          await putObject(key, bytes);
          await db.sceneClip.updateMany({
            where: { scene_id: row.scene_id },
            data: { is_selected: false },
          });
          await db.sceneClip.update({
            where: { id: row.id },
            data: { status: "completed", progress: 100, video_url: key, is_selected: true },
          });
        } else if (job.status === "failed") {
          await db.sceneClip.update({
            where: { id: row.id },
            data: {
              status: "failed",
              error_message: job.error?.message ?? "The animation was rejected by the provider.",
            },
          });
        } else if (typeof job.progress === "number" && job.progress !== row.progress) {
          await db.sceneClip.update({ where: { id: row.id }, data: { progress: job.progress } });
        }
      } catch (error) {
        await db.sceneClip.update({
          where: { id: row.id },
          data: {
            status: "failed",
            error_message: error instanceof Error ? error.message : "Animation polling failed.",
          },
        });
      }
    }

    return (await listSceneClips(db, data.projectId)).map((row) => ({
      ...row,
      url: objectUrl(row.videoKey),
    }));
  });

export const deleteSceneClip = createServerFn({ method: "POST" })
  .validator((input: unknown) => z.object({ clipId: z.string() }).parse(input))
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const { getDb } = await import("./db.server");
    const { removeObjects } = await import("./storage.server");
    const db = getDb();
    const row = await db.sceneClip.findUnique({ where: { id: data.clipId } });
    if (!row) return { ok: true };
    if (row.video_url) await removeObjects([row.video_url]);
    await db.sceneClip.delete({ where: { id: row.id } });
    return { ok: true };
  });
