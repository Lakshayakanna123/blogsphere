-- =============================================================================
-- BlogSphere — 0001: core schema
-- Tables: profiles, posts, comments
-- Helper functions, triggers, indexes.
-- RLS policies live in 0002, storage in 0003.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Helper: normalise a single tag -> lowercase, trimmed, hyphenated, a-z0-9 only.
-- -----------------------------------------------------------------------------
create or replace function public.normalize_tag(tag text)
returns text
language sql
immutable
set search_path = ''
as $$
  select nullif(
    trim(both '-' from
      regexp_replace(
        regexp_replace(lower(trim(coalesce(tag, ''))), '[^a-z0-9\s-]', '', 'g'),
        '[\s-]+', '-', 'g'
      )
    ),
    ''
  );
$$;

-- Normalise and de-duplicate an array of tags, preserving first-seen order.
create or replace function public.normalize_tags(tags text[])
returns text[]
language sql
immutable
set search_path = ''
as $$
  select coalesce(array_agg(t order by first_pos), '{}'::text[])
  from (
    select t, min(pos) as first_pos
    from (
      select public.normalize_tag(raw) as t, pos
      from unnest(coalesce(tags, '{}'::text[])) with ordinality as u(raw, pos)
    ) s
    where t is not null and length(t) <= 32
    group by t
  ) d;
$$;

-- -----------------------------------------------------------------------------
-- profiles
-- One row per auth.users row. Contains ONLY public profile information
-- (email and credentials stay in auth.users, managed by Supabase Auth).
-- -----------------------------------------------------------------------------
create table public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(trim(display_name)) between 1 and 80),
  avatar_url   text check (avatar_url is null or char_length(avatar_url) <= 1024),
  bio          text check (bio is null or char_length(bio) <= 500),
  role         text not null default 'writer'
               check (role in ('admin', 'writer', 'reader')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

comment on table public.profiles is 'Public author/reader profile. role is NOT client-writable (see column grants + guard trigger).';
comment on column public.profiles.role is 'admin | writer | reader. Default writer. Only changeable by an admin via public.set_user_role() or by service_role.';

-- -----------------------------------------------------------------------------
-- Trusted role helpers. SECURITY DEFINER so policies can consult profiles
-- without recursing through profiles' own RLS. Fixed empty search_path.
-- -----------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin'
  );
$$;

create or replace function public.can_write()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role in ('writer', 'admin')
  );
$$;

revoke all on function public.is_admin()  from public;
revoke all on function public.can_write() from public;
grant execute on function public.is_admin()  to anon, authenticated, service_role;
grant execute on function public.can_write() to anon, authenticated, service_role;

-- -----------------------------------------------------------------------------
-- Generic updated_at trigger
-- -----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Profile guard: id and role are immutable for ordinary clients.
-- Column grants (0002) already block it; this is defence in depth.
create or replace function public.profiles_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.id <> old.id then
    raise exception 'profile id is immutable' using errcode = '42501';
  end if;

  -- current_user is the definer (postgres) inside public.set_user_role(),
  -- and service_role for trusted server-side tooling. Clients are
  -- 'authenticated' / 'anon' and are always rejected.
  if new.role is distinct from old.role
     and current_user not in ('postgres', 'service_role', 'supabase_admin') then
    raise exception 'role changes require an administrator' using errcode = '42501';
  end if;

  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_before_update
  before update on public.profiles
  for each row execute function public.profiles_guard();

