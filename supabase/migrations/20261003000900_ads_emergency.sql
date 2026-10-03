-- =============================================================================
-- BridgeConnect · 0009 · Advertisements and emergency information
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Advertisements: submitted by entities, reviewed by administrators.
-- -----------------------------------------------------------------------------
create type public.ad_placement as enum ('home_feed', 'explore', 'marketplace');
create type public.ad_status as enum (
  'draft', 'pending_review', 'approved', 'rejected', 'paused', 'archived'
);

create table public.advertisements (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null references public.entities (id) on delete cascade,
  title text not null check (char_length(title) between 3 and 80),
  body text check (char_length(body) <= 200),
  image_path text check (char_length(image_path) <= 500),
  -- In-app destination only (e.g. /businesses/acme). External links are not
  -- permitted in ads to limit phishing risk.
  link_path text check (link_path ~ '^/[A-Za-z0-9/_\-]*$'),
  placement public.ad_placement not null,
  target_region_id uuid references public.regions (id) on delete set null,
  target_district_id uuid references public.districts (id) on delete set null,
  target_community_id uuid references public.communities (id) on delete set null,
  starts_on date not null,
  ends_on date not null,
  status public.ad_status not null default 'draft',
  review_note text check (char_length(review_note) <= 1000),
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  impressions int not null default 0,
  clicks int not null default 0,
  created_by uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint advertisements_dates check (ends_on >= starts_on and ends_on <= starts_on + 180),
  constraint advertisements_single_target check (
    num_nonnulls(target_region_id, target_district_id, target_community_id) <= 1)
);
create index advertisements_entity_idx on public.advertisements (entity_id);
create index advertisements_serving_idx on public.advertisements (placement, status, starts_on, ends_on);

create trigger advertisements_set_updated_at before update on public.advertisements
  for each row execute function private.set_updated_at();

-- Entities may only move ads between draft / pending_review / paused / archived.
-- Any content edit of a reviewed ad sends it back for review.
create or replace function private.guard_advertisement()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  is_reviewer boolean := private.has_permission('ads.review', private.entity_community(new.entity_id));
begin
  if tg_op = 'INSERT' then
    if new.status not in ('draft', 'pending_review') then
      new.status := 'draft';
    end if;
    return new;
  end if;
  if new.status is distinct from old.status then
    if old.status = 'paused' and new.status = 'approved' then
      null; -- advertiser resumes a paused, previously approved ad
    elsif new.status in ('approved', 'rejected') and not is_reviewer then
      raise exception 'Only reviewers can approve or reject advertisements' using errcode = '42501';
    elsif new.status = 'paused' and old.status <> 'approved' then
      raise exception 'Only approved advertisements can be paused' using errcode = '22023';
    end if;
  end if;
  if (new.title, new.body, new.image_path, new.link_path, new.placement, new.starts_on, new.ends_on,
      new.target_region_id, new.target_district_id, new.target_community_id)
     is distinct from
     (old.title, old.body, old.image_path, old.link_path, old.placement, old.starts_on, old.ends_on,
      old.target_region_id, old.target_district_id, old.target_community_id)
     and old.status in ('approved', 'paused', 'rejected') then
    new.status := 'pending_review';
  end if;
  return new;
end;
$$;
create trigger advertisements_guard before insert or update on public.advertisements
  for each row execute function private.guard_advertisement();

