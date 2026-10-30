import { z } from "zod";
import { SLUG_MAX_LENGTH, SLUG_PATTERN } from "@/lib/utils/slug";
import { MAX_TAGS, MAX_TAG_LENGTH } from "@/lib/utils/tags";

// ── Auth ─────────────────────────────────────────────────────────────────────

export const signUpSchema = z.object({
  displayName: z
    .string()
    .min(1, "Name is required")
    .max(80, "Name must be 80 characters or fewer")
    .transform((v) => v.trim()),
  email: z.string().email("Enter a valid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(72, "Password is too long"),
});

export const signInSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

export const resetPasswordSchema = z.object({
  email: z.string().email("Enter a valid email address"),
});

export const updatePasswordSchema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters").max(72),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, {
    message: "Passwords do not match",
    path: ["confirm"],
  });

// ── Profile ───────────────────────────────────────────────────────────────────

export const updateProfileSchema = z.object({
  display_name: z
    .string()
    .min(1, "Display name is required")
    .max(80)
    .transform((v) => v.trim()),
  bio: z
    .string()
    .max(500, "Bio must be 500 characters or fewer")
    .optional()
    .transform((v) => v?.trim() ?? null),
  avatar_url: z
    .string()
    .url("Must be a valid URL")
    .max(1024)
    .optional()
    .nullable()
    .transform((v) => v?.trim() ?? null),
});

// ── Post ──────────────────────────────────────────────────────────────────────

const tagSchema = z
  .string()
  .max(MAX_TAG_LENGTH, `Tag must be ${MAX_TAG_LENGTH} characters or fewer`)
  .transform((t) =>
    t
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/[\s-]+/g, "-")
      .replace(/^-+|-+$/g, ""),
  )
  .refine((t) => t.length > 0, "Tag is empty after normalisation");

export const postSchema = z.object({
  title: z
    .string()
    .min(1, "Title is required")
    .max(200, "Title must be 200 characters or fewer")
    .transform((v) => v.trim()),
  slug: z
    .string()
    .min(1, "Slug is required")
    .max(SLUG_MAX_LENGTH, `Slug must be ${SLUG_MAX_LENGTH} characters or fewer`)
    .regex(SLUG_PATTERN, "Slug may only contain lowercase letters, numbers, and hyphens")
    .transform((v) => v.trim().toLowerCase()),
  excerpt: z
    .string()
    .max(300, "Excerpt must be 300 characters or fewer")
    .optional()
    .nullable()
    .transform((v) => v?.trim() ?? null),
  markdown: z
    .string()
    .max(100_000, "Article body is too long")
    .default(""),
  cover_image_url: z
    .string()
    .url("Must be a valid URL")
    .max(1024)
    .optional()
    .nullable()
    .transform((v) => v?.trim() ?? null),
  tags: z.array(tagSchema).max(MAX_TAGS, `Maximum ${MAX_TAGS} tags allowed`).default([]),
  published: z.boolean().default(false),
});

// ── Comment ───────────────────────────────────────────────────────────────────

export const commentSchema = z.object({
  body: z
    .string()
    .min(1, "Comment cannot be empty")
    .max(2000, "Comment must be 2 000 characters or fewer")
    .transform((v) => v.trim()),
  post_id: z.string().uuid("Invalid post ID"),
});

export const updateCommentSchema = z.object({
  body: z
    .string()
    .min(1, "Comment cannot be empty")
    .max(2000)
    .transform((v) => v.trim()),
  id: z.string().uuid("Invalid comment ID"),
});

// ── Inferred types ────────────────────────────────────────────────────────────

export type SignUpInput = z.infer<typeof signUpSchema>;
export type SignInInput = z.infer<typeof signInSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type UpdatePasswordInput = z.infer<typeof updatePasswordSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type PostInput = z.infer<typeof postSchema>;
export type CommentInput = z.infer<typeof commentSchema>;
export type UpdateCommentInput = z.infer<typeof updateCommentSchema>;
