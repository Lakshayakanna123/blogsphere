/**
 * Image validation helpers shared by the upload Route Handler and the
 * post save action.
 */

export const MAX_IMAGE_BYTES = 4 * 1024 * 1024; // 4 MiB (bucket limit + Vercel body limit)
export const IMAGE_BUCKET = "post-images";

export type AllowedImageType = "image/jpeg" | "image/png" | "image/webp";

export const IMAGE_EXTENSIONS: Record<AllowedImageType, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export const ACCEPTED_IMAGE_TYPES = Object.keys(IMAGE_EXTENSIONS) as AllowedImageType[];

/**
 * Detect the real image type from magic bytes. File names and the
 * browser-supplied Content-Type are never trusted.
 */
export function detectImageType(bytes: Uint8Array): AllowedImageType | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return "image/png";
  }
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 && // R
    bytes[1] === 0x49 && // I
    bytes[2] === 0x46 && // F
    bytes[3] === 0x46 && // F
    bytes[8] === 0x57 && // W
    bytes[9] === 0x45 && // E
    bytes[10] === 0x42 && // B
    bytes[11] === 0x50 // P
  ) {
    return "image/webp";
  }
  return null;
}

/** Public URL prefix for objects in the image bucket. */
export function publicBucketPrefix(supabaseUrl: string): string {
  return `${supabaseUrl.replace(/\/+$/, "")}/storage/v1/object/public/${IMAGE_BUCKET}/`;
}

/**
 * Extract the object path ("{userId}/{file}") from a public URL in our bucket.
 * Returns null for anything else (other hosts, other buckets, traversal).
 */
export function storagePathFromPublicUrl(url: string, supabaseUrl: string): string | null {
  const prefix = publicBucketPrefix(supabaseUrl);
  if (!url.startsWith(prefix)) return null;
  const path = url.slice(prefix.length).split(/[?#]/)[0];
  if (!/^[0-9a-f-]{36}\/[A-Za-z0-9._-]{1,200}$/.test(path) || path.includes("..")) return null;
  return path;
}

/** A cover/inline image URL is acceptable only if it lives in the caller's own folder. */
export function isOwnedImageUrl(url: string, userId: string, supabaseUrl: string): boolean {
  const path = storagePathFromPublicUrl(url, supabaseUrl);
  return path !== null && path.startsWith(`${userId}/`);
}
