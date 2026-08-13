// import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
// import path from "node:path";

// /**
//  * Local filesystem object storage — the replacement for Supabase Storage.
//  * Files live under UPLOADS_DIR (default ./uploads) and are served by
//  * /api/public/files/$ so the browser can load them with a plain URL.
//  */
// const PUBLIC_PREFIX = "/api/public/files";

// function rootDir() {
//   return path.resolve(process.env["UPLOADS_DIR"] ?? "uploads");
// }

// /** Blocks path traversal and absolute paths; keys are always relative. */
// export function safeKey(key: string) {
//   const normalized = path
//     .normalize(key)
//     .replace(/^(\.\.(\/|\\|$))+/, "")
//     .replace(/^[/\\]+/, "");
//   if (!normalized || normalized.includes("..")) throw new Error("Invalid storage key.");
//   return normalized;
// }

// function absolutePath(key: string) {
//   return path.join(rootDir(), safeKey(key));
// }

// export async function putObject(key: string, bytes: Uint8Array) {
//   const target = absolutePath(key);
//   await mkdir(path.dirname(target), { recursive: true });
//   await writeFile(target, bytes);
//   return key;
// }

// export async function getObject(key: string): Promise<Uint8Array | null> {
//   try {
//     const buffer = await readFile(absolutePath(key));
//     return new Uint8Array(buffer);
//   } catch {
//     return null;
//   }
// }

// export async function removeObjects(keys: string[]) {
//   await Promise.all(
//     keys.map(async (key) => {
//       try {
//         await rm(absolutePath(key), { force: true });
//       } catch {
//         /* already gone */
//       }
//     }),
//   );
// }

// /** Public URL for a stored object. Replaces Supabase signed URLs (storage is no longer per-user). */
// export function objectUrl(key: string | null | undefined) {
//   if (!key) return null;
//   return `${PUBLIC_PREFIX}/${safeKey(key)
//     .split("/")
//     .map((segment) => encodeURIComponent(segment))
//     .join("/")}`;
// }

import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { safeKey, objectUrl } from "../utils/url";

export { safeKey, objectUrl };

const PUBLIC_PREFIX = "/api/public/files";

export function rootDir() {
  return path.resolve(process.env["UPLOADS_DIR"] ?? "uploads");
}

export function absolutePath(key: string) {
  return path.join(rootDir(), safeKey(key));
}

export async function putObject(key: string, bytes: Uint8Array) {
  const target = absolutePath(key);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, bytes);
  return key;
}

export async function getObject(key: string): Promise<Uint8Array | null> {
  try {
    const buffer = await readFile(absolutePath(key));
    return new Uint8Array(buffer);
  } catch {
    return null;
  }
}

export async function removeObjects(keys: string[]) {
  await Promise.all(
    keys.map(async (key) => {
      try {
        await rm(absolutePath(key), { force: true });
      } catch {
        /* already gone */
      }
    }),
  );
}
