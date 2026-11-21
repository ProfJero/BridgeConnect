-- =============================================================================
-- BridgeConnect · 0016 · Engagement release
-- -----------------------------------------------------------------------------
--  1. Reviews & ratings for verified entities (+ entity replies, reports, moderation)
--  2. Following entities (+ notifications on new posts and events)
--  3. Inbox: resident ↔ entity conversations (realtime)
--  4. Service bookings / appointments
--  5. Community polls, help requests/offers and "resolved" posts
--  6. Support desk (residents and workspaces → DBI staff)
--  7. Privacy: self-service account deletion
--  8. Platform-owner bootstrap by confirmed email
--
-- Conventions as before: RLS on every table, column-level grants, every state
-- machine behind SECURITY DEFINER functions with `set search_path = ''`.
-- =============================================================================

-- Small helper: members of an entity at or above a role (used for notifications).
create or replace function private.entity_member_ids(
  p_entity uuid,
  p_min_role public.membership_role default 'editor'
)
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select m.user_id
  from public.entity_memberships m
  join public.profiles p on p.id = m.user_id
  where m.entity_id = p_entity
    and p.account_status = 'active'
    and private.membership_rank(m.role) >= private.membership_rank(p_min_role);
$$;

-- Notify every member of an entity at or above a role.
create or replace function private.notify_entity(
  p_entity uuid,
  p_min_role public.membership_role,
  p_type text,
  p_title text,
  p_body text default null,
  p_link text default null,
  p_except uuid default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid;
begin
  for uid in select private.entity_member_ids(p_entity, p_min_role) loop
    if p_except is null or uid <> p_except then
      perform private.notify(uid, p_type, p_title, p_body, p_link);
    end if;
  end loop;
end;
$$;

-- -----------------------------------------------------------------------------
-- 1. Reviews & ratings
-- -----------------------------------------------------------------------------
alter table public.entities
  add column rating_avg numeric(3, 2) check (rating_avg between 1 and 5),
  add column rating_count int not null default 0 check (rating_count >= 0),
  add column follower_count int not null default 0 check (follower_count >= 0);

create table public.entity_reviews (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null references public.entities (id) on delete cascade,
  author_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  title text check (char_length(title) between 3 and 120),
  body text check (char_length(body) between 10 and 2000),
  status public.content_status not null default 'published',
  moderation_reason text check (char_length(moderation_reason) <= 1000),
  response text check (char_length(response) between 2 and 2000),
  responded_at timestamptz,
  responded_by uuid references public.profiles (id) on delete set null,
  edited_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (entity_id, author_id)
);
create index entity_reviews_entity_idx on public.entity_reviews (entity_id, created_at desc)
  where status = 'published';
create index entity_reviews_author_idx on public.entity_reviews (author_id);
create index entity_reviews_status_idx on public.entity_reviews (status) where status <> 'published';

create trigger entity_reviews_set_updated_at before update on public.entity_reviews
  for each row execute function private.set_updated_at();

create or replace function private.prepare_review()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.status := 'published';
    new.response := null;
    new.responded_at := null;
    new.responded_by := null;
    if not private.entity_is_public(new.entity_id)
       or not private.entity_has_capability(new.entity_id, 'reviews') then
      raise exception 'This listing does not accept reviews' using errcode = '42501';
    end if;
    if exists (select 1 from public.entity_memberships
               where entity_id = new.entity_id and user_id = new.author_id) then
      raise exception 'You cannot review an organisation you belong to' using errcode = '42501';
    end if;
    if (select count(*) from public.entity_reviews
        where author_id = new.author_id and created_at > now() - interval '1 day') >= 10 then
      raise exception 'Review limit reached. Please try again tomorrow.' using errcode = '54000';
    end if;
  elsif tg_op = 'UPDATE' then
    if new.rating is distinct from old.rating or new.body is distinct from old.body
       or new.title is distinct from old.title then
      new.edited_at := now();
    end if;
  end if;
  return new;
end;
$$;
create trigger entity_reviews_prepare before insert or update on public.entity_reviews
  for each row execute function private.prepare_review();

create or replace function private.refresh_entity_rating(p_entity uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.entities e set
    rating_avg = s.avg_rating,
    rating_count = s.n
  from (
    select round(avg(rating)::numeric, 2) as avg_rating, count(*)::int as n
    from public.entity_reviews
    where entity_id = p_entity and status = 'published'
  ) s
  where e.id = p_entity;
$$;

create or replace function private.entity_review_changed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.refresh_entity_rating(coalesce(new.entity_id, old.entity_id));
  if tg_op = 'INSERT' then
    perform private.notify_entity(new.entity_id, 'manager', 'review.new',
      'New ' || new.rating || '★ review for ' ||
        (select name from public.entities where id = new.entity_id),
      left(coalesce(new.title, new.body, ''), 140),
      '/workspace/' || new.entity_id::text || '/reviews');
  end if;
  return coalesce(new, old);
end;
$$;
create trigger entity_reviews_changed after insert or update or delete on public.entity_reviews
  for each row execute function private.entity_review_changed();

-- The entity's public reply. Managers+ of an active entity with `reviews`.
create or replace function public.respond_to_review(p_review uuid, p_response text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  r public.entity_reviews%rowtype;
  reply text := nullif(trim(p_response), '');
begin
  select * into r from public.entity_reviews where id = p_review for update;
  if not found then
    raise exception 'Review not found' using errcode = 'P0002';
  end if;
  if not private.entity_can(r.entity_id, 'reviews', 'manager') then
    raise exception 'Not permitted' using errcode = '42501';
  end if;
  if r.status <> 'published' then
    raise exception 'This review is not visible' using errcode = '22023';
  end if;
  if reply is not null and char_length(reply) > 2000 then
    raise exception 'Reply is too long' using errcode = '22023';
  end if;
  update public.entity_reviews
  set response = reply,
      responded_at = case when reply is null then null else now() end,
      responded_by = case when reply is null then null else (select auth.uid()) end
  where id = p_review;
  if reply is not null then
    perform private.notify(r.author_id, 'review.response',
      (select name from public.entities where id = r.entity_id) || ' replied to your review',
      left(reply, 140),
      '/directory/' || (select slug from public.entities where id = r.entity_id) || '?tab=reviews');
  end if;
end;
$$;
revoke all on function public.respond_to_review(uuid, text) from public, anon;
grant execute on function public.respond_to_review(uuid, text) to authenticated;

alter table public.entity_reviews enable row level security;
grant select on public.entity_reviews to anon, authenticated;
grant insert (entity_id, rating, title, body) on public.entity_reviews to authenticated;
grant update (rating, title, body) on public.entity_reviews to authenticated;
grant delete on public.entity_reviews to authenticated;

create policy "Published reviews of public entities are public"
  on public.entity_reviews for select to anon, authenticated
  using (status = 'published' and private.entity_is_public(entity_id));
create policy "Authors see their own reviews"
  on public.entity_reviews for select to authenticated
  using (author_id = (select auth.uid()));
create policy "Entity managers see reviews of their entity"
  on public.entity_reviews for select to authenticated
  using (private.is_entity_member(entity_id, 'manager'));
create policy "Moderators see reviews in scope"
  on public.entity_reviews for select to authenticated
  using (private.has_permission('content.moderate', private.entity_community(entity_id)));
create policy "Active users review public entities"
  on public.entity_reviews for insert to authenticated
  with check (author_id = (select auth.uid()) and private.is_active_user());
create policy "Authors edit their visible reviews"
  on public.entity_reviews for update to authenticated
  using (author_id = (select auth.uid()) and status = 'published' and private.is_active_user())
  with check (author_id = (select auth.uid()));
create policy "Authors delete their reviews"
  on public.entity_reviews for delete to authenticated
  using (author_id = (select auth.uid()));

-- Reports can target reviews.
alter table public.reports add column review_id uuid references public.entity_reviews (id) on delete cascade;
create index reports_review_idx on public.reports (review_id) where review_id is not null;
alter table public.reports drop constraint reports_single_target;
alter table public.reports add constraint reports_single_target check (num_nonnulls(
  post_id, comment_id, entity_id, product_id, service_id, job_id, event_id, profile_id, review_id) = 1);
drop index public.reports_open_unique_idx;
create unique index reports_open_unique_idx on public.reports (
  reporter_id,
  coalesce(post_id, comment_id, entity_id, product_id, service_id, job_id, event_id, profile_id, review_id)
) where status in ('open', 'reviewing');
grant insert (review_id) on public.reports to authenticated;

create or replace function private.prepare_report()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select count(*) from public.reports
      where reporter_id = new.reporter_id and created_at > now() - interval '1 hour') >= 20 then
    raise exception 'Report limit reached. Please try again later.' using errcode = '54000';
  end if;
  new.status := 'open';
  new.community_id := coalesce(
    (select community_id from public.posts where id = new.post_id),
    (select p.community_id from public.post_comments c join public.posts p on p.id = c.post_id
     where c.id = new.comment_id),
    (select community_id from public.entities where id = new.entity_id),
    (select private.entity_community(entity_id) from public.products where id = new.product_id),
    (select private.entity_community(entity_id) from public.services where id = new.service_id),
    (select community_id from public.jobs where id = new.job_id),
    (select community_id from public.events where id = new.event_id),
    (select home_community_id from public.profiles where id = new.profile_id),
    (select private.entity_community(entity_id) from public.entity_reviews where id = new.review_id)
  );
  return new;
end;
$$;

create or replace function private.report_auto_hide()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  threshold int := coalesce((private.setting('reports.auto_hide_threshold'))::int, 5);
begin
  if new.post_id is not null and (
    select count(distinct reporter_id) from public.reports
    where post_id = new.post_id and status in ('open', 'reviewing')) >= threshold then
    update public.posts
    set status = 'pending_review', moderation_reason = 'Automatically held after multiple reports'
    where id = new.post_id and status = 'published';
  end if;
  if new.review_id is not null and (
    select count(distinct reporter_id) from public.reports
    where review_id = new.review_id and status in ('open', 'reviewing')) >= threshold then
    update public.entity_reviews
    set status = 'pending_review', moderation_reason = 'Automatically held after multiple reports'
    where id = new.review_id and status = 'published';
  end if;
  return new;
end;
$$;

-- moderate_content gains the `review` target.
create or replace function public.moderate_content(
  p_target_type public.moderation_target,
  p_target uuid,
  p_action public.moderation_action_type,
  p_reason text,
  p_report uuid default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_community uuid;
  owner_id uuid;
  perm text;
  new_content_status public.content_status;
begin
  if char_length(coalesce(trim(p_reason), '')) < 3 then
    raise exception 'A reason is required' using errcode = '22023';
  end if;
  if p_action not in ('approve', 'hide', 'remove', 'restore') then
    raise exception 'Unsupported action for content' using errcode = '22023';
  end if;
  new_content_status := case p_action when 'approve' then 'published' when 'restore' then 'published'
                                      when 'hide' then 'hidden' else 'removed' end::public.content_status;

  case p_target_type
    when 'post' then
      select community_id, author_id into target_community, owner_id from public.posts where id = p_target;
      perm := 'content.moderate';
    when 'comment' then
      select p.community_id, c.author_id into target_community, owner_id
      from public.post_comments c join public.posts p on p.id = c.post_id where c.id = p_target;
      perm := 'content.moderate';
    when 'review' then
      select private.entity_community(entity_id), author_id into target_community, owner_id
      from public.entity_reviews where id = p_target;
      perm := 'content.moderate';
    when 'product' then
      select private.entity_community(entity_id), created_by into target_community, owner_id
      from public.products where id = p_target;
      perm := 'marketplace.manage';
    when 'service' then
      select private.entity_community(entity_id), created_by into target_community, owner_id
      from public.services where id = p_target;
      perm := 'marketplace.manage';
    when 'job' then
      select community_id, created_by into target_community, owner_id from public.jobs where id = p_target;
      perm := 'jobs.manage';
    when 'event' then
      select community_id, created_by into target_community, owner_id from public.events where id = p_target;
      perm := 'events.manage';
  end case;

  if target_community is null then
    raise exception 'Content not found' using errcode = 'P0002';
  end if;
  if not private.has_permission(perm, target_community) then
    raise exception 'Not permitted' using errcode = '42501';
  end if;

  if p_target_type = 'post' then
    update public.posts set status = new_content_status,
      moderation_reason = case when p_action in ('approve', 'restore') then null else left(p_reason, 1000) end
    where id = p_target;
  elsif p_target_type = 'comment' then
    update public.post_comments set status = new_content_status,
      moderation_reason = case when p_action in ('approve', 'restore') then null else left(p_reason, 1000) end
    where id = p_target;
  elsif p_target_type = 'review' then
    update public.entity_reviews set status = new_content_status,
      moderation_reason = case when p_action in ('approve', 'restore') then null else left(p_reason, 1000) end
    where id = p_target;
  elsif p_target_type = 'product' then
    update public.products set
      status = case when p_action in ('hide', 'remove') then 'removed' else 'archived' end::public.product_status,
      moderation_reason = case when p_action in ('hide', 'remove') then left(p_reason, 1000) end
    where id = p_target;
  elsif p_target_type = 'service' then
    update public.services set
      status = case when p_action in ('hide', 'remove') then 'removed' else 'archived' end::public.service_status,
      moderation_reason = case when p_action in ('hide', 'remove') then left(p_reason, 1000) end
    where id = p_target;
  elsif p_target_type = 'job' then
    update public.jobs set
      status = case when p_action in ('hide', 'remove') then 'removed' else 'closed' end::public.job_status,
      moderation_reason = case when p_action in ('hide', 'remove') then left(p_reason, 1000) end
    where id = p_target;
  elsif p_target_type = 'event' then
    update public.events set
      status = case when p_action in ('hide', 'remove') then 'removed' else 'draft' end::public.event_status,
      moderation_reason = case when p_action in ('hide', 'remove') then left(p_reason, 1000) end
    where id = p_target;
  end if;

  insert into public.moderation_actions (moderator_id, report_id, target_type, target_id,
                                         community_id, action, reason)
  values ((select auth.uid()), p_report, p_target_type, p_target, target_community, p_action, left(p_reason, 1000));

  if p_report is not null then
    update public.reports
    set status = 'resolved', handled_by = (select auth.uid()),
        resolution_note = left(p_reason, 2000), resolved_at = now()
    where id = p_report and community_id is not distinct from target_community;
  end if;

  if p_action in ('hide', 'remove') and owner_id is not null then
    perform private.notify(owner_id, 'moderation.content_actioned',
      'Your ' || p_target_type::text || ' was ' ||
        case p_action when 'hide' then 'hidden' else 'removed' end || ' by a moderator',
      left(p_reason, 300), null);
  end if;

  perform private.write_audit('moderation.' || p_action, p_target_type::text, p_target::text,
    jsonb_build_object('reason', p_reason, 'report_id', p_report), target_community);
end;
$$;

-- -----------------------------------------------------------------------------
-- 2. Following entities
-- -----------------------------------------------------------------------------
create table public.entity_follows (
  entity_id uuid not null references public.entities (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (entity_id, user_id)
);
create index entity_follows_user_idx on public.entity_follows (user_id, created_at desc);

create or replace function private.entity_follow_changed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    update public.entities set follower_count = follower_count + 1 where id = new.entity_id;
  else
    update public.entities set follower_count = greatest(follower_count - 1, 0) where id = old.entity_id;
  end if;
  return coalesce(new, old);
end;
$$;
create trigger entity_follows_counter after insert or delete on public.entity_follows
  for each row execute function private.entity_follow_changed();

alter table public.entity_follows enable row level security;
grant select, delete on public.entity_follows to authenticated;
grant insert (entity_id) on public.entity_follows to authenticated;
create policy "Users see what they follow"
  on public.entity_follows for select to authenticated
  using (user_id = (select auth.uid()));
create policy "Entity managers see their followers"
  on public.entity_follows for select to authenticated
  using (private.is_entity_member(entity_id, 'manager'));
create policy "Active users follow public entities"
  on public.entity_follows for insert to authenticated
  with check (user_id = (select auth.uid()) and private.is_active_user()
              and private.entity_is_public(entity_id));
create policy "Users unfollow"
  on public.entity_follows for delete to authenticated
  using (user_id = (select auth.uid()));

-- Fan out to followers when an entity publishes a post or an event.
create or replace function private.notify_followers(
  p_entity uuid, p_type text, p_title text, p_body text, p_link text, p_except uuid
)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.notifications (recipient_id, type, title, body, link)
  select f.user_id, p_type, left(p_title, 140), left(p_body, 1000), p_link
  from public.entity_follows f
  join public.profiles p on p.id = f.user_id and p.account_status = 'active'
  where f.entity_id = p_entity
    and (p_except is null or f.user_id <> p_except)
    and private.entity_is_public(p_entity);
$$;

create or replace function private.entity_post_published()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.entity_id is not null and new.status = 'published' then
    perform private.notify_followers(new.entity_id, 'follow.new_post',
      (select name from public.entities where id = new.entity_id) || ' posted an update',
      left(coalesce(new.title, new.body), 140), '/community/posts/' || new.id::text, new.author_id);
  end if;
  return new;
end;
$$;
create trigger posts_notify_followers after insert on public.posts
  for each row execute function private.entity_post_published();

create or replace function private.entity_event_published()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'published' and (tg_op = 'INSERT' or old.status <> 'published')
     and new.starts_at > now() then
    perform private.notify_followers(new.entity_id, 'follow.new_event',
      (select name from public.entities where id = new.entity_id) || ' published an event',
      new.title, '/events/' || new.slug, new.created_by);
  end if;
  return new;
end;
$$;
create trigger events_notify_followers after insert or update of status on public.events
  for each row execute function private.entity_event_published();

-- -----------------------------------------------------------------------------
-- 3. Inbox: conversations between a resident and an entity
-- -----------------------------------------------------------------------------
create type public.conversation_status as enum ('open', 'closed', 'blocked');

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null references public.entities (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  subject text check (char_length(subject) between 2 and 140),
  status public.conversation_status not null default 'open',
  last_message_at timestamptz not null default now(),
  last_message_preview text check (char_length(last_message_preview) <= 160),
  last_sender_side text check (last_sender_side in ('user', 'entity')),
  user_last_read_at timestamptz,
  entity_last_read_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (entity_id, user_id)
);
create index conversations_user_idx on public.conversations (user_id, last_message_at desc);
create index conversations_entity_idx on public.conversations (entity_id, last_message_at desc);
create trigger conversations_set_updated_at before update on public.conversations
  for each row execute function private.set_updated_at();

create table public.conversation_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id uuid references public.profiles (id) on delete set null,
  sender_side text not null check (sender_side in ('user', 'entity')),
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index conversation_messages_conv_idx on public.conversation_messages (conversation_id, created_at);
create index conversation_messages_sender_idx on public.conversation_messages (sender_id, created_at desc);

-- 'user' | 'entity' | null: which side of the conversation the caller is on.
create or replace function private.conversation_side(p_conversation uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when c.user_id = (select auth.uid()) then 'user'
    when private.entity_can(c.entity_id, 'messages', 'editor') then 'entity'
  end
  from public.conversations c where c.id = p_conversation;
$$;
grant execute on function private.conversation_side(uuid) to authenticated;

create or replace function private.check_message_rate()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select count(*) from public.conversation_messages
      where sender_id = (select auth.uid()) and created_at > now() - interval '1 hour') >= 60 then
    raise exception 'Message limit reached. Please try again later.' using errcode = '54000';
  end if;
end;
$$;

create or replace function private.deliver_message(
  p_conversation uuid, p_side text, p_body text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  c public.conversations%rowtype;
  msg_id uuid;
  v_body text := trim(p_body);
  entity_name text;
  recipient_caught_up boolean;
begin
  if char_length(coalesce(v_body, '')) < 1 or char_length(v_body) > 2000 then
    raise exception 'Messages must be between 1 and 2000 characters' using errcode = '22023';
  end if;
  perform private.check_message_rate();
  select * into c from public.conversations where id = p_conversation for update;

  -- Notify only when the recipient had read everything before this message (avoids a
  -- notification per message in a busy thread).
  recipient_caught_up := case p_side
    when 'user' then c.last_sender_side is distinct from 'user'
                     or c.entity_last_read_at >= c.last_message_at
    else c.last_sender_side is distinct from 'entity'
         or c.user_last_read_at >= c.last_message_at end;

  insert into public.conversation_messages (conversation_id, sender_id, sender_side, body, created_at)
  values (p_conversation, (select auth.uid()), p_side, v_body, clock_timestamp())
  returning id into msg_id;

  update public.conversations set
    last_message_at = clock_timestamp(),
    last_message_preview = left(v_body, 160),
    last_sender_side = p_side,
    status = case when p_side = 'user' and status = 'closed' then 'open' else status end,
    user_last_read_at = case when p_side = 'user' then clock_timestamp() else user_last_read_at end,
    entity_last_read_at = case when p_side = 'entity' then clock_timestamp() else entity_last_read_at end
  where id = p_conversation;

  if recipient_caught_up then
    select name into entity_name from public.entities where id = c.entity_id;
    if p_side = 'user' then
      perform private.notify_entity(c.entity_id, 'editor', 'message.new',
        'New message for ' || entity_name, left(v_body, 140),
        '/workspace/' || c.entity_id::text || '/inbox/' || c.id::text, (select auth.uid()));
    else
      perform private.notify(c.user_id, 'message.new', entity_name || ' replied to you',
        left(v_body, 140), '/messages/' || c.id::text);
    end if;
  end if;
  return msg_id;
end;
$$;

-- A resident opens (or continues) a conversation with a public entity.
create or replace function public.start_conversation(p_entity uuid, p_subject text, p_body text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  conv public.conversations%rowtype;
begin
  if uid is null or not private.is_active_user() then
    raise exception 'Not permitted' using errcode = '42501';
  end if;
  if not private.entity_is_public(p_entity) or not private.entity_has_capability(p_entity, 'messages') then
    raise exception 'This organisation is not accepting messages' using errcode = '42501';
  end if;
  if exists (select 1 from public.entity_memberships where entity_id = p_entity and user_id = uid) then
    raise exception 'You are a member of this organisation' using errcode = '22023';
  end if;

  select * into conv from public.conversations where entity_id = p_entity and user_id = uid;
  if found and conv.status = 'blocked' then
    raise exception 'This organisation is not accepting messages from you' using errcode = '42501';
  end if;
  if not found then
    insert into public.conversations (entity_id, user_id, subject, user_last_read_at)
    values (p_entity, uid, nullif(left(trim(coalesce(p_subject, '')), 140), ''), clock_timestamp())
    returning * into conv;
  end if;
  perform private.deliver_message(conv.id, 'user', p_body);
  return conv.id;
end;
$$;

create or replace function public.send_message(p_conversation uuid, p_body text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  side text := private.conversation_side(p_conversation);
  conv_status public.conversation_status;
begin
  if side is null or not private.is_active_user() then
    raise exception 'Not permitted' using errcode = '42501';
  end if;
  select status into conv_status from public.conversations where id = p_conversation;
  if conv_status = 'blocked' and side = 'user' then
    raise exception 'This organisation is not accepting messages from you' using errcode = '42501';
  end if;
  if side = 'user' and not private.entity_is_public(
       (select entity_id from public.conversations where id = p_conversation)) then
    raise exception 'This organisation is not accepting messages' using errcode = '42501';
  end if;
  return private.deliver_message(p_conversation, side, p_body);
end;
$$;

create or replace function public.mark_conversation_read(p_conversation uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  side text := private.conversation_side(p_conversation);
begin
  if side is null then
    raise exception 'Not permitted' using errcode = '42501';
  end if;
  update public.conversations set
    user_last_read_at = case when side = 'user' then clock_timestamp() else user_last_read_at end,
    entity_last_read_at = case when side = 'entity' then clock_timestamp() else entity_last_read_at end
  where id = p_conversation;
end;
$$;

-- Entity side: open / close / block. Resident side: close only.
create or replace function public.set_conversation_status(
  p_conversation uuid, p_status public.conversation_status
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  side text := private.conversation_side(p_conversation);
  c public.conversations%rowtype;
begin
  if side is null or not private.is_active_user() then
    raise exception 'Not permitted' using errcode = '42501';
  end if;
  select * into c from public.conversations where id = p_conversation;
  if side = 'user' and p_status <> 'closed' then
    raise exception 'Not permitted' using errcode = '42501';
  end if;
  if side = 'entity' and p_status = 'blocked'
     and not private.entity_can(c.entity_id, 'messages', 'manager') then
    raise exception 'Only managers can block a contact' using errcode = '42501';
  end if;
  update public.conversations set status = p_status where id = p_conversation;
  if side = 'entity' and p_status = 'blocked' then
    perform private.write_audit('conversations.block', 'conversations', p_conversation::text,
      jsonb_build_object('entity_id', c.entity_id, 'user_id', c.user_id),
      private.entity_community(c.entity_id));
  end if;
end;
$$;

-- Unread counts for badges.
create or replace function public.my_unread_message_count()
returns int
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::int from public.conversations
  where user_id = (select auth.uid())
    and last_sender_side = 'entity'
    and (user_last_read_at is null or last_message_at > user_last_read_at);
$$;

create or replace function public.entity_unread_message_count(p_entity uuid)
returns int
language sql
stable
security definer
set search_path = ''
as $$
  select case when private.entity_can(p_entity, 'messages', 'editor') then (
    select count(*)::int from public.conversations
    where entity_id = p_entity and status <> 'blocked'
      and last_sender_side = 'user'
      and (entity_last_read_at is null or last_message_at > entity_last_read_at)
  ) else 0 end;
$$;

revoke all on function public.start_conversation(uuid, text, text) from public, anon;
revoke all on function public.send_message(uuid, text) from public, anon;
revoke all on function public.mark_conversation_read(uuid) from public, anon;
revoke all on function public.set_conversation_status(uuid, public.conversation_status) from public, anon;
revoke all on function public.my_unread_message_count() from public, anon;
revoke all on function public.entity_unread_message_count(uuid) from public, anon;
grant execute on function public.start_conversation(uuid, text, text) to authenticated;
grant execute on function public.send_message(uuid, text) to authenticated;
grant execute on function public.mark_conversation_read(uuid) to authenticated;
grant execute on function public.set_conversation_status(uuid, public.conversation_status) to authenticated;
grant execute on function public.my_unread_message_count() to authenticated;
grant execute on function public.entity_unread_message_count(uuid) to authenticated;

alter table public.conversations enable row level security;
alter table public.conversation_messages enable row level security;
grant select on public.conversations, public.conversation_messages to authenticated;

create policy "Participants see their conversations"
  on public.conversations for select to authenticated
  using (user_id = (select auth.uid()) or private.entity_can(entity_id, 'messages', 'editor'));
create policy "Participants see messages"
  on public.conversation_messages for select to authenticated
  using (private.conversation_side(conversation_id) is not null);

-- -----------------------------------------------------------------------------
-- 4. Service bookings
-- -----------------------------------------------------------------------------
create type public.booking_status as enum ('requested', 'confirmed', 'declined', 'cancelled', 'completed');

alter table public.services add column accepts_bookings boolean not null default true;
grant insert (accepts_bookings), update (accepts_bookings) on public.services to authenticated;

create table public.service_bookings (
  id uuid primary key default gen_random_uuid(),
  booking_number bigint generated always as identity unique,
  service_id uuid not null references public.services (id) on delete cascade,
  entity_id uuid not null references public.entities (id) on delete cascade,
  customer_id uuid not null references public.profiles (id) on delete cascade,
  requested_date date not null,
  requested_time time,
  customer_note text check (char_length(customer_note) <= 1000),
  contact_phone text check (contact_phone ~ '^\+?[0-9 ]{7,20}$'),
  status public.booking_status not null default 'requested',
  entity_note text check (char_length(entity_note) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index service_bookings_entity_idx on public.service_bookings (entity_id, status, requested_date);
create index service_bookings_customer_idx on public.service_bookings (customer_id, created_at desc);
create index service_bookings_service_idx on public.service_bookings (service_id);
create trigger service_bookings_set_updated_at before update on public.service_bookings
  for each row execute function private.set_updated_at();

create or replace function public.request_booking(
  p_service uuid,
  p_date date,
  p_time time default null,
  p_note text default null,
  p_phone text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  s public.services%rowtype;
  booking_id uuid;
  num bigint;
begin
  if uid is null or not private.is_active_user() then
    raise exception 'Not permitted' using errcode = '42501';
  end if;
  select * into s from public.services where id = p_service;
  if not found or s.status <> 'active' or not s.accepts_bookings
     or not private.entity_is_public(s.entity_id)
     or not private.entity_has_capability(s.entity_id, 'bookings') then
    raise exception 'This service is not taking bookings' using errcode = '42501';
  end if;
  if exists (select 1 from public.entity_memberships where entity_id = s.entity_id and user_id = uid) then
    raise exception 'You cannot book your own service' using errcode = '22023';
  end if;
  if p_date is null or p_date < current_date or p_date > current_date + 365 then
    raise exception 'Choose a date within the next 12 months' using errcode = '22023';
  end if;
  if char_length(coalesce(p_note, '')) > 1000 then
    raise exception 'Note is too long' using errcode = '22023';
  end if;
  if (select count(*) from public.service_bookings
      where customer_id = uid and created_at > now() - interval '1 day') >= 10 then
    raise exception 'Booking limit reached. Please try again tomorrow.' using errcode = '54000';
  end if;
  if exists (select 1 from public.service_bookings where customer_id = uid and service_id = p_service
             and requested_date = p_date and status in ('requested', 'confirmed')) then
    raise exception 'You already have a booking for this service on that day' using errcode = '23505';
  end if;

  insert into public.service_bookings (service_id, entity_id, customer_id, requested_date, requested_time,
                                       customer_note, contact_phone)
  values (p_service, s.entity_id, uid, p_date, p_time, nullif(trim(p_note), ''), nullif(trim(p_phone), ''))
  returning id, booking_number into booking_id, num;

  perform private.notify_entity(s.entity_id, 'editor', 'booking.requested',
    'New booking request #' || num || ' · ' || s.name,
    to_char(p_date, 'Dy DD Mon YYYY') || coalesce(' at ' || to_char(p_time, 'HH24:MI'), ''),
    '/workspace/' || s.entity_id::text || '/bookings');
  return booking_id;
end;
$$;

create or replace function public.update_booking_status(
  p_booking uuid,
  p_status public.booking_status,
  p_note text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  b public.service_bookings%rowtype;
  is_customer boolean;
  is_entity boolean;
  allowed boolean;
  service_name text;
begin
  select * into b from public.service_bookings where id = p_booking for update;
  if not found then
    raise exception 'Booking not found' using errcode = 'P0002';
  end if;
  is_customer := b.customer_id = (select auth.uid()) and private.is_active_user();
  is_entity := private.entity_can(b.entity_id, 'bookings', 'editor');
  if not (is_customer or is_entity) then
    raise exception 'Not permitted' using errcode = '42501';
  end if;

  allowed := case
    when is_entity and b.status = 'requested' and p_status in ('confirmed', 'declined') then true
    when is_entity and b.status = 'confirmed' and p_status in ('completed', 'cancelled') then true
    when is_customer and b.status in ('requested', 'confirmed') and p_status = 'cancelled' then true
    else false end;
  if not allowed then
    raise exception 'That change is not allowed for this booking' using errcode = '22023';
  end if;
  if char_length(coalesce(p_note, '')) > 1000 then
    raise exception 'Note is too long' using errcode = '22023';
  end if;

  update public.service_bookings set
    status = p_status,
    entity_note = case when is_entity and nullif(trim(p_note), '') is not null then trim(p_note) else entity_note end
  where id = p_booking;

  select name into service_name from public.services where id = b.service_id;
  if is_entity then
    perform private.notify(b.customer_id, 'booking.' || p_status::text,
      'Booking #' || b.booking_number || ' ' || p_status::text || ' · ' || service_name,
      nullif(trim(p_note), ''), '/bookings');
  else
    perform private.notify_entity(b.entity_id, 'editor', 'booking.cancelled',
      'Booking #' || b.booking_number || ' cancelled by the customer', service_name,
      '/workspace/' || b.entity_id::text || '/bookings');
  end if;
end;
$$;

revoke all on function public.request_booking(uuid, date, time, text, text) from public, anon;
revoke all on function public.update_booking_status(uuid, public.booking_status, text) from public, anon;
grant execute on function public.request_booking(uuid, date, time, text, text) to authenticated;
grant execute on function public.update_booking_status(uuid, public.booking_status, text) to authenticated;

alter table public.service_bookings enable row level security;
grant select on public.service_bookings to authenticated;
create policy "Customers see their bookings"
  on public.service_bookings for select to authenticated
  using (customer_id = (select auth.uid()));
create policy "Entity editors see their bookings"
  on public.service_bookings for select to authenticated
  using (private.entity_can(entity_id, 'bookings', 'editor'));
create policy "Marketplace staff see bookings in scope"
  on public.service_bookings for select to authenticated
  using (private.has_permission('orders.read_all', private.entity_community(entity_id)));

-- -----------------------------------------------------------------------------
-- 5. Polls, help requests and resolved posts
-- -----------------------------------------------------------------------------
alter table public.posts
  add column resolved_at timestamptz,
  add column poll_closes_at timestamptz;
grant update (resolved_at) on public.posts to authenticated;
grant insert (poll_closes_at) on public.posts to authenticated;

create table public.poll_options (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  label text not null check (char_length(label) between 1 and 100),
  position smallint not null check (position between 0 and 5),
  vote_count int not null default 0 check (vote_count >= 0),
  unique (post_id, position)
);

create table public.poll_votes (
  post_id uuid not null references public.posts (id) on delete cascade,
  option_id uuid not null references public.poll_options (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);
create index poll_votes_option_idx on public.poll_votes (option_id);
create index poll_votes_user_idx on public.poll_votes (user_id);

create or replace function private.prepare_poll_option()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select kind from public.posts where id = new.post_id) <> 'poll' then
    raise exception 'Options can only be added to polls' using errcode = '22023';
  end if;
  if exists (select 1 from public.poll_votes where post_id = new.post_id) then
    raise exception 'Options cannot change after voting has started' using errcode = '22023';
  end if;
  if (select count(*) from public.poll_options where post_id = new.post_id) >= 6 then
    raise exception 'A poll can have at most 6 options' using errcode = '22023';
  end if;
  new.vote_count := 0;
  return new;
end;
$$;
create trigger poll_options_prepare before insert on public.poll_options
  for each row execute function private.prepare_poll_option();

create or replace function private.prepare_poll_vote()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  p public.posts%rowtype;
begin
  select * into p from public.posts where id = new.post_id;
  if p.kind <> 'poll' or p.status <> 'published' then
    raise exception 'This poll is not open' using errcode = '22023';
  end if;
  if p.poll_closes_at is not null and p.poll_closes_at <= now() then
    raise exception 'This poll has closed' using errcode = '22023';
  end if;
  if not exists (select 1 from public.poll_options where id = new.option_id and post_id = new.post_id) then
    raise exception 'Invalid option' using errcode = '22023';
  end if;
  return new;
end;
$$;
create trigger poll_votes_prepare before insert on public.poll_votes
  for each row execute function private.prepare_poll_vote();

create or replace function private.poll_vote_changed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    update public.poll_options set vote_count = vote_count + 1 where id = new.option_id;
  else
    update public.poll_options set vote_count = greatest(vote_count - 1, 0) where id = old.option_id;
  end if;
  return coalesce(new, old);
end;
$$;
create trigger poll_votes_counter after insert or delete on public.poll_votes
  for each row execute function private.poll_vote_changed();

-- Changing a vote = delete + insert, only while the poll is open.
create or replace function private.guard_poll_unvote()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (select 1 from public.posts where id = old.post_id
             and poll_closes_at is not null and poll_closes_at <= now())
     and exists (select 1 from public.posts where id = old.post_id) then
    raise exception 'This poll has closed' using errcode = '22023';
  end if;
  return old;
end;
$$;
create trigger poll_votes_guard_delete before delete on public.poll_votes
  for each row when (pg_trigger_depth() = 0)
  execute function private.guard_poll_unvote();

alter table public.poll_options enable row level security;
alter table public.poll_votes enable row level security;
grant select on public.poll_options to anon, authenticated;
grant insert (post_id, label, position) on public.poll_options to authenticated;
grant select, delete on public.poll_votes to authenticated;
grant insert (post_id, option_id) on public.poll_votes to authenticated;

create policy "Poll options follow post visibility"
  on public.poll_options for select to anon, authenticated
  using (private.can_view_post(post_id));
create policy "Authors add options to their polls"
  on public.poll_options for insert to authenticated
  with check (exists (select 1 from public.posts p where p.id = post_id
                      and p.author_id = (select auth.uid()))
              and private.is_active_user());
create policy "Users see their own votes"
  on public.poll_votes for select to authenticated
  using (user_id = (select auth.uid()));
create policy "Active users vote on visible polls"
  on public.poll_votes for insert to authenticated
  with check (user_id = (select auth.uid()) and private.is_active_user()
              and private.can_view_post(post_id));
create policy "Users withdraw their votes"
  on public.poll_votes for delete to authenticated
  using (user_id = (select auth.uid()));

-- -----------------------------------------------------------------------------
-- 6. Support desk
-- -----------------------------------------------------------------------------
create type public.ticket_status as enum ('open', 'pending', 'resolved', 'closed');
create type public.ticket_category as enum (
  'account', 'verification', 'marketplace', 'safety', 'bug', 'feedback', 'other'
);

create table public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  ticket_number bigint generated always as identity unique,
  requester_id uuid not null references public.profiles (id) on delete cascade,
  entity_id uuid references public.entities (id) on delete set null,
  category public.ticket_category not null,
  subject text not null check (char_length(subject) between 3 and 140),
  status public.ticket_status not null default 'open',
  priority text not null default 'normal' check (priority in ('low', 'normal', 'high', 'urgent')),
  assigned_to uuid references public.profiles (id) on delete set null,
  last_activity_at timestamptz not null default now(),
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index support_tickets_requester_idx on public.support_tickets (requester_id, last_activity_at desc);
create index support_tickets_queue_idx on public.support_tickets (status, last_activity_at desc);
create index support_tickets_entity_idx on public.support_tickets (entity_id) where entity_id is not null;
create index support_tickets_assignee_idx on public.support_tickets (assigned_to) where assigned_to is not null;
create trigger support_tickets_set_updated_at before update on public.support_tickets
  for each row execute function private.set_updated_at();

create table public.support_ticket_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.support_tickets (id) on delete cascade,
  author_id uuid references public.profiles (id) on delete set null,
  is_staff boolean not null default false,
  body text not null check (char_length(body) between 1 and 4000),
  created_at timestamptz not null default now()
);
create index support_ticket_messages_ticket_idx on public.support_ticket_messages (ticket_id, created_at);
create index support_ticket_messages_author_idx on public.support_ticket_messages (author_id);

create or replace function public.create_support_ticket(
  p_category public.ticket_category,
  p_subject text,
  p_body text,
  p_entity uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  ticket_id uuid;
  num bigint;
begin
  -- Suspended users may still contact support (e.g. to appeal).
  if uid is null or not exists (select 1 from public.profiles where id = uid
                                and account_status in ('active', 'suspended')) then
    raise exception 'Not permitted' using errcode = '42501';
  end if;
  if char_length(coalesce(trim(p_subject), '')) < 3 or char_length(trim(p_subject)) > 140 then
    raise exception 'Subject must be between 3 and 140 characters' using errcode = '22023';
  end if;
  if char_length(coalesce(trim(p_body), '')) < 10 or char_length(trim(p_body)) > 4000 then
    raise exception 'Describe the problem in 10 to 4000 characters' using errcode = '22023';
  end if;
  if p_entity is not null and not exists (
       select 1 from public.entity_memberships where entity_id = p_entity and user_id = uid) then
    raise exception 'Not permitted' using errcode = '42501';
  end if;
  if (select count(*) from public.support_tickets
      where requester_id = uid and created_at > now() - interval '1 day') >= 5 then
    raise exception 'Ticket limit reached. Please try again tomorrow.' using errcode = '54000';
  end if;

  insert into public.support_tickets (requester_id, entity_id, category, subject,
    priority)
  values (uid, p_entity, p_category, trim(p_subject),
    case when p_category = 'safety' then 'high' else 'normal' end)
  returning id, ticket_number into ticket_id, num;
  insert into public.support_ticket_messages (ticket_id, author_id, is_staff, body)
  values (ticket_id, uid, false, trim(p_body));
  perform private.notify(uid, 'support.created', 'Support ticket #' || num || ' received',
    'We will reply here and notify you.', '/support/' || ticket_id::text);
  return ticket_id;
end;
$$;

create or replace function public.reply_support_ticket(p_ticket uuid, p_body text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  t public.support_tickets%rowtype;
  staff boolean := private.has_permission('support.manage');
  msg_id uuid;
begin
  select * into t from public.support_tickets where id = p_ticket for update;
  if not found then
    raise exception 'Ticket not found' using errcode = 'P0002';
  end if;
  if not (staff or t.requester_id = uid) then
    raise exception 'Not permitted' using errcode = '42501';
  end if;
  if t.status = 'closed' and not staff then
    raise exception 'This ticket is closed. Please open a new one.' using errcode = '22023';
  end if;
  if char_length(coalesce(trim(p_body), '')) < 1 or char_length(trim(p_body)) > 4000 then
    raise exception 'Replies must be between 1 and 4000 characters' using errcode = '22023';
  end if;
  if (select count(*) from public.support_ticket_messages
      where author_id = uid and created_at > now() - interval '1 hour') >= 30 then
    raise exception 'Reply limit reached. Please try again later.' using errcode = '54000';
  end if;

  insert into public.support_ticket_messages (ticket_id, author_id, is_staff, body)
  values (p_ticket, uid, staff and t.requester_id <> uid, trim(p_body))
  returning id into msg_id;

  update public.support_tickets set
    last_activity_at = now(),
    status = (case when staff and t.requester_id <> uid then 'pending' else 'open' end)::public.ticket_status,
    resolved_at = null,
    assigned_to = case when staff and t.requester_id <> uid then coalesce(assigned_to, uid) else assigned_to end
  where id = p_ticket;

  if staff and t.requester_id <> uid then
    perform private.notify(t.requester_id, 'support.reply',
      'DBI support replied to ticket #' || t.ticket_number, left(trim(p_body), 140),
      '/support/' || p_ticket::text);
  elsif t.assigned_to is not null then
    perform private.notify(t.assigned_to, 'support.reply',
      'New reply on ticket #' || t.ticket_number, left(trim(p_body), 140),
      '/admin/support/' || p_ticket::text);
  end if;
  return msg_id;
end;
$$;

create or replace function public.update_support_ticket(
  p_ticket uuid,
  p_status public.ticket_status default null,
  p_priority text default null,
  p_assignee uuid default null,
  p_unassign boolean default false
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  t public.support_tickets%rowtype;
  staff boolean := private.has_permission('support.manage');
begin
  select * into t from public.support_tickets where id = p_ticket for update;
  if not found then
    raise exception 'Ticket not found' using errcode = 'P0002';
  end if;
  if not staff then
    -- Requesters may only close or resolve their own ticket.
    if t.requester_id <> uid or p_status is null or p_status not in ('resolved', 'closed')
       or p_priority is not null or p_assignee is not null or p_unassign then
      raise exception 'Not permitted' using errcode = '42501';
    end if;
  end if;
  if p_priority is not null and p_priority not in ('low', 'normal', 'high', 'urgent') then
    raise exception 'Invalid priority' using errcode = '22023';
  end if;
  if p_assignee is not null and not exists (
       select 1 from public.user_role_assignments a
       join public.role_permissions rp on rp.role_id = a.role_id
       where a.user_id = p_assignee and rp.permission_key = 'support.manage'
         and a.region_id is null and a.district_id is null and a.community_id is null) then
    raise exception 'Tickets can only be assigned to support staff' using errcode = '22023';
  end if;

  update public.support_tickets set
    status = coalesce(p_status, status),
    priority = coalesce(p_priority, priority),
    assigned_to = case when p_unassign then null else coalesce(p_assignee, assigned_to) end,
    resolved_at = case when coalesce(p_status, status) in ('resolved', 'closed') then coalesce(resolved_at, now())
                       else null end,
    last_activity_at = now()
  where id = p_ticket;

  if staff and p_status in ('resolved', 'closed') and t.requester_id <> uid then
    perform private.notify(t.requester_id, 'support.resolved',
      'Ticket #' || t.ticket_number || ' marked ' || p_status::text, t.subject,
      '/support/' || p_ticket::text);
  end if;
  if staff then
    perform private.write_audit('support.update', 'support_tickets', p_ticket::text,
      jsonb_build_object('status', p_status, 'priority', p_priority, 'assignee', p_assignee,
                         'unassign', p_unassign));
  end if;
end;
$$;

revoke all on function public.create_support_ticket(public.ticket_category, text, text, uuid) from public, anon;
revoke all on function public.reply_support_ticket(uuid, text) from public, anon;
revoke all on function public.update_support_ticket(uuid, public.ticket_status, text, uuid, boolean) from public, anon;
grant execute on function public.create_support_ticket(public.ticket_category, text, text, uuid) to authenticated;
grant execute on function public.reply_support_ticket(uuid, text) to authenticated;
grant execute on function public.update_support_ticket(uuid, public.ticket_status, text, uuid, boolean) to authenticated;

alter table public.support_tickets enable row level security;
alter table public.support_ticket_messages enable row level security;
grant select on public.support_tickets, public.support_ticket_messages to authenticated;
create policy "Requesters see their tickets"
  on public.support_tickets for select to authenticated
  using (requester_id = (select auth.uid()));
create policy "Support staff see all tickets"
  on public.support_tickets for select to authenticated
  using (private.has_permission('support.manage'));
create policy "Ticket messages follow ticket visibility"
  on public.support_ticket_messages for select to authenticated
  using (exists (select 1 from public.support_tickets t where t.id = ticket_id
                 and (t.requester_id = (select auth.uid()) or private.has_permission('support.manage'))));

-- Permission + a dedicated platform role.
insert into public.permissions (key, category, description) values
  ('support.manage', 'Support', 'Answer and manage support tickets (platform-wide)')
on conflict (key) do update set category = excluded.category, description = excluded.description;
insert into public.roles (key, name, description, scope_level, is_system) values
  ('support_agent', 'Support Agent', 'Answers resident and workspace support tickets.', 'platform', true)
on conflict (key) do update set name = excluded.name, description = excluded.description,
  scope_level = excluded.scope_level, is_system = true;
insert into public.role_permissions (role_id, permission_key)
select r.id, p.key
from public.roles r
cross join (values ('support.manage')) as p(key)
where r.key in ('platform_owner', 'platform_admin')
on conflict do nothing;
insert into public.role_permissions (role_id, permission_key)
select r.id, p.key
from public.roles r
cross join (values ('admin.access'), ('users.read'), ('support.manage')) as p(key)
where r.key = 'support_agent'
on conflict do nothing;

-- -----------------------------------------------------------------------------
-- Capability defaults for the new modules
-- -----------------------------------------------------------------------------
insert into public.entity_type_capabilities (entity_type, capability)
select t::public.entity_type, c::public.entity_capability
from (values
  ('business',           array['messages','bookings','reviews']),
  ('cooperative',        array['messages','bookings','reviews']),
  ('ngo',                array['messages','bookings','reviews']),
  ('school',             array['messages','bookings','reviews']),
  ('health_facility',    array['messages','bookings','reviews']),
  ('government_agency',  array['messages','bookings']),
  ('faith_organisation', array['messages']),
  ('community_group',    array['messages'])
) as d(t, caps), unnest(d.caps) as c
on conflict do nothing;

-- -----------------------------------------------------------------------------
-- Realtime: inbox updates live (RLS-filtered).
-- -----------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.conversation_messages;
    alter publication supabase_realtime add table public.conversations;
  end if;
end;
$$;

-- -----------------------------------------------------------------------------
-- 7. Privacy: self-service account deletion
-- -----------------------------------------------------------------------------
-- Deletes the caller's account. If marketplace orders reference the account
-- (kept for the seller's records), the account is anonymised and its sign-in
-- disabled instead of being removed.
create or replace function public.delete_my_account(p_confirm text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
begin
  if uid is null then
    raise exception 'Not permitted' using errcode = '42501';
  end if;
  if p_confirm is distinct from 'DELETE' then
    raise exception 'Type DELETE to confirm' using errcode = '22023';
  end if;
  if exists (
    select 1 from public.entity_memberships m
    where m.user_id = uid and m.role = 'owner'
      and not exists (select 1 from public.entity_memberships o
                      where o.entity_id = m.entity_id and o.role = 'owner' and o.user_id <> uid)) then
    raise exception 'Transfer ownership of your organisations before deleting your account'
      using errcode = '23514';
  end if;
  if exists (select 1 from public.user_role_assignments a join public.roles r on r.id = a.role_id
             where a.user_id = uid and r.key = 'platform_owner')
     and not exists (select 1 from public.user_role_assignments a join public.roles r on r.id = a.role_id
                     where a.user_id <> uid and r.key = 'platform_owner') then
    raise exception 'The last platform owner cannot delete their account' using errcode = '23514';
  end if;

  perform private.write_audit('profiles.self_delete', 'profiles', uid::text, '{}'::jsonb);

  if exists (select 1 from public.orders where buyer_id = uid) then
    delete from public.user_role_assignments where user_id = uid;
    delete from public.entity_memberships where user_id = uid;
    delete from public.posts where author_id = uid;
    delete from public.post_comments where author_id = uid;
    delete from public.entity_reviews where author_id = uid;
    delete from public.notifications where recipient_id = uid;
    update public.profiles set
      display_name = 'Deleted user', username = null, avatar_path = null, bio = null,
      home_community_id = null, account_status = 'deactivated'
    where id = uid;
    update auth.users set
      email = 'deleted+' || uid::text || '@invalid.bridgeconnect',
      phone = null,
      encrypted_password = null,
      raw_user_meta_data = '{}'::jsonb,
      banned_until = 'infinity'
    where id = uid;
    delete from auth.identities where user_id = uid;
    delete from auth.sessions where user_id = uid;
    return 'anonymised';
  end if;

  delete from auth.users where id = uid;
  return 'deleted';
end;
$$;
revoke all on function public.delete_my_account(text) from public, anon;
grant execute on function public.delete_my_account(text) to authenticated;

-- -----------------------------------------------------------------------------
-- 8. Platform-owner bootstrap
-- -----------------------------------------------------------------------------
-- Operators list an email in private.owner_bootstrap (SQL editor / production
-- script). When an account with that email exists AND has confirmed it, it is
-- granted platform_owner once, audited, and the entry is consumed. An
-- unconfirmed sign-up with the email gets nothing.
create table private.owner_bootstrap (
  email text primary key check (email = lower(email) and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  created_at timestamptz not null default now()
);
revoke all on private.owner_bootstrap from public, anon, authenticated;

create or replace function private.apply_owner_bootstrap(p_user uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  u record;
begin
  select id, lower(email) as email, email_confirmed_at into u from auth.users where id = p_user;
  if u.id is null or u.email_confirmed_at is null
     or not exists (select 1 from private.owner_bootstrap where email = u.email)
     or not exists (select 1 from public.profiles where id = u.id) then
    return false;
  end if;
  insert into public.user_role_assignments (user_id, role_id)
  select u.id, r.id from public.roles r where r.key = 'platform_owner'
  on conflict do nothing;
  insert into public.audit_logs (action, target_table, target_id, metadata)
  values ('roles.bootstrap_owner', 'profiles', u.id::text,
          jsonb_build_object('via', 'private.owner_bootstrap'));
  delete from private.owner_bootstrap where email = u.email;
  return true;
end;
$$;
revoke all on function private.apply_owner_bootstrap(uuid) from public, anon, authenticated;

create or replace function private.owner_bootstrap_trigger()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.email_confirmed_at is not null then
    perform private.apply_owner_bootstrap(new.id);
  end if;
  return new;
end;
$$;
revoke all on function private.owner_bootstrap_trigger() from public, anon, authenticated;

-- Fires after on_auth_user_created (trigger order is alphabetical), so the profile exists.
create trigger on_auth_user_owner_bootstrap
  after insert or update of email_confirmed_at on auth.users
  for each row execute function private.owner_bootstrap_trigger();

-- Covering indexes for the new foreign keys not already indexed above.
create index if not exists entity_reviews_responded_by_fk_idx on public.entity_reviews (responded_by);
create index if not exists entity_follows_entity_id_fk_idx on public.entity_follows (entity_id);
