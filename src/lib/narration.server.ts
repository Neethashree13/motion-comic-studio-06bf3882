import type { PrismaClient } from "@/generated/prisma/client";

/** Narration script for a scene: just narration and dialogue, skip title metadata. */
export function buildNarrationText(scene: {
  scene_number: number;
  title: string;
  narration: string | null;
  dialogue: string | null;
}) {
  const parts = [
    scene.narration?.trim() || "",
    scene.dialogue?.trim() || "",
  ].filter(Boolean);
  return parts.join(" ");
}

export function audioKey(projectId: string, sceneId: string, version: number, format: string) {
  return `audio/${projectId}/${sceneId}-v${version}.${format}`;
}

export type TimelineEntry = {
  sceneId: string;
  sceneNumber: number;
  title: string;
  imageKey: string | null;
  audioKey: string | null;
  durationMs: number | null;
};

/**
 * Ordered scene timeline pairing the selected image with the selected narration clip.
 * This is the input a future video assembler (Phase C) consumes.
 */
export async function collectSceneTimeline(db: PrismaClient, projectId: string): Promise<TimelineEntry[]> {
  const [scenes, images, audios] = await Promise.all([
    db.scene.findMany({ where: { project_id: projectId }, orderBy: { scene_number: "asc" } }),
    db.generatedImage.findMany({
      where: { project_id: projectId, status: "ready" },
      orderBy: { version: "asc" },
    }),
    db.sceneAudio.findMany({
      where: { project_id: projectId, status: "completed" },
      orderBy: { version: "asc" },
    }),
  ]);

  return scenes.map((scene) => {
    const sceneImages = images.filter((image) => image.scene_id === scene.id);
    const sceneAudios = audios.filter((audio) => audio.scene_id === scene.id);
    const image = sceneImages.find((item) => item.is_selected) ?? sceneImages[sceneImages.length - 1] ?? null;
    const audio = sceneAudios.find((item) => item.is_selected) ?? sceneAudios[sceneAudios.length - 1] ?? null;

    return {
      sceneId: scene.id,
      sceneNumber: scene.scene_number,
      title: scene.title,
      imageKey: image?.image_url ?? null,
      audioKey: audio?.audio_url ?? null,
      durationMs: audio?.duration_ms ?? null,
    };
  });
}
