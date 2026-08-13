import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const StoryInput = z.object({
  idea: z.string(),
  genre: z.string(),
  length: z.string(),
  artStyle: z.string(),
  duration: z.string(),
  voice: z.string(),
  story: z.object({
    title: z.string(),
    logline: z.string(),
    ending: z.string(),
    characters: z.array(
      z.object({ name: z.string(), role: z.string(), appearance: z.string() }),
    ),
    scenes: z.array(
      z.object({
        title: z.string(),
        panelPrompt: z.string(),
        narration: z.string(),
        dialogue: z.string(),
        music: z.string(),
      }),
    ),
  }),
});

export const saveProject = createServerFn({ method: "POST" })
  .validator((input: unknown) => StoryInput.parse(input))
  .handler(async ({ data }) => {
    try {
      const { getDb } = await import("./db.server");
      const { traitsFromAppearance } = await import("./projects.server");
      const db = getDb();
      const { story } = data;

      console.log("🔄 Saving project with title:", story.title);
      console.log("📍 Characters:", story.characters.length);
      console.log("📍 Scenes:", story.scenes.length);

      const project = await db.project.create({
        data: {
          idea: data.idea,
          genre: data.genre,
          length: data.length,
          art_style: data.artStyle,
          duration: data.duration,
          voice: data.voice,
          title: story.title,
          logline: story.logline,
          ending: story.ending,
          status: "story",
          characters: {
            create: story.characters.map((character: typeof story.characters[0], index) => ({
              name: character.name,
              role: character.role,
              appearance: character.appearance,
              traits: traitsFromAppearance(character.appearance),
              sort_order: index,
            })),
          },
          scenes: {
            create: story.scenes.map((scene: typeof story.scenes[0], index) => ({
              scene_number: index + 1,
              title: scene.title,
              narration: scene.narration,
              dialogue: scene.dialogue,
              music: scene.music,
            })),
          },
        },
        select: { id: true },
      });

      console.log("✅ Project saved successfully with ID:", project.id);
      return { projectId: project.id };
    } catch (error) {
      console.error("❌ Error saving project:", error);
      if (error instanceof Error) {
        throw new Error(`Failed to save project: ${error.message}`);
      }
      throw new Error("Failed to save project: Unknown error");
    }
  });

export const listProjects = createServerFn({ method: "GET" }).handler(async () => {
  const { getDb } = await import("./db.server");
  const rows = await getDb().project.findMany({
    select: {
      id: true,
      title: true,
      logline: true,
      genre: true,
      art_style: true,
      length: true,
      status: true,
      updated_at: true,
    },
    orderBy: { updated_at: "desc" },
  });
  return rows.map((row: typeof rows[0]) => ({ ...row, updated_at: row.updated_at.toISOString() }));
});

export const getProject = createServerFn({ method: "POST" })
  .validator((input: unknown) => z.object({ projectId: z.string() }).parse(input))
  .handler(async ({ data }) => {
    const { getDb } = await import("./db.server");
    const db = getDb();

    const [project, characters, scenes, panels] = await Promise.all([
      db.project.findUnique({ where: { id: data.projectId } }),
      db.character.findMany({
        where: { project_id: data.projectId },
        orderBy: { sort_order: "asc" },
      }),
      db.scene.findMany({
        where: { project_id: data.projectId },
        orderBy: { scene_number: "asc" },
      }),
      db.panel.findMany({
        where: { project_id: data.projectId },
        orderBy: { panel_number: "asc" },
      }),
    ]);

    if (!project) throw new Error("Project not found.");
    return { project, characters, scenes, panels };
  });

export const deleteProject = createServerFn({ method: "POST" })
  .validator((input: unknown) => z.object({ projectId: z.string() }).parse(input))
  .handler(async ({ data }) => {
    const { getDb } = await import("./db.server");
    await getDb().project.delete({ where: { id: data.projectId } });
    return { ok: true };
  });

