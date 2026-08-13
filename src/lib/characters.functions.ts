import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { ReferenceView } from "./characters.server";

const CharacterFields = z.object({
  name: z.string().min(1),
  role: z.string().nullable().optional(),
  appearance: z.string().nullable().optional(),
  hair: z.string().nullable().optional(),
  hair_color: z.string().nullable().optional(),
  eye_color: z.string().nullable().optional(),
  clothing: z.string().nullable().optional(),
  accessories: z.string().nullable().optional(),
  colors: z.string().nullable().optional(),
  age: z.string().nullable().optional(),
  personality: z.string().nullable().optional(),
  backstory: z.string().nullable().optional(),
  traits: z.array(z.string()).optional(),
});

export const listCharacterLibrary = createServerFn({ method: "POST" })
  .validator((input: unknown) =>
    z.object({ projectId: z.string().optional() }).parse(input ?? {}),
  )
  .handler(async ({ data }) => {
    const { getDb } = await import("./db.server");
    const { objectUrl } = await import("./storage.server");
    const db = getDb();

    const characters = await db.character.findMany({
      ...(data.projectId ? { where: { project_id: data.projectId } } : {}),
      orderBy: { sort_order: "asc" },
      include: {
        project: { select: { id: true, title: true, genre: true, art_style: true } },
        referenceImages: { orderBy: { created_at: "asc" } as const },
      },
    });


    return characters.map(({ referenceImages, project, ...character }) => ({
      ...character,
      project: project ?? null,
      references: referenceImages.map((row) => ({
        id: row.id,
        view_type: row.view_type as ReferenceView,
        version: row.version,
        status: row.status,
        error_message: row.error_message,
        is_approved: row.is_approved,
        image_prompt: row.image_prompt,
        created_at: row.created_at.toISOString(),
        url: objectUrl(row.image_url),
      })),
    }));
  });

export const updateCharacter = createServerFn({ method: "POST" })
  .validator((input: unknown) =>
    z.object({ characterId: z.string(), fields: CharacterFields }).parse(input),
  )
  .handler(async ({ data }) => {
    const { getDb } = await import("./db.server");
    const f = data.fields;
    await getDb().character.update({
      where: { id: data.characterId },
      data: {
        name: f.name,
        role: f.role ?? null,
        appearance: f.appearance ?? null,
        hair: f.hair ?? null,
        hair_color: f.hair_color ?? null,
        eye_color: f.eye_color ?? null,
        clothing: f.clothing ?? null,
        accessories: f.accessories ?? null,
        colors: f.colors ?? null,
        age: f.age ?? null,
        personality: f.personality ?? null,
        backstory: f.backstory ?? null,
        traits: f.traits ?? [],
      },
    });
    return { ok: true };
  });

export const setCharacterLock = createServerFn({ method: "POST" })
  .validator((input: unknown) =>
    z.object({ characterId: z.string(), locked: z.boolean() }).parse(input),
  )
  .handler(async ({ data }) => {
    const { getDb } = await import("./db.server");
    await getDb().character.update({
      where: { id: data.characterId },
      data: { is_locked: data.locked },
    });
    return { ok: true };
  });

export const generateReferenceImage = createServerFn({ method: "POST" })
  .validator((input: unknown) =>
    z
      .object({ characterId: z.string(), view: z.enum(["front", "side", "portrait", "expressions"]) })
      .parse(input),
  )
  .handler(async ({ data }) => {
  const key = process.env["GEMINI_API_KEY"];
    if (!key) throw new Error("Image generation is not configured yet.");

    const { getDb } = await import("./db.server");
    const { objectUrl, putObject } = await import("./storage.server");
    const { buildReferencePrompt } = await import("./characters.server");
    const { generateImageBytes } = await import("./images.server");
    const db = getDb();

    const character = await db.character.findUnique({
      where: { id: data.characterId },
      include: { project: true },
    });
    if (!character) throw new Error("Character not found.");
    const project = character.project;
    if (!project) throw new Error("Project not found.");

    const latest = await db.characterReferenceImage.findFirst({
      where: { character_id: character.id, view_type: data.view },
      orderBy: { version: "desc" },
      select: { version: true },
    });
    const version = (latest?.version ?? 0) + 1;

    const prompt = buildReferencePrompt(
      character as never,
      data.view as ReferenceView,
      project.art_style,
      project.genre,
    );

    const row = await db.characterReferenceImage.create({
      data: {
        character_id: character.id,
        project_id: character.project_id,
        image_prompt: prompt,
        view_type: data.view,
        version,
        status: "generating",
        is_approved: false,
      },
      select: { id: true },
    });

    try {
      const bytes = await generateImageBytes(prompt, key);
      const path = `${character.project_id}/characters/${character.id}/${data.view}-v${version}-${Date.now()}.png`;
      await putObject(path, bytes);

      await db.$transaction([
        db.characterReferenceImage.updateMany({
          where: { character_id: character.id, view_type: data.view, id: { not: row.id } },
          data: { is_approved: false },
        }),
        db.characterReferenceImage.update({
          where: { id: row.id },
          data: { image_url: path, status: "ready", is_approved: true, error_message: null },
        }),
      ]);

      return { id: row.id, version, url: objectUrl(path), status: "ready" as const };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Reference generation failed.";
      await db.characterReferenceImage
        .update({ where: { id: row.id }, data: { status: "failed", error_message: message } })
        .catch(() => undefined);
      throw new Error(message);
    }
  });

