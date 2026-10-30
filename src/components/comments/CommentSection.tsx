"use client";

import { useActionState, useRef, useState } from "react";
import { Send, Trash2, Edit2, X, Check } from "lucide-react";
import { addComment, deleteComment, editComment } from "@/lib/actions/comments";
import type { CommentWithProfile } from "@/types/database";
import type { UserSession } from "@/lib/auth/session";
import { formatDate } from "@/lib/utils/dates";
import Link from "next/link";

type Props = {
  postId: string;
  postSlug: string;
  comments: CommentWithProfile[];
  currentUser: UserSession | null;
};

const INITIAL = { ok: false, message: "" };

export default function CommentSection({
  postId,
  postSlug,
  comments,
  currentUser,
}: Props) {
  const [state, formAction, pending] = useActionState(addComment, INITIAL as any);
  const formRef = useRef<HTMLFormElement>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Reset form after successful comment
  if (state?.ok && formRef.current) {
    formRef.current.reset();
  }

  return (
    <section id="comments" className="mt-16">
      <h2 className="text-2xl font-bold mb-8">
        Comments ({comments.length})
      </h2>

      {/* Comment form */}
      {currentUser ? (
        <form
          ref={formRef}
          action={formAction}
          className="card p-6 mb-10"
        >
          <input type="hidden" name="post_id" value={postId} />
          <label className="label" htmlFor="comment-body">
            Leave a comment
          </label>
          <textarea
            id="comment-body"
            name="body"
            className="textarea mb-3"
            placeholder="Share your thoughts…"
            rows={4}
            maxLength={2000}
            required
          />
          {state && !state.ok && state.message && (
            <p className="field-error mb-3">{state.message}</p>
          )}
          {state?.ok && (
            <p className="text-sm text-[var(--success)] mb-3">{state.message}</p>
          )}
          <button type="submit" className="btn btn-primary" disabled={pending}>
            <Send size={15} />
            {pending ? "Posting…" : "Post comment"}
          </button>
        </form>
      ) : (
        <div className="card p-6 text-center mb-10">
          <p className="text-[var(--text-secondary)] mb-4">
            Sign in to join the conversation.
          </p>
          <Link href={`/login?redirect=/blog/${postSlug}#comments`} className="btn btn-primary">
            Sign in
          </Link>
        </div>
      )}

      {/* Comment list */}
      {comments.length === 0 ? (
        <p className="text-[var(--text-muted)] text-center py-10">
          No comments yet. Be the first!
        </p>
      ) : (
        <ul className="space-y-6">
          {comments.map((c) => {
            const canEdit =
              currentUser?.id === c.user_id;
            const canDelete =
              currentUser?.id === c.user_id || currentUser?.role === "admin";
            return (
              <li key={c.id} className="flex gap-4">
                {/* Avatar */}
                <Link href={`/authors/${c.profiles.id}`} className="shrink-0 mt-1">
                  {c.profiles.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={c.profiles.avatar_url}
                      alt={c.profiles.display_name}
                      className="w-9 h-9 rounded-full object-cover"
                    />
                  ) : (
                    <span className="w-9 h-9 rounded-full bg-gradient-to-br from-[var(--brand-400)] to-[var(--brand-600)] flex items-center justify-center text-white font-bold text-sm">
                      {c.profiles.display_name.charAt(0)}
                    </span>
                  )}
                </Link>

                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1.5">
                    <Link
                      href={`/authors/${c.profiles.id}`}
                      className="font-semibold text-sm hover:text-[var(--brand-500)] transition-colors"
                    >
                      {c.profiles.display_name}
                    </Link>
                    <span className="text-xs text-[var(--text-muted)]">
                      {formatDate(c.updated_at ?? c.created_at)}
                      {c.updated_at && c.updated_at !== c.created_at && " (edited)"}
                    </span>
                  </div>

                  {editingId === c.id ? (
                    <InlineEdit
                      comment={c}
                      postSlug={postSlug}
                      onClose={() => setEditingId(null)}
                    />
                  ) : (
                    <>
                      <p className="text-sm text-[var(--text-secondary)] whitespace-pre-line leading-relaxed">
                        {c.body}
                      </p>
                      <div className="flex gap-3 mt-2">
                        {canEdit && (
                          <button
                            onClick={() => setEditingId(c.id)}
                            className="btn btn-ghost btn-sm text-xs"
                          >
                            <Edit2 size={12} /> Edit
                          </button>
                        )}
                        {canDelete && (
                          <form
                            action={async () => {
                              await deleteComment(c.id, postSlug);
                            }}
                          >
                            <button type="submit" className="btn btn-ghost btn-sm text-xs text-[var(--danger)]">
                              <Trash2 size={12} /> Delete
                            </button>
                          </form>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function InlineEdit({
  comment,
  postSlug,
  onClose,
}: {
  comment: CommentWithProfile;
  postSlug: string;
  onClose: () => void;
}) {
  const [state, formAction, pending] = useActionState(editComment, INITIAL as any);

  if (state?.ok) onClose();

  return (
    <form action={formAction}>
      <input type="hidden" name="id" value={comment.id} />
      <textarea
        name="body"
        className="textarea text-sm mb-2"
        rows={3}
        defaultValue={comment.body}
        required
      />
      {state && !state.ok && state.message && (
        <p className="field-error mb-2">{state.message}</p>
      )}
      <div className="flex gap-2">
        <button type="submit" className="btn btn-primary btn-sm" disabled={pending}>
          <Check size={13} /> Save
        </button>
        <button type="button" onClick={onClose} className="btn btn-ghost btn-sm">
          <X size={13} /> Cancel
        </button>
      </div>
    </form>
  );
}
