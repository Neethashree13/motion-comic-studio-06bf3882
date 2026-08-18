import type { PrismaClient } from "@/generated/prisma/client";

/** Storage key of the panel image an animation should be generated from. */
export async function selectedSceneImageKey(db: PrismaClient, sceneId: string) {
  const images = await db.generatedImage.findMany({
    where: { scene_id: sceneId, status: "ready" },
    orderBy: { version: "asc" },
  });
  const image = images.find((item) => item.is_selected) ?? images[images.length - 1] ?? null;
  return image?.image_url ?? null;
}

export type SceneClipRow = {
  id: string;
  scene_id: string;
  scene_number: number;
  title: string;
  status: string;
  progress: number;
  error_message: string | null;
  duration_ms: number | null;
  videoKey: string | null;
  has_image: boolean;
};

/** One row per scene: the selected (or most recent) animated clip, if any. */
export async function listSceneClips(
  db: PrismaClient,
  projectId: string,
): Promise<SceneClipRow[]> {
  const [scenes, clips, images] = await Promise.all([
    db.scene.findMany({ where: { project_id: projectId }, orderBy: { scene_number: "asc" } }),
    db.sceneClip.findMany({ where: { project_id: projectId }, orderBy: { created_at: "asc" } }),
    db.generatedImage.findMany({
      where: { project_id: projectId, status: "ready" },
      select: { scene_id: true },
    }),
  ]);
  const withImage = new Set(images.map((image) => image.scene_id));

  return scenes.map((scene) => {
    const sceneClips = clips.filter((clip) => clip.scene_id === scene.id);
    const active = sceneClips.find((clip) => clip.status === "pending" || clip.status === "generating");
    const clip =
      active ??
      sceneClips.find((item) => item.is_selected && item.status === "completed") ??
      sceneClips[sceneClips.length - 1] ??
      null;

    return {
      id: clip?.id ?? "",
      scene_id: scene.id,
      scene_number: scene.scene_number,
      title: scene.title,
      status: clip?.status ?? "none",
      progress: clip?.progress ?? 0,
      error_message: clip?.error_message ?? null,
      duration_ms: clip?.duration_ms ?? null,
      videoKey: clip?.status === "completed" ? clip.video_url : null,
      has_image: withImage.has(scene.id),
    };
  });
}