export const duplicateProject = createServerFn({ method: "POST" })
  .validator((input: unknown) => z.object({ projectId: z.string() }).parse(input))
  .handler(async ({ data }) => {
    const { getDb } = await import("./db.server");
    const db = getDb();

    const original = await db.project.findUnique({
      where: { id: data.projectId },
      include: { characters: true, scenes: true, panels: true },
    });
    if (!original) throw new Error("Project not found.");

    const copy = await db.project.create({
      data: {
        idea: original.idea,
        genre: original.genre,
        length: original.length,
        art_style: original.art_style,
        duration: original.duration,
        voice: original.voice,
        title: `${original.title} (copy)`,
        logline: original.logline,
        ending: original.ending,
        status: original.status,
        characters: {
          create: original.characters.map((character: typeof original.characters[0]) => ({
            name: character.name,
            role: character.role,
            appearance: character.appearance,
            traits: character.traits ?? [],
            sort_order: character.sort_order,
          })),
        },
      },
      select: { id: true },
    });

    const sceneIdMap = new Map<string, string>();
    for (const scene of original.scenes) {
      // eslint-disable-next-line no-await-in-loop
      const inserted = await db.scene.create({
        data: {
          project_id: copy.id,
          scene_number: scene.scene_number,
          title: scene.title,
          narration: scene.narration,
          dialogue: scene.dialogue,
          music: scene.music,
        },
        select: { id: true },
      });
      sceneIdMap.set(scene.id, inserted.id);
    }

    const panelRows = original.panels
      .map((panel: typeof original.panels[0]) => {
        const scene_id = sceneIdMap.get(panel.scene_id);
        if (!scene_id) return null;
        return {
          project_id: copy.id,
          scene_id,
          panel_number: panel.panel_number,
          image_prompt: panel.image_prompt,
          caption: panel.caption,
          image_url: panel.image_url,
          image_status: panel.image_status,
        };
      })
      .filter((row): row is NonNullable<typeof row> => row !== null);
    if (panelRows.length) await db.panel.createMany({ data: panelRows });

    return { projectId: copy.id };
  });

const PanelSchema = z.object({
  panels: z.array(
    z.object({
      sceneNumber: z.number(),
      caption: z.string(),
      imagePrompt: z.string(),
    }),
  ),
});

export const generatePanels = createServerFn({ method: "POST" })
  .validator((input: unknown) => z.object({ projectId: z.string() }).parse(input))
  .handler(async ({ data }) => {
    const key = process.env["GEMINI_API_KEY"];
    if (!key) throw new Error("AI is not configured yet.");

    const { getDb } = await import("./db.server");
    const db = getDb();

    const [project, characters, scenes] = await Promise.all([
      db.project.findUnique({ where: { id: data.projectId } }),
      db.character.findMany({
        where: { project_id: data.projectId },
        orderBy: { sort_order: "asc" },
      }),
      db.scene.findMany({
        where: { project_id: data.projectId },
        orderBy: { scene_number: "asc" },
      }),
    ]);

    if (!project || scenes.length === 0) throw new Error("This project has no scenes yet.");

    const perScene = Math.max(1, Math.min(3, Math.round(14 / scenes.length)));
    const target = Math.max(6, Math.min(20, perScene * scenes.length));

    const characterSheet = characters
      .map(
        (character: typeof characters[0]) =>
          `${character.name} (${character.role ?? "character"}): ${character.appearance ?? ""} | locked traits: ${
            Array.isArray(character.traits) ? character.traits.join(", ") : ""
          }`,
      )
      .join("\n");

    const sceneSheet = scenes
      .map(
        (scene: typeof scenes[0]) =>
          `Scene ${scene.scene_number} — ${scene.title}\nNarration: ${scene.narration ?? ""}\nDialogue: ${
            scene.dialogue ?? ""
          }`,
      )
      .join("\n\n");

    const { createGeminiProvider } = await import("./ai-gateway.server");
    const { streamText } = await import("ai");
    const gateway = createGeminiProvider(key);

    const result = streamText({
     model: gateway("gemini-3.5-flash"),
      system:
        "You are a comic panel breakdown artist. You write image-generation prompts that keep every character visually identical across panels by repeating their locked appearance traits verbatim in each prompt. You always answer with raw JSON.",
      prompt: [
        `Comic title: ${project.title}`,
        `Genre: ${project.genre} | Art style: ${project.art_style}`,
        "",
        "CHARACTER SHEET (repeat these traits verbatim in every prompt the character appears in):",
        characterSheet || "No named characters.",
        "",
        "SCENES:",
        sceneSheet,
        "",
        `Break this story into exactly ${target} comic panels, roughly ${perScene} per scene, in story order.`,
        "Each imagePrompt must be a single vivid paragraph naming the art style, the shot type, the setting and the exact locked traits of any character shown.",
        "Each caption is a short comic caption or dialogue balloon line.",
        "",
        "Reply with ONLY raw JSON, no markdown fence:",
        '{ "panels": [{ "sceneNumber": number, "caption": string, "imagePrompt": string }] }',
      ].join("\n"),
    });

    const raw = (await result.text)
      .trim()
      .replace(/^```(?:json)?/i, "")
      .replace(/```$/, "")
      .trim();

    let parsed: z.infer<typeof PanelSchema>;
    try {
      parsed = PanelSchema.parse(JSON.parse(raw));
    } catch {
      throw new Error("The panel breakdown came back malformed. Please try again.");
    }

    const sceneByNumber = new Map(scenes.map((scene: typeof scenes[0]) => [scene.scene_number, scene]));
    const rows = parsed.panels
      .map((panel, index) => {
        const scene = sceneByNumber.get(panel.sceneNumber) ?? scenes[0]!;
        return {
          project_id: project.id,
          scene_id: scene.id,
          panel_number: index + 1,
          image_prompt: panel.imagePrompt,
          caption: panel.caption,
          image_status: "pending",
        };
      })
      .slice(0, 20);

    if (rows.length < 6) throw new Error("The panel breakdown was too short. Please try again.");

    await db.$transaction([
      db.panel.deleteMany({ where: { project_id: project.id } }),
      db.panel.createMany({ data: rows }),
      db.project.update({ where: { id: project.id }, data: { status: "panels" } }),
    ]);

    return { count: rows.length };
  });

