import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type SceneAudioRecord = {
  id: string;
  project_id: string;
  scene_id: string;
  narration_text: string;
  voice: string;
  provider: string;
  format: string;
  duration_ms: number | null;
  version: number;
  status: string;
  error_message: string | null;
  is_selected: boolean;
  created_at: string;
  url: string | null;
};

export const listSceneAudio = createServerFn({ method: "POST" })
  .validator((input: unknown) => z.object({ projectId: z.string() }).parse(input))
  .handler(async ({ data }): Promise<SceneAudioRecord[]> => {
    const { getDb } = await import("./db.server");
    const { objectUrl } = await import("./storage.server");

    const rows = await getDb().sceneAudio.findMany({
      where: { project_id: data.projectId },
      orderBy: { created_at: "asc" },
    });

    return rows.map((row) => ({
      id: row.id,
      project_id: row.project_id,
      scene_id: row.scene_id,
      narration_text: row.narration_text,
      voice: row.voice,
      provider: row.provider,
      format: row.format,
      duration_ms: row.duration_ms,
      version: row.version,
      status: row.status,
      error_message: row.error_message,
      is_selected: row.is_selected,
      created_at: row.created_at.toISOString(),
      url: objectUrl(row.audio_url),
    }));
  });

export const generateSceneNarration = createServerFn({ method: "POST" })
  .validator((input: unknown) =>
    z
      .object({
        sceneId: z.string(),
        voice: z.string().optional(),
        regenerate: z.boolean().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }): Promise<{ audioId: string; status: string; url: string | null }> => {
    const { getDb } = await import("./db.server");
    const { objectUrl, putObject, removeObjects } = await import("./storage.server");
    const { audioKey, buildNarrationText } = await import("./narration.server");
    const { getTtsProvider } = await import("./tts/index.server");
    const { EMOTION_VOICE_STYLE, normalizeEmotion } = await import("./motion/types");
    const db = getDb();

    const scene = await db.scene.findUnique({ where: { id: data.sceneId } });
    if (!scene) throw new Error("Scene not found.");

    const narrationText = buildNarrationText(scene);
    if (!narrationText.trim()) throw new Error("This scene has no narration text to speak.");

    // Emotional narration: the scene's directed emotion steers delivery.
    const emotion = normalizeEmotion(scene.emotion);
    const instructions = EMOTION_VOICE_STYLE[emotion];

    const latest = await db.sceneAudio.findFirst({
      where: { scene_id: scene.id },
      orderBy: { version: "desc" },
    });

    // Reuse a finished clip unless the caller explicitly asked to regenerate,
    // or the scene's emotion changed since that clip was produced.
    if (
      !data.regenerate &&
      latest?.status === "completed" &&
      latest.audio_url &&
      latest.style === emotion
    ) {
      return { audioId: latest.id, status: latest.status, url: objectUrl(latest.audio_url) };
    }

    const provider = getTtsProvider();
    const version = (latest?.version ?? 0) + 1;
    const voice = data.voice ?? latest?.voice ?? provider.defaultVoice;

    const row = await db.sceneAudio.create({
      data: {
        project_id: scene.project_id,
        scene_id: scene.id,
        narration_text: narrationText,
        voice,
        provider: provider.id,
        version,
        status: "generating",
        style: emotion,
        enhanced_text: narrationText,
      },
    });

    try {
      const result = await provider.synthesize({ text: narrationText, voice, instructions });

      const key = audioKey(scene.project_id, scene.id, version, result.format);
      await putObject(key, result.bytes);

      // Only one clip per scene is active at a time.
      await db.sceneAudio.updateMany({
        where: { scene_id: scene.id, id: { not: row.id } },
        data: { is_selected: false },
      });

      const updated = await db.sceneAudio.update({
        where: { id: row.id },
        data: {
          status: "completed",
          audio_url: key,
          format: result.format,
          voice: result.voice,
          provider: result.provider,
          duration_ms: result.durationMs ?? null,
          is_selected: true,
          style: emotion,
          enhanced_text: narrationText,
          error_message: null,
        },
      });


      // Old versions are superseded; free their bytes.
      const stale = await db.sceneAudio.findMany({
        where: { scene_id: scene.id, id: { not: row.id }, audio_url: { not: null } },
        select: { id: true, audio_url: true },
      });
      if (stale.length > 0) {
        await removeObjects(stale.map((item) => item.audio_url as string));
        await db.sceneAudio.deleteMany({ where: { id: { in: stale.map((item) => item.id) } } });
      }

      return { audioId: updated.id, status: updated.status, url: objectUrl(updated.audio_url) };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Narration failed.";
      await db.sceneAudio.update({
        where: { id: row.id },
        data: { status: "failed", error_message: message },
      });
      throw new Error(message);
    }
  });

export const deleteSceneAudio = createServerFn({ method: "POST" })
  .validator((input: unknown) => z.object({ audioId: z.string() }).parse(input))
  .handler(async ({ data }) => {
    const { getDb } = await import("./db.server");
    const { removeObjects } = await import("./storage.server");
    const db = getDb();

    const row = await db.sceneAudio.findUnique({ where: { id: data.audioId } });
    if (!row) return { ok: true };
    if (row.audio_url) await removeObjects([row.audio_url]);
    await db.sceneAudio.delete({ where: { id: row.id } });
    return { ok: true };
  });

/** Ordered image + audio pairing per scene — the input for future video assembly. */
export const getSceneTimeline = createServerFn({ method: "POST" })
  .validator((input: unknown) => z.object({ projectId: z.string() }).parse(input))
  .handler(async ({ data }) => {
    const { getDb } = await import("./db.server");
    const { collectSceneTimeline } = await import("./narration.server");
    return collectSceneTimeline(getDb(), data.projectId);
  });
