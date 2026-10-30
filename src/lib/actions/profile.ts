"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/session";
import { updateProfileSchema } from "@/lib/schemas";
import type { ActionResult } from "@/lib/errors";
import { toUserMessage, logServerError } from "@/lib/errors";

// ── Update profile ────────────────────────────────────────────────────────────

export async function updateProfile(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireUser();

  const parsed = updateProfileSchema.safeParse({
    display_name: formData.get("display_name"),
    bio:          formData.get("bio"),
    avatar_url:   formData.get("avatar_url") || null,
  });

  if (!parsed.success) {
    return {
      ok: false,
      message: "Please fix the errors below.",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const supabase = await createSupabaseServerClient();

  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: parsed.data.display_name,
      bio:          parsed.data.bio,
      avatar_url:   parsed.data.avatar_url,
      updated_at:   new Date().toISOString(),
    })
    .eq("id", user.id);

  if (error) {
    logServerError("profile.update", error, { userId: user.id });
    return { ok: false, message: toUserMessage(error) };
  }

  revalidatePath("/dashboard/profile");
  revalidatePath(`/authors/${user.id}`);

  return { ok: true, message: "Profile updated successfully!" };
}

// ── Upload avatar ─────────────────────────────────────────────────────────────

export async function uploadAvatar(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult<{ url: string }>> {
  const user = await requireUser();

  const file = formData.get("avatar") as File | null;
  if (!file || file.size === 0) {
    return { ok: false, message: "No file selected." };
  }

  // Validate file type
  const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  if (!ALLOWED.includes(file.type)) {
    return { ok: false, message: "Only JPEG, PNG, WebP, or GIF images are allowed." };
  }

  // Validate file size (2 MB)
  if (file.size > 2 * 1024 * 1024) {
    return { ok: false, message: "Image must be 2 MB or smaller." };
  }

  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `avatars/${user.id}/avatar.${ext}`;

  const supabase = await createSupabaseServerClient();
  const { error: uploadError } = await supabase.storage
    .from("uploads")
    .upload(path, file, { upsert: true, contentType: file.type });

  if (uploadError) {
    logServerError("profile.uploadAvatar", uploadError, { userId: user.id });
    return { ok: false, message: toUserMessage(uploadError) };
  }

  const { data: urlData } = supabase.storage.from("uploads").getPublicUrl(path);
  const publicUrl = urlData.publicUrl;

  // Save to profile
  await supabase
    .from("profiles")
    .update({ avatar_url: publicUrl, updated_at: new Date().toISOString() })
    .eq("id", user.id);

  revalidatePath("/dashboard/profile");
  return { ok: true, message: "Avatar updated!", data: { url: publicUrl } };
}
