import { requireUser } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import Link from "next/link";
import { PenLine, Eye, EyeOff } from "lucide-react";
import { formatDate } from "@/lib/utils/dates";
import { togglePublish, deletePost } from "@/lib/actions/posts";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "My Posts" };

type SearchParams = { filter?: string };

export default async function MyPostsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { filter } = await searchParams;
  const user = await requireUser();
  const supabase = await createSupabaseServerClient();

  let query = supabase
    .from("posts")
    .select("id, title, slug, published, created_at, published_at, word_count", {
      count: "exact",
    })
    .eq("author", user.id)
    .order("created_at", { ascending: false });

  if (filter === "published") query = query.eq("published", true);
  if (filter === "drafts") query = query.eq("published", false);

  const { data: posts, count } = await query;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">My Posts ({count ?? 0})</h1>
        <Link href="/dashboard/posts/new" className="btn btn-primary btn-sm">
          <PenLine size={14} /> New post
        </Link>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2">
        {[
          { label: "All", value: undefined },
          { label: "Published", value: "published" },
          { label: "Drafts", value: "drafts" },
        ].map(({ label, value }) => (
          <Link
            key={label}
            href={value ? `/dashboard/posts?filter=${value}` : "/dashboard/posts"}
            className={`btn btn-sm ${filter === value ? "btn-primary" : "btn-secondary"}`}
          >
            {label}
          </Link>
        ))}
      </div>

      {!posts?.length ? (
        <div className="card p-12 text-center">
          <p className="text-[var(--text-muted)] mb-4">No posts found.</p>
          <Link href="/dashboard/posts/new" className="btn btn-primary">
            Write your first post
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {posts.map((post) => (
            <li key={post.id} className="card p-4 flex flex-wrap items-center gap-3">
              <span className={`badge shrink-0 ${post.published ? "badge-success" : "badge-neutral"}`}>
                {post.published ? "Published" : "Draft"}
              </span>

              <span className="font-medium flex-1 min-w-0 truncate">{post.title}</span>

              <span className="text-xs text-[var(--text-muted)] shrink-0">
                {formatDate(post.published_at ?? post.created_at)}
              </span>

              <div className="flex gap-2 shrink-0">
                <Link
                  href={`/dashboard/posts/${post.id}/edit`}
                  className="btn btn-secondary btn-sm"
                >
                  Edit
                </Link>
                {post.published && (
                  <Link href={`/blog/${post.slug}`} className="btn btn-ghost btn-sm">
                    View
                  </Link>
                )}
                <form
                  action={async () => {
                    "use server";
                    await togglePublish(post.id);
                  }}
                >
                  <button type="submit" className="btn btn-ghost btn-sm">
                    {post.published ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