create or replace function public.review_advertisement(
  p_ad uuid,
  p_decision public.ad_status,
  p_note text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  ad public.advertisements%rowtype;
  community uuid;
begin
  select * into ad from public.advertisements where id = p_ad for update;
  if not found then
    raise exception 'Advertisement not found' using errcode = 'P0002';
  end if;
  community := private.entity_community(ad.entity_id);
  if not private.has_permission('ads.review', community) then
    raise exception 'Not permitted' using errcode = '42501';
  end if;
  if p_decision not in ('approved', 'rejected') then
    raise exception 'Decision must be approved or rejected' using errcode = '22023';
  end if;
  if ad.status <> 'pending_review' then
    raise exception 'Advertisement is not awaiting review' using errcode = '22023';
  end if;
  if p_decision = 'rejected' and char_length(coalesce(trim(p_note), '')) < 5 then
    raise exception 'A reason is required' using errcode = '22023';
  end if;

  update public.advertisements
  set status = p_decision, review_note = left(p_note, 1000),
      reviewed_by = (select auth.uid()), reviewed_at = now()
  where id = p_ad;

  perform private.notify_entity_staff(ad.entity_id, 'manager', 'ads.reviewed',
    'Advertisement ' || p_decision::text || ': ' || ad.title, left(p_note, 300),
    '/workspace/' || ad.entity_id::text || '/ads');
  perform private.write_audit('ads.' || p_decision, 'advertisements', p_ad::text,
    jsonb_build_object('note', p_note), community);
end;
$$;

-- Serve ads for a placement and community.
create or replace function public.active_advertisements(
  p_placement public.ad_placement,
  p_community uuid default null,
  p_limit int default 3
)
returns setof public.advertisements
language sql
stable
security invoker
set search_path = ''
as $$
  select a.* from public.advertisements a
  left join public.communities c on c.id = p_community
  left join public.districts d on d.id = c.district_id
  where a.placement = p_placement
    and a.status = 'approved'
    and current_date between a.starts_on and a.ends_on
    and (
      (a.target_region_id is null and a.target_district_id is null and a.target_community_id is null)
      or a.target_community_id = p_community
      or a.target_district_id = c.district_id
      or a.target_region_id = d.region_id
    )
  order by random()
  limit least(greatest(p_limit, 1), 5);
$$;

create or replace function public.record_ad_click(p_ad uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.advertisements set clicks = clicks + 1
  where id = p_ad and status = 'approved';
$$;

revoke all on function public.review_advertisement(uuid, public.ad_status, text) from public, anon;
grant execute on function public.review_advertisement(uuid, public.ad_status, text) to authenticated;
grant execute on function public.active_advertisements(public.ad_placement, uuid, int) to anon, authenticated;
grant execute on function public.record_ad_click(uuid) to anon, authenticated;

alter table public.advertisements enable row level security;
grant select on public.advertisements to anon, authenticated;
grant insert (entity_id, title, body, image_path, link_path, placement, target_region_id,
              target_district_id, target_community_id, starts_on, ends_on, status)
  on public.advertisements to authenticated;
grant update (title, body, image_path, link_path, placement, target_region_id,
              target_district_id, target_community_id, starts_on, ends_on, status)
  on public.advertisements to authenticated;

create policy "Approved running ads are public"
  on public.advertisements for select to anon, authenticated
  using (status = 'approved' and current_date between starts_on and ends_on
         and private.entity_is_public(entity_id));
create policy "Entity managers see their ads"
  on public.advertisements for select to authenticated
  using (private.is_entity_member(entity_id, 'manager'));
create policy "Ad reviewers see ads in scope"
  on public.advertisements for select to authenticated
  using (private.has_permission('ads.review', private.entity_community(entity_id)));
create policy "Entity managers create ads"
  on public.advertisements for insert to authenticated
  with check (private.entity_can(entity_id, 'advertising', 'manager'));
create policy "Entity managers edit ads"
  on public.advertisements for update to authenticated
  using (private.entity_can(entity_id, 'advertising', 'manager'))
  with check (private.entity_can(entity_id, 'advertising', 'manager'));

-- -----------------------------------------------------------------------------
-- Emergency alerts and contacts
-- -----------------------------------------------------------------------------
create type public.alert_severity as enum ('info', 'advisory', 'warning', 'critical');
create type public.alert_category as enum (
  'fire', 'flood', 'health', 'security', 'weather', 'utility', 'road', 'missing_person', 'other'
);
create type public.alert_status as enum ('active', 'resolved', 'cancelled');

create table public.emergency_alerts (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 5 and 140),
  body text not null check (char_length(body) between 10 and 3000),
  instructions text check (char_length(instructions) <= 2000),
  severity public.alert_severity not null,
  category public.alert_category not null,
  region_id uuid references public.regions (id) on delete cascade,
  district_id uuid references public.districts (id) on delete cascade,
  community_id uuid references public.communities (id) on delete cascade,
  issued_by uuid references public.profiles (id) on delete set null,
  issuing_entity_id uuid references public.entities (id) on delete set null,
  status public.alert_status not null default 'active',
  starts_at timestamptz not null default now(),
  expires_at timestamptz,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint emergency_alerts_single_scope check (num_nonnulls(region_id, district_id, community_id) = 1),
  constraint emergency_alerts_expiry check (expires_at is null or expires_at > starts_at)
);
create index emergency_alerts_active_idx on public.emergency_alerts (status, starts_at desc);
create index emergency_alerts_community_idx on public.emergency_alerts (community_id);
create index emergency_alerts_district_idx on public.emergency_alerts (district_id);
create index emergency_alerts_region_idx on public.emergency_alerts (region_id);

create trigger emergency_alerts_set_updated_at before update on public.emergency_alerts
  for each row execute function private.set_updated_at();

-- Who may issue an alert at the given scope (optionally on behalf of an entity)?
create or replace function private.can_issue_alert(
  p_region uuid, p_district uuid, p_community uuid, p_entity uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    case
      when p_entity is null then
        private.has_permission('emergency.publish', p_community, p_district, p_region)
      else
        -- Entities with the capability may alert their own community or district.
        private.entity_can(p_entity, 'emergency_alerts', 'manager')
        and p_region is null
        and (p_community = private.entity_community(p_entity)
             or p_district = private.community_district(private.entity_community(p_entity)))
    end;
$$;

create or replace function public.issue_emergency_alert(
  p_title text,
  p_body text,
  p_severity public.alert_severity,
  p_category public.alert_category,
  p_instructions text default null,
  p_region uuid default null,
  p_district uuid default null,
  p_community uuid default null,
  p_expires_at timestamptz default null,
  p_entity uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_id uuid;
begin
  if num_nonnulls(p_region, p_district, p_community) <> 1 then
    raise exception 'Choose exactly one area for the alert' using errcode = '22023';
  end if;
  if not private.can_issue_alert(p_region, p_district, p_community, p_entity) then
    raise exception 'Not permitted to issue alerts for this area' using errcode = '42501';
  end if;

  insert into public.emergency_alerts (title, body, instructions, severity, category,
    region_id, district_id, community_id, issued_by, issuing_entity_id, expires_at)
  values (p_title, p_body, p_instructions, p_severity, p_category,
    p_region, p_district, p_community, (select auth.uid()), p_entity, p_expires_at)
  returning id into new_id;

  -- Warnings and critical alerts notify every resident in the area.
  if p_severity in ('warning', 'critical') then
    insert into public.notifications (recipient_id, type, title, body, link)
    select p.id, 'emergency.alert', left('[' || upper(p_severity::text) || '] ' || p_title, 140),
           left(p_body, 300), '/emergency/' || new_id::text
    from public.profiles p
    join public.communities c on c.id = p.home_community_id
    join public.districts d on d.id = c.district_id
    where p.account_status = 'active'
      and (p.home_community_id = p_community or c.district_id = p_district or d.region_id = p_region);
  end if;

  perform private.write_audit('emergency.issue', 'emergency_alerts', new_id::text,
    jsonb_build_object('severity', p_severity, 'title', p_title, 'entity_id', p_entity),
    p_community, p_district, p_region);
  return new_id;
end;
$$;

create or replace function public.update_emergency_alert_status(
  p_alert uuid,
  p_status public.alert_status
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  a public.emergency_alerts%rowtype;
begin
  select * into a from public.emergency_alerts where id = p_alert for update;
  if not found then
    raise exception 'Alert not found' using errcode = 'P0002';
  end if;
  if not private.can_issue_alert(a.region_id, a.district_id, a.community_id, a.issuing_entity_id)
     and not private.has_permission('emergency.publish', a.community_id, a.district_id, a.region_id) then
    raise exception 'Not permitted' using errcode = '42501';
  end if;
  if a.status <> 'active' then
    raise exception 'Alert is already closed' using errcode = '22023';
  end if;
  update public.emergency_alerts
  set status = p_status, resolved_at = case when p_status <> 'active' then now() end
  where id = p_alert;
  perform private.write_audit('emergency.' || p_status, 'emergency_alerts', p_alert::text,
    '{}'::jsonb, a.community_id, a.district_id, a.region_id);
end;
$$;

-- Alerts relevant to a community: its own, its district's and its region's.
create or replace function public.alerts_for_community(p_community uuid, p_include_closed boolean default false)
returns setof public.emergency_alerts
language sql
stable
security invoker
set search_path = ''
as $$
  select a.* from public.emergency_alerts a
  where (a.community_id = p_community
         or a.district_id = private.community_district(p_community)
         or a.region_id = private.district_region(private.community_district(p_community)))
    and (p_include_closed
         or (a.status = 'active' and (a.expires_at is null or a.expires_at > now())))
  order by case a.severity when 'critical' then 0 when 'warning' then 1
                           when 'advisory' then 2 else 3 end,
           a.starts_at desc
  limit 50;
$$;

revoke all on function public.issue_emergency_alert(text, text, public.alert_severity, public.alert_category, text, uuid, uuid, uuid, timestamptz, uuid) from public, anon;
revoke all on function public.update_emergency_alert_status(uuid, public.alert_status) from public, anon;
grant execute on function public.issue_emergency_alert(text, text, public.alert_severity, public.alert_category, text, uuid, uuid, uuid, timestamptz, uuid) to authenticated;
grant execute on function public.update_emergency_alert_status(uuid, public.alert_status) to authenticated;
grant execute on function public.alerts_for_community(uuid, boolean) to anon, authenticated;
grant execute on function private.can_issue_alert(uuid, uuid, uuid, uuid) to authenticated;

alter table public.emergency_alerts enable row level security;
grant select on public.emergency_alerts to anon, authenticated;
create policy "Emergency alerts are public"
  on public.emergency_alerts for select to anon, authenticated using (true);

create type public.emergency_service as enum (
  'police', 'fire', 'ambulance', 'hospital', 'disaster_management',
  'utility', 'community_leader', 'other'
);

create table public.emergency_contacts (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 120),
  service public.emergency_service not null,
  phone text not null check (phone ~ '^\+?[0-9 ]{3,20}$'),
  alt_phone text check (alt_phone ~ '^\+?[0-9 ]{3,20}$'),
  notes text check (char_length(notes) <= 300),
  region_id uuid references public.regions (id) on delete cascade,
  district_id uuid references public.districts (id) on delete cascade,
  community_id uuid references public.communities (id) on delete cascade,
  sort_order smallint not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- No scope = national contact (e.g. 112).
  constraint emergency_contacts_single_scope check (num_nonnulls(region_id, district_id, community_id) <= 1)
);
create index emergency_contacts_community_idx on public.emergency_contacts (community_id);
create index emergency_contacts_district_idx on public.emergency_contacts (district_id);

create trigger emergency_contacts_set_updated_at before update on public.emergency_contacts
  for each row execute function private.set_updated_at();
create trigger audit_emergency_contacts after insert or update or delete on public.emergency_contacts
  for each row execute function private.audit_row_change();

alter table public.emergency_contacts enable row level security;
grant select on public.emergency_contacts to anon, authenticated;
grant insert, update, delete on public.emergency_contacts to authenticated;
create policy "Active emergency contacts are public"
  on public.emergency_contacts for select to anon, authenticated
  using (is_active or private.has_permission('emergency.publish', community_id, district_id, region_id));
create policy "Emergency publishers add contacts in scope"
  on public.emergency_contacts for insert to authenticated
  with check (private.has_permission('emergency.publish', community_id, district_id, region_id));
create policy "Emergency publishers edit contacts in scope"
  on public.emergency_contacts for update to authenticated
  using (private.has_permission('emergency.publish', community_id, district_id, region_id))
  with check (private.has_permission('emergency.publish', community_id, district_id, region_id));
create policy "Emergency publishers delete contacts in scope"
  on public.emergency_contacts for delete to authenticated
  using (private.has_permission('emergency.publish', community_id, district_id, region_id));
