"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { signUpSchema, signInSchema, resetPasswordSchema } from "@/lib/schemas";
import type { ActionResult } from "@/lib/errors";
import { toUserMessage, logServerError } from "@/lib/errors";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://blogsphere.vercel.app";

// ── Sign Up ───────────────────────────────────────────────────────────────────

export async function signUp(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const raw = {
    displayName: formData.get("displayName"),
    email:       formData.get("email"),
    password:    formData.get("password"),
  };

  const parsed = signUpSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      message: "Please fix the errors below.",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const { displayName, email, password } = parsed.data;
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { display_name: displayName },
      emailRedirectTo: `${SITE_URL}/auth/callback`,
    },
  });

  if (error) {
    logServerError("auth.signUp", error, {});
    return { ok: false, message: toUserMessage(error) };
  }

  return {
    ok: true,
    message:
      "Account created! Please check your email and click the confirmation link.",
  };
}

// ── Sign In ───────────────────────────────────────────────────────────────────

export async function signIn(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const raw = {
    email:    formData.get("email"),
    password: formData.get("password"),
  };

  const parsed = signInSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      message: "Please fix the errors below.",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    logServerError("auth.signIn", error, {});
    if (error.message?.toLowerCase().includes("invalid login credentials")) {
      return { ok: false, message: "Incorrect email or password." };
    }
    if (error.message?.toLowerCase().includes("email not confirmed")) {
      return {
        ok: false,
        message: "Please confirm your email address before signing in.",
      };
    }
    return { ok: false, message: toUserMessage(error) };
  }

  redirect("/dashboard");
}

// ── Sign Out ──────────────────────────────────────────────────────────────────

export async function signOut() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/");
}

// ── Reset password request ────────────────────────────────────────────────────

export async function requestPasswordReset(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const raw = { email: formData.get("email") };
  const parsed = resetPasswordSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      message: "Enter a valid email address.",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${SITE_URL}/auth/update-password`,
  });

  if (error) {
    logServerError("auth.resetPassword", error, {});
    // Don't reveal whether the email exists
  }

  return {
    ok: true,
    message:
      "If that email is registered, you'll receive a reset link shortly.",
  };
}

// ── Update password ───────────────────────────────────────────────────────────

export async function updatePassword(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const password = formData.get("password") as string;
  const confirm  = formData.get("confirm")  as string;

  if (!password || password.length < 8) {
    return { ok: false, message: "Password must be at least 8 characters." };
  }
  if (password !== confirm) {
    return { ok: false, message: "Passwords do not match." };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    logServerError("auth.updatePassword", error, {});
    return { ok: false, message: toUserMessage(error) };
  }

  redirect("/dashboard");
}