export const generateCharacterSheet = createServerFn({ method: "POST" })
  .validator((input: unknown) => z.object({ characterId: z.string() }).parse(input))
  .handler(async ({ data }) => {
  const key = process.env["GEMINI_API_KEY"];
    if (!key) throw new Error("Image generation is not configured yet.");

    const { getDb } = await import("./db.server");
    const { putObject } = await import("./storage.server");
    const { buildReferencePrompt, REFERENCE_VIEWS } = await import("./characters.server");
    const { generateImageBytes } = await import("./images.server");
    const db = getDb();

    const character = await db.character.findUnique({
      where: { id: data.characterId },
      include: { project: true },
    });
    if (!character) throw new Error("Character not found.");
    const project = character.project;
    if (!project) throw new Error("Project not found.");

    const results: { view: ReferenceView; ok: boolean; error?: string }[] = [];
    for (const view of REFERENCE_VIEWS) {
      const prompt = buildReferencePrompt(character as never, view, project.art_style, project.genre);
      // eslint-disable-next-line no-await-in-loop
      const latest = await db.characterReferenceImage.findFirst({
        where: { character_id: character.id, view_type: view },
        orderBy: { version: "desc" },
        select: { version: true },
      });
      const version = (latest?.version ?? 0) + 1;

      // eslint-disable-next-line no-await-in-loop
      const row = await db.characterReferenceImage.create({
        data: {
          character_id: character.id,
          project_id: character.project_id,
          image_prompt: prompt,
          view_type: view,
          version,
          status: "generating",
          is_approved: false,
        },
        select: { id: true },
      });

      try {
        // eslint-disable-next-line no-await-in-loop
        const bytes = await generateImageBytes(prompt, key);
        const path = `${character.project_id}/characters/${character.id}/${view}-v${version}-${Date.now()}.png`;
        // eslint-disable-next-line no-await-in-loop
        await putObject(path, bytes);
        // eslint-disable-next-line no-await-in-loop
        await db.$transaction([
          db.characterReferenceImage.updateMany({
            where: { character_id: character.id, view_type: view, id: { not: row.id } },
            data: { is_approved: false },
          }),
          db.characterReferenceImage.update({
            where: { id: row.id },
            data: { image_url: path, status: "ready", is_approved: true, error_message: null },
          }),
        ]);
        results.push({ view, ok: true });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Reference generation failed.";
        // eslint-disable-next-line no-await-in-loop
        await db.characterReferenceImage
          .update({ where: { id: row.id }, data: { status: "failed", error_message: message } })
          .catch(() => undefined);
        results.push({ view, ok: false, error: message });
      }
    }

    return { results };
  });

export const approveReferenceImage = createServerFn({ method: "POST" })
  .validator((input: unknown) =>
    z.object({ referenceId: z.string(), approved: z.boolean() }).parse(input),
  )
  .handler(async ({ data }) => {
    const { getDb } = await import("./db.server");
    const db = getDb();

    const target = await db.characterReferenceImage.findUnique({
      where: { id: data.referenceId },
      select: { id: true, character_id: true, view_type: true },
    });
    if (!target) throw new Error("Reference image not found.");

    if (data.approved) {
      await db.characterReferenceImage.updateMany({
        where: { character_id: target.character_id, view_type: target.view_type },
        data: { is_approved: false },
      });
    }
    await db.characterReferenceImage.update({
      where: { id: target.id },
      data: { is_approved: data.approved },
    });
    return { ok: true };
  });

export const deleteReferenceImage = createServerFn({ method: "POST" })
  .validator((input: unknown) => z.object({ referenceId: z.string() }).parse(input))
  .handler(async ({ data }) => {
    const { getDb } = await import("./db.server");
    const { removeObjects } = await import("./storage.server");
    const db = getDb();

    const target = await db.characterReferenceImage.findUnique({
      where: { id: data.referenceId },
      select: { id: true, image_url: true },
    });
    if (!target) throw new Error("Reference image not found.");
    if (target.image_url) await removeObjects([target.image_url]);
    await db.characterReferenceImage.delete({ where: { id: target.id } });
    return { ok: true };
  });
