import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

export function createGeminiProvider(apiKey: string) {
  return createOpenAICompatible({
    name: "gemini",
    baseURL: "https://generativelanguage.googleapis.com/v1beta/openai",
    apiKey,
    // The openai-compatible adapter will use Bearer auth by default with apiKey
  });
}