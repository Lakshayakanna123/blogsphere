"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/session";
import { commentSchema, updateCommentSchema } from "@/lib/schemas";
import type { ActionResult } from "@/lib/errors";
import { toUserMessage, logServerError } from "@/lib/errors";
import { canDeleteComment, canEditComment } from "@/lib/utils/permissions";

// ── Add comment ───────────────────────────────────────────────────────────────

export async function addComment(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireUser();

  const parsed = commentSchema.safeParse({
    body:    formData.get("body"),
    post_id: formData.get("post_id"),
  });

  if (!parsed.success) {
    return {
      ok: false,
      message: "Please fix the errors below.",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const supabase = await createSupabaseServerClient();

  // Verify the post is published (user can't comment on drafts unless admin)
  const { data: post } = await supabase
    .from("posts")
    .select("published, slug")
    .eq("id", parsed.data.post_id)
    .single();

  if (!post?.published) {
    return { ok: false, message: "You cannot comment on an unpublished post." };
  }

  const { error } = await supabase.from("comments").insert({
    body:    parsed.data.body,
    post_id: parsed.data.post_id,
    user_id: user.id,
  });

  if (error) {
    logServerError("comments.add", error, { post_id: parsed.data.post_id });
    return { ok: false, message: toUserMessage(error) };
  }

  revalidatePath(`/blog/${post.slug}`);
  return { ok: true, message: "Comment posted!" };
}

// ── Delete comment ────────────────────────────────────────────────────────────

export async function deleteComment(
  id: string,
  postSlug: string,
): Promise<ActionResult> {
  const user = await requireUser();
  const supabase = await createSupabaseServerClient();

  const { data: comment, error: fetchError } = await supabase
    .from("comments")
    .select("user_id")
    .eq("id", id)
    .single();

  if (fetchError || !comment) {
    return { ok: false, message: "Comment not found." };
  }

  if (!canDeleteComment(user, comment)) {
    return { ok: false, message: "You don't have permission to delete this comment." };
  }

  const { error } = await supabase.from("comments").delete().eq("id", id);

  if (error) {
    logServerError("comments.delete", error, { id });
    return { ok: false, message: toUserMessage(error) };
  }

  revalidatePath(`/blog/${postSlug}`);
  return { ok: true, message: "Comment deleted." };
}

// ── Edit comment ──────────────────────────────────────────────────────────────

export async function editComment(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireUser();

  const parsed = updateCommentSchema.safeParse({
    body: formData.get("body"),
    id:   formData.get("id"),
  });

  if (!parsed.success) {
    return {
      ok: false,
      message: "Please fix the errors below.",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const supabase = await createSupabaseServerClient();
  const { data: comment, error: fetchError } = await supabase
    .from("comments")
    .select("user_id, post_id")
    .eq("id", parsed.data.id)
    .single();

  if (fetchError || !comment) {
    return { ok: false, message: "Comment not found." };
  }

  if (!canEditComment(user, comment)) {
    return { ok: false, message: "You can only edit your own comments." };
  }

  const { error } = await supabase
    .from("comments")
    .update({ body: parsed.data.body, updated_at: new Date().toISOString() })
    .eq("id", parsed.data.id);

  if (error) {
    logServerError("comments.edit", error, { id: parsed.data.id });
    return { ok: false, message: toUserMessage(error) };
  }

  // We need the post slug to revalidate - look it up
  const { data: post } = await supabase
    .from("posts")
    .select("slug")
    .eq("id", comment.post_id)
    .single();

  if (post) revalidatePath(`/blog/${post.slug}`);
  return { ok: true, message: "Comment updated." };
}
