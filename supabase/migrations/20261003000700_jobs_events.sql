-- =============================================================================
-- BridgeConnect · 0007 · Jobs, job applications, events, RSVPs
-- Only verified entities with the `jobs` / `events` capability can publish.
-- =============================================================================

create type public.employment_type as enum (
  'full_time', 'part_time', 'contract', 'temporary', 'internship', 'volunteer', 'apprenticeship'
);
create type public.pay_period as enum ('hour', 'day', 'week', 'month', 'year', 'fixed');
create type public.job_status as enum ('draft', 'open', 'closed', 'archived', 'removed');
create type public.job_application_status as enum (
  'submitted', 'reviewing', 'shortlisted', 'rejected', 'hired', 'withdrawn'
);
create type public.event_status as enum ('draft', 'published', 'cancelled', 'removed');
create type public.rsvp_status as enum ('going', 'interested');

-- Default a listing's community to its entity's community.
create or replace function private.default_listing_community()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.community_id is null then
    new.community_id := private.entity_community(new.entity_id);
  end if;
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- Jobs
-- -----------------------------------------------------------------------------
create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null references public.entities (id) on delete cascade,
  category_id uuid references public.listing_categories (id) on delete set null,
  community_id uuid not null references public.communities (id) on delete restrict,
  title text not null check (char_length(title) between 3 and 140),
  slug text not null unique default '', -- always set by private.assign_listing_slug()
  description text not null check (char_length(description) between 20 and 8000),
  requirements text check (char_length(requirements) <= 4000),
  employment_type public.employment_type not null,
  location_note text check (char_length(location_note) <= 200),
  salary_min numeric(12, 2) check (salary_min >= 0),
  salary_max numeric(12, 2) check (salary_max >= 0),
  salary_period public.pay_period,
  currency char(3) not null default 'GHS' check (currency ~ '^[A-Z]{3}$'),
  application_deadline date,
  status public.job_status not null default 'draft',
  moderation_reason text check (char_length(moderation_reason) <= 1000),
  created_by uuid default auth.uid() references public.profiles (id) on delete set null,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  search tsvector generated always as (
    setweight(to_tsvector('simple', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(description, '')), 'C')
  ) stored,
  constraint jobs_salary_range check (salary_max is null or salary_min is null or salary_max >= salary_min)
);
create index jobs_entity_idx on public.jobs (entity_id);
create index jobs_public_idx on public.jobs (status, published_at desc);
create index jobs_community_idx on public.jobs (community_id);
create index jobs_search_idx on public.jobs using gin (search);

create trigger jobs_set_updated_at before update on public.jobs
  for each row execute function private.set_updated_at();
create trigger jobs_assign_slug before insert or update of title on public.jobs
  for each row execute function private.assign_listing_slug();
create trigger jobs_default_community before insert on public.jobs
  for each row execute function private.default_listing_community();

create or replace function private.stamp_job_published()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'open' and new.published_at is null then
    new.published_at := now();
  end if;
  return new;
end;
$$;
create trigger jobs_stamp_published before insert or update of status on public.jobs
  for each row execute function private.stamp_job_published();

