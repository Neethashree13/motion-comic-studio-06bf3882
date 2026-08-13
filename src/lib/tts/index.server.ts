import { lovableTtsProvider } from "./lovable.server";
import type { TtsProvider } from "./types";

/**
 * Provider registry. Add a new implementation here (ElevenLabs, OpenAI direct, …)
 * and select it with the TTS_PROVIDER env var — no call site changes.
 */
const PROVIDERS: Record<string, TtsProvider> = {
  [lovableTtsProvider.id]: lovableTtsProvider,
};

export function getTtsProvider(id?: string): TtsProvider {
  const key = (id ?? process.env["TTS_PROVIDER"] ?? lovableTtsProvider.id).toLowerCase();
  const provider = PROVIDERS[key];
  if (!provider) throw new Error(`Unknown TTS provider "${key}".`);
  return provider;
}

export type { SynthesisRequest, SynthesisResult, TtsProvider } from "./types";
