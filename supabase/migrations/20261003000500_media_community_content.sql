-- =============================================================================
-- BridgeConnect · 0005 · Media and community content
-- -----------------------------------------------------------------------------
-- Residents may post to their community without verification. Posts are
-- subject to moderation (status) and reporting (0008). Entity posts require
-- the `posts` capability and editor+ membership of an active entity.
-- =============================================================================

create type public.content_status as enum ('published', 'pending_review', 'hidden', 'removed');

create type public.post_kind as enum (
  'general', 'question', 'recommendation', 'lost_and_found', 'announcement'
);

-- -----------------------------------------------------------------------------
-- Media assets (files live in Supabase Storage; this is the catalogue)
-- -----------------------------------------------------------------------------
create table public.media_assets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  entity_id uuid references public.entities (id) on delete cascade,
  -- Object path in the public `public-media` bucket. Convention:
  --   users/{owner_id}/{uuid}.{ext}   or   entities/{entity_id}/{uuid}.{ext}
  storage_path text not null unique check (
    char_length(storage_path) <= 500
    and storage_path ~ '^(users|entities)/[0-9a-f-]{36}/[0-9a-f-]{36}\.(jpg|jpeg|png|webp)$'
  ),
  mime_type text not null check (mime_type in ('image/jpeg', 'image/png', 'image/webp')),
  size_bytes int not null check (size_bytes > 0 and size_bytes <= 5242880),
  width int check (width > 0),
  height int check (height > 0),
  alt_text text check (char_length(alt_text) <= 300),
  created_at timestamptz not null default now(),
  constraint media_assets_path_matches_owner check (
    (entity_id is null and storage_path like 'users/' || owner_id::text || '/%')
    or (entity_id is not null and storage_path like 'entities/' || entity_id::text || '/%')
  )
);
create index media_assets_owner_idx on public.media_assets (owner_id);
create index media_assets_entity_idx on public.media_assets (entity_id) where entity_id is not null;

-- -----------------------------------------------------------------------------
-- Posts
-- -----------------------------------------------------------------------------
create table public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  entity_id uuid references public.entities (id) on delete cascade,
  community_id uuid not null references public.communities (id) on delete restrict,
  kind public.post_kind not null default 'general',
  title text check (char_length(title) between 3 and 140),
  body text not null check (char_length(body) between 1 and 5000),
  status public.content_status not null default 'published',
  moderation_reason text check (char_length(moderation_reason) <= 1000),
  comment_count int not null default 0 check (comment_count >= 0),
  reaction_count int not null default 0 check (reaction_count >= 0),
  edited_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  search tsvector generated always as (
    setweight(to_tsvector('simple', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(body, '')), 'B')
  ) stored
);
create index posts_feed_idx on public.posts (community_id, created_at desc) where status = 'published';
create index posts_author_idx on public.posts (author_id, created_at desc);
create index posts_entity_idx on public.posts (entity_id, created_at desc) where entity_id is not null;
create index posts_status_idx on public.posts (status) where status <> 'published';
create index posts_search_idx on public.posts using gin (search);

create trigger posts_set_updated_at before update on public.posts
  for each row execute function private.set_updated_at();

create table public.post_media (
  post_id uuid not null references public.posts (id) on delete cascade,
  media_id uuid not null references public.media_assets (id) on delete cascade,
  position smallint not null default 0 check (position between 0 and 9),
  primary key (post_id, media_id)
);
create index post_media_media_idx on public.post_media (media_id);

-- Server-enforced post rules: status, entity community, kind, rate limit.
create or replace function private.prepare_post()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  hourly_limit int := coalesce((private.setting('community.max_posts_per_hour'))::int, 10);
  needs_approval boolean := coalesce((private.setting('community.posts_require_approval'))::boolean, false);
begin
  if tg_op = 'INSERT' then
    if new.entity_id is not null then
      new.community_id := private.entity_community(new.entity_id);
      new.status := 'published';
    else
      if new.kind = 'announcement' then
        raise exception 'Announcements can only be published by verified entities'
          using errcode = '42501';
      end if;
      new.status := case when needs_approval then 'pending_review' else 'published' end;
      if (select count(*) from public.posts
          where author_id = new.author_id and created_at > now() - interval '1 hour') >= hourly_limit then
        raise exception 'Posting limit reached. Please try again later.' using errcode = '54000';
      end if;
    end if;
  elsif tg_op = 'UPDATE' then
    if new.body is distinct from old.body or new.title is distinct from old.title then
      new.edited_at := now();
    end if;
    if new.kind = 'announcement' and new.entity_id is null then
      raise exception 'Announcements can only be published by verified entities' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;
