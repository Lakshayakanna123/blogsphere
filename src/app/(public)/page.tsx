import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/session";
import Link from "next/link";
import { ArrowRight, PenLine, Users, BookOpen, Sparkles } from "lucide-react";
import PostCard from "@/components/posts/PostCard";
import type { PostSummaryWithAuthor } from "@/types/database";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "BlogSphere — Where Ideas Take Shape",
  description:
    "Discover thought-provoking articles and connect with a community of curious minds. Start reading or start writing today.",
};

// Revalidate every 5 minutes
export const revalidate = 300;

export default async function HomePage() {
  const [supabase, user] = await Promise.all([
    createSupabaseServerClient(),
    getCurrentUser(),
  ]);

  const { data: posts } = await supabase
    .from("posts")
    .select(
      `id, author, title, slug, excerpt, cover_image_url, published, tags,
       created_at, updated_at, published_at, word_count,
       profiles ( id, display_name, avatar_url )`,
    )
    .eq("published", true)
    .order("published_at", { ascending: false })
    .limit(6);

  const featured = posts?.[0] as PostSummaryWithAuthor | undefined;
  const grid = (posts?.slice(1) ?? []) as PostSummaryWithAuthor[];

  return (
    <>
      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="hero-gradient">
        <div className="page-wrapper py-28 text-center">
          <div className="inline-flex items-center gap-2 badge badge-brand mb-6 animate-fade-in-up">
            <Sparkles size={13} />
            Your next great read is here
          </div>
          <h1
            className="gradient-text mb-6 animate-fade-in-up"
            style={{ animationDelay: "60ms" }}
          >
            Where Ideas Take Shape
          </h1>
          <p
            className="text-lg text-[var(--text-secondary)] max-w-2xl mx-auto mb-10 animate-fade-in-up"
            style={{ animationDelay: "120ms" }}
          >
            BlogSphere is a community platform for writers and readers.
            Discover in-depth articles, share your expertise, and join the
            conversation.
          </p>
          <div
            className="flex flex-wrap gap-3 justify-center animate-fade-in-up"
            style={{ animationDelay: "180ms" }}
          >
            <Link href="/blog" className="btn btn-primary btn-lg">
              Start Reading <ArrowRight size={18} />
            </Link>
            {user ? (
              <Link
                href="/dashboard/posts/new"
                className="btn btn-secondary btn-lg"
              >
                <PenLine size={18} /> Write a Post
              </Link>
            ) : (
              <Link href="/signup" className="btn btn-secondary btn-lg">
                Join for Free
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* ── Stats ─────────────────────────────────────────────────────────── */}
      <section className="border-y border-[var(--border)]">
        <div className="page-wrapper py-10">
          <div className="grid grid-cols-3 gap-6 text-center">
            {STATS.map(({ icon: Icon, label, value }) => (
              <div key={label} className="space-y-1">
                <Icon
                  size={22}
                  className="mx-auto text-[var(--brand-400)] mb-2"
                />
                <p className="text-2xl font-bold gradient-text">{value}</p>
                <p className="text-sm text-[var(--text-muted)]">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Featured post ─────────────────────────────────────────────────── */}
      {featured && (
        <section className="page-wrapper py-16">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold">Featured</h2>
          </div>
          <PostCard post={featured} size="large" />
        </section>
      )}

      {/* ── Grid ──────────────────────────────────────────────────────────── */}
      {grid.length > 0 && (
        <section className="page-wrapper pb-20">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold">Latest Posts</h2>
            <Link
              href="/blog"
              className="text-sm text-[var(--brand-500)] hover:text-[var(--brand-400)] transition-colors flex items-center gap-1 font-medium"
            >
              View all <ArrowRight size={15} />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {grid.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        </section>
      )}

      {/* ── CTA ───────────────────────────────────────────────────────────── */}
      {!user && (
        <section className="bg-gradient-to-br from-[var(--brand-600)] to-[var(--brand-800)] text-white">
          <div className="page-wrapper py-20 text-center">
            <h2 className="text-3xl font-bold mb-4">Ready to start writing?</h2>
            <p className="text-white/70 mb-8 max-w-xl mx-auto">
              Join thousands of writers sharing their ideas on BlogSphere.
              It&apos;s free and takes less than a minute to get started.
            </p>
            <Link
              href="/signup"
              className="btn btn-lg"
              style={{ background: "white", color: "var(--brand-700)" }}
            >
              Create your account <ArrowRight size={18} />
            </Link>
          </div>
        </section>
      )}
    </>
  );
}

const STATS = [
  { icon: BookOpen, value: "1,000+", label: "Articles published" },
  { icon: Users,    value: "500+",   label: "Active writers" },
  { icon: PenLine,  value: "50K+",   label: "Words written today" },
];
