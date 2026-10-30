"use client";

import { useActionState, useState, useId } from "react";
import { createPost } from "@/lib/actions/posts";
import { slugify } from "@/lib/utils/slug";
import { parseTags } from "@/lib/utils/tags";
import PostBody from "@/components/posts/PostBody";
import { Eye, EyeOff, Tag, Save, Send } from "lucide-react";

const INITIAL = { ok: false, message: "" };

type PostEditorProps = {
  defaultValues?: {
    id?: string;
    title?: string;
    slug?: string;
    excerpt?: string;
    markdown?: string;
    cover_image_url?: string;
    tags?: string[];
    published?: boolean;
  };
  /** If provided, the editor will call updatePost(id, …) instead of createPost */
  postId?: string;
};

export default function PostEditor({ defaultValues, postId }: PostEditorProps) {
  const [state, formAction, pending] = useActionState(
    createPost,
    INITIAL as any,
  );

  const titleId   = useId();
  const slugId    = useId();
  const excerptId = useId();
  const coverUrlId = useId();
  const tagsId    = useId();
  const bodyId    = useId();

  const [title, setTitle]      = useState(defaultValues?.title ?? "");
  const [slug, setSlug]        = useState(defaultValues?.slug ?? "");
  const [markdown, setMarkdown] = useState(defaultValues?.markdown ?? "");
  const [tagsStr, setTagsStr]  = useState((defaultValues?.tags ?? []).join(", "));
  const [preview, setPreview]  = useState(false);
  const [published, setPublished] = useState(defaultValues?.published ?? false);

  const derivedTags = parseTags(tagsStr);

  function handleTitleChange(val: string) {
    setTitle(val);
    if (!defaultValues?.slug) setSlug(slugify(val));
  }

  return (
    <form action={formAction} className="space-y-6">
      {/* Hidden fields */}
      <input type="hidden" name="tags" value={JSON.stringify(derivedTags)} />
      <input type="hidden" name="published" value={String(published)} />
      <input type="hidden" name="markdown" value={markdown} />

      {/* Title */}
      <div>
        <label className="label" htmlFor={titleId}>Title *</label>
        <input
          id={titleId}
          name="title"
          type="text"
          value={title}
          onChange={(e) => handleTitleChange(e.target.value)}
          className={`input text-lg font-semibold ${state?.fieldErrors?.title ? "error" : ""}`}
          placeholder="Your post title…"
          required
        />
        {state?.fieldErrors?.title?.map((e) => (
          <p key={e} className="field-error">{e}</p>
        ))}
      </div>

      {/* Slug */}
      <div>
        <label className="label" htmlFor={slugId}>Slug *</label>
        <input
          id={slugId}
          name="slug"
          type="text"
          value={slug}
          onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "").replace(/-+/g, "-"))}
          className={`input font-mono text-sm ${state?.fieldErrors?.slug ? "error" : ""}`}
          placeholder="url-friendly-slug"
          required
        />
        {state?.fieldErrors?.slug?.map((e) => (
          <p key={e} className="field-error">{e}</p>
        ))}
        {slug && (
          <p className="text-xs text-[var(--text-muted)] mt-1">
            URL: /blog/<span className="font-mono">{slug}</span>
          </p>
        )}
      </div>

      {/* Excerpt */}
      <div>
        <label className="label" htmlFor={excerptId}>Excerpt (optional)</label>
        <textarea
          id={excerptId}
          name="excerpt"
          defaultValue={defaultValues?.excerpt ?? ""}
          className="textarea"
          placeholder="A short summary shown in post cards…"
          rows={2}
          maxLength={300}
        />
      </div>

      {/* Cover image URL */}
      <div>
        <label className="label" htmlFor={coverUrlId}>Cover image URL (optional)</label>
        <input
          id={coverUrlId}
          name="cover_image_url"
          type="url"
          defaultValue={defaultValues?.cover_image_url ?? ""}
          className="input"
          placeholder="https://images.unsplash.com/…"
        />
      </div>

      {/* Tags */}
      <div>
        <label className="label" htmlFor={tagsId}>
          <Tag size={13} className="inline" /> Tags (comma-separated, max 10)
        </label>
        <input
          id={tagsId}
          type="text"
          value={tagsStr}
          onChange={(e) => setTagsStr(e.target.value)}
          className="input"
          placeholder="javascript, react, webdev"
        />
        {derivedTags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {derivedTags.map((t) => (
              <span key={t} className="badge badge-brand text-xs">{t}</span>
            ))}
          </div>
        )}
      </div>

      {/* Body editor + preview toggle */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="label mb-0" htmlFor={bodyId}>Body (Markdown)</label>
          <button
            type="button"
            onClick={() => setPreview((p) => !p)}
            className="btn btn-ghost btn-sm text-xs"
          >
            {preview ? <EyeOff size={13} /> : <Eye size={13} />}
            {preview ? "Hide preview" : "Preview"}
          </button>
        </div>

        {preview ? (
          <div className="card p-6 min-h-[24rem]">
            {markdown ? (
              <PostBody markdown={markdown} />
            ) : (
              <p className="text-[var(--text-muted)] italic">Nothing to preview yet.</p>
            )}
          </div>
        ) : (
          <textarea
            id={bodyId}
            value={markdown}
            onChange={(e) => setMarkdown(e.target.value)}
            className="textarea font-mono text-sm"
            placeholder="Write your article in Markdown…"
            rows={20}
          />
        )}
      </div>

      {/* Status message */}
      {state && !state.ok && state.message && (
        <div className="p-3 rounded-lg border border-[var(--danger)] bg-[hsl(0_72%_97%)] dark:bg-[hsl(0_20%_14%)] text-sm text-[var(--danger)]">
          {state.message}
        </div>
      )}
      {state?.ok && (
        <div className="p-3 rounded-lg border border-[var(--success)] bg-[hsl(142_72%_96%)] dark:bg-[hsl(142_30%_12%)] text-sm text-[var(--success)]">
          {state.message}
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-3 pt-2">
        <button
          type="submit"
          className="btn btn-secondary"
          disabled={pending}
          onClick={() => setPublished(false)}
        >
          <Save size={16} />
          {pending ? "Saving…" : "Save draft"}
        </button>
        <button
          type="submit"
          className="btn btn-primary"
          disabled={pending}
          onClick={() => setPublished(true)}
        >
          <Send size={16} />
          {pending ? "Publishing…" : "Publish now"}
        </button>
      </div>
    </form>
  );
}
