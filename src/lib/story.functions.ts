import { createServerFn } from "@tanstack/react-start";
import { streamText } from "ai";
import { z } from "zod";

const InputSchema = z.object({
  idea: z.string(),
  genre: z.string(),
  length: z.string(),
  artStyle: z.string(),
  duration: z.string(),
  voice: z.string(),
});

const StorySchema = z.object({
  title: z.string(),
  logline: z.string(),
  characters: z.array(
    z.object({
      name: z.string(),
      role: z.string(),
      appearance: z.string(),
    }),
  ),
  outline: z.array(z.string()),
  scenes: z.array(
    z.object({
      title: z.string(),
      panelPrompt: z.string(),
      narration: z.string(),
      dialogue: z.string(),
      music: z.string(),
    }),
  ),
  ending: z.string(),
});

export type GeneratedStory = z.infer<typeof StorySchema>;

export const generateStory = createServerFn({ method: "POST" })
  .validator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data }) => {
    const key = process.env["GEMINI_API_KEY"];
    if (!key) throw new Error("AI is not configured yet.");

   const { createGeminiProvider } = await import("./ai-gateway.server");
   const gateway = createGeminiProvider(key);
    const sceneCount = data.length === "short" ? 4 : data.length === "medium" ? 6 : 9;

    const prompt = [
      `Idea: ${data.idea}`,
      `Genre: ${data.genre}`,
      `Art style: ${data.artStyle}`,
      `Target video duration: ${data.duration}`,
      `Narrator voice: ${data.voice}`,
      "",
      `Write a comic-story treatment with exactly ${sceneCount} scenes.`,
      "Include 2-4 characters with distinctive visual descriptions so panels stay consistent, and one short outline beat per scene.",
      "",
      "Reply with ONLY raw JSON (no markdown fence, no commentary) using exactly this shape:",
      `{
  "title": string,
  "logline": string,
  "characters": [{ "name": string, "role": string, "appearance": string }],
  "outline": [string],
  "scenes": [{
    "title": string,
    "panelPrompt": string,   // vivid image-generation prompt including the art style and character look
    "narration": string,     // 1-2 narrated sentences
    "dialogue": string,      // one line formatted as NAME: line
    "music": string          // short royalty-free background music cue for the genre
  }],
  "ending": string
}`,
    ].join("\n");

    const result = streamText({
     model: gateway("gemini-3.5-flash"),
      system:
        "You are a comic-story director. You write tight, cinematic, genre-true comic scripts made to become short narrated motion-comic videos. You always answer with raw JSON matching the requested shape exactly.",
      prompt,
    });

    console.log("⏳ Waiting for story generation...");
    const raw = await result.text;
    console.log("📝 Raw API response length:", raw.length);
    console.log("📝 Raw API response (first 500 chars):", raw.slice(0, 500));
    
    const cleaned = raw
      .trim()
      .replace(/^```(?:json)?/i, "")
      .replace(/```$/, "")
      .trim();

    console.log("🧹 Cleaned response length:", cleaned.length);
    
    try {
      const parsed = JSON.parse(cleaned);
      console.log("✅ JSON parsed successfully");
      console.log("📊 Story structure:", { 
        title: parsed.title, 
        charactersCount: parsed.characters?.length,
        scenesCount: parsed.scenes?.length 
      });
      return StorySchema.parse(parsed);
    } catch (error) {
      console.error("❌ Error parsing story:", error instanceof Error ? error.message : error);
      console.error("❌ Malformed story output (first 800 chars):", cleaned.slice(0, 800));
      throw new Error(`The story came back malformed. Error: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  });

