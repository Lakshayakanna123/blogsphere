import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Role } from "@/lib/utils/permissions";

export type UserSession = {
  id: string;
  email: string | undefined;
  role: Role;
  displayName: string;
  avatarUrl: string | null;
};

/**
 * Data Access Layer: session reader.
 *
 * Returns the authenticated user with their profile role, or null.
 * Always calls getUser() (server-side JWT validation via Supabase Auth)
 * before touching the database — never trusts getSession() alone.
 *
 * This is the canonical "who is making this request?" function.
 * Use it in every Server Action and Route Handler that needs the caller.
 */
export async function getCurrentUser(): Promise<UserSession | null> {
  "use cache: private";

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, avatar_url, role")
    .eq("id", user.id)
    .single();

  return {
    id: user.id,
    email: user.email,
    role: (profile?.role ?? "writer") as Role,
    displayName: profile?.display_name ?? user.email?.split("@")[0] ?? "Unknown",
    avatarUrl: profile?.avatar_url ?? null,
  };
}

/**
 * Require authentication — throws a redirect to /login if unauthenticated.
 * Use in Server Actions and protected Route Handlers.
 */
export async function requireUser(): Promise<UserSession> {
  const { redirect } = await import("next/navigation");
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/**
 * Require admin role — redirects to / if authenticated but not admin.
 */
export async function requireAdmin(): Promise<UserSession> {
  const { redirect } = await import("next/navigation");
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "admin") redirect("/");
  return user;
}
