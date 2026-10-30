import "server-only";

/**
 * Error mapping and safe server-side logging.
 *
 * - Users get clear but non-sensitive messages.
 * - Logs include an operation name + Postgres/Supabase error code, never
 *   tokens, cookies, passwords or article bodies.
 */

export type ActionResult<T = undefined> =
  | { ok: true; message?: string; data?: T }
  | { ok: false; message: string; fieldErrors?: Record<string, string[] | undefined> };

type SupabaseLikeError = {
  code?: string | null;
  message?: string | null;
  status?: number | null;
  name?: string | null;
};

export const SESSION_EXPIRED_MESSAGE = "Your session has expired. Please sign in again.";
export const GENERIC_ERROR_MESSAGE = "Something went wrong. Please try again.";

/** Translate a PostgREST / Postgres / Storage error into a safe message. */
export function toUserMessage(error: unknown, fallback = GENERIC_ERROR_MESSAGE): string {
  const err = (error ?? {}) as SupabaseLikeError;
  const code = err.code ?? "";
  const message = (err.message ?? "").toLowerCase();

  if (code === "23505") return "That slug is already in use. Please choose another.";
  if (code === "42501" || message.includes("row-level security")) {
    return "You don't have permission to perform this action.";
  }
  if (code === "PGRST116") return "The requested item was not found or you don't have access to it.";
  if (code === "23514") return "Some fields contain invalid values. Please review and try again.";
  if (code === "P0001" && message.includes("rate limit")) {
    return "You're doing that too often. Please wait a minute and try again.";
  }
  if (code === "PGRST301" || message.includes("jwt expired")) return SESSION_EXPIRED_MESSAGE;
  if (message.includes("fetch failed") || message.includes("network")) {
    return "We couldn't reach the server. Check your connection and try again.";
  }
  return fallback;
}

/** Structured, secret-free server log line. */
export function logServerError(operation: string, error: unknown, context: Record<string, unknown> = {}) {
  const err = (error ?? {}) as SupabaseLikeError;
  const safeContext = Object.fromEntries(
    Object.entries(context).filter(([key]) => !/token|password|secret|cookie|markdown|body|email/i.test(key)),
  );
  console.error(
    JSON.stringify({
      level: "error",
      operation,
      code: err.code ?? null,
      status: err.status ?? null,
      name: err.name ?? (error instanceof Error ? error.name : null),
      // Messages from Postgres/Supabase do not contain secrets, but truncate defensively.
      message: (err.message ?? (error instanceof Error ? error.message : String(error))).slice(0, 300),
      ...safeContext,
    }),
  );
}
