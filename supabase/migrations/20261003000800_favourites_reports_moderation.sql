-- =============================================================================
-- BridgeConnect · 0008 · Favourites, reports, moderation
-- -----------------------------------------------------------------------------
-- Polymorphic targets are modelled with one nullable FK column per target type
-- and a CHECK that exactly one is set, so referential integrity is preserved.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Favourites
-- -----------------------------------------------------------------------------
create table public.favourites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  entity_id uuid references public.entities (id) on delete cascade,
  product_id uuid references public.products (id) on delete cascade,
  service_id uuid references public.services (id) on delete cascade,
  job_id uuid references public.jobs (id) on delete cascade,
  event_id uuid references public.events (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint favourites_single_target
    check (num_nonnulls(entity_id, product_id, service_id, job_id, event_id) = 1)
);
create unique index favourites_entity_uidx on public.favourites (user_id, entity_id) where entity_id is not null;
create unique index favourites_product_uidx on public.favourites (user_id, product_id) where product_id is not null;
create unique index favourites_service_uidx on public.favourites (user_id, service_id) where service_id is not null;
create unique index favourites_job_uidx on public.favourites (user_id, job_id) where job_id is not null;
create unique index favourites_event_uidx on public.favourites (user_id, event_id) where event_id is not null;
create index favourites_user_created_idx on public.favourites (user_id, created_at desc);

alter table public.favourites enable row level security;
grant select, delete on public.favourites to authenticated;
grant insert (entity_id, product_id, service_id, job_id, event_id) on public.favourites to authenticated;
create policy "Users see their favourites"
  on public.favourites for select to authenticated
  using (user_id = (select auth.uid()));
create policy "Users add favourites"
  on public.favourites for insert to authenticated
  with check (user_id = (select auth.uid()) and private.is_active_user());
create policy "Users remove favourites"
  on public.favourites for delete to authenticated
  using (user_id = (select auth.uid()));

-- -----------------------------------------------------------------------------
-- Reports
-- -----------------------------------------------------------------------------
create type public.report_reason as enum (
  'spam', 'scam_or_fraud', 'harassment', 'hate_speech', 'violence',
  'misinformation', 'inappropriate', 'impersonation', 'prohibited_item', 'other'
);
create type public.report_status as enum ('open', 'reviewing', 'resolved', 'dismissed');

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  post_id uuid references public.posts (id) on delete cascade,
  comment_id uuid references public.post_comments (id) on delete cascade,
  entity_id uuid references public.entities (id) on delete cascade,
  product_id uuid references public.products (id) on delete cascade,
  service_id uuid references public.services (id) on delete cascade,
  job_id uuid references public.jobs (id) on delete cascade,
  event_id uuid references public.events (id) on delete cascade,
  profile_id uuid references public.profiles (id) on delete cascade,
  -- Derived server-side; drives geographic scoping of moderation.
  community_id uuid references public.communities (id) on delete set null,
  reason public.report_reason not null,
  details text check (char_length(details) <= 2000),
  status public.report_status not null default 'open',
  handled_by uuid references public.profiles (id) on delete set null,
  resolution_note text check (char_length(resolution_note) <= 2000),
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reports_single_target check (num_nonnulls(
    post_id, comment_id, entity_id, product_id, service_id, job_id, event_id, profile_id) = 1)
);
create index reports_status_idx on public.reports (status, created_at);
create index reports_community_idx on public.reports (community_id);
create index reports_post_idx on public.reports (post_id) where post_id is not null;
-- One open report per reporter per target.
create unique index reports_open_unique_idx on public.reports (
  reporter_id,
  coalesce(post_id, comment_id, entity_id, product_id, service_id, job_id, event_id, profile_id)
) where status in ('open', 'reviewing');

create trigger reports_set_updated_at before update on public.reports
  for each row execute function private.set_updated_at();

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
    (select home_community_id from public.profiles where id = new.profile_id)
  );
  return new;
end;
$$;
create trigger reports_prepare before insert on public.reports
  for each row execute function private.prepare_report();

-- Auto-hide a post once enough distinct users have open reports against it.
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
  return new;
end;
$$;
create trigger reports_auto_hide after insert on public.reports
  for each row execute function private.report_auto_hide();

-- -----------------------------------------------------------------------------
-- Moderation actions (immutable record of every moderator decision)
-- -----------------------------------------------------------------------------
create type public.moderation_action_type as enum (
  'approve', 'hide', 'remove', 'restore', 'dismiss_report', 'warn_user'
);
create type public.moderation_target as enum (
  'post', 'comment', 'product', 'service', 'job', 'event'
);

