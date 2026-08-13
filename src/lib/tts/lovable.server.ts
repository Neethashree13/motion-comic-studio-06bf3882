import { chunkForTts, type SynthesisRequest, type SynthesisResult, type TtsProvider, getVoiceForDialogue } from "./types";

/**
 * Uses Google Translate TTS (free, no API key required).
 * Maps common voice names to language codes for variety.
 */
async function synthesizeChunk(text: string, voice: string): Promise<Uint8Array> {
  if (!text || !text.trim()) {
    throw new Error("Cannot synthesize empty text");
  }

  // Map voice names to language codes for variety
  const voiceLanguageMap: Record<string, string> = {
    alloy: "en", // English (default)
    echo: "en", // English
    fable: "en-GB", // British English
    onyx: "en-US", // American English
    nova: "en-AU", // Australian English
    shimmer: "en-IE", // Irish English
  };

  const language = voiceLanguageMap[voice?.toLowerCase()] || "en";
  
  // Aggressive text sanitization: remove ellipsis, extra punctuation, special chars
  let cleanText = text
    .trim()
    .replace(/\.\.\./g, ".") // Replace ellipsis with single period
    .replace(/[""]/g, '"') // Normalize smart quotes
    .replace(/['']/g, "'") // Normalize smart apostrophes
    .replace(/\s+/g, " ") // Normalize whitespace
    .trim();

  // If text is still too long, truncate to first 30 words
  const wordArray = cleanText.split(/\s+/);
  if (wordArray.length > 30) {
    cleanText = wordArray.slice(0, 30).join(" ");
    console.log(`[synthesizeChunk] ⚠️ Text truncated to 30 words`);
  }

  const encodedText = encodeURIComponent(cleanText);
  const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodedText}&tl=${language}&client=tw-ob`;

  console.log(
    `[synthesizeChunk] 🎙️ TTS request (${language}, ${voice}): "${cleanText.substring(0, 50)}..." (${wordArray.length} words, URL length: ${ttsUrl.length})`
  );

  const response = await fetch(ttsUrl, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      Accept: "audio/mpeg",
      "Accept-Encoding": "gzip, deflate",
    },
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    console.error(
      `[synthesizeChunk] ❌ TTS failed (${response.status}): URL length ${ttsUrl.length} chars. Text: "${cleanText.substring(0, 80)}..."`
    );
    throw new Error(`TTS request failed (${response.status}): ${response.statusText}`);
  }

  const buffer = await response.arrayBuffer();
  if (buffer.byteLength === 0) {
    throw new Error("TTS returned empty audio data");
  }

  console.log(`[synthesizeChunk] ✅ Audio chunk generated (${buffer.byteLength} bytes)`);
  return new Uint8Array(buffer);
}

export const lovableTtsProvider: TtsProvider = {
  id: "lovable",
  defaultVoice: "alloy",

  async synthesize(request: SynthesisRequest): Promise<SynthesisResult> {
    const defaultVoice = request.voice?.trim() || lovableTtsProvider.defaultVoice;
    const format = "mp3";
    const parts: Uint8Array[] = [];

    console.log("[lovableTtsProvider.synthesize] 🎬 Starting TTS synthesis...");

    for (const chunk of chunkForTts(request.text)) {
      try {
        // Auto-detect voice from dialogue (e.g., "JAX: ...") for character variety
        const voiceForChunk = getVoiceForDialogue(chunk, defaultVoice);
        
        console.log(
          `[lovableTtsProvider.synthesize] 🎤 Synthesizing chunk with voice: ${voiceForChunk} (${chunk.length} chars)`
        );

        // eslint-disable-next-line no-await-in-loop
        const audio = await synthesizeChunk(chunk, voiceForChunk);
        parts.push(audio);
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        console.error("[lovableTtsProvider.synthesize] ❌ Failed to synthesize chunk:", msg);
        throw new Error(`Text-to-speech failed: ${msg}`);
      }
    }

    const total = parts.reduce((sum, part) => sum + part.length, 0);
    const bytes = new Uint8Array(total);
    let offset = 0;
    for (const part of parts) {
      bytes.set(part, offset);
      offset += part.length;
    }

    // Estimate duration: Google Translate TTS is typically ~128 kbps MP3
    const BYTES_PER_SECOND = 16_000;
    const durationMs = Math.max(1_000, Math.round((total / BYTES_PER_SECOND) * 1_000));

    console.log(
      "[lovableTtsProvider.synthesize] ✅ TTS complete. Duration: " + Math.round(durationMs / 1000) + "s"
    );

    return {
      bytes,
      format,
      voice: defaultVoice,
      provider: lovableTtsProvider.id,
      durationMs,
    };
  },
};
