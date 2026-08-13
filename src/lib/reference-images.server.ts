import { bytesToDataUrl } from "./images.server";
import { getObject } from "./storage.server";

/** Loads approved reference art from local storage and returns base64 data URLs for image conditioning. */
export async function referenceDataUrls(paths: string[], limit = 4) {
  const urls: string[] = [];
  for (const path of paths.slice(0, limit)) {
    // eslint-disable-next-line no-await-in-loop
    const bytes = await getObject(path);
    if (!bytes) continue;
    urls.push(bytesToDataUrl(bytes));
  }
  return urls;
}
