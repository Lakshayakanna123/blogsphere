/**
 * Hand-crafted database types.
 *
 * These mirror the schema in supabase/migrations/ exactly.
 * When using `supabase gen types typescript`, replace this file with the output.
 */

export type Role = "admin" | "writer" | "reader";

export type Profile = {
  id: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  role: Role;
  created_at: string;
  updated_at: string;
};

export type Post = {
  id: string;
  author: string;
  title: string;
  slug: string;
  excerpt: string | null;
  markdown: string;
  cover_image_url: string | null;
  published: boolean;
  tags: string[];
  created_at: string;
  updated_at: string;
  published_at: string | null;
  word_count: number;
  search_vector: string; // opaque on the client
};

/** Lightweight post row for listings — omits the heavy markdown body. */
export type PostSummary = Omit<Post, "markdown" | "search_vector">;

export type Comment = {
  id: string;
  post_id: string;
  user_id: string;
  body: string;
  created_at: string;
  updated_at: string | null;
};

export type CommentWithProfile = Comment & {
  profiles: Pick<Profile, "id" | "display_name" | "avatar_url">;
};

export type PostWithAuthor = Post & {
  profiles: Pick<Profile, "id" | "display_name" | "avatar_url" | "bio">;
};

export type PostSummaryWithAuthor = PostSummary & {
  profiles: Pick<Profile, "id" | "display_name" | "avatar_url">;
};

// Supabase Database shape (minimal — expand with supabase gen types typescript later)
export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Partial<Profile> & Pick<Profile, "id">;
        Update: Partial<Omit<Profile, "id" | "created_at">>;
      };
      posts: {
        Row: Post;
        Insert: Partial<Post> & Pick<Post, "title" | "slug" | "markdown">;
        Update: Partial<Omit<Post, "id" | "author" | "created_at" | "search_vector" | "word_count">>;
      };
      comments: {
        Row: Comment;
        Insert: Pick<Comment, "post_id" | "body">;
        Update: Pick<Comment, "body">;
      };
    };
    Functions: {
      is_admin: { Args: Record<never, never>; Returns: boolean };
      can_write: { Args: Record<never, never>; Returns: boolean };
      is_slug_available: { Args: { candidate: string; exclude_id?: string }; Returns: boolean };
      set_user_role: { Args: { target: string; new_role: Role }; Returns: void };
      get_popular_posts: { Args: { max_results?: number }; Returns: Post[] };
      get_tag_counts: { Args: { max_results?: number }; Returns: { tag: string; post_count: number }[] };
      get_top_authors: {
        Args: { max_results?: number };
        Returns: Array<Pick<Profile, "id" | "display_name" | "avatar_url" | "bio"> & { post_count: number }>;
      };
    };
  };
};
