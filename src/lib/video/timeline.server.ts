import type { PrismaClient } from "@/generated/prisma/client";
import { collectSceneTimeline } from "../narration.server";

/**
 * Phase C timeline entry — one renderable segment of the final video.
 * `imagePath` / `audioPath` are storage keys understood by storage.server.ts,
 * never absolute filesystem paths, so the renderer stays storage-agnostic.
 */
export type VideoTimelineEntry = {
  sceneId: string;
  sceneNumber: number;
  title: string;
  imagePath: string;
  audioPath: string;
  durationMs: number | null;
  /** Phase D hook: the exact narration script for this segment. */
  narrationText: string | null;
};

export type TimelineIssue = {
  sceneNumber: number;
  title: string;
  missing: ("image" | "narration")[];
};

export type TimelineResult = {
  entries: VideoTimelineEntry[];
  issues: TimelineIssue[];
};

/**
 * Ordered, render-ready timeline for a project.
 * Reuses collectSceneTimeline() from Phase B (selected GeneratedImage + selected
 * SceneAudio per scene) and reports scenes that cannot be rendered yet.
 */
export async function buildProjectTimeline(
  db: PrismaClient,
  projectId: string,
): Promise<TimelineResult> {
  const [rows, scenes] = await Promise.all([
    collectSceneTimeline(db, projectId),
    db.scene.findMany({
      where: { project_id: projectId },
      orderBy: { scene_number: "asc" },
      select: { id: true, narration: true },
    }),
  ]);
  const narrationById = new Map(scenes.map((scene) => [scene.id, scene.narration]));

  const entries: VideoTimelineEntry[] = [];
  const issues: TimelineIssue[] = [];

  for (const row of rows) {
    const missing: ("image" | "narration")[] = [];
    if (!row.imageKey) missing.push("image");
    if (!row.audioKey) missing.push("narration");

    if (missing.length > 0 || !row.imageKey || !row.audioKey) {
      issues.push({ sceneNumber: row.sceneNumber, title: row.title, missing });
      continue;
    }

    entries.push({
      sceneId: row.sceneId,
      sceneNumber: row.sceneNumber,
      title: row.title,
      imagePath: row.imageKey,
      audioPath: row.audioKey,
      durationMs: row.durationMs,
      narrationText: narrationById.get(row.sceneId) ?? null,
    });
  }

  return { entries, issues };
}

/** Storage key for a project's rendered video. Served by /api/public/files/$. */
export function videoKey(projectId: string) {
  return `video/${projectId}/final.mp4`;
}
