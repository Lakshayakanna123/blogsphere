-- =============================================================================
-- BlogSphere — 0002: Row-Level Security, policies and privileges
--
-- Principles
--   * RLS enabled on every exposed table. Never disabled.
--   * Identity comes from auth.uid() (JWT `sub`), never from request bodies.
--   * Roles are read via SECURITY DEFINER helpers (is_admin / can_write)
--     with a fixed search_path -> no policy recursion on profiles.
--   * Column-level GRANTs restrict which columns clients may write, so
--     even a permissive row policy cannot touch role / author / ids.
--   * (select auth.uid()) is used so Postgres evaluates it once per query.
-- =============================================================================

alter table public.profiles enable row level security;
alter table public.posts    enable row level security;
alter table public.comments enable row level security;

-- Note: FORCE ROW LEVEL SECURITY is intentionally NOT used. The table owner
-- (postgres) is only used by migrations and by the small set of audited
-- SECURITY DEFINER helpers (is_admin, can_write, is_slug_available,
-- handle_new_user, set_user_role), which must see rows regardless of the
-- client-facing policies below.

-- -----------------------------------------------------------------------------
-- Table / column privileges (Supabase grants broad defaults; tighten them).
-- -----------------------------------------------------------------------------
revoke all on public.profiles from anon, authenticated;
revoke all on public.posts    from anon, authenticated;
revoke all on public.comments from anon, authenticated;

-- profiles: public read; owners may update only presentation fields.
grant select on public.profiles to anon, authenticated;
grant update (display_name, avatar_url, bio) on public.profiles to authenticated;

-- posts: public read (rows filtered by RLS); authors write content columns.
grant select on public.posts to anon, authenticated;
grant insert (title, slug, excerpt, markdown, cover_image_url, published, tags)
  on public.posts to authenticated;
grant update (title, slug, excerpt, markdown, cover_image_url, published, tags)
  on public.posts to authenticated;
grant delete on public.posts to authenticated;

-- comments: public read (filtered by RLS); users write body only.
grant select on public.comments to anon, authenticated;
grant insert (post_id, body) on public.comments to authenticated;
grant update (body) on public.comments to authenticated;
grant delete on public.comments to authenticated;

-- =============================================================================
-- PROFILES
-- Privacy model: profiles hold only public author information
-- (display name, avatar, bio, role). Email lives in auth.users and is never
-- exposed through this table.
-- =============================================================================

-- Anyone may read public profile information.
create policy "profiles: public read"
  on public.profiles for select
  to anon, authenticated
  using (true);

-- A user may update only their own row (columns limited by GRANT above;
-- role changes additionally blocked by profiles_guard trigger).
create policy "profiles: owner update"
  on public.profiles for update
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- No INSERT policy: rows are created only by the handle_new_user trigger.
-- No DELETE policy: rows are removed only via auth.users cascade.

-- =============================================================================
-- POSTS
-- =============================================================================

-- Published posts are public; drafts are visible only to their author
-- and to explicitly authorised administrators.
create policy "posts: read published or own"
  on public.posts for select
  to anon, authenticated
  using (
    published
    or author = (select auth.uid())
    or (select public.is_admin())
  );

-- Writers/admins may create posts only as themselves.
create policy "posts: writers insert own"
  on public.posts for insert
  to authenticated
  with check (
    author = (select auth.uid())
    and (select public.can_write())
  );

-- Authors update their own posts (must still hold writer/admin role);
-- admins may moderate any post (e.g. unpublish). Author is immutable
-- (trigger), so a post can never be re-assigned.
create policy "posts: author or admin update"
  on public.posts for update
  to authenticated
  using (
    author = (select auth.uid())
    or (select public.is_admin())
  )
  with check (
    (author = (select auth.uid()) and (select public.can_write()))
    or (select public.is_admin())
  );

-- Authors delete their own posts; admins may delete any post.
create policy "posts: author or admin delete"
  on public.posts for delete
  to authenticated
  using (
    author = (select auth.uid())
    or (select public.is_admin())
  );

-- =============================================================================
-- COMMENTS
-- =============================================================================

-- Comments are readable only when the parent post is readable by the caller.
-- The sub-select is itself filtered by posts RLS (posts policies never
-- reference comments, so there is no recursion).
create policy "comments: read on visible posts"
  on public.comments for select
  to anon, authenticated
  using (
    exists (
      select 1 from public.posts p
      where p.id = comments.post_id
        and (p.published
             or p.author = (select auth.uid())
             or (select public.is_admin()))
    )
  );

-- Signed-in users may comment as themselves, on published posts only.
create policy "comments: insert own on published"
  on public.comments for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.posts p
      where p.id = comments.post_id and p.published
    )
  );

-- Users may edit only their own comments (body column only via GRANT).
create policy "comments: owner update"
  on public.comments for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Users delete their own comments; admins may moderate (delete) any comment.
create policy "comments: owner or admin delete"
  on public.comments for delete
  to authenticated
  using (
    user_id = (select auth.uid())
    or (select public.is_admin())
  );
