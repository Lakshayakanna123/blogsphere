/** Publication state helpers. */

export type PublicationStatus = "draft" | "published";
export type SaveIntent = "draft" | "publish" | "unpublish" | "keep";

export function getPublicationStatus(post: { published: boolean }): PublicationStatus {
  return post.published ? "published" : "draft";
}

/**
 * Resolve the `published` flag to store for a save request.
 * - "draft"     -> always a draft
 * - "publish"   -> published
 * - "unpublish" -> draft
 * - "keep"      -> keep the current state (e.g. "Update" on a published post)
 */
export function resolvePublished(intent: SaveIntent, currentlyPublished: boolean): boolean {
  switch (intent) {
    case "publish":
      return true;
    case "draft":
    case "unpublish":
      return false;
    case "keep":
      return currentlyPublished;
  }
}

export type PublishCheck = { ok: true } | { ok: false; reasons: string[] };

/** Guard against accidentally publishing empty or incomplete articles. */
export function checkPublishable(input: { title: string; markdown: string }): PublishCheck {
  const reasons: string[] = [];
  if (!input.title.trim()) reasons.push("Add a title before publishing.");
  const body = input.markdown.trim();
  if (!body) reasons.push("Write some content before publishing.");
  else if (body.split(/\s+/).length < 5) reasons.push("Articles need at least a few words before publishing.");
  return reasons.length ? { ok: false, reasons } : { ok: true };
}
