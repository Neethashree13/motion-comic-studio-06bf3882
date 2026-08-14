import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { SceneDirection } from "./motion/types";

export type SceneDirectionRecord = {
  sceneId: string;
  sceneNumber: number;
  title: string;
} & SceneDirection;

/**
 * Runs the AI Director over every scene in a project (or one scene) and stores
 * the resulting camera plan on the scene row.
 */
export const directProject = createServerFn({ method: "POST" })
  .validator((input: unknown) =>
    z.object({ projectId: z.string(), sceneId: z.string().optional() }).parse(input),
  )
  .handler(async ({ data }): Promise<SceneDirectionRecord[]> => {
    const { getDb } = await import("./db.server");
    const { buildDirectorPrompt, heuristicDirection, parseDirection } = await import(
      "./director.server"
    );
    const { generateText } = await import("ai");
    const db = getDb();

    const project = await db.project.findUnique({ where: { id: data.projectId } });
    if (!project) throw new Error("Project not found.");

    const [characters, scenes] = await Promise.all([
      db.character.findMany({
        where: { project_id: project.id },
        orderBy: { sort_order: "asc" },
        select: { name: true, role: true },
      }),
      db.scene.findMany({
        where: data.sceneId
          ? { project_id: project.id, id: data.sceneId }
          : { project_id: project.id },
        orderBy: { scene_number: "asc" },
      }),
    ]);
    if (scenes.length === 0) throw new Error("This project has no scenes yet.");

    const key = process.env["GEMINI_API_KEY"];
    const model = key
      ? (await import("./ai-gateway.server")).createGeminiProvider(key)("gemini-2.5-flash")
      : null;

    const results: SceneDirectionRecord[] = [];

    for (const scene of scenes) {
      let direction: SceneDirection;
      if (model) {
        try {
          const prompt = buildDirectorPrompt({
            projectTitle: project.title,
            genre: project.genre,
            artStyle: project.art_style,
            logline: project.logline,
            characters,
            scene,
          });
          // eslint-disable-next-line no-await-in-loop
          const { text } = await generateText({
            model,
            system:
              "You are a motion-comic director. You plan camera beats over still comic panels and always answer with raw JSON matching the requested shape exactly.",
            prompt,
          });
          direction = parseDirection(text);
        } catch (error) {
          console.error("[directProject] falling back to heuristic:", error);
          direction = heuristicDirection(scene);
        }
      } else {
        direction = heuristicDirection(scene);
      }

      // eslint-disable-next-line no-await-in-loop
      await db.scene.update({
        where: { id: scene.id },
        data: {
          shot_list: JSON.parse(JSON.stringify(direction.shots)),
          emotion: direction.emotion,
          transition: direction.transition,
        },
      });

      results.push({
        sceneId: scene.id,
        sceneNumber: scene.scene_number,
        title: scene.title,
        ...direction,
      });
    }

    return results;
  });

/** Manual override from the studio UI (emotion / transition tweaks). */
export const updateSceneDirection = createServerFn({ method: "POST" })
  .validator((input: unknown) =>
    z
      .object({
        sceneId: z.string(),
        emotion: z.string().optional(),
        transition: z.string().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { getDb } = await import("./db.server");
    const { normalizeEmotion, normalizeTransition } = await import("./motion/types");

    const updated = await getDb().scene.update({
      where: { id: data.sceneId },
      data: {
        ...(data.emotion ? { emotion: normalizeEmotion(data.emotion) } : {}),
        ...(data.transition ? { transition: normalizeTransition(data.transition) } : {}),
      },
      select: { id: true, emotion: true, transition: true },
    });
    return updated;
  });
