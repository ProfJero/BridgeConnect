-- =============================================================================
-- BridgeConnect · 0019 · Owner fast-track, rentals, riders & trips
-- -----------------------------------------------------------------------------
--  1. Platform owners can set up their own organisations instantly (nobody
--     outranks them, so "you cannot review your own application" would block
--     them forever). Everyone else still goes through independent review.
--  2. Rentals: residents list rooms, houses, shops, land… and receive viewing
--     requests. Moderated and reportable like other content.
--  3. Mobility: dispatch riders, drivers and tricycle riders register, are
--     verified by staff, go online and accept ride / delivery requests
--     (first accept wins). Deliveries can carry a marketplace order.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Platform-owner fast track
-- -----------------------------------------------------------------------------
create or replace function public.fast_track_entity_application(p_application uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  app public.entity_applications%rowtype;
  uid uuid := (select auth.uid());
  new_entity uuid;
begin
  select * into app from public.entity_applications where id = p_application for update;
  if not found then
    raise exception 'Application not found' using errcode = 'P0002';
  end if;
  -- Only a platform owner, and only for their OWN application. Owners already
  -- hold every permission, so independent review adds no extra assurance.
  if app.applicant_id <> uid or not private.has_permission('platform.owner') then
    raise exception 'Not permitted' using errcode = '42501';
  end if;
  if app.status not in ('submitted', 'under_review', 'info_requested') then
    raise exception 'Application has already been decided' using errcode = '22023';
  end if;

  insert into public.entities (
    entity_type, name, slug, description, sector, community_id, address, phone, email, verified_by)
  values (
    app.entity_type, app.proposed_name, private.unique_slug('public.entities', app.proposed_name),
    app.description, app.sector, app.community_id, app.address, app.contact_phone, app.contact_email, uid)
  returning id into new_entity;

  if app.entity_type = 'business' then
    insert into public.business_profiles (entity_id) values (new_entity);
  else
    insert into public.organisation_profiles (entity_id) values (new_entity);
  end if;
  insert into public.entity_memberships (entity_id, user_id, role, invited_by)
  values (new_entity, uid, 'owner', uid);

  update public.entity_applications
  set status = 'approved', reviewer_id = uid, decided_at = now(), entity_id = new_entity,
      decision_reason = 'Set up directly by a platform owner'
  where id = p_application;
  insert into public.application_events (application_id, actor_id, event, note)
  values (p_application, uid, 'approved', 'Set up directly by a platform owner');

  perform private.write_audit('verification.owner_fast_track', 'entity_applications', p_application::text,
    jsonb_build_object('entity_id', new_entity, 'name', app.proposed_name), app.community_id);
  return new_entity;
end;
$$;
revoke all on function public.fast_track_entity_application(uuid) from public, anon;
grant execute on function public.fast_track_entity_application(uuid) to authenticated;

-- New permission for the mobility module.
insert into public.permissions (key, category, description) values
  ('mobility.manage', 'Mobility', 'Verify riders and drivers and oversee trips in scope')
on conflict (key) do update set category = excluded.category, description = excluded.description;
insert into public.role_permissions (role_id, permission_key)
select r.id, 'mobility.manage' from public.roles r
where r.key in ('platform_owner', 'platform_admin', 'regional_admin', 'district_admin')
on conflict do nothing;

-- -----------------------------------------------------------------------------
-- 2. Rentals
-- -----------------------------------------------------------------------------
create type public.rental_type as enum (
  'room', 'self_contain', 'apartment', 'house', 'shop', 'office', 'warehouse', 'land', 'event_space'
);
create type public.rental_period as enum ('day', 'week', 'month', 'year');
create type public.rental_status as enum ('draft', 'available', 'rented', 'archived', 'removed');

create table public.rental_listings (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  community_id uuid not null references public.communities (id) on delete restrict,
  rental_type public.rental_type not null,
  title text not null check (char_length(title) between 5 and 140),
  slug text not null unique default '',
  description text not null check (char_length(description) between 20 and 5000),
  price numeric(12, 2) not null check (price > 0 and price <= 10000000),
  currency char(3) not null default 'GHS' check (currency ~ '^[A-Z]{3}$'),
  period public.rental_period not null default 'month',
  advance_months smallint check (advance_months between 0 and 36),
  bedrooms smallint check (bedrooms between 0 and 20),
  bathrooms smallint check (bathrooms between 0 and 20),
  furnished boolean not null default false,
  amenities text[] not null default '{}' check (cardinality(amenities) <= 20),
  location_note text check (char_length(location_note) <= 300),
  contact_phone text not null check (contact_phone ~ '^\+?[0-9 ]{7,20}$'),
  whatsapp text check (whatsapp ~ '^\+?[0-9 ]{7,20}$'),
  available_from date,
  status public.rental_status not null default 'available',
  moderation_reason text check (char_length(moderation_reason) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  search tsvector generated always as (
    setweight(to_tsvector('simple', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(location_note, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(description, '')), 'C')
  ) stored
);
create index rental_listings_public_idx on public.rental_listings (status, community_id, created_at desc);
create index rental_listings_owner_idx on public.rental_listings (owner_id, created_at desc);
create index rental_listings_type_idx on public.rental_listings (rental_type, price) where status = 'available';
create index rental_listings_community_fk_idx on public.rental_listings (community_id);
create index rental_listings_search_idx on public.rental_listings using gin (search);

create trigger rental_listings_set_updated_at before update on public.rental_listings
  for each row execute function private.set_updated_at();
create trigger rental_listings_assign_slug before insert or update of title on public.rental_listings
  for each row execute function private.assign_listing_slug();

create or replace function private.prepare_rental()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (select 1 from unnest(new.amenities) a where char_length(a) not between 1 and 40) then
    raise exception 'Amenities must be 1 to 40 characters' using errcode = '22023';
  end if;
  if tg_op = 'INSERT' then
    if new.status = 'removed' then
      new.status := 'available';
    end if;
    if (select count(*) from public.rental_listings
        where owner_id = new.owner_id and created_at > now() - interval '1 day') >= 10 then
      raise exception 'Listing limit reached. Please try again tomorrow.' using errcode = '54000';
    end if;
  end if;
  -- Owners can never set 'removed': the RLS update policy's WITH CHECK forbids it,
  -- so only moderate_content (SECURITY DEFINER) can.
  return new;
end;
$$;
create trigger rental_listings_prepare before insert or update on public.rental_listings
  for each row execute function private.prepare_rental();

create table public.rental_media (
  rental_id uuid not null references public.rental_listings (id) on delete cascade,
  media_id uuid not null references public.media_assets (id) on delete cascade,
  position smallint not null default 0 check (position between 0 and 9),
  primary key (rental_id, media_id)
);
create index rental_media_media_idx on public.rental_media (media_id);

alter table public.rental_listings enable row level security;
alter table public.rental_media enable row level security;

grant select on public.rental_listings to anon, authenticated;
grant insert (community_id, rental_type, title, description, price, period, advance_months, bedrooms,
              bathrooms, furnished, amenities, location_note, contact_phone, whatsapp, available_from, status)
  on public.rental_listings to authenticated;
grant update (community_id, rental_type, title, description, price, period, advance_months, bedrooms,
              bathrooms, furnished, amenities, location_note, contact_phone, whatsapp, available_from, status)
  on public.rental_listings to authenticated;
grant delete on public.rental_listings to authenticated;

create or replace function private.owner_is_active(p_owner uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.profiles where id = p_owner and account_status = 'active');
$$;
grant execute on function private.owner_is_active(uuid) to anon, authenticated;

create policy "Available and rented listings are public"
  on public.rental_listings for select to anon, authenticated
  using (status in ('available', 'rented') and private.owner_is_active(owner_id));
create policy "Owners see their listings"
  on public.rental_listings for select to authenticated
  using (owner_id = (select auth.uid()));
create policy "Moderators see listings in scope"
  on public.rental_listings for select to authenticated
  using (private.has_permission('content.moderate', community_id));
create policy "Active users list rentals"
  on public.rental_listings for insert to authenticated
  with check (owner_id = (select auth.uid()) and private.is_active_user() and status <> 'removed');
create policy "Owners edit their listings"
  on public.rental_listings for update to authenticated
  using (owner_id = (select auth.uid()) and private.is_active_user() and status <> 'removed')
  with check (owner_id = (select auth.uid()) and status <> 'removed');
create policy "Owners delete their listings"
  on public.rental_listings for delete to authenticated
  using (owner_id = (select auth.uid()));

grant select on public.rental_media to anon, authenticated;
grant insert, delete on public.rental_media to authenticated;
create policy "Rental photos follow listing visibility"
  on public.rental_media for select to anon, authenticated
  using (exists (select 1 from public.rental_listings r where r.id = rental_id));
create policy "Owners attach their own photos"
  on public.rental_media for insert to authenticated
  with check (
    exists (select 1 from public.rental_listings r where r.id = rental_id and r.owner_id = (select auth.uid()))
    and exists (select 1 from public.media_assets m where m.id = media_id and m.owner_id = (select auth.uid())
                and m.entity_id is null)
  );
create policy "Owners detach photos"
  on public.rental_media for delete to authenticated
  using (exists (select 1 from public.rental_listings r where r.id = rental_id and r.owner_id = (select auth.uid())));

-- Viewing requests / enquiries
create type public.inquiry_status as enum ('new', 'contacted', 'closed');
create table public.rental_inquiries (
  id uuid primary key default gen_random_uuid(),
  rental_id uuid not null references public.rental_listings (id) on delete cascade,
  sender_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  message text not null check (char_length(message) between 5 and 1000),
  contact_phone text not null check (contact_phone ~ '^\+?[0-9 ]{7,20}$'),
  preferred_date date,
  status public.inquiry_status not null default 'new',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index rental_inquiries_rental_idx on public.rental_inquiries (rental_id, created_at desc);
create index rental_inquiries_sender_idx on public.rental_inquiries (sender_id, created_at desc);
create trigger rental_inquiries_set_updated_at before update on public.rental_inquiries
  for each row execute function private.set_updated_at();

create or replace function private.prepare_rental_inquiry()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  r public.rental_listings%rowtype;
begin
  select * into r from public.rental_listings where id = new.rental_id;
  if r.id is null or r.status <> 'available' then
    raise exception 'This property is not available' using errcode = '22023';
  end if;
  if r.owner_id = new.sender_id then
    raise exception 'You cannot enquire about your own listing' using errcode = '22023';
  end if;
  if (select count(*) from public.rental_inquiries
      where sender_id = new.sender_id and created_at > now() - interval '1 day') >= 20 then
    raise exception 'Enquiry limit reached. Please try again tomorrow.' using errcode = '54000';
  end if;
  new.status := 'new';
  perform private.notify(r.owner_id, 'rental.inquiry', 'New enquiry: ' || r.title,
    left(new.message, 140), '/rentals/mine');
  return new;
end;
$$;
create trigger rental_inquiries_prepare before insert on public.rental_inquiries
  for each row execute function private.prepare_rental_inquiry();

alter table public.rental_inquiries enable row level security;
grant select on public.rental_inquiries to authenticated;
grant insert (rental_id, message, contact_phone, preferred_date) on public.rental_inquiries to authenticated;
grant update (status) on public.rental_inquiries to authenticated;
create policy "Senders see their enquiries"
  on public.rental_inquiries for select to authenticated
  using (sender_id = (select auth.uid()));
create policy "Listing owners see enquiries"
  on public.rental_inquiries for select to authenticated
  using (exists (select 1 from public.rental_listings r where r.id = rental_id and r.owner_id = (select auth.uid())));
create policy "Active users send enquiries"
  on public.rental_inquiries for insert to authenticated
  with check (sender_id = (select auth.uid()) and private.is_active_user());
create policy "Listing owners update enquiry status"
  on public.rental_inquiries for update to authenticated
  using (exists (select 1 from public.rental_listings r where r.id = rental_id and r.owner_id = (select auth.uid())))
  with check (exists (select 1 from public.rental_listings r where r.id = rental_id and r.owner_id = (select auth.uid())));

-- Reports and moderation for rentals
alter table public.reports add column rental_id uuid references public.rental_listings (id) on delete cascade;
create index reports_rental_idx on public.reports (rental_id) where rental_id is not null;
alter table public.reports drop constraint reports_single_target;
alter table public.reports add constraint reports_single_target check (num_nonnulls(
  post_id, comment_id, entity_id, product_id, service_id, job_id, event_id, profile_id, review_id, rental_id) = 1);
drop index public.reports_open_unique_idx;
create unique index reports_open_unique_idx on public.reports (
  reporter_id,
  coalesce(post_id, comment_id, entity_id, product_id, service_id, job_id, event_id, profile_id, review_id, rental_id)
) where status in ('open', 'reviewing');
grant insert (rental_id) on public.reports to authenticated;

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
    (select private.entity_community(entity_id) from public.entity_reviews where id = new.review_id),
    (select community_id from public.rental_listings where id = new.rental_id)
  );
  return new;
end;
$$;

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
    when 'rental' then
      select community_id, rental_listings.owner_id into target_community, owner_id
      from public.rental_listings where id = p_target;
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
  elsif p_target_type = 'rental' then
    update public.rental_listings set
      status = case when p_action in ('hide', 'remove') then 'removed' else 'archived' end::public.rental_status,
      moderation_reason = case when p_action in ('hide', 'remove') then left(p_reason, 1000) end
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
-- 3. Mobility: riders, drivers and trips
-- -----------------------------------------------------------------------------
create type public.vehicle_type as enum ('motorbike', 'tricycle', 'car', 'van', 'bicycle');
create type public.rider_status as enum ('pending', 'approved', 'suspended', 'rejected');
create type public.trip_kind as enum ('ride', 'delivery');
create type public.trip_status as enum ('requested', 'accepted', 'arrived', 'in_progress', 'completed', 'cancelled');
create type public.payment_method as enum ('cash', 'mobile_money');

create table public.rider_profiles (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  vehicle_type public.vehicle_type not null,
  vehicle_description text not null check (char_length(vehicle_description) between 2 and 120),
  plate_number text check (plate_number ~ '^[A-Za-z0-9 -]{2,20}$'),
  offers_rides boolean not null default true,
  offers_delivery boolean not null default true,
  community_id uuid not null references public.communities (id) on delete restrict,
  service_area text check (char_length(service_area) <= 200),
  phone text not null check (phone ~ '^\+?[0-9 ]{7,20}$'),
  whatsapp text check (whatsapp ~ '^\+?[0-9 ]{7,20}$'),
  bio text check (char_length(bio) <= 300),
  status public.rider_status not null default 'pending',
  status_reason text check (char_length(status_reason) <= 500),
  reviewed_by uuid references public.profiles (id) on delete set null,
  is_online boolean not null default false,
  last_online_at timestamptz,
  -- Approximate position, only used server-side to sort nearby riders. Never granted to API roles.
  last_lat numeric(8, 5) check (last_lat between -90 and 90),
  last_lng numeric(8, 5) check (last_lng between -180 and 180),
  rating_avg numeric(3, 2) check (rating_avg between 1 and 5),
  rating_count int not null default 0 check (rating_count >= 0),
  completed_trips int not null default 0 check (completed_trips >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint rider_profiles_offers_something check (offers_rides or offers_delivery)
);
create index rider_profiles_available_idx on public.rider_profiles (community_id, vehicle_type)
  where status = 'approved' and is_online;
create index rider_profiles_status_idx on public.rider_profiles (status, created_at);
create index rider_profiles_reviewed_by_fk_idx on public.rider_profiles (reviewed_by);
create trigger rider_profiles_set_updated_at before update on public.rider_profiles
  for each row execute function private.set_updated_at();

-- Riders can't approve themselves; a platform owner registering is approved immediately.
create or replace function private.prepare_rider_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.status := case when private.has_permission('platform.owner') then 'approved' else 'pending' end;
    new.status_reason := null;
    new.reviewed_by := case when new.status = 'approved' then new.user_id end;
    new.is_online := false;
    new.rating_avg := null;
    new.rating_count := 0;
    new.completed_trips := 0;
  end if;
  if new.is_online and new.status <> 'approved' then
    raise exception 'Your rider account must be approved before going online' using errcode = '42501';
  end if;
  if new.is_online and (tg_op = 'INSERT' or not old.is_online) then
    new.last_online_at := now();
  end if;
  return new;
end;
$$;
create trigger rider_profiles_prepare before insert or update on public.rider_profiles
  for each row execute function private.prepare_rider_profile();

create or replace function private.is_approved_rider()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_active_user() and exists (
    select 1 from public.rider_profiles where user_id = (select auth.uid()) and status = 'approved');
$$;
grant execute on function private.is_approved_rider() to authenticated;

alter table public.rider_profiles enable row level security;
-- Column-level: nobody reads coordinates through the API.
grant select (user_id, vehicle_type, vehicle_description, plate_number, offers_rides, offers_delivery,
              community_id, service_area, phone, whatsapp, bio, status, status_reason, is_online,
              last_online_at, rating_avg, rating_count, completed_trips, created_at, updated_at)
  on public.rider_profiles to authenticated;
grant insert (user_id, vehicle_type, vehicle_description, plate_number, offers_rides, offers_delivery,
              community_id, service_area, phone, whatsapp, bio)
  on public.rider_profiles to authenticated;
grant update (vehicle_type, vehicle_description, plate_number, offers_rides, offers_delivery,
              community_id, service_area, phone, whatsapp, bio)
  on public.rider_profiles to authenticated;

create policy "Approved riders are visible to signed-in users"
  on public.rider_profiles for select to authenticated
  using (status = 'approved' and private.owner_is_active(user_id));
create policy "Riders see their own profile"
  on public.rider_profiles for select to authenticated
  using (user_id = (select auth.uid()));
create policy "Mobility staff see riders in scope"
  on public.rider_profiles for select to authenticated
  using (private.has_permission('mobility.manage', community_id));
create policy "Active users register as riders"
  on public.rider_profiles for insert to authenticated
  with check (user_id = (select auth.uid()) and private.is_active_user());
create policy "Riders edit their own profile"
  on public.rider_profiles for update to authenticated
  using (user_id = (select auth.uid()) and private.is_active_user())
  with check (user_id = (select auth.uid()));

-- Staff decision on a rider (approve / suspend / reject), scoped by the rider's base community.
create or replace function public.admin_review_rider(
  p_rider uuid, p_status public.rider_status, p_reason text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  r public.rider_profiles%rowtype;
begin
  select * into r from public.rider_profiles where user_id = p_rider for update;
  if not found then
    raise exception 'Rider not found' using errcode = 'P0002';
  end if;
  if not private.has_permission('mobility.manage', r.community_id) then
    raise exception 'Not permitted' using errcode = '42501';
  end if;
  if p_rider = (select auth.uid()) then
    raise exception 'You cannot review your own rider account' using errcode = '42501';
  end if;
  if p_status = 'pending' then
    raise exception 'Invalid status' using errcode = '22023';
  end if;
  if p_status in ('suspended', 'rejected') and char_length(coalesce(trim(p_reason), '')) < 5 then
    raise exception 'A reason is required' using errcode = '22023';
  end if;
  update public.rider_profiles set
    status = p_status, status_reason = nullif(trim(coalesce(p_reason, '')), ''), reviewed_by = (select auth.uid()),
    is_online = case when p_status = 'approved' then is_online else false end
  where user_id = p_rider;
  perform private.notify(p_rider, 'rider.' || p_status::text,
    case p_status when 'approved' then 'You are approved to ride on BridgeConnect'
                  when 'suspended' then 'Your rider account was suspended'
                  else 'Your rider application was not approved' end,
    nullif(trim(coalesce(p_reason, '')), ''), '/rider');
  perform private.write_audit('riders.' || p_status::text, 'rider_profiles', p_rider::text,
    jsonb_build_object('reason', p_reason), r.community_id);
end;
$$;

-- Go online / offline (with an optional approximate position).
create or replace function public.set_rider_online(
  p_online boolean, p_lat numeric default null, p_lng numeric default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_approved_rider() then
    raise exception 'Your rider account must be approved before going online' using errcode = '42501';
  end if;
  update public.rider_profiles set
    is_online = p_online,
    last_lat = case when p_online and p_lat between -90 and 90 then round(p_lat, 3) end,
    last_lng = case when p_online and p_lng between -180 and 180 then round(p_lng, 3) end
  where user_id = (select auth.uid());
end;
$$;

create table public.trips (
  id uuid primary key default gen_random_uuid(),
  trip_number bigint generated always as identity unique,
  kind public.trip_kind not null,
  vehicle_type public.vehicle_type,
  customer_id uuid not null references public.profiles (id) on delete cascade,
  rider_id uuid references public.profiles (id) on delete set null,
  preferred_rider_id uuid references public.profiles (id) on delete set null,
  community_id uuid not null references public.communities (id) on delete restrict,
  pickup_address text not null check (char_length(pickup_address) between 3 and 300),
  pickup_lat numeric(8, 5) check (pickup_lat between -90 and 90),
  pickup_lng numeric(8, 5) check (pickup_lng between -180 and 180),
  dropoff_address text not null check (char_length(dropoff_address) between 3 and 300),
  dropoff_lat numeric(8, 5) check (dropoff_lat between -90 and 90),
  dropoff_lng numeric(8, 5) check (dropoff_lng between -180 and 180),
  distance_km numeric(7, 2),
  package_description text check (char_length(package_description) <= 500),
  recipient_name text check (char_length(recipient_name) <= 80),
  recipient_phone text check (recipient_phone ~ '^\+?[0-9 ]{7,20}$'),
  customer_phone text not null check (customer_phone ~ '^\+?[0-9 ]{7,20}$'),
  order_id uuid references public.orders (id) on delete set null,
  note text check (char_length(note) <= 500),
  payment_method public.payment_method not null default 'cash',
  offered_fare numeric(10, 2) not null check (offered_fare > 0 and offered_fare <= 10000),
  final_fare numeric(10, 2) check (final_fare > 0 and final_fare <= 10000),
  currency char(3) not null default 'GHS',
  status public.trip_status not null default 'requested',
  cancel_reason text check (char_length(cancel_reason) <= 300),
  cancelled_by text check (cancelled_by in ('customer', 'rider', 'staff')),
  accepted_at timestamptz,
  arrived_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  customer_rating smallint check (customer_rating between 1 and 5),
  customer_comment text check (char_length(customer_comment) <= 500),
  rated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint trips_delivery_details check (kind = 'ride' or package_description is not null)
);
create index trips_customer_idx on public.trips (customer_id, created_at desc);
create index trips_rider_idx on public.trips (rider_id, created_at desc) where rider_id is not null;
create index trips_open_idx on public.trips (community_id, created_at) where status = 'requested';
create index trips_preferred_rider_fk_idx on public.trips (preferred_rider_id);
create index trips_order_fk_idx on public.trips (order_id);
create index trips_community_fk_idx on public.trips (community_id);
create trigger trips_set_updated_at before update on public.trips
  for each row execute function private.set_updated_at();

-- Great-circle distance in km.
create or replace function private.haversine_km(lat1 numeric, lng1 numeric, lat2 numeric, lng2 numeric)
returns numeric
language sql
immutable
set search_path = ''
as $$
  select round((2 * 6371 * asin(sqrt(
    power(sin(radians((lat2 - lat1) / 2)), 2) +
    cos(radians(lat1)) * cos(radians(lat2)) * power(sin(radians((lng2 - lng1) / 2)), 2)
  )))::numeric, 2);
$$;

-- Can the caller (an approved, online rider) take this open trip?
create or replace function private.rider_can_take(p_trip uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.trips t
    join public.rider_profiles r on r.user_id = (select auth.uid())
    where t.id = p_trip
      and t.status = 'requested'
      and r.status = 'approved' and r.is_online
      and t.customer_id <> r.user_id
      and (t.vehicle_type is null or t.vehicle_type = r.vehicle_type)
      and ((t.kind = 'ride' and r.offers_rides) or (t.kind = 'delivery' and r.offers_delivery))
      and (t.preferred_rider_id is null or t.preferred_rider_id = r.user_id)
      and private.community_district(t.community_id) = private.community_district(r.community_id)
  ) and private.is_active_user();
$$;

create or replace function public.request_trip(
  p_kind public.trip_kind,
  p_community uuid,
  p_pickup_address text,
  p_dropoff_address text,
  p_customer_phone text,
  p_offered_fare numeric,
  p_vehicle_type public.vehicle_type default null,
  p_pickup_lat numeric default null,
  p_pickup_lng numeric default null,
  p_dropoff_lat numeric default null,
  p_dropoff_lng numeric default null,
  p_package_description text default null,
  p_recipient_name text default null,
  p_recipient_phone text default null,
  p_note text default null,
  p_payment_method public.payment_method default 'cash',
  p_preferred_rider uuid default null,
  p_order uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  trip_id uuid;
  num bigint;
  o public.orders%rowtype;
  dist numeric;
  district uuid := private.community_district(p_community);
  rider uuid;
begin
  if uid is null or not private.is_active_user() then
    raise exception 'Not permitted' using errcode = '42501';
  end if;
  if district is null or not exists (select 1 from public.communities where id = p_community and is_active) then
    raise exception 'Choose a valid community' using errcode = '22023';
  end if;
  if p_kind = 'delivery' and char_length(coalesce(trim(p_package_description), '')) < 3 then
    raise exception 'Describe what is being delivered' using errcode = '22023';
  end if;
  if (select count(*) from public.trips where customer_id = uid
      and status in ('requested', 'accepted', 'arrived', 'in_progress')) >= 3 then
    raise exception 'You already have 3 active requests' using errcode = '54000';
  end if;
  if (select count(*) from public.trips where customer_id = uid and created_at > now() - interval '1 hour') >= 10 then
    raise exception 'Request limit reached. Please try again later.' using errcode = '54000';
  end if;
  if p_preferred_rider is not null and not exists (
       select 1 from public.rider_profiles r where r.user_id = p_preferred_rider and r.status = 'approved'
         and ((p_kind = 'ride' and r.offers_rides) or (p_kind = 'delivery' and r.offers_delivery))) then
    raise exception 'That rider is not available for this request' using errcode = '22023';
  end if;
  if p_preferred_rider = uid then
    raise exception 'You cannot request yourself' using errcode = '22023';
  end if;
  if p_order is not null then
    select * into o from public.orders where id = p_order;
    if o.id is null or p_kind <> 'delivery'
       or not (o.buyer_id = uid or private.entity_can(o.entity_id, 'orders', 'editor'))
       or o.status not in ('confirmed', 'ready') then
      raise exception 'This order cannot be sent for delivery' using errcode = '22023';
    end if;
  end if;
  if p_pickup_lat is not null and p_pickup_lng is not null and p_dropoff_lat is not null and p_dropoff_lng is not null then
    dist := private.haversine_km(p_pickup_lat, p_pickup_lng, p_dropoff_lat, p_dropoff_lng);
  end if;

  insert into public.trips (
    kind, vehicle_type, customer_id, preferred_rider_id, community_id,
    pickup_address, pickup_lat, pickup_lng, dropoff_address, dropoff_lat, dropoff_lng, distance_km,
    package_description, recipient_name, recipient_phone, customer_phone, order_id, note,
    payment_method, offered_fare)
  values (
    p_kind, p_vehicle_type, uid, p_preferred_rider, p_community,
    trim(p_pickup_address), p_pickup_lat, p_pickup_lng, trim(p_dropoff_address), p_dropoff_lat, p_dropoff_lng, dist,
    nullif(trim(coalesce(p_package_description, '')), ''), nullif(trim(coalesce(p_recipient_name, '')), ''),
    nullif(trim(coalesce(p_recipient_phone, '')), ''), trim(p_customer_phone), p_order,
    nullif(trim(coalesce(p_note, '')), ''), p_payment_method, round(p_offered_fare, 2))
  returning id, trip_number into trip_id, num;

  -- Alert the chosen rider, or online riders in the district who can take it.
  for rider in
    select r.user_id from public.rider_profiles r
    join public.profiles p on p.id = r.user_id and p.account_status = 'active'
    where r.status = 'approved'
      and r.user_id <> uid
      and (p_preferred_rider is null and r.is_online or r.user_id = p_preferred_rider)
      and (p_vehicle_type is null or r.vehicle_type = p_vehicle_type)
      and ((p_kind = 'ride' and r.offers_rides) or (p_kind = 'delivery' and r.offers_delivery))
      and private.community_district(r.community_id) = district
    limit 50
  loop
    perform private.notify(rider, 'trip.requested',
      case p_kind when 'ride' then 'New ride request' else 'New delivery request' end
        || ' · GHS ' || round(p_offered_fare, 2),
      left(trim(p_pickup_address), 60) || ' → ' || left(trim(p_dropoff_address), 60), '/rider');
  end loop;
  return trip_id;
end;
$$;

-- Open requests a rider can take (safe columns only: no customer phone until accepted).
create or replace function public.open_trip_requests()
returns table (
  id uuid, trip_number bigint, kind public.trip_kind, vehicle_type public.vehicle_type,
  pickup_address text, dropoff_address text, distance_km numeric, package_description text,
  note text, payment_method public.payment_method, offered_fare numeric, created_at timestamptz,
  for_me boolean, pickup_km numeric
)
language sql
stable
security definer
set search_path = ''
as $$
  select t.id, t.trip_number, t.kind, t.vehicle_type, t.pickup_address, t.dropoff_address, t.distance_km,
         t.package_description, t.note, t.payment_method, t.offered_fare, t.created_at,
         t.preferred_rider_id is not null,
         case when r.last_lat is not null and t.pickup_lat is not null
              then private.haversine_km(r.last_lat, r.last_lng, t.pickup_lat, t.pickup_lng) end
  from public.trips t
  join public.rider_profiles r on r.user_id = (select auth.uid())
  where t.status = 'requested' and private.rider_can_take(t.id)
    and t.created_at > now() - interval '6 hours'
  order by (t.preferred_rider_id is not null) desc, 14 nulls last, t.created_at
  limit 50;
$$;

create or replace function public.accept_trip(p_trip uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  t public.trips%rowtype;
  rider_name text;
begin
  if not private.rider_can_take(p_trip) then
    raise exception 'This request is no longer available' using errcode = '22023';
  end if;
  if exists (select 1 from public.trips where rider_id = uid and status in ('accepted', 'arrived', 'in_progress')) then
    raise exception 'Finish your current trip first' using errcode = '22023';
  end if;
  -- First accept wins: the status guard makes this atomic.
  update public.trips set status = 'accepted', rider_id = uid, accepted_at = now()
  where id = p_trip and status = 'requested'
  returning * into t;
  if t.id is null then
    raise exception 'This request is no longer available' using errcode = '22023';
  end if;
  select display_name into rider_name from public.profiles where id = uid;
  perform private.notify(t.customer_id, 'trip.accepted', rider_name || ' accepted your request #' || t.trip_number,
    (select vehicle_description || coalesce(' · ' || plate_number, '') from public.rider_profiles where user_id = uid),
    '/rides/' || t.id::text);
end;
$$;

create or replace function public.update_trip_status(
  p_trip uuid, p_status public.trip_status, p_reason text default null, p_final_fare numeric default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  t public.trips%rowtype;
  is_customer boolean;
  is_rider boolean;
begin
  select * into t from public.trips where id = p_trip for update;
  if not found then
    raise exception 'Trip not found' using errcode = 'P0002';
  end if;
  is_customer := t.customer_id = uid;
  is_rider := t.rider_id = uid and private.is_approved_rider();
  if not (is_customer or is_rider) or not private.is_active_user() then
    raise exception 'Not permitted' using errcode = '42501';
  end if;

  if is_rider and t.status = 'accepted' and p_status = 'arrived' then
    update public.trips set status = 'arrived', arrived_at = now() where id = p_trip;
    perform private.notify(t.customer_id, 'trip.arrived', 'Your rider has arrived', t.pickup_address,
      '/rides/' || t.id::text);
  elsif is_rider and t.status in ('accepted', 'arrived') and p_status = 'in_progress' then
    update public.trips set status = 'in_progress', started_at = now() where id = p_trip;
  elsif is_rider and t.status = 'in_progress' and p_status = 'completed' then
    if p_final_fare is not null and (p_final_fare <= 0 or p_final_fare > 10000) then
      raise exception 'Invalid fare' using errcode = '22023';
    end if;
    update public.trips set status = 'completed', completed_at = now(),
      final_fare = round(coalesce(p_final_fare, offered_fare), 2)
    where id = p_trip;
    update public.rider_profiles set completed_trips = completed_trips + 1 where user_id = uid;
    perform private.notify(t.customer_id, 'trip.completed', 'Trip #' || t.trip_number || ' completed',
      'Rate your rider to help the community.', '/rides/' || t.id::text);
  elsif is_customer and t.status in ('requested', 'accepted', 'arrived') and p_status = 'cancelled' then
    update public.trips set status = 'cancelled', cancelled_at = now(), cancelled_by = 'customer',
      cancel_reason = left(nullif(trim(coalesce(p_reason, '')), ''), 300)
    where id = p_trip;
    if t.rider_id is not null then
      perform private.notify(t.rider_id, 'trip.cancelled', 'Trip #' || t.trip_number || ' was cancelled',
        nullif(trim(coalesce(p_reason, '')), ''), '/rider');
    end if;
  elsif is_rider and t.status in ('accepted', 'arrived') and p_status = 'requested' then
    -- The rider drops the job: it goes back to the open pool.
    update public.trips set status = 'requested', rider_id = null, accepted_at = null, arrived_at = null,
      preferred_rider_id = null
    where id = p_trip;
    perform private.notify(t.customer_id, 'trip.released', 'Your rider could not make it',
      'We are finding you another rider.', '/rides/' || t.id::text);
  else
    raise exception 'That change is not allowed for this trip' using errcode = '22023';
  end if;
end;
$$;

create or replace function public.rate_trip(p_trip uuid, p_rating smallint, p_comment text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  t public.trips%rowtype;
begin
  select * into t from public.trips where id = p_trip for update;
  if not found or t.customer_id <> (select auth.uid()) then
    raise exception 'Trip not found' using errcode = 'P0002';
  end if;
  if t.status <> 'completed' or t.rated_at is not null then
    raise exception 'This trip cannot be rated' using errcode = '22023';
  end if;
  if p_rating not between 1 and 5 then
    raise exception 'Choose 1 to 5 stars' using errcode = '22023';
  end if;
  update public.trips set customer_rating = p_rating, rated_at = now(),
    customer_comment = left(nullif(trim(coalesce(p_comment, '')), ''), 500)
  where id = p_trip;
  update public.rider_profiles r set
    rating_count = s.n, rating_avg = s.avg_rating
  from (select count(*)::int n, round(avg(customer_rating)::numeric, 2) avg_rating
        from public.trips where rider_id = t.rider_id and customer_rating is not null) s
  where r.user_id = t.rider_id;
end;
$$;

-- Riders near the caller's community, for "call a rider" (no coordinates exposed).
create or replace function public.available_riders(
  p_community uuid, p_kind public.trip_kind default null, p_vehicle public.vehicle_type default null
)
returns table (
  user_id uuid, display_name text, avatar_path text, vehicle_type public.vehicle_type, vehicle_description text,
  plate_number text, offers_rides boolean, offers_delivery boolean, phone text, whatsapp text,
  is_online boolean, rating_avg numeric, rating_count int, completed_trips int, community_name text
)
language sql
stable
security definer
set search_path = ''
as $$
  select r.user_id, p.display_name, p.avatar_path, r.vehicle_type, r.vehicle_description, r.plate_number,
         r.offers_rides, r.offers_delivery, r.phone, r.whatsapp, r.is_online, r.rating_avg, r.rating_count,
         r.completed_trips, c.name
  from public.rider_profiles r
  join public.profiles p on p.id = r.user_id and p.account_status = 'active'
  join public.communities c on c.id = r.community_id
  where (select auth.uid()) is not null
    and r.status = 'approved'
    and c.district_id = private.community_district(p_community)
    and (p_vehicle is null or r.vehicle_type = p_vehicle)
    and (p_kind is null or (p_kind = 'ride' and r.offers_rides) or (p_kind = 'delivery' and r.offers_delivery))
  order by r.is_online desc, r.rating_avg desc nulls last, r.completed_trips desc
  limit 50;
$$;

revoke all on function public.admin_review_rider(uuid, public.rider_status, text) from public, anon;
revoke all on function public.set_rider_online(boolean, numeric, numeric) from public, anon;
revoke all on function public.request_trip(public.trip_kind, uuid, text, text, text, numeric, public.vehicle_type,
  numeric, numeric, numeric, numeric, text, text, text, text, public.payment_method, uuid, uuid) from public, anon;
revoke all on function public.open_trip_requests() from public, anon;
revoke all on function public.accept_trip(uuid) from public, anon;
revoke all on function public.update_trip_status(uuid, public.trip_status, text, numeric) from public, anon;
revoke all on function public.rate_trip(uuid, smallint, text) from public, anon;
revoke all on function public.available_riders(uuid, public.trip_kind, public.vehicle_type) from public, anon;
grant execute on function public.admin_review_rider(uuid, public.rider_status, text) to authenticated;
grant execute on function public.set_rider_online(boolean, numeric, numeric) to authenticated;
grant execute on function public.request_trip(public.trip_kind, uuid, text, text, text, numeric, public.vehicle_type,
  numeric, numeric, numeric, numeric, text, text, text, text, public.payment_method, uuid, uuid) to authenticated;
grant execute on function public.open_trip_requests() to authenticated;
grant execute on function public.accept_trip(uuid) to authenticated;
grant execute on function public.update_trip_status(uuid, public.trip_status, text, numeric) to authenticated;
grant execute on function public.rate_trip(uuid, smallint, text) to authenticated;
grant execute on function public.available_riders(uuid, public.trip_kind, public.vehicle_type) to authenticated;

alter table public.trips enable row level security;
grant select on public.trips to authenticated;
create policy "Customers see their trips"
  on public.trips for select to authenticated
  using (customer_id = (select auth.uid()));
create policy "Riders see trips assigned to them"
  on public.trips for select to authenticated
  using (rider_id = (select auth.uid()));
create policy "Mobility staff see trips in scope"
  on public.trips for select to authenticated
  using (private.has_permission('mobility.manage', community_id));
create policy "Sellers see deliveries of their orders"
  on public.trips for select to authenticated
  using (order_id is not null and exists (
    select 1 from public.orders o where o.id = order_id and private.entity_can(o.entity_id, 'orders', 'editor')));

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.trips;
  end if;
end;
$$;