export const regeneratePanel = createServerFn({ method: "POST" })
  .validator((input: unknown) => z.object({ panelId: z.string() }).parse(input))
  .handler(async ({ data }) => {
    const key = process.env["GEMINI_API_KEY"];
    if (!key) throw new Error("AI is not configured yet.");

    const { getDb } = await import("./db.server");
    const db = getDb();

    const panel = await db.panel.findUnique({
      where: { id: data.panelId },
      include: { project: true, scene: true },
    });
    if (!panel) throw new Error("Panel not found.");
    const { project, scene } = panel;
    if (!project || !scene) throw new Error("Panel context is missing.");

    const characters = await db.character.findMany({ where: { project_id: panel.project_id } });

    const characterSheet = characters
      .map(
        (character: typeof characters[0]) =>
          `${character.name}: ${character.appearance ?? ""} | locked traits: ${
            Array.isArray(character.traits) ? character.traits.join(", ") : ""
          }`,
      )
      .join("\n");

    const { createGeminiProvider } = await import("./ai-gateway.server");
    const { streamText } = await import("ai");
    const gateway = createGeminiProvider(key);

    const result = streamText({
     model: gateway("gemini-3.5-flash"),
      system:
        "You rewrite a single comic panel. You keep character appearance traits identical and only change the framing, staging and mood. You always answer with raw JSON.",
      prompt: [
        `Art style: ${project.art_style} | Genre: ${project.genre}`,
        `Scene ${scene.scene_number} — ${scene.title}`,
        `Narration: ${scene.narration ?? ""}`,
        "",
        "CHARACTER SHEET (traits must be repeated verbatim):",
        characterSheet || "No named characters.",
        "",
        `Current caption: ${panel.caption ?? ""}`,
        `Current prompt: ${panel.image_prompt}`,
        "",
        "Write a fresh alternative take on this same panel with a different shot type or staging.",
        'Reply with ONLY raw JSON: { "caption": string, "imagePrompt": string }',
      ].join("\n"),
    });

    const raw = (await result.text)
      .trim()
      .replace(/^```(?:json)?/i, "")
      .replace(/```$/, "")
      .trim();

    let parsed: { caption: string; imagePrompt: string };
    try {
      parsed = z.object({ caption: z.string(), imagePrompt: z.string() }).parse(JSON.parse(raw));
    } catch {
      throw new Error("The regenerated panel came back malformed. Please try again.");
    }

    await db.panel.update({
      where: { id: panel.id },
      data: {
        caption: parsed.caption,
        image_prompt: parsed.imagePrompt,
        image_url: null,
        image_status: "pending",
      },
    });

    return { ok: true };
  });
