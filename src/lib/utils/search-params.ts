/**
 * Listing/search URL parameter parsing and pagination helpers.
 * Every value from the URL is treated as untrusted input.
 */

export const PAGE_SIZE = 9;
export const MAX_QUERY_LENGTH = 100;

export type SortOrder = "newest" | "oldest" | "title";
export const SORT_OPTIONS: { value: SortOrder; label: string }[] = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "title", label: "Title (A–Z)" },
];

export type ListingParams = {
  q: string;
  page: number;
  sort: SortOrder;
  tag: string | null;
};

type RawParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export function parseListingParams(raw: RawParams): ListingParams {
  const q = (first(raw.q) ?? "").replace(/\s+/g, " ").trim().slice(0, MAX_QUERY_LENGTH);

  const pageNum = Number.parseInt(first(raw.page) ?? "1", 10);
  const page = Number.isFinite(pageNum) && pageNum >= 1 && pageNum <= 10_000 ? pageNum : 1;

  const sortRaw = first(raw.sort);
  const sort: SortOrder = sortRaw === "oldest" || sortRaw === "title" ? sortRaw : "newest";

  const tagRaw = first(raw.tag)?.trim().toLowerCase() ?? "";
  const tag = /^[a-z0-9]+(-[a-z0-9]+)*$/.test(tagRaw) && tagRaw.length <= 32 ? tagRaw : null;

  return { q, page, sort, tag };
}

/** Inclusive range for PostgREST `.range(from, to)`. */
export function pageRange(page: number, pageSize = PAGE_SIZE): { from: number; to: number } {
  const from = (Math.max(1, page) - 1) * pageSize;
  return { from, to: from + pageSize - 1 };
}

export function totalPages(total: number, pageSize = PAGE_SIZE): number {
  return Math.max(1, Math.ceil(Math.max(0, total) / pageSize));
}

/** Build a URL that preserves current filters while overriding some. */
export function buildListingHref(
  pathname: string,
  current: Partial<ListingParams>,
  overrides: Partial<ListingParams> = {},
): string {
  const merged = { ...current, ...overrides };
  const params = new URLSearchParams();
  if (merged.q) params.set("q", merged.q);
  if (merged.tag) params.set("tag", merged.tag);
  if (merged.sort && merged.sort !== "newest") params.set("sort", merged.sort);
  if (merged.page && merged.page > 1) params.set("page", String(merged.page));
  const qs = params.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}

/**
 * Sanitise free text for PostgreSQL `websearch_to_tsquery`. websearch syntax
 * is already injection-safe (it never raises on malformed input), but we
 * strip characters that carry no meaning to keep queries predictable.
 */
export function toWebSearchQuery(q: string): string {
  return q
    .replace(/[^\p{L}\p{N}\s"'-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_QUERY_LENGTH);
}

/** Escape a value for use inside a PostgREST ILIKE pattern. */
export function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, (c) => `\\${c}`);
}
