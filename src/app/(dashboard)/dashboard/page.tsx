import { requireUser } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import Link from "next/link";
import { PenLine, BookOpen, Eye, FileText } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const user = await requireUser();
  const supabase = await createSupabaseServerClient();

  const { data: posts, count: totalPosts } = await supabase
    .from("posts")
    .select("id, title, slug, published, created_at, word_count", { count: "exact" })
    .eq("author", user.id)
    .order("created_at", { ascending: false })
    .limit(5);

  const publishedCount = (await supabase
    .from("posts")
    .select("id", { count: "exact", head: true })
    .eq("author", user.id)
    .eq("published", true)).count ?? 0;

  const draftCount = (totalPosts ?? 0) - publishedCount;

  return (
    <div className="space-y-10">
      {/* Greeting */}
      <div>
        <h1 className="text-3xl font-bold">
          Hello, {user.displayName.split(" ")[0]}! 👋
        </h1>
        <p className="text-[var(--text-secondary)] mt-1">
          Here&apos;s a summary of your activity.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Total posts", value: totalPosts ?? 0, icon: FileText, href: "/dashboard/posts" },
          { label: "Published", value: publishedCount, icon: Eye, href: "/dashboard/posts?filter=published" },
          { label: "Drafts", value: draftCount, icon: BookOpen, href: "/dashboard/posts?filter=drafts" },
        ].map(({ label, value, icon: Icon, href }) => (
          <Link
            key={label}
            href={href}
            className="card p-6 flex items-center gap-4 card-hover group"
          >
            <span className="w-12 h-12 rounded-xl bg-[var(--brand-100)] dark:bg-[hsl(262_40%_18%)] flex items-center justify-center text-[var(--brand-500)] group-hover:bg-[var(--brand-500)] group-hover:text-white transition-colors">
              <Icon size={22} />
            </span>
            <div>
              <p className="text-2xl font-bold">{value}</p>
              <p className="text-sm text-[var(--text-muted)]">{label}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Quick action */}
      {(user.role === "writer" || user.role === "admin") && (
        <Link
          href="/dashboard/posts/new"
          className="btn btn-primary btn-lg"
        >
          <PenLine size={18} /> Write a new post
        </Link>
      )}

      {/* Recent posts */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">Recent posts</h2>
          <Link
            href="/dashboard/posts"
            className="text-sm text-[var(--brand-500)] hover:text-[var(--brand-400)] transition-colors"
          >
            View all
          </Link>
        </div>

        {!posts?.length ? (
          <div className="card p-10 text-center">
            <p className="text-[var(--text-muted)] mb-4">No posts yet.</p>
            <Link href="/dashboard/posts/new" className="btn btn-primary">
              Write your first post
            </Link>
          </div>
        ) : (
          <ul className="space-y-3">
            {posts.map((post) => (
              <li key={post.id} className="card p-4 flex items-center gap-3">
                <span className={`badge ${post.published ? "badge-success" : "badge-neutral"} shrink-0`}>
                  {post.published ? "Published" : "Draft"}
                </span>
                <span className="font-medium truncate flex-1">{post.title}</span>
                <Link
                  href={`/dashboard/posts/${post.id}/edit`}
                  className="btn btn-ghost btn-sm shrink-0"
                >
                  Edit
                </Link>
                {post.published && (
                  <Link
                    href={`/blog/${post.slug}`}
                    className="btn btn-ghost btn-sm shrink-0"
                  >
                    View
                  </Link>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
