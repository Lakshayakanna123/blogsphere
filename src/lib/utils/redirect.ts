/**
 * Safe redirect handling — prevents open redirects.
 *
 * Only same-origin relative paths are accepted. Anything that could be
 * interpreted by a browser as an absolute or protocol-relative URL
 * ("//evil.com", "/\\evil.com", "https://…", "javascript:…") is rejected.
 */
export function safeRedirectPath(
  value: string | null | undefined,
  fallback = "/dashboard",
): string {
  if (!value || typeof value !== "string") return fallback;

  let candidate: string;
  try {
    candidate = decodeURIComponent(value.trim());
  } catch {
    return fallback;
  }

  if (
    !candidate.startsWith("/") ||
    candidate.startsWith("//") ||
    candidate.startsWith("/\\") ||
    candidate.includes("\\") ||
    // eslint-disable-next-line no-control-regex
    /[\u0000-\u001f\u007f]/.test(candidate) ||
    candidate.length > 512
  ) {
    return fallback;
  }

  try {
    // Resolve against a dummy origin; if the origin changes it was not relative.
    const url = new URL(candidate, "http://blogsphere.local");
    if (url.origin !== "http://blogsphere.local") return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}
