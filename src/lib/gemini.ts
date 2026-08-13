// import { GoogleGenAI } from "@google/genai";

// /**
//  * Initializes and returns a GoogleGenAI client configured with GEMINI_API_KEY.
//  */
// export function getGeminiClient(apiKey?: string) {
//   const key = apiKey || process.env.GEMINI_API_KEY;
//   if (!key) {
//     throw new Error("GEMINI_API_KEY is missing. Please set GEMINI_API_KEY in your environment secrets.");
//   }
//   return new GoogleGenAI({
//     apiKey: key,
//     httpOptions: {
//       headers: {
//         "User-Agent": "aistudio-build",
//       },
//     },
//   });
// }
