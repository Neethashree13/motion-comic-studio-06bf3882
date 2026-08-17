import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { Emotion, Shot, Transition } from "./motion/types";

/** One playable scene for the browser motion engine. */
export type MotionSceneRecord = {
  sceneId: string;
  sceneNumber: number;
  title: string;
  imageUrl: string | null;
  audioUrl: string | null;
  durationMs: number;
  shots: Shot[];
  emotion: Emotion;
  transition: Transition;
  narration: string | null;
};

export type MotionTimeline = {
  projectId: string;
  projectTitle: string;
  totalMs: number;
  scenes: MotionSceneRecord[];
};

/** Fallback screen time when a scene has no narration clip to time against. */
const DEFAULT_SCENE_MS = 4_200;

export const getMotionTimeline = createServerFn({ method: "POST" })
  .validator((input: unknown) => z.object({ projectId: z.string() }).parse(input))
  .handler(async ({ data }): Promise<MotionTimeline> => {
    const { getDb } = await import("./db.server");
    const { objectUrl } = await import("./storage.server");
    const { collectSceneTimeline } = await import("./narration.server");
    const { normalizeEmotion, normalizeShots, normalizeTransition } = await import("./motion/types");
    const db = getDb();

    const project = await db.project.findUnique({ where: { id: data.projectId } });
    if (!project) throw new Error("Project not found.");

    const [rows, scenes] = await Promise.all([
      collectSceneTimeline(db, project.id),
      db.scene.findMany({
        where: { project_id: project.id },
        orderBy: { scene_number: "asc" },
      }),
    ]);
    const sceneById = new Map(scenes.map((scene) => [scene.id, scene]));

    const motionScenes: MotionSceneRecord[] = rows.map((row) => {
      const scene = sceneById.get(row.sceneId);
      return {
        sceneId: row.sceneId,
        sceneNumber: row.sceneNumber,
        title: row.title,
        imageUrl: objectUrl(row.imageKey),
        audioUrl: objectUrl(row.audioKey),
        durationMs: Math.max(1_500, row.durationMs ?? DEFAULT_SCENE_MS),
        shots: normalizeShots(scene?.shot_list),
        emotion: normalizeEmotion(scene?.emotion),
        transition: normalizeTransition(scene?.transition),
        narration: scene?.narration ?? null,
      };
    });

    return {
      projectId: project.id,
      projectTitle: project.title,
      totalMs: motionScenes.reduce((sum, scene) => sum + scene.durationMs, 0),
      scenes: motionScenes,
    };
  });
