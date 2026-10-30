import Link from "next/link";
import { Calendar, Clock, Tag } from "lucide-react";
import type { PostSummaryWithAuthor } from "@/types/database";
import { formatDate } from "@/lib/utils/dates";
import { readingTime } from "@/lib/utils/reading";

type PostCardProps = {
  post: PostSummaryWithAuthor;
  size?: "default" | "large";
};

export default function PostCard({ post, size = "default" }: PostCardProps) {
  const author = post.profiles;
  const mins = readingTime(post.word_count ?? 0);

  if (size === "large") {
    return (
      <article className="card card-hover overflow-hidden group">
        <div className="grid md:grid-cols-2 gap-0">
          {/* Cover */}
          <div className="relative h-64 md:h-full bg-[var(--bg-sunken)] overflow-hidden">
            {post.cover_image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={post.cover_image_url}
                alt={post.title}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[var(--brand-500)] to-[var(--brand-700)]">
                <span className="text-6xl font-bold text-white/20 select-none">
                  {post.title.charAt(0)}
                </span>
              </div>
            )}
          </div>

          {/* Content */}
          <div className="p-8 flex flex-col justify-center gap-4">
            {/* Tags */}
            {post.tags?.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {post.tags.slice(0, 3).map((tag) => (
                  <Link
                    key={tag}
                    href={`/tags/${tag}`}
                    className="badge badge-brand"
                  >
                    <Tag size={10} />{tag}
                  </Link>
                ))}
              </div>
            )}

            <h2 className="text-2xl font-bold leading-snug">
              <Link
                href={`/blog/${post.slug}`}
                className="hover:text-[var(--brand-500)] transition-colors"
              >
                {post.title}
              </Link>
            </h2>

            {post.excerpt && (
              <p className="text-[var(--text-secondary)] line-clamp-3">
                {post.excerpt}
              </p>
            )}

            {/* Meta */}
            <div className="flex flex-wrap items-center gap-4 text-sm text-[var(--text-muted)]">
              {/* Author */}
              <Link
                href={`/authors/${author.id}`}
                className="flex items-center gap-2 hover:text-[var(--text-primary)] transition-colors"
              >
                {author.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={author.avatar_url}
                    alt={author.display_name}
                    className="w-6 h-6 rounded-full object-cover"
                  />
                ) : (
                  <span className="w-6 h-6 rounded-full bg-[var(--brand-500)] flex items-center justify-center text-white text-xs font-bold">
                    {author.display_name.charAt(0)}
                  </span>
                )}
                <span className="font-medium">{author.display_name}</span>
              </Link>

              <span className="flex items-center gap-1">
                <Calendar size={13} />
                {formatDate(post.published_at ?? post.created_at)}
              </span>
              <span className="flex items-center gap-1">
                <Clock size={13} />
                {mins} min read
              </span>
            </div>

            <Link
              href={`/blog/${post.slug}`}
              className="btn btn-primary self-start mt-2"
            >
              Read article
            </Link>
          </div>
        </div>
      </article>
    );
  }

  // Default (grid) card
  return (
    <article className="card card-hover overflow-hidden group flex flex-col">
      {/* Cover */}
      <div className="relative h-48 bg-[var(--bg-sunken)] overflow-hidden shrink-0">
        {post.cover_image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={post.cover_image_url}
            alt={post.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[var(--brand-400)] to-[var(--brand-700)]">
            <span className="text-4xl font-bold text-white/20 select-none">
              {post.title.charAt(0)}
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-5 flex flex-col flex-1 gap-3">
        {post.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {post.tags.slice(0, 2).map((tag) => (
              <Link key={tag} href={`/tags/${tag}`} className="badge badge-brand text-xs">
                {tag}
              </Link>
            ))}
          </div>
        )}

        <h3 className="font-bold leading-snug line-clamp-2">
          <Link
            href={`/blog/${post.slug}`}
            className="hover:text-[var(--brand-500)] transition-colors"
          >
            {post.title}
          </Link>
        </h3>

        {post.excerpt && (
          <p className="text-sm text-[var(--text-secondary)] line-clamp-2 flex-1">
            {post.excerpt}
          </p>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between mt-auto pt-3 border-t border-[var(--border-subtle)] text-xs text-[var(--text-muted)]">
          <Link
            href={`/authors/${author.id}`}
            className="flex items-center gap-1.5 hover:text-[var(--text-primary)] transition-colors font-medium"
          >
            {author.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={author.avatar_url}
                alt={author.display_name}
                className="w-5 h-5 rounded-full object-cover"
              />
            ) : (
              <span className="w-5 h-5 rounded-full bg-[var(--brand-500)] flex items-center justify-center text-white text-[10px] font-bold">
                {author.display_name.charAt(0)}
              </span>
            )}
            {author.display_name}
          </Link>
          <span className="flex items-center gap-1">
            <Clock size={11} /> {mins} min
          </span>
        </div>
      </div>
    </article>
  );
}
