const PUBLIC_PREFIX = "/api/public/files";

export function safeKey(key: string) {
  const normalized = key
    .replace(/\\/g, "/")
    .replace(/^(\.\.(\/|$))+/, "")
    .replace(/^[/\\]+/, "");
  if (!normalized || normalized.includes("..")) return "";
  return normalized;
}

export function objectUrl(key: string | null | undefined): string | null {
  if (!key) return null;
  if (key.startsWith("http://") || key.startsWith("https://")) return key;
  if (key.startsWith(`${PUBLIC_PREFIX}/`)) return key;
  if (key.startsWith("api/public/files/")) return `/${key}`;

  const cleanKey = key.startsWith("/") ? key.substring(1) : key;
  try {
    const safe = safeKey(cleanKey);
    if (!safe) return null;
    const encoded = safe
      .split("/")
      .map((segment) => encodeURIComponent(segment))
      .join("/");
    return `${PUBLIC_PREFIX}/${encoded}`;
  } catch (err) {
    console.error("[url] Invalid objectUrl key:", key, err);
    return null;
  }
}
