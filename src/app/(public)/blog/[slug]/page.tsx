import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/session";
import { canViewPost } from "@/lib/utils/permissions";
import { formatDate } from "@/lib/utils/dates";
import { readingTime } from "@/lib/utils/reading";
import type { PostWithAuthor, CommentWithProfile } from "@/types/database";
import type { Metadata } from "next";
import Link from "next/link";
import { Calendar, Clock, Tag, Edit } from "lucide-react";
import PostBody from "@/components/posts/PostBody";
import CommentSection from "@/components/comments/CommentSection";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("posts")
    .select("title, excerpt, cover_image_url")
    .eq("slug", slug)
    .single();

  if (!data) return {};

  return {
    title: data.title,
    description: data.excerpt ?? undefined,
    openGraph: {
      title: data.title,
      description: data.excerpt ?? undefined,
      images: data.cover_image_url ? [{ url: data.cover_image_url }] : [],
    },
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const [supabase, user] = await Promise.all([
    createSupabaseServerClient(),
    getCurrentUser(),
  ]);

  const { data: post } = await supabase
    .from("posts")
    .select(
      `*, profiles ( id, display_name, avatar_url, bio )`,
    )
    .eq("slug", slug)
    .single();

  if (!post || !canViewPost(user, post as PostWithAuthor)) notFound();

  const typedPost = post as PostWithAuthor;

  // Fetch comments
  const { data: comments } = await supabase
    .from("comments")
    .select(`*, profiles ( id, display_name, avatar_url )`)
    .eq("post_id", post.id)
    .order("created_at", { ascending: true });

  const mins = readingTime(post.word_count ?? 0);
  const author = typedPost.profiles;

  return (
    <div className="page-wrapper py-16">
      <div className="max-w-3xl mx-auto">
        {/* Draft banner */}
        {!post.published && (
          <div className="mb-8 flex items-center gap-3 p-4 rounded-lg border border-[var(--warning)] bg-[hsl(38_94%_96%)] dark:bg-[hsl(38_30%_14%)]">
            <span className="badge badge-accent">Draft</span>
            <p className="text-sm text-[var(--text-secondary)]">
              This post is not published. Only you and admins can see it.
            </p>
            {user && (user.id === post.author || user.role === "admin") && (
              <Link
                href={`/dashboard/posts/${post.id}/edit`}
                className="btn btn-sm btn-secondary ml-auto"
              >
                <Edit size={13} /> Edit
              </Link>
            )}
          </div>
        )}

        {/* Tags */}
        {post.tags?.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-6">
            {post.tags.map((tag: string) => (
              <Link key={tag} href={`/blog?tag=${tag}`} className="badge badge-brand">
                <Tag size={11} />{tag}
              </Link>
            ))}
          </div>
        )}

        {/* Title */}
        <h1 className="mb-6">{post.title}</h1>

        {/* Meta row */}
        <div className="flex flex-wrap items-center gap-5 pb-8 mb-8 border-b border-[var(--border)] text-sm text-[var(--text-muted)]">
          <Link
            href={`/authors/${author.id}`}
            className="flex items-center gap-2 hover:text-[var(--text-primary)] transition-colors"
          >
            {author.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={author.avatar_url}
                alt={author.display_name}
                className="w-9 h-9 rounded-full object-cover"
              />
            ) : (
              <span className="w-9 h-9 rounded-full bg-gradient-to-br from-[var(--brand-400)] to-[var(--brand-600)] flex items-center justify-center text-white font-bold">
                {author.display_name.charAt(0)}
              </span>
            )}
            <div className="flex flex-col">
              <span className="font-semibold text-[var(--text-primary)]">
                {author.display_name}
              </span>
            </div>
          </Link>

          <span className="flex items-center gap-1">
            <Calendar size={13} />
            {formatDate(post.published_at ?? post.created_at)}
          </span>
          <span className="flex items-center gap-1">
            <Clock size={13} />
            {mins} min read
          </span>

          {/* Edit button (authors/admins) */}
          {user && (user.id === post.author || user.role === "admin") && (
            <Link
              href={`/dashboard/posts/${post.id}/edit`}
              className="btn btn-sm btn-ghost ml-auto"
            >
              <Edit size={13} /> Edit
            </Link>
          )}
        </div>

        {/* Cover image */}
        {post.cover_image_url && (
          <div className="mb-10 rounded-xl overflow-hidden aspect-video">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={post.cover_image_url}
              alt={post.title}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Article body */}
        <PostBody markdown={post.markdown} />

        {/* Author bio */}
        {author.bio && (
          <div className="mt-14 p-6 card flex items-start gap-4">
            {author.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={author.avatar_url}
                alt={author.display_name}
                className="w-14 h-14 rounded-full object-cover shrink-0"
              />
            ) : (
              <span className="w-14 h-14 rounded-full bg-gradient-to-br from-[var(--brand-400)] to-[var(--brand-600)] flex items-center justify-center text-white text-xl font-bold shrink-0">
                {author.display_name.charAt(0)}
              </span>
            )}
            <div>
              <p className="text-xs uppercase tracking-wider text-[var(--text-muted)] mb-1">
                Written by
              </p>
              <Link
                href={`/authors/${author.id}`}
                className="font-bold hover:text-[var(--brand-500)] transition-colors"
              >
                {author.display_name}
              </Link>
              <p className="text-sm text-[var(--text-secondary)] mt-1 leading-relaxed">
                {author.bio}
              </p>
            </div>
          </div>
        )}

        {/* Comments */}
        <CommentSection
          postId={post.id}
          postSlug={post.slug}
          comments={(comments ?? []) as CommentWithProfile[]}
          currentUser={user}
        />
      </div>
    </div>
  );
}