create table public.moderation_actions (
  id uuid primary key default gen_random_uuid(),
  moderator_id uuid references public.profiles (id) on delete set null,
  report_id uuid references public.reports (id) on delete set null,
  target_type public.moderation_target,
  target_id uuid,
  community_id uuid references public.communities (id) on delete set null,
  action public.moderation_action_type not null,
  reason text not null check (char_length(reason) between 3 and 1000),
  created_at timestamptz not null default now()
);
create index moderation_actions_target_idx on public.moderation_actions (target_type, target_id);
create index moderation_actions_created_idx on public.moderation_actions (created_at desc);

-- Apply a moderation decision to content. Scope is the content's community.
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
begin
  if char_length(coalesce(trim(p_reason), '')) < 3 then
    raise exception 'A reason is required' using errcode = '22023';
  end if;
  if p_action not in ('approve', 'hide', 'remove', 'restore') then
    raise exception 'Unsupported action for content' using errcode = '22023';
  end if;

  case p_target_type
    when 'post' then
      select community_id, author_id into target_community, owner_id from public.posts where id = p_target;
      perm := 'content.moderate';
    when 'comment' then
      select p.community_id, c.author_id into target_community, owner_id
      from public.post_comments c join public.posts p on p.id = c.post_id where c.id = p_target;
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

  if p_target_type in ('post', 'comment') then
    if p_target_type = 'post' then
      update public.posts set
        status = case p_action when 'approve' then 'published' when 'restore' then 'published'
                               when 'hide' then 'hidden' else 'removed' end::public.content_status,
        moderation_reason = case when p_action in ('approve', 'restore') then null else left(p_reason, 1000) end
      where id = p_target;
    else
      update public.post_comments set
        status = case p_action when 'approve' then 'published' when 'restore' then 'published'
                               when 'hide' then 'hidden' else 'removed' end::public.content_status,
        moderation_reason = case when p_action in ('approve', 'restore') then null else left(p_reason, 1000) end
      where id = p_target;
    end if;
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

-- Move a report through review without touching content (dismiss / reviewing).
create or replace function public.update_report_status(
  p_report uuid,
  p_status public.report_status,
  p_note text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  r public.reports%rowtype;
begin
  select * into r from public.reports where id = p_report for update;
  if not found then
    raise exception 'Report not found' using errcode = 'P0002';
  end if;
  if not (private.has_permission('content.moderate', r.community_id)
          or (r.community_id is null and private.has_permission('content.moderate'))) then
    raise exception 'Not permitted' using errcode = '42501';
  end if;
  if p_status = 'open' then
    raise exception 'Invalid status' using errcode = '22023';
  end if;
  update public.reports
  set status = p_status, handled_by = (select auth.uid()),
      resolution_note = coalesce(left(p_note, 2000), resolution_note),
      resolved_at = case when p_status in ('resolved', 'dismissed') then now() end
  where id = p_report;
  if p_status = 'dismissed' then
    insert into public.moderation_actions (moderator_id, report_id, community_id, action, reason)
    values ((select auth.uid()), p_report, r.community_id, 'dismiss_report',
            coalesce(nullif(trim(p_note), ''), 'Dismissed'));
  end if;
  perform private.write_audit('reports.' || p_status, 'reports', p_report::text,
    jsonb_build_object('note', p_note), r.community_id);
end;
$$;

revoke all on function public.moderate_content(public.moderation_target, uuid, public.moderation_action_type, text, uuid) from public, anon;
revoke all on function public.update_report_status(uuid, public.report_status, text) from public, anon;
grant execute on function public.moderate_content(public.moderation_target, uuid, public.moderation_action_type, text, uuid) to authenticated;
grant execute on function public.update_report_status(uuid, public.report_status, text) to authenticated;

alter table public.reports enable row level security;
alter table public.moderation_actions enable row level security;

grant select on public.reports to authenticated;
grant insert (post_id, comment_id, entity_id, product_id, service_id, job_id, event_id,
              profile_id, reason, details)
  on public.reports to authenticated;
create policy "Reporters see their reports"
  on public.reports for select to authenticated
  using (reporter_id = (select auth.uid()));
create policy "Moderators see reports in scope"
  on public.reports for select to authenticated
  using (private.has_permission('reports.read', community_id)
         or (community_id is null and private.has_permission('reports.read')));
create policy "Active users file reports"
  on public.reports for insert to authenticated
  with check (reporter_id = (select auth.uid()) and private.is_active_user()
              and (profile_id is null or profile_id <> (select auth.uid())));

grant select on public.moderation_actions to authenticated;
create policy "Moderators see moderation history in scope"
  on public.moderation_actions for select to authenticated
  using (private.has_permission('content.moderate', community_id)
         or (community_id is null and private.has_permission('content.moderate')));