create table public.job_applications (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs (id) on delete cascade,
  applicant_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  cover_letter text not null check (char_length(cover_letter) between 20 and 5000),
  contact_phone text not null check (contact_phone ~ '^\+?[0-9 ]{7,20}$'),
  -- Private `job-applications` bucket: {applicant_id}/{job_id}/{uuid}.pdf
  cv_path text check (char_length(cv_path) <= 500),
  status public.job_application_status not null default 'submitted',
  employer_note text check (char_length(employer_note) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (job_id, applicant_id),
  constraint job_applications_cv_path_owner check (
    cv_path is null or cv_path like applicant_id::text || '/' || job_id::text || '/%')
);
create index job_applications_applicant_idx on public.job_applications (applicant_id);
create index job_applications_job_status_idx on public.job_applications (job_id, status);

create trigger job_applications_set_updated_at before update on public.job_applications
  for each row execute function private.set_updated_at();

create or replace function private.job_application_created()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  j public.jobs%rowtype;
begin
  new.status := 'submitted';
  select * into j from public.jobs where id = new.job_id;
  if j.status <> 'open' or (j.application_deadline is not null and j.application_deadline < current_date) then
    raise exception 'This job is not accepting applications' using errcode = '22023';
  end if;
  return new;
end;
$$;
create trigger job_applications_before_insert before insert on public.job_applications
  for each row execute function private.job_application_created();

create or replace function private.job_application_notify()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  j public.jobs%rowtype;
begin
  select * into j from public.jobs where id = new.job_id;
  perform private.notify_entity_staff(j.entity_id, 'editor', 'jobs.new_application',
    'New application for ' || j.title, null,
    '/workspace/' || j.entity_id::text || '/jobs/' || j.id::text);
  return new;
end;
$$;
create trigger job_applications_after_insert after insert on public.job_applications
  for each row execute function private.job_application_notify();

-- Employers move applications through review; applicants may withdraw.
create or replace function public.set_job_application_status(
  p_application uuid,
  p_status public.job_application_status,
  p_note text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  a public.job_applications%rowtype;
  j public.jobs%rowtype;
  uid uuid := (select auth.uid());
begin
  select * into a from public.job_applications where id = p_application for update;
  if not found then
    raise exception 'Application not found' using errcode = 'P0002';
  end if;
  select * into j from public.jobs where id = a.job_id;

  if a.applicant_id = uid and p_status = 'withdrawn' then
    if a.status in ('rejected', 'hired', 'withdrawn') then
      raise exception 'Application can no longer be withdrawn' using errcode = '22023';
    end if;
  elsif private.entity_can(j.entity_id, 'jobs', 'editor') then
    if p_status not in ('reviewing', 'shortlisted', 'rejected', 'hired')
       or a.status = 'withdrawn' then
      raise exception 'Invalid status change' using errcode = '22023';
    end if;
  else
    raise exception 'Application not found' using errcode = 'P0002';
  end if;

  update public.job_applications
  set status = p_status,
      employer_note = case when a.applicant_id = uid then employer_note else coalesce(left(p_note, 2000), employer_note) end
  where id = p_application;

  if a.applicant_id <> uid then
    perform private.notify(a.applicant_id, 'jobs.application_updated',
      'Update on your application: ' || j.title,
      'Status: ' || replace(p_status::text, '_', ' '), '/jobs/applications');
  end if;
end;
$$;
revoke all on function public.set_job_application_status(uuid, public.job_application_status, text) from public, anon;
grant execute on function public.set_job_application_status(uuid, public.job_application_status, text) to authenticated;

-- -----------------------------------------------------------------------------
-- Events
-- -----------------------------------------------------------------------------
create table public.events (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null references public.entities (id) on delete cascade,
  category_id uuid references public.listing_categories (id) on delete set null,
  community_id uuid not null references public.communities (id) on delete restrict,
  title text not null check (char_length(title) between 3 and 140),
  slug text not null unique default '', -- always set by private.assign_listing_slug()
  description text not null check (char_length(description) between 10 and 8000),
  venue text check (char_length(venue) <= 200),
  is_online boolean not null default false,
  online_url text check (online_url ~* '^https://' and char_length(online_url) <= 300),
  starts_at timestamptz not null,
  ends_at timestamptz,
  capacity int check (capacity > 0),
  cover_path text check (char_length(cover_path) <= 500),
  status public.event_status not null default 'draft',
  moderation_reason text check (char_length(moderation_reason) <= 1000),
  going_count int not null default 0 check (going_count >= 0),
  created_by uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  search tsvector generated always as (
    setweight(to_tsvector('simple', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(venue, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(description, '')), 'C')
  ) stored,
  constraint events_end_after_start check (ends_at is null or ends_at > starts_at),
  constraint events_location check (is_online or venue is not null)
);
create index events_entity_idx on public.events (entity_id);
create index events_public_idx on public.events (status, starts_at);
create index events_community_idx on public.events (community_id, starts_at);
create index events_search_idx on public.events using gin (search);

create trigger events_set_updated_at before update on public.events
  for each row execute function private.set_updated_at();
create trigger events_assign_slug before insert or update of title on public.events
  for each row execute function private.assign_listing_slug();
create trigger events_default_community before insert on public.events
  for each row execute function private.default_listing_community();

create table public.event_rsvps (
  event_id uuid not null references public.events (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  status public.rsvp_status not null,
  created_at timestamptz not null default now(),
  primary key (event_id, user_id)
);
create index event_rsvps_user_idx on public.event_rsvps (user_id);

create or replace function private.event_rsvp_changed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  e public.events%rowtype;
  delta int := 0;
begin
  if tg_op in ('INSERT', 'UPDATE') then
    select * into e from public.events where id = new.event_id for update;
    if e.status <> 'published' or coalesce(e.ends_at, e.starts_at) < now() then
      raise exception 'This event is not open for RSVPs' using errcode = '22023';
    end if;
    if new.status = 'going' and (tg_op = 'INSERT' or old.status <> 'going')
       and e.capacity is not null and e.going_count >= e.capacity then
      raise exception 'This event is full' using errcode = '22023';
    end if;
  end if;

  if tg_op = 'INSERT' and new.status = 'going' then delta := 1;
  elsif tg_op = 'DELETE' and old.status = 'going' then delta := -1;
  elsif tg_op = 'UPDATE' and old.status <> new.status then
    delta := case when new.status = 'going' then 1 else -1 end;
  end if;
  if delta <> 0 then
    update public.events set going_count = greatest(going_count + delta, 0)
    where id = coalesce(new.event_id, old.event_id);
  end if;
  return coalesce(new, old);
end;
$$;
create trigger event_rsvps_before_change before insert or update or delete on public.event_rsvps
  for each row execute function private.event_rsvp_changed();

-- -----------------------------------------------------------------------------
-- Row Level Security
-- -----------------------------------------------------------------------------
alter table public.jobs enable row level security;
alter table public.job_applications enable row level security;
alter table public.events enable row level security;
alter table public.event_rsvps enable row level security;

grant select on public.jobs to anon, authenticated;
grant insert (entity_id, category_id, community_id, title, description, requirements,
              employment_type, location_note, salary_min, salary_max, salary_period,
              application_deadline, status)
  on public.jobs to authenticated;
grant update (category_id, title, description, requirements, employment_type, location_note,
              salary_min, salary_max, salary_period, application_deadline, status)
  on public.jobs to authenticated;

create policy "Open and closed jobs of active entities are public"
  on public.jobs for select to anon, authenticated
  using (status in ('open', 'closed') and private.entity_is_public(entity_id)
         and private.entity_has_capability(entity_id, 'jobs'));
create policy "Entity members see their jobs"
  on public.jobs for select to authenticated
  using (private.is_entity_member(entity_id));
create policy "Job admins see jobs in scope"
  on public.jobs for select to authenticated
  using (private.has_permission('jobs.manage', community_id));
create policy "Entity editors create jobs"
  on public.jobs for insert to authenticated
  with check (private.entity_can(entity_id, 'jobs', 'editor') and status <> 'removed');
create policy "Entity editors edit jobs"
  on public.jobs for update to authenticated
  using (private.entity_can(entity_id, 'jobs', 'editor') and status <> 'removed')
  with check (private.entity_can(entity_id, 'jobs', 'editor') and status <> 'removed');

grant select on public.job_applications to authenticated;
grant insert (job_id, cover_letter, contact_phone, cv_path) on public.job_applications to authenticated;
create policy "Applicants see their job applications"
  on public.job_applications for select to authenticated
  using (applicant_id = (select auth.uid()));
create policy "Employers see applications to their jobs"
  on public.job_applications for select to authenticated
  using (exists (select 1 from public.jobs j where j.id = job_id
                 and private.entity_can(j.entity_id, 'jobs', 'editor')));
create policy "Active users apply to jobs"
  on public.job_applications for insert to authenticated
  with check (applicant_id = (select auth.uid()) and private.is_active_user());

grant select on public.events to anon, authenticated;
grant insert (entity_id, category_id, community_id, title, description, venue, is_online,
              online_url, starts_at, ends_at, capacity, cover_path, status)
  on public.events to authenticated;
grant update (category_id, title, description, venue, is_online, online_url, starts_at,
              ends_at, capacity, cover_path, status)
  on public.events to authenticated;

create policy "Published events of active entities are public"
  on public.events for select to anon, authenticated
  using (status in ('published', 'cancelled') and private.entity_is_public(entity_id)
         and private.entity_has_capability(entity_id, 'events'));
create policy "Entity members see their events"
  on public.events for select to authenticated
  using (private.is_entity_member(entity_id));
create policy "Event admins see events in scope"
  on public.events for select to authenticated
  using (private.has_permission('events.manage', community_id));
create policy "Entity editors create events"
  on public.events for insert to authenticated
  with check (private.entity_can(entity_id, 'events', 'editor') and status <> 'removed');
create policy "Entity editors edit events"
  on public.events for update to authenticated
  using (private.entity_can(entity_id, 'events', 'editor') and status <> 'removed')
  with check (private.entity_can(entity_id, 'events', 'editor') and status <> 'removed');

grant select on public.event_rsvps to authenticated;
grant insert (event_id, status), update (status), delete on public.event_rsvps to authenticated;
create policy "Users see their RSVPs"
  on public.event_rsvps for select to authenticated
  using (user_id = (select auth.uid()));
create policy "Organisers see RSVPs to their events"
  on public.event_rsvps for select to authenticated
  using (exists (select 1 from public.events e where e.id = event_id
                 and private.is_entity_member(e.entity_id, 'editor')));
create policy "Active users RSVP"
  on public.event_rsvps for insert to authenticated
  with check (user_id = (select auth.uid()) and private.is_active_user());
create policy "Users change their RSVP"
  on public.event_rsvps for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy "Users cancel their RSVP"
  on public.event_rsvps for delete to authenticated
  using (user_id = (select auth.uid()));
