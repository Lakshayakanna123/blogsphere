import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://blogsphere.vercel.app";

/**
 * /auth/callback — receives the PKCE code from Supabase email links and
 * exchanges it for a session.  Works for:
 *   - email confirmation after sign-up
 *   - magic link sign-in
 *   - password reset (redirects to /auth/update-password)
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code  = searchParams.get("code");
  const next  = searchParams.get("next") ?? "/dashboard";
  const error = searchParams.get("error");

  if (error) {
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(error)}`, SITE_URL),
    );
  }

  if (!code) {
    return NextResponse.redirect(new URL("/login", SITE_URL));
  }

  const supabase = await createSupabaseServerClient();
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError) {
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(exchangeError.message)}`, SITE_URL),
    );
  }

  return NextResponse.redirect(new URL(next, SITE_URL));
}
