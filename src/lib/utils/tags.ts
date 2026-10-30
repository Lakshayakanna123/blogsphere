/**
 * Tag normalisation — mirrors `public.normalize_tag(s)` in the database so
 * client previews match what is stored. The database trigger is the source
 * of truth.
 */

export const MAX_TAGS = 10;
export const MAX_TAG_LENGTH = 32;

export function normalizeTag(tag: string): string | null {
  const normalized = tag
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s-]+/g, "-")
    .replace(/^-+|-+$/g, "");

  if (!normalized || normalized.length > MAX_TAG_LENGTH) return null;
  return normalized;
}

/** Normalise, de-duplicate (case-insensitive) and cap a list of tags. */
export function normalizeTags(input: string | readonly string[], max = MAX_TAGS): string[] {
  const raw = typeof input === "string" ? input.split(",") : input;
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of raw) {
    const tag = normalizeTag(value);
    if (tag && !seen.has(tag)) {
      seen.add(tag);
      result.push(tag);
    }
    if (result.length >= max) break;
  }
  return result;
}

/** Human-friendly label: "machine-learning" -> "Machine learning". */
export function formatTagLabel(tag: string): string {
  const spaced = tag.replace(/-/g, " ");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}
