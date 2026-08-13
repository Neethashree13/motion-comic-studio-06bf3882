/** Helpers for project server functions (kept out of the *.functions.ts module scope). */
export function traitsFromAppearance(appearance: string) {
  return appearance
    .split(/[,;]/)
    .map((part) => part.trim())
    .filter((part) => part.length > 2)
    .slice(0, 8);
}
