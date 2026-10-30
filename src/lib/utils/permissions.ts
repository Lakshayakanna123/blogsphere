/**
 * Permission helpers used to decide what UI to render and to fail fast in
 * server actions.
 *
 * IMPORTANT: these are convenience checks only. Authorisation is enforced
 * by PostgreSQL Row-Level Security and column privileges; hiding a button
 * is never the security boundary.
 */

export type Role = "admin" | "writer" | "reader";

export type Viewer = { id: string; role: Role } | null;

type PostLike = { author: string; published: boolean };
type CommentLike = { user_id: string };

export function isAdmin(viewer: Viewer): boolean {
  return viewer?.role === "admin";
}

export function canWrite(viewer: Viewer): boolean {
  return viewer?.role === "writer" || viewer?.role === "admin";
}

export function canViewPost(viewer: Viewer, post: PostLike): boolean {
  return post.published || viewer?.id === post.author || isAdmin(viewer);
}

export function canEditPost(viewer: Viewer, post: PostLike): boolean {
  return (viewer?.id === post.author && canWrite(viewer)) || isAdmin(viewer);
}

export function canDeletePost(viewer: Viewer, post: PostLike): boolean {
  return viewer?.id === post.author || isAdmin(viewer);
}

export function canComment(viewer: Viewer, post: PostLike): boolean {
  return viewer !== null && post.published;
}

export function canEditComment(viewer: Viewer, comment: CommentLike): boolean {
  return viewer?.id === comment.user_id;
}

export function canDeleteComment(viewer: Viewer, comment: CommentLike): boolean {
  return viewer?.id === comment.user_id || isAdmin(viewer);
}
