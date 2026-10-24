-- =============================================================================
-- BridgeConnect · 0003b · Notifications
-- In-app notifications. Rows are created only by database workflows
-- (private.notify) and the scoped broadcast RPC — never directly by clients.
-- Realtime is enabled for this table (see 0012) so badges update live.
-- =============================================================================

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  type text not null check (type ~ '^[a-z_]+\.[a-z_]+$'),
  title text not null check (char_length(title) between 1 and 140),
  body text check (char_length(body) <= 1000),
  -- In-app relative path only; prevents open-redirect / javascript: links.
  link text check (link ~ '^/[A-Za-z0-9/_\-?=&.%]*$'),
  data jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_recipient_created_idx
  on public.notifications (recipient_id, created_at desc);
create index notifications_unread_idx
  on public.notifications (recipient_id) where read_at is null;

create or replace function private.notify(
  p_recipient uuid,
  p_type text,
  p_title text,
  p_body text default null,
  p_link text default null,
  p_data jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_recipient is null then
    return;
  end if;
  insert into public.notifications (recipient_id, type, title, body, link, data)
  values (p_recipient, p_type, left(p_title, 140), left(p_body, 1000), p_link,
          coalesce(p_data, '{}'::jsonb));
end;
$$;

-- Mark all of the caller's notifications read.
create or replace function public.mark_all_notifications_read()
returns void
language sql
security invoker
set search_path = ''
as $$
  update public.notifications
  set read_at = now()
  where recipient_id = (select auth.uid()) and read_at is null;
$$;

-- Scoped broadcast to residents whose home community falls in scope.
create or replace function public.admin_broadcast_notification(
  p_title text,
  p_body text,
  p_link text default null,
  p_region uuid default null,
  p_district uuid default null,
  p_community uuid default null
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  sent integer;
begin
  if num_nonnulls(p_region, p_district, p_community) > 1 then
    raise exception 'Specify at most one scope' using errcode = '22023';
  end if;
  if not private.has_permission('notifications.broadcast', p_community, p_district, p_region) then
    raise exception 'Not permitted' using errcode = '42501';
  end if;
  if char_length(coalesce(trim(p_title), '')) < 3 then
    raise exception 'Title is required' using errcode = '22023';
  end if;

  insert into public.notifications (recipient_id, type, title, body, link)
  select p.id, 'system.broadcast', left(p_title, 140), left(p_body, 1000), p_link
  from public.profiles p
  left join public.communities c on c.id = p.home_community_id
  left join public.districts d on d.id = c.district_id
  where p.account_status = 'active'
    and (
      (p_region is null and p_district is null and p_community is null)
      or (p_community is not null and p.home_community_id = p_community)
      or (p_district is not null and c.district_id = p_district)
      or (p_region is not null and d.region_id = p_region)
    );
  get diagnostics sent = row_count;

  perform private.write_audit('notifications.broadcast', 'notifications', null,
    jsonb_build_object('title', p_title, 'recipients', sent),
    p_community, p_district, p_region);
  return sent;
end;
$$;

revoke all on function public.mark_all_notifications_read() from public, anon;
revoke all on function public.admin_broadcast_notification(text, text, text, uuid, uuid, uuid) from public, anon;
grant execute on function public.mark_all_notifications_read() to authenticated;
grant execute on function public.admin_broadcast_notification(text, text, text, uuid, uuid, uuid) to authenticated;

alter table public.notifications enable row level security;
grant select, delete on public.notifications to authenticated;
grant update (read_at) on public.notifications to authenticated;

create policy "Users read their own notifications"
  on public.notifications for select to authenticated
  using (recipient_id = (select auth.uid()));
create policy "Users mark their own notifications read"
  on public.notifications for update to authenticated
  using (recipient_id = (select auth.uid()))
  with check (recipient_id = (select auth.uid()));
create policy "Users delete their own notifications"
  on public.notifications for delete to authenticated
  using (recipient_id = (select auth.uid()));
