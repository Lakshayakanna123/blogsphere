/**
 * Slug utilities.
 *
 * Slugs are URL-safe, lowercase, hyphen-separated and limited to 120 chars,
 * matching the `posts.slug` CHECK constraint in the database:
 *   ^[a-z0-9]+(-[a-z0-9]+)*$
 */

export const SLUG_MAX_LENGTH = 120;
export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Convert arbitrary text (e.g. a title) into a URL-safe slug. */
export function slugify(input: string, maxLength = SLUG_MAX_LENGTH): string {
  const slug = input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "") // strip diacritics
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");

  return truncateSlug(slug, maxLength);
}

/** Truncate on a hyphen boundary where possible, never leaving a trailing hyphen. */
export function truncateSlug(slug: string, maxLength = SLUG_MAX_LENGTH): string {
  if (slug.length <= maxLength) return slug;
  const cut = slug.slice(0, maxLength);
  const lastHyphen = cut.lastIndexOf("-");
  const trimmed = lastHyphen > maxLength * 0.6 ? cut.slice(0, lastHyphen) : cut;
  return trimmed.replace(/-+$/g, "");
}

export function isValidSlug(slug: string): boolean {
  return slug.length > 0 && slug.length <= SLUG_MAX_LENGTH && SLUG_PATTERN.test(slug);
}

/** Append a numeric/random suffix while respecting the max length. */
export function withSuffix(base: string, suffix: string | number): string {
  const tail = `-${suffix}`;
  const head = truncateSlug(base, SLUG_MAX_LENGTH - tail.length) || "post";
  return `${head}${tail}`;
}

export function randomSuffix(length = 6): string {
  const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

/**
 * Find an available slug.
 * Tries `base`, then `base-2` … `base-{maxNumbered}`, then a random suffix.
 * `isTaken` is injected so the strategy is unit-testable and the database
 * remains the source of truth (the UNIQUE constraint is the final guard).
 */
export async function generateUniqueSlug(
  baseInput: string,
  isTaken: (candidate: string) => Promise<boolean>,
  { maxNumbered = 20 }: { maxNumbered?: number } = {},
): Promise<string> {
  const base = slugify(baseInput) || `post-${randomSuffix(6)}`;

  if (!(await isTaken(base))) return base;

  for (let n = 2; n <= maxNumbered; n += 1) {
    const candidate = withSuffix(base, n);
    if (!(await isTaken(candidate))) return candidate;
  }

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const candidate = withSuffix(base, randomSuffix(6));
    if (!(await isTaken(candidate))) return candidate;
  }

  throw new Error("Unable to generate a unique slug");
}
