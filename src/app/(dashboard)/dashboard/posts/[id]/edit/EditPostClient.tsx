"use client";

import { useActionState, useState } from "react";
import { updatePost, deletePost, togglePublish } from "@/lib/actions/posts";
import { slugify } from "@/lib/utils/slug";
import { parseTags } from "@/lib/utils/tags";
import PostBody from "@/components/posts/PostBody";
import { Eye, EyeOff, Tag, Save, Send, Trash2, EyeIcon } from "lucide-react";
import type { Post } from "@/types/database";

type Props = { post: Post };

const INITIAL = { ok: false, message: "" };

export default function EditPostClient({ post }: Props) {
  const boundUpdate = updatePost.bind(null, post.id);
  const [state, formAction, pending] = useActionState(boundUpdate, INITIAL as any);

  const [title, setTitle]       = useState(post.title);
  const [slug, setSlug]         = useState(post.slug);
  const [markdown, setMarkdown] = useState(post.markdown);
  const [tagsStr, setTagsStr]   = useState(post.tags?.join(", ") ?? "");
  const [preview, setPreview]   = useState(false);
  const [published, setPublished] = useState(post.published);
  const [deleting, setDeleting]   = useState(false);
  const [toggling, setToggling]   = useState(false);

  const derivedTags = parseTags(tagsStr);

  function handleTitleChange(val: string) {
    setTitle(val);
    if (val && !post.slug) setSlug(slugify(val));
  }

  async function handleDelete() {
    if (!confirm("Delete this post permanently? This cannot be undone.")) return;
    setDeleting(true);
    await deletePost(post.id);
  }

  async function handleToggle() {
    setToggling(true);
    await togglePublish(post.id);
    setToggling(false);
  }

  return (
    <form action={formAction} className="space-y-6">
      {/* Hidden fields */}
      <input type="hidden" name="tags"      value={JSON.stringify(derivedTags)} />
      <input type="hidden" name="published" value={String(published)} />
      <input type="hidden" name="markdown"  value={markdown} />

      {/* Title */}
      <div>
        <label className="label" htmlFor="edit-title">Title *</label>
        <input
          id="edit-title"
          name="title"
          type="text"
          value={title}
          onChange={(e) => handleTitleChange(e.target.value)}
          className={`input text-lg font-semibold ${state?.fieldErrors?.title ? "error" : ""}`}
          required
        />
        {state?.fieldErrors?.title?.map((e) => (
          <p key={e} className="field-error">{e}</p>
        ))}
      </div>

      {/* Slug */}
      <div>
        <label className="label" htmlFor="edit-slug">Slug *</label>
        <input
          id="edit-slug"
          name="slug"
          type="text"
          value={slug}
          onChange={(e) =>
            setSlug(
              e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "").replace(/-+/g, "-"),
            )
          }
          className="input font-mono text-sm"
          required
        />
      </div>

      {/* Excerpt */}
      <div>
        <label className="label" htmlFor="edit-excerpt">Excerpt</label>
        <textarea
          id="edit-excerpt"
          name="excerpt"
          defaultValue={post.excerpt ?? ""}
          className="textarea"
          rows={2}
          maxLength={300}
        />
      </div>

      {/* Cover image */}
      <div>
        <label className="label" htmlFor="edit-cover">Cover image URL</label>
        <input
          id="edit-cover"
          name="cover_image_url"
          type="url"
          defaultValue={post.cover_image_url ?? ""}
          className="input"
        />
      </div>

      {/* Tags */}
      <div>
        <label className="label" htmlFor="edit-tags">
          <Tag size={13} className="inline" /> Tags
        </label>
        <input
          id="edit-tags"
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

      {/* Body */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="label mb-0" htmlFor="edit-body">Body (Markdown)</label>
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
          <div className="card p-6 min-h-[20rem]">
            {markdown ? <PostBody markdown={markdown} /> : (
              <p className="text-[var(--text-muted)] italic">Nothing to preview.</p>
            )}
          </div>
        ) : (
          <textarea
            id="edit-body"
            value={markdown}
            onChange={(e) => setMarkdown(e.target.value)}
            className="textarea font-mono text-sm"
            rows={18}
          />
        )}
      </div>

      {/* Feedback */}
      {state && !state.ok && state.message && (
        <div className="p-3 rounded-lg border border-[var(--danger)] bg-[hsl(0_72%_97%)] text-sm text-[var(--danger)]">
          {state.message}
        </div>
      )}
      {state?.ok && (
        <div className="p-3 rounded-lg border border-[var(--success)] bg-[hsl(142_72%_96%)] text-sm text-[var(--success)]">
          {state.message}
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-3 pt-2 items-center">
        <button
          type="submit"
          className="btn btn-secondary"
          disabled={pending}
          onClick={() => setPublished(post.published)}
        >
          <Save size={16} /> {pending ? "Saving…" : "Save changes"}
        </button>

        <button
          type="submit"
          className="btn btn-primary"
          disabled={pending}
          onClick={() => setPublished(true)}
        >
          <Send size={16} /> Publish
        </button>

        <button
          type="button"
          onClick={handleToggle}
          disabled={toggling}
          className="btn btn-ghost btn-sm"
        >
          {post.published ? (
            <><EyeOff size={14} /> Move to drafts</>
          ) : (
            <><EyeIcon size={14} /> Publish</>
          )}
        </button>

        <button
          type="button"
          onClick={handleDelete}
          disabled={deleting}
          className="btn btn-danger btn-sm ml-auto"
        >
          <Trash2 size={14} /> {deleting ? "Deleting…" : "Delete post"}
        </button>
      </div>
    </form>
  );
}
