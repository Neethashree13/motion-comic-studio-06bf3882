/**
 * Provider-agnostic text-to-speech contract.
 * Swapping providers later means adding one file and one registry entry —
 * no call site in the app changes.
 */
export type AudioFormat = "mp3" | "wav";

export type SynthesisRequest = {
  text: string;
  voice?: string;
  format?: AudioFormat;
  /** Optional natural-language steering (tone, pacing) when the provider supports it. */
  instructions?: string;
};

export type SynthesisResult = {
  bytes: Uint8Array;
  format: AudioFormat;
  voice: string;
  provider: string;
  /** Best-effort duration; used later to time comic panels against narration. */
  durationMs?: number;
};

export interface TtsProvider {
  id: string;
  defaultVoice: string;
  synthesize(request: SynthesisRequest): Promise<SynthesisResult>;
}

/**
 * Splits narration into pieces that stay well under any provider input cap,
 * preferring sentence boundaries. Google Translate TTS works best with ~50 words max.
 */
export function chunkForTts(text: string, maxWords = 50): string[] {
  const wordCount = (value: string) => (value.match(/\S+/g) ?? []).length;
  const sentences = text.match(/[^.!?]+[.!?]*\s*/g) ?? [text];
  const chunks: string[] = [];
  let current = "";

  const flush = () => {
    if (current.trim()) chunks.push(current.trim());
    current = "";
  };

  for (const sentence of sentences) {
    if (wordCount(sentence) > maxWords) {
      flush();
      const words = sentence.match(/\S+/g) ?? [];
      for (let i = 0; i < words.length; i += maxWords) {
        chunks.push(words.slice(i, i + maxWords).join(" "));
      }
      continue;
    }
    if (current && wordCount(current) + wordCount(sentence) > maxWords) flush();
    current += sentence;
  }
  flush();
  return chunks.length > 0 ? chunks : [text];
}

/**
 * Maps character names to distinct voices for dialogue variety.
 * Auto-detects characters from dialogue (e.g., "JAX: Hello") patterns.
 */
export const CHARACTER_VOICES: Record<string, string> = {
  JAX: "alloy",
  VECTOR: "onyx",
  ARCHON: "nova",
  ECHO: "shimmer",
  SAGE: "fable",
  SENTINEL: "echo",
};

/**
 * Extracts the speaker's character name from dialogue line.
 * Returns the mapped voice or default "alloy" if no character found.
 */
export function getVoiceForDialogue(dialogueLine: string, defaultVoice = "alloy"): string {
  const charMatch = dialogueLine.match(/^([A-Z_]+):\s/);
  if (!charMatch) return defaultVoice;
  const charName = charMatch[1]!.toUpperCase();
  return CHARACTER_VOICES[charName] ?? defaultVoice;
}