-- -----------------------------------------------------------------------------
-- Profile initialisation on sign-up.
-- Uses ONLY display_name from user metadata (sanitised, length-limited).
-- Role is never read from metadata -> always the column default ('writer').
-- -----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text;
begin
  v_name := left(trim(regexp_replace(
              coalesce(new.raw_user_meta_data ->> 'display_name',
                       new.raw_user_meta_data ->> 'full_name',
                       new.raw_user_meta_data ->> 'name',
                       split_part(coalesce(new.email, ''), '@', 1),
                       ''),
              '[[:cntrl:]]', '', 'g')), 80);

  if v_name is null or v_name = '' then
    v_name := 'New writer';
  end if;

  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    v_name,
    case
      when (new.raw_user_meta_data ->> 'avatar_url') ~ '^https://[^\s]{1,1000}$'
      then new.raw_user_meta_data ->> 'avatar_url'
      else null
    end
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Admin-only role management (explicitly authorised path).
create or replace function public.set_user_role(target uuid, new_role text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'only administrators can change roles' using errcode = '42501';
  end if;
  if new_role not in ('admin', 'writer', 'reader') then
    raise exception 'invalid role' using errcode = '22023';
  end if;
  if target = (select auth.uid()) and new_role <> 'admin' then
    raise exception 'administrators cannot demote themselves' using errcode = '42501';
  end if;

  update public.profiles set role = new_role where id = target;
end;
$$;

revoke all on function public.set_user_role(uuid, text) from public, anon;
grant execute on function public.set_user_role(uuid, text) to authenticated;

-- -----------------------------------------------------------------------------
-- posts
-- -----------------------------------------------------------------------------
create table public.posts (
  id              uuid primary key default gen_random_uuid(),
  author          uuid not null default auth.uid()
                  references public.profiles (id) on delete cascade,
  title           text not null check (char_length(trim(title)) between 1 and 200),
  slug            text not null unique
                  check (char_length(slug) between 1 and 120
                         and slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  excerpt         text check (excerpt is null or char_length(excerpt) <= 300),
  markdown        text not null default ''
                  check (char_length(markdown) <= 100000),
  cover_image_url text check (cover_image_url is null
                              or (char_length(cover_image_url) <= 1024
                                  and cover_image_url ~ '^(https?://|/)')),
  published       boolean not null default false,
  tags            text[] not null default '{}'
                  check (cardinality(tags) <= 10),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  published_at    timestamptz,

  -- Approximate word count, used for reading-time estimates in listings
  -- without transferring the full markdown body.
  word_count      integer generated always as (
                    coalesce(array_length(
                      regexp_split_to_array(nullif(trim(markdown), ''), '\s+'), 1), 0)
                  ) stored,

  -- Full-text search document (title > excerpt > body).
  search_vector   tsvector generated always as (
                    setweight(to_tsvector('english'::regconfig, coalesce(title, '')), 'A') ||
                    setweight(to_tsvector('english'::regconfig, coalesce(excerpt, '')), 'B') ||
                    setweight(to_tsvector('english'::regconfig, coalesce(markdown, '')), 'C')
                  ) stored,

  -- An article can never be published without real content.
  constraint posts_publish_requires_content
    check (not published or char_length(trim(markdown)) >= 1),
  -- published_at is set if and only if the post is published.
  constraint posts_published_at_consistent
    check ((published and published_at is not null) or (not published and published_at is null))
);

comment on column public.posts.author is 'Owner. Defaults to auth.uid(); RLS enforces author = auth.uid(); immutable after insert.';
comment on column public.posts.search_vector is 'Generated weighted tsvector used for PostgreSQL full-text search (GIN indexed).';

-- Lifecycle trigger: normalise tags, manage published_at / updated_at,
-- keep author immutable.
create or replace function public.posts_before_write()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.tags := public.normalize_tags(new.tags);
  new.title := trim(new.title);

  if tg_op = 'INSERT' then
    -- Trusted tooling (seed scripts using service_role) may supply
    -- historical dates; clients always get server time.
    if current_user in ('postgres', 'service_role', 'supabase_admin') then
      new.created_at := coalesce(new.created_at, now());
      new.updated_at := coalesce(new.updated_at, new.created_at);
      new.published_at := case when new.published
                               then coalesce(new.published_at, now())
                               else null end;
    else
      new.created_at := now();
      new.updated_at := now();
      new.published_at := case when new.published then now() else null end;
    end if;
    return new;
  end if;

  -- UPDATE
  if new.author <> old.author then
    raise exception 'post author is immutable' using errcode = '42501';
  end if;
  new.created_at := old.created_at;
  new.updated_at := now();

  if new.published and not old.published then
    new.published_at := now();                 -- newly published
  elsif new.published and old.published then
    new.published_at := old.published_at;      -- keep original date
  else
    new.published_at := null;                  -- unpublished / draft
  end if;

  return new;
end;
$$;

create trigger posts_before_insert_update
  before insert or update on public.posts
  for each row execute function public.posts_before_write();

-- Indexes for implemented query patterns.
create index posts_published_feed_idx on public.posts (published_at desc) where published;
create index posts_author_updated_idx on public.posts (author, updated_at desc);
create index posts_author_published_idx on public.posts (author, published_at desc) where published;
create index posts_tags_gin_idx on public.posts using gin (tags);
create index posts_search_gin_idx on public.posts using gin (search_vector);
create index posts_cover_image_idx on public.posts (cover_image_url) where cover_image_url is not null;

-- Slug availability check that reveals only a boolean (never draft content).
create or replace function public.is_slug_available(candidate text, exclude_id uuid default null)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select not exists (
    select 1 from public.posts
    where slug = candidate
      and (exclude_id is null or id <> exclude_id)
  );
$$;

revoke all on function public.is_slug_available(text, uuid) from public, anon;
grant execute on function public.is_slug_available(text, uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- comments
-- -----------------------------------------------------------------------------
create table public.comments (
  id         uuid primary key default gen_random_uuid(),
  post_id    uuid not null references public.posts (id) on delete cascade,
  user_id    uuid not null default auth.uid()
             references public.profiles (id) on delete cascade,
  body       text not null check (char_length(trim(body)) between 1 and 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create index comments_post_created_idx on public.comments (post_id, created_at);
create index comments_user_created_idx on public.comments (user_id, created_at desc);

-- Comment lifecycle: trim body, rate-limit inserts, immutable ownership,
-- set updated_at on edit.
create or replace function public.comments_before_write()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  recent_count integer;
begin
  new.body := trim(new.body);

  if tg_op = 'INSERT' then
    new.created_at := now();
    new.updated_at := null;

    -- Rate limit: max 5 comments per user per 60 seconds.
    select count(*) into recent_count
    from public.comments
    where user_id = new.user_id
      and created_at > now() - interval '60 seconds';

    if recent_count >= 5 then
      raise exception 'comment rate limit exceeded' using errcode = 'P0001',
        hint = 'Please wait a minute before commenting again.';
    end if;
    return new;
  end if;

  if new.user_id <> old.user_id or new.post_id <> old.post_id then
    raise exception 'comment ownership is immutable' using errcode = '42501';
  end if;
  new.created_at := old.created_at;
  new.updated_at := now();
  return new;
end;
$$;

create trigger comments_before_insert_update
  before insert or update on public.comments
  for each row execute function public.comments_before_write();
