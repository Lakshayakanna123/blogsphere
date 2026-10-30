"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireUser, requireAdmin } from "@/lib/auth/session";
import { postSchema } from "@/lib/schemas";
import type { ActionResult } from "@/lib/errors";
import { toUserMessage, logServerError } from "@/lib/errors";
import { slugify, generateUniqueSlug } from "@/lib/utils/slug";
import { canEditPost, canDeletePost } from "@/lib/utils/permissions";

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseFormPost(formData: FormData) {
  return {
    title:           formData.get("title"),
    slug:            formData.get("slug"),
    excerpt:         formData.get("excerpt"),
    markdown:        formData.get("markdown"),
    cover_image_url: formData.get("cover_image_url"),
    tags:            JSON.parse((formData.get("tags") as string) ?? "[]"),
    published:       formData.get("published") === "true",
  };
}

// ── Create post ───────────────────────────────────────────────────────────────

export async function createPost(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult<{ slug: string }>> {
  const user = await requireUser();

  const parsed = postSchema.safeParse(parseFormPost(formData));
  if (!parsed.success) {
    return {
      ok: false,
      message: "Please fix the errors below.",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const data = parsed.data;
  const supabase = await createSupabaseServerClient();

  // Ensure unique slug
  const uniqueSlug = await generateUniqueSlug(
    data.slug || data.title,
    async (candidate) => {
      const { data: row } = await supabase
        .from("posts")
        .select("slug")
        .eq("slug", candidate)
        .maybeSingle();
      return row !== null;
    },
  );

  const { data: post, error } = await supabase
    .from("posts")
    .insert({
      ...data,
      slug:       uniqueSlug,
      author:     user.id,
      word_count: countWords(data.markdown),
      published_at: data.published ? new Date().toISOString() : null,
    })
    .select("slug")
    .single();

  if (error || !post) {
    logServerError("posts.create", error, { slug: uniqueSlug });
    return { ok: false, message: toUserMessage(error) };
  }

  revalidatePath("/blog");
  revalidatePath("/");
  revalidatePath("/dashboard");
  redirect(`/blog/${post.slug}`);
}

// ── Update post ───────────────────────────────────────────────────────────────

export async function updatePost(
  id: string,
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult<{ slug: string }>> {
  const user = await requireUser();

  const parsed = postSchema.safeParse(parseFormPost(formData));
  if (!parsed.success) {
    return {
      ok: false,
      message: "Please fix the errors below.",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const data = parsed.data;
  const supabase = await createSupabaseServerClient();

  // Verify ownership
  const { data: existing, error: fetchError } = await supabase
    .from("posts")
    .select("id, author, published, slug")
    .eq("id", id)
    .single();

  if (fetchError || !existing) {
    return { ok: false, message: "Post not found." };
  }

  if (!canEditPost(user, existing)) {
    return { ok: false, message: "You don't have permission to edit this post." };
  }

  // If slug changed, check uniqueness
  let newSlug = data.slug;
  if (newSlug !== existing.slug) {
    newSlug = await generateUniqueSlug(
      data.slug || data.title,
      async (candidate) => {
        if (candidate === existing.slug) return false;
        const { data: row } = await supabase
          .from("posts")
          .select("slug")
          .eq("slug", candidate)
          .maybeSingle();
        return row !== null;
      },
    );
  }

  const { data: updated, error } = await supabase
    .from("posts")
    .update({
      ...data,
      slug:       newSlug,
      word_count: countWords(data.markdown),
      published_at:
        data.published && !existing.published
          ? new Date().toISOString()
          : undefined,
    })
    .eq("id", id)
    .select("slug")
    .single();

  if (error || !updated) {
    logServerError("posts.update", error, { id });
    return { ok: false, message: toUserMessage(error) };
  }

  revalidatePath(`/blog/${updated.slug}`);
  revalidatePath("/blog");
  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/posts/${id}/edit`);

  return { ok: true, message: "Post saved successfully!", data: { slug: updated.slug } };
}

// ── Delete post ───────────────────────────────────────────────────────────────

export async function deletePost(id: string): Promise<ActionResult> {
  const user = await requireUser();
  const supabase = await createSupabaseServerClient();

  const { data: post, error: fetchError } = await supabase
    .from("posts")
    .select("author, published, slug")
    .eq("id", id)
    .single();

  if (fetchError || !post) {
    return { ok: false, message: "Post not found." };
  }

  if (!canDeletePost(user, post)) {
    return { ok: false, message: "You don't have permission to delete this post." };
  }

  const { error } = await supabase.from("posts").delete().eq("id", id);
  if (error) {
    logServerError("posts.delete", error, { id });
    return { ok: false, message: toUserMessage(error) };
  }

  revalidatePath("/blog");
  revalidatePath("/");
  revalidatePath("/dashboard");
  redirect("/dashboard");
}

// ── Toggle publish ────────────────────────────────────────────────────────────

export async function togglePublish(id: string): Promise<ActionResult> {
  const user = await requireUser();
  const supabase = await createSupabaseServerClient();

  const { data: post, error: fetchError } = await supabase
    .from("posts")
    .select("author, published, slug")
    .eq("id", id)
    .single();

  if (fetchError || !post) return { ok: false, message: "Post not found." };
  if (!canEditPost(user, post)) {
    return { ok: false, message: "Permission denied." };
  }

  const newPublished = !post.published;
  const { error } = await supabase
    .from("posts")
    .update({
      published: newPublished,
      published_at: newPublished ? new Date().toISOString() : null,
    })
    .eq("id", id);

  if (error) {
    logServerError("posts.togglePublish", error, { id });
    return { ok: false, message: toUserMessage(error) };
  }

  revalidatePath(`/blog/${post.slug}`);
  revalidatePath("/blog");
  revalidatePath("/dashboard");

  return {
    ok: true,
    message: newPublished ? "Post published." : "Post moved to drafts.",
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function countWords(markdown: string): number {
  return markdown
    .replace(/[#*`_~\[\]()>!]/g, "")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}
