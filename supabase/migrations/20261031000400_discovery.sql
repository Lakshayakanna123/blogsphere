-- =============================================================================
-- BlogSphere — 0004: discovery helpers
--
-- All functions are SECURITY INVOKER (the default) and filter on
-- published = true explicitly, so they can never surface drafts and RLS
-- still applies to the caller.
-- =============================================================================

-- Popular posts: ranked by number of comments, then recency.
create or replace function public.get_popular_posts(max_results integer default 3)
returns setof public.posts
language sql
stable
set search_path = ''
as $$
  select p.*
  from public.posts p
  left join public.comments c on c.post_id = p.id
  where p.published
  group by p.id
  order by count(c.id) desc, p.published_at desc
  limit least(greatest(coalesce(max_results, 3), 1), 24);
$$;

-- Tag cloud: tags of published posts with usage counts.
create or replace function public.get_tag_counts(max_results integer default 20)
returns table (tag text, post_count bigint)
language sql
stable
set search_path = ''
as $$
  select t.tag, count(*) as post_count
  from public.posts p
  cross join lateral unnest(p.tags) as t(tag)
  where p.published
  group by t.tag
  order by post_count desc, t.tag asc
  limit least(greatest(coalesce(max_results, 20), 1), 100);
$$;

-- Author highlights: authors with the most published posts.
create or replace function public.get_top_authors(max_results integer default 4)
returns table (
  id uuid,
  display_name text,
  avatar_url text,
  bio text,
  post_count bigint
)
language sql
stable
set search_path = ''
as $$
  select pr.id, pr.display_name, pr.avatar_url, pr.bio, count(p.id) as post_count
  from public.profiles pr
  join public.posts p on p.author = pr.id and p.published
  group by pr.id
  order by post_count desc, max(p.published_at) desc
  limit least(greatest(coalesce(max_results, 4), 1), 24);
$$;

revoke all on function public.get_popular_posts(integer) from public;
revoke all on function public.get_tag_counts(integer)    from public;
revoke all on function public.get_top_authors(integer)   from public;
grant execute on function public.get_popular_posts(integer) to anon, authenticated;
grant execute on function public.get_tag_counts(integer)    to anon, authenticated;
grant execute on function public.get_top_authors(integer)   to anon, authenticated;