create trigger posts_prepare before insert or update on public.posts
  for each row execute function private.prepare_post();

-- Visibility of a post for the current user.
create or replace function private.can_view_post(p_post uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.posts p
    where p.id = p_post
      and (
        (p.status = 'published' and (p.entity_id is null or private.entity_is_public(p.entity_id)))
        or p.author_id = (select auth.uid())
        or private.has_permission('content.moderate', p.community_id)
      )
  );
$$;
grant execute on function private.can_view_post(uuid) to anon, authenticated;

-- -----------------------------------------------------------------------------
-- Comments and reactions
-- -----------------------------------------------------------------------------
create table public.post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  author_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  status public.content_status not null default 'published',
  moderation_reason text check (char_length(moderation_reason) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index post_comments_post_idx on public.post_comments (post_id, created_at);
create index post_comments_author_idx on public.post_comments (author_id);

create trigger post_comments_set_updated_at before update on public.post_comments
  for each row execute function private.set_updated_at();

create table public.post_reactions (
  post_id uuid not null references public.posts (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);
create index post_reactions_user_idx on public.post_reactions (user_id);

create or replace function private.prepare_comment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  hourly_limit int := coalesce((private.setting('community.max_comments_per_hour'))::int, 40);
begin
  new.status := 'published';
  if (select count(*) from public.post_comments
      where author_id = new.author_id and created_at > now() - interval '1 hour') >= hourly_limit then
    raise exception 'Comment limit reached. Please try again later.' using errcode = '54000';
  end if;
  return new;
end;
$$;
create trigger post_comments_prepare before insert on public.post_comments
  for each row execute function private.prepare_comment();

-- Denormalised counters + notifications.
create or replace function private.post_comment_changed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  p public.posts%rowtype;
begin
  if tg_op = 'INSERT' then
    update public.posts set comment_count = comment_count + 1 where id = new.post_id
    returning * into p;
    if p.author_id <> new.author_id then
      perform private.notify(p.author_id, 'community.comment',
        (select display_name from public.profiles where id = new.author_id) || ' commented on your post',
        left(new.body, 140), '/community/posts/' || p.id::text);
    end if;
  elsif tg_op = 'DELETE' then
    update public.posts set comment_count = greatest(comment_count - 1, 0) where id = old.post_id;
  end if;
  return coalesce(new, old);
end;
$$;
create trigger post_comments_counter after insert or delete on public.post_comments
  for each row execute function private.post_comment_changed();

create or replace function private.post_reaction_changed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    update public.posts set reaction_count = reaction_count + 1 where id = new.post_id;
  else
    update public.posts set reaction_count = greatest(reaction_count - 1, 0) where id = old.post_id;
  end if;
  return coalesce(new, old);
end;
$$;
create trigger post_reactions_counter after insert or delete on public.post_reactions
  for each row execute function private.post_reaction_changed();

-- -----------------------------------------------------------------------------
-- Row Level Security
-- -----------------------------------------------------------------------------
alter table public.media_assets enable row level security;
alter table public.posts enable row level security;
alter table public.post_media enable row level security;
alter table public.post_comments enable row level security;
alter table public.post_reactions enable row level security;

-- Media catalogue: files are in a public bucket, so metadata is public too.
grant select on public.media_assets to anon, authenticated;
grant insert (entity_id, storage_path, mime_type, size_bytes, width, height, alt_text)
  on public.media_assets to authenticated;
grant update (alt_text) on public.media_assets to authenticated;
grant delete on public.media_assets to authenticated;

create policy "Media metadata is public"
  on public.media_assets for select to anon, authenticated using (true);
create policy "Users register their own media"
  on public.media_assets for insert to authenticated
  with check (
    owner_id = (select auth.uid()) and private.is_active_user()
    and (entity_id is null or private.entity_can(entity_id, 'media', 'editor'))
  );
create policy "Owners and entity editors manage media"
  on public.media_assets for update to authenticated
  using (owner_id = (select auth.uid())
         or (entity_id is not null and private.entity_can(entity_id, 'media', 'editor')))
  with check (owner_id = (select auth.uid())
         or (entity_id is not null and private.entity_can(entity_id, 'media', 'editor')));
create policy "Owners and entity editors delete media"
  on public.media_assets for delete to authenticated
  using (owner_id = (select auth.uid())
         or (entity_id is not null and private.entity_can(entity_id, 'media', 'editor')));

-- Posts
grant select on public.posts to anon, authenticated;
grant insert (entity_id, community_id, kind, title, body) on public.posts to authenticated;
grant update (kind, title, body) on public.posts to authenticated;
grant delete on public.posts to authenticated;

create policy "Published posts are public"
  on public.posts for select to anon, authenticated
  using (status = 'published' and (entity_id is null or private.entity_is_public(entity_id)));
create policy "Authors see their own posts"
  on public.posts for select to authenticated
  using (author_id = (select auth.uid()));
create policy "Moderators see posts in scope"
  on public.posts for select to authenticated
  using (private.has_permission('content.moderate', community_id));
create policy "Active users create posts"
  on public.posts for insert to authenticated
  with check (
    author_id = (select auth.uid())
    and private.is_active_user()
    and (entity_id is null or private.entity_can(entity_id, 'posts', 'editor'))
  );
create policy "Authors edit their visible posts"
  on public.posts for update to authenticated
  using (author_id = (select auth.uid()) and status in ('published', 'pending_review')
         and private.is_active_user())
  with check (author_id = (select auth.uid()));
create policy "Authors delete their posts"
  on public.posts for delete to authenticated
  using (author_id = (select auth.uid()));
create policy "Entity editors delete entity posts"
  on public.posts for delete to authenticated
  using (entity_id is not null and private.entity_can(entity_id, 'posts', 'editor'));

grant select on public.post_media to anon, authenticated;
grant insert, delete on public.post_media to authenticated;
create policy "Post media follows post visibility"
  on public.post_media for select to anon, authenticated
  using (private.can_view_post(post_id));
create policy "Authors attach their media to their posts"
  on public.post_media for insert to authenticated
  with check (
    exists (select 1 from public.posts p where p.id = post_id and p.author_id = (select auth.uid()))
    and exists (select 1 from public.media_assets m where m.id = media_id
                and (m.owner_id = (select auth.uid())
                     or (m.entity_id is not null and private.entity_can(m.entity_id, 'media', 'editor'))))
  );
create policy "Authors detach media from their posts"
  on public.post_media for delete to authenticated
  using (exists (select 1 from public.posts p where p.id = post_id and p.author_id = (select auth.uid())));

-- Comments
grant select on public.post_comments to anon, authenticated;
grant insert (post_id, body) on public.post_comments to authenticated;
grant update (body) on public.post_comments to authenticated;
grant delete on public.post_comments to authenticated;

create policy "Published comments on visible posts are public"
  on public.post_comments for select to anon, authenticated
  using (status = 'published' and private.can_view_post(post_id));
create policy "Authors see their own comments"
  on public.post_comments for select to authenticated
  using (author_id = (select auth.uid()));
create policy "Moderators see comments in scope"
  on public.post_comments for select to authenticated
  using (exists (select 1 from public.posts p where p.id = post_id
                 and private.has_permission('content.moderate', p.community_id)));
create policy "Active users comment on published posts"
  on public.post_comments for insert to authenticated
  with check (
    author_id = (select auth.uid()) and private.is_active_user()
    and exists (select 1 from public.posts p where p.id = post_id and p.status = 'published')
    and private.can_view_post(post_id)
  );
create policy "Authors edit their published comments"
  on public.post_comments for update to authenticated
  using (author_id = (select auth.uid()) and status = 'published' and private.is_active_user())
  with check (author_id = (select auth.uid()));
create policy "Authors delete their comments"
  on public.post_comments for delete to authenticated
  using (author_id = (select auth.uid()));

-- Reactions
grant select on public.post_reactions to anon, authenticated;
grant insert (post_id), delete on public.post_reactions to authenticated;
create policy "Reactions on visible posts are public"
  on public.post_reactions for select to anon, authenticated
  using (private.can_view_post(post_id));
create policy "Active users react to published posts"
  on public.post_reactions for insert to authenticated
  with check (
    user_id = (select auth.uid()) and private.is_active_user()
    and exists (select 1 from public.posts p where p.id = post_id and p.status = 'published')
  );
create policy "Users remove their reactions"
  on public.post_reactions for delete to authenticated
  using (user_id = (select auth.uid()));
