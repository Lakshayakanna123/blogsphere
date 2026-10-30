import { type NextRequest, NextResponse } from "next/server";
import { updateSupabaseSession } from "@/lib/supabase/proxy";

/**
 * Proxy (formerly Middleware) — refreshes the Supabase session cookie on
 * every matched request. This is mandatory for SSR auth with @supabase/ssr.
 *
 * Route-level access control is handled inside Server Components / Server
 * Actions (via requireUser / requireAdmin) not here, because this runs
 * before RSC. Optimistic checks (redirect unauthenticated users away from
 * /dashboard shell) are acceptable to add here later.
 */
export async function proxy(request: NextRequest) {
  return await updateSupabaseSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except static assets and Next internals.
     * Pattern mirrors the recommended Supabase + Next.js pattern.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)$).*)",
  ],
};
