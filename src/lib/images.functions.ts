import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const listSceneImages = createServerFn({ method: "POST" })
  .validator((input: unknown) => z.object({ projectId: z.string() }).parse(input))
  .handler(async ({ data }) => {
    const { getDb } = await import("./db.server");
    const { objectUrl } = await import("./storage.server");

    const rows = await getDb().generatedImage.findMany({
      where: { project_id: data.projectId },
      orderBy: { created_at: "asc" },
    });

    return rows.map((row) => ({
      id: row.id,
      project_id: row.project_id,
      scene_id: row.scene_id,
      image_prompt: row.image_prompt,
      version: row.version,
      status: row.status,
      error_message: row.error_message,
      is_selected: row.is_selected,
      created_at: row.created_at.toISOString(),
      url: objectUrl(row.image_url),
    }));
  });

export const generateSceneImage = createServerFn({ method: "POST" })
  .validator((input: unknown) =>
    z.object({ sceneId: z.string(), alternate: z.boolean().optional() }).parse(input),
  )
  .handler(async ({ data }) => {
    const startedAt = Date.now();
    console.info("[scene-image] server function started", { sceneId: data.sceneId, alternate: Boolean(data.alternate) });
    const key = process.env["GEMINI_API_KEY"];
    if (!key) {
      console.warn("[scene-image] Image generation skipped - GEMINI_API_KEY not configured");
      return { ok: true, message: "Image generation disabled. Configure GEMINI_API_KEY to enable." };
    }

    const { getDb } = await import("./db.server");
    const { objectUrl, putObject } = await import("./storage.server");
    const { buildScenePrompt, generateImageBytes, VARIANT_HINTS } = await import("./images.server");
    const { referenceDataUrls } = await import("./reference-images.server");
    const db = getDb();

    const scene = await db.scene.findUnique({ where: { id: data.sceneId } });
    if (!scene) throw new Error("Scene not found.");

    const [project, characters, existing] = await Promise.all([
      db.project.findUnique({ where: { id: scene.project_id } }),
      db.character.findMany({
        where: { project_id: scene.project_id },
        orderBy: { sort_order: "asc" },
      }),
      db.generatedImage.findFirst({
        where: { scene_id: scene.id },
        orderBy: { version: "desc" },
        select: { version: true },
      }),
    ]);

    if (!project) throw new Error("Project not found.");

    const version = (existing?.version ?? 0) + 1;
    const hint = data.alternate && version > 1 ? VARIANT_HINTS[(version - 2) % VARIANT_HINTS.length] : undefined;

    // Approved reference sheets of locked characters condition the model on the exact identity.
    const lockedIds = characters.filter((c) => c.is_locked).map((c) => c.id);
    let referencePaths: string[] = [];
    let referencedNames: string[] = [];
    if (lockedIds.length) {
      const refs = await db.characterReferenceImage.findMany({
        where: { character_id: { in: lockedIds }, is_approved: true, status: "ready" },
        select: { character_id: true, image_url: true, view_type: true },
      });
      const byCharacter = new Map<string, string>();
      const order = ["front", "portrait", "side", "expressions"];
      for (const row of refs) {
        if (!row.image_url) continue;
        const current = byCharacter.get(row.character_id);
        if (!current) {
          byCharacter.set(row.character_id, `${row.view_type}::${row.image_url}`);
          continue;
        }
        const currentRank = order.indexOf(current.split("::")[0]!);
        const nextRank = order.indexOf(row.view_type);
        if (nextRank !== -1 && (currentRank === -1 || nextRank < currentRank)) {
          byCharacter.set(row.character_id, `${row.view_type}::${row.image_url}`);
        }
      }
      referencePaths = [...byCharacter.values()].map((value) => value.split("::").slice(1).join("::"));
      referencedNames = characters.filter((c) => byCharacter.has(c.id)).map((c) => c.name);
    }

    const references = referencePaths.length ? await referenceDataUrls(referencePaths) : [];
    const prompt = buildScenePrompt(project, scene, characters, hint, referencedNames);

    const row = await db.generatedImage.create({
      data: {
        project_id: scene.project_id,
        scene_id: scene.id,
        image_prompt: prompt,
        version,
        status: "queued",
        is_selected: false,
      },
      select: { id: true },
    });
    console.info("[scene-image] database row created", {
      imageId: row.id,
      sceneId: scene.id,
      status: "queued",
      version,
    });

    try {
      await db.generatedImage.update({
        where: { id: row.id },
        data: { status: "generating", error_message: null },
      });
      console.info("[scene-image] database updated", { imageId: row.id, status: "generating" });

      console.info("[scene-image] AI request sent", {
        imageId: row.id,
        sceneId: scene.id,
        referenceCount: references.length,
      });
      const bytes = await generateImageBytes(prompt, key, references);
      console.info("[scene-image] AI response received", {
        imageId: row.id,
        byteLength: bytes.byteLength,
        elapsedMs: Date.now() - startedAt,
      });

      const path = `${scene.project_id}/${scene.id}/v${version}-${Date.now()}.png`;
      await putObject(path, bytes);
      console.info("[scene-image] upload complete", { imageId: row.id, path });

      await db.$transaction([
        db.generatedImage.updateMany({
          where: { scene_id: scene.id, id: { not: row.id } },
          data: { is_selected: false },
        }),
        db.generatedImage.update({
          where: { id: row.id },
          data: { image_url: path, status: "ready", is_selected: true, error_message: null },
        }),
        db.project.update({ where: { id: scene.project_id }, data: { status: "images" } }),
      ]);
      console.info("[scene-image] database updated", {
        imageId: row.id,
        status: "ready",
        path,
        durationMs: Date.now() - startedAt,
      });

      return {
        id: row.id,
        status: "ready" as const,
        path,
        url: objectUrl(path),
        version,
        durationMs: Date.now() - startedAt,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Image generation failed.";
      await db.generatedImage
        .update({ where: { id: row.id }, data: { status: "failed", error_message: message } })
        .catch(() => undefined);
      console.error("[scene-image] generation failed", {
        imageId: row.id,
        sceneId: scene.id,
        message,
        elapsedMs: Date.now() - startedAt,
      });
      // Don't throw - just return failure status so it doesn't block the project
      return {
        id: row.id,
        status: "failed" as const,
        error: message,
        version,
        durationMs: Date.now() - startedAt,
      };
    }
  });

export const selectSceneImage = createServerFn({ method: "POST" })
  .validator((input: unknown) => z.object({ imageId: z.string() }).parse(input))
  .handler(async ({ data }) => {
    const { getDb } = await import("./db.server");
    const db = getDb();

    const target = await db.generatedImage.findUnique({
      where: { id: data.imageId },
      select: { id: true, scene_id: true },
    });
    if (!target) throw new Error("Image not found.");

    await db.$transaction([
      db.generatedImage.updateMany({ where: { scene_id: target.scene_id }, data: { is_selected: false } }),
      db.generatedImage.update({ where: { id: target.id }, data: { is_selected: true } }),
    ]);
    return { ok: true };
  });

/**
 * Generates image for a comic panel from its prompt using Pollinations AI.
 */
export const generatePanelImage = createServerFn({ method: "POST" })
  .validator((input: unknown) => z.object({ panelId: z.string() }).parse(input))
  .handler(async ({ data }) => {
    const startedAt = Date.now();
    console.info("[panel-image] Generating image for panel", { panelId: data.panelId });

    const { getDb } = await import("./db.server");
    const { objectUrl, putObject } = await import("./storage.server");
    const { generateImageBytes } = await import("./images.server");
    const db = getDb();

    try {
      // Fetch panel and project details
      const panel = await db.panel.findUnique({ where: { id: data.panelId } });
      if (!panel) throw new Error("Panel not found.");

      const project = await db.project.findUnique({ where: { id: panel.project_id } });
      if (!project) throw new Error("Project not found.");

      console.log(`[panel-image] 🎨 Generating image: "${panel.image_prompt.substring(0, 50)}..."`);

      // Generate image from prompt
      const imageBytes = await generateImageBytes(panel.image_prompt, "", []);

      // Save to storage
      const storagePath = `panels/${panel.project_id}/${data.panelId}.png`;
      await putObject(storagePath, imageBytes);

      // Update panel with image URL and status
      await db.panel.update({
        where: { id: data.panelId },
        data: {
          image_url: storagePath,
          image_status: "ready",
        },
      });

      console.log(`[panel-image] ✅ Image generated and saved (${imageBytes.length} bytes)`);
      return {
        panelId: data.panelId,
        status: "ready" as const,
        url: objectUrl(storagePath),
        durationMs: Date.now() - startedAt,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Panel image generation failed.";
      console.error("[panel-image] ❌ Generation failed:", message);

      // Mark panel as failed
      await db.panel
        .update({
          where: { id: data.panelId },
          data: { image_status: "failed" },
        })
        .catch(() => undefined);

      return {
        panelId: data.panelId,
        status: "failed" as const,
        error: message,
        durationMs: Date.now() - startedAt,
      };
    }
  });

export const deleteSceneImage = createServerFn({ method: "POST" })
  .validator((input: unknown) => z.object({ imageId: z.string() }).parse(input))
  .handler(async ({ data }) => {
    const { getDb } = await import("./db.server");
    const { removeObjects } = await import("./storage.server");
    const db = getDb();

    const target = await db.generatedImage.findUnique({
      where: { id: data.imageId },
      select: { id: true, image_url: true },
    });
    if (!target) throw new Error("Image not found.");
    if (target.image_url) await removeObjects([target.image_url]);
    await db.generatedImage.delete({ where: { id: target.id } });
    return { ok: true };
  });
