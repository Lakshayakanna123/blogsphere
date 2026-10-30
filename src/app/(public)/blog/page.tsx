import { createSupabaseServerClient } from "@/lib/supabase/server";
import PostCard from "@/components/posts/PostCard";
import type { PostSummaryWithAuthor } from "@/types/database";
import type { Metadata } from "next";
import Link from "next/link";
import { Filter } from "lucide-react";

export const metadata: Metadata = {
  title: "Blog",
  description: "Browse all published articles on BlogSphere.",
};

export const revalidate = 120;

type SearchParams = { tag?: string; page?: string };

export default async function BlogPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { tag, page } = await searchParams;
  const currentPage = Math.max(1, Number(page ?? 1));
  const PAGE_SIZE = 9;
  const offset = (currentPage - 1) * PAGE_SIZE;

  const supabase = await createSupabaseServerClient();

  let query = supabase
    .from("posts")
    .select(
      `id, author, title, slug, excerpt, cover_image_url, published, tags,
       created_at, updated_at, published_at, word_count,
       profiles ( id, display_name, avatar_url )`,
      { count: "exact" },
    )
    .eq("published", true)
    .order("published_at", { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1);

  if (tag) {
    query = query.contains("tags", [tag]);
  }

  const { data: posts, count } = await query;
  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE);

  return (
    <div className="page-wrapper py-16">
      {/* Header */}
      <div className="mb-10">
        <h1 className="text-4xl font-bold mb-3">
          {tag ? (
            <>
              Posts tagged{" "}
              <span className="gradient-text">&ldquo;{tag}&rdquo;</span>
            </>
          ) : (
            "All Posts"
          )}
        </h1>
        <p className="text-[var(--text-secondary)]">
          {count} article{count !== 1 ? "s" : ""} published
        </p>
        {tag && (
          <Link
            href="/blog"
            className="inline-flex items-center gap-1 mt-3 text-sm text-[var(--brand-500)] hover:text-[var(--brand-400)] transition-colors"
          >
            <Filter size={13} /> Clear filter
          </Link>
        )}
      </div>

      {/* Grid */}
      {!posts?.length ? (
        <div className="text-center py-24 text-[var(--text-muted)]">
          <p className="text-lg font-medium">No posts yet.</p>
          <p className="text-sm mt-1">Check back soon!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {(posts as PostSummaryWithAuthor[]).map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-14">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <Link
              key={p}
              href={`/blog?${tag ? `tag=${tag}&` : ""}page=${p}`}
              className={`btn btn-sm ${p === currentPage ? "btn-primary" : "btn-secondary"}`}
            >
              {p}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
