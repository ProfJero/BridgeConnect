-- =============================================================================
-- BridgeConnect · 0004 · Entities, capabilities, memberships, verification
-- -----------------------------------------------------------------------------
-- Trust model: Application → Review → Verification → Approval → Workspace.
-- Residents cannot insert into `entities`. An entity row only exists once a
-- reviewer with `entities.verify` (scoped to the entity's community) approves
-- an application via `review_entity_application`.
-- =============================================================================

create type public.entity_type as enum (
  'business', 'cooperative', 'ngo', 'school', 'health_facility',
  'government_agency', 'faith_organisation', 'community_group'
);

create type public.sector as enum (
  'commerce', 'agriculture', 'education', 'health', 'government',
  'civil_society', 'faith', 'transport', 'hospitality', 'technology',
  'finance', 'artisan', 'other'
);

create type public.entity_status as enum ('active', 'suspended', 'archived');

create type public.entity_capability as enum (
  'posts', 'products', 'services', 'jobs', 'events', 'media',
  'members', 'analytics', 'advertising', 'orders', 'emergency_alerts'
);

create type public.membership_role as enum ('owner', 'manager', 'editor', 'member');

create type public.application_status as enum (
  'submitted', 'under_review', 'info_requested', 'approved', 'rejected', 'withdrawn'
);

-- -----------------------------------------------------------------------------
-- Entities (public, trusted directory records)
-- -----------------------------------------------------------------------------
create table public.entities (
  id uuid primary key default gen_random_uuid(),
  entity_type public.entity_type not null,
  name text not null check (char_length(name) between 2 and 120),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  tagline text check (char_length(tagline) <= 160),
  description text check (char_length(description) <= 5000),
  sector public.sector not null,
  community_id uuid not null references public.communities (id) on delete restrict,
  address text check (char_length(address) <= 300),
  phone text check (phone ~ '^\+?[0-9 ]{7,20}$'),
  email text check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' and char_length(email) <= 254),
  website text check (website ~* '^https://' and char_length(website) <= 300),
  whatsapp text check (whatsapp ~ '^\+?[0-9 ]{7,20}$'),
  logo_path text check (char_length(logo_path) <= 500),
  cover_path text check (char_length(cover_path) <= 500),
  -- {"mon": {"open": "08:00", "close": "17:00"}, ...}; validated in app layer.
  opening_hours jsonb,
  status public.entity_status not null default 'active',
  status_reason text check (char_length(status_reason) <= 1000),
  verified_at timestamptz not null default now(),
  verified_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  search tsvector generated always as (
    setweight(to_tsvector('simple', coalesce(name, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(tagline, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(description, '')), 'C')
  ) stored
);
create index entities_community_idx on public.entities (community_id);
create index entities_type_status_idx on public.entities (entity_type, status);
create index entities_sector_idx on public.entities (sector) where status = 'active';
create index entities_search_idx on public.entities using gin (search);
create index entities_name_trgm_idx on public.entities using gin (name extensions.gin_trgm_ops);

create trigger entities_set_updated_at before update on public.entities
  for each row execute function private.set_updated_at();

-- Type-specific public details.
create table public.business_profiles (
  entity_id uuid primary key references public.entities (id) on delete cascade,
  year_established int check (year_established between 1800 and 2100),
  delivery_available boolean not null default false,
  accepts_mobile_money boolean not null default false,
  updated_at timestamptz not null default now()
);
create trigger business_profiles_set_updated_at before update on public.business_profiles
  for each row execute function private.set_updated_at();

create table public.organisation_profiles (
  entity_id uuid primary key references public.entities (id) on delete cascade,
  mission text check (char_length(mission) <= 2000),
  year_established int check (year_established between 1800 and 2100),
  beneficiaries text check (char_length(beneficiaries) <= 500),
  updated_at timestamptz not null default now()
);
create trigger organisation_profiles_set_updated_at before update on public.organisation_profiles
  for each row execute function private.set_updated_at();

-- -----------------------------------------------------------------------------
-- Capabilities: defaults per type, plus per-entity overrides by administrators.
-- -----------------------------------------------------------------------------
create table public.entity_type_capabilities (
  entity_type public.entity_type not null,
  capability public.entity_capability not null,
  primary key (entity_type, capability)
);

create table public.entity_capability_overrides (
  entity_id uuid not null references public.entities (id) on delete cascade,
  capability public.entity_capability not null,
  enabled boolean not null,
  set_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (entity_id, capability)
);

-- -----------------------------------------------------------------------------
-- Memberships (workspace context)
-- -----------------------------------------------------------------------------
create table public.entity_memberships (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null references public.entities (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role public.membership_role not null,
  invited_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (entity_id, user_id)
);
create index entity_memberships_user_idx on public.entity_memberships (user_id);

create trigger entity_memberships_set_updated_at before update on public.entity_memberships
  for each row execute function private.set_updated_at();

create or replace function private.membership_rank(r public.membership_role)
returns int
language sql
immutable
set search_path = ''
as $$
  select case r when 'owner' then 4 when 'manager' then 3 when 'editor' then 2 else 1 end;
$$;

-- Never allow an entity to be left without an owner.
create or replace function private.protect_last_owner()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.role = 'owner'
     and (tg_op = 'DELETE' or new.role <> 'owner')
     and not exists (
       select 1 from public.entity_memberships
       where entity_id = old.entity_id and role = 'owner' and id <> old.id
     )
     -- Allow cascading deletes when the entity itself is removed.
     and exists (select 1 from public.entities where id = old.entity_id) then
    raise exception 'An entity must keep at least one owner' using errcode = '23514';
  end if;
  return coalesce(new, old);
end;
$$;
create trigger entity_memberships_protect_last_owner
  before update or delete on public.entity_memberships
  for each row execute function private.protect_last_owner();

-- -----------------------------------------------------------------------------
-- Entity authorization helpers
-- -----------------------------------------------------------------------------
create or replace function private.entity_role(p_entity uuid)
returns public.membership_role
language sql
stable
security definer
set search_path = ''
as $$
  select m.role
  from public.entity_memberships m
  where m.entity_id = p_entity and m.user_id = (select auth.uid());
$$;

create or replace function private.entity_community(p_entity uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select community_id from public.entities where id = p_entity;
$$;

create or replace function private.entity_has_capability(
  p_entity uuid,
  p_capability public.entity_capability
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select o.enabled from public.entity_capability_overrides o
     where o.entity_id = p_entity and o.capability = p_capability),
    exists (
      select 1 from public.entities e
      join public.entity_type_capabilities c on c.entity_type = e.entity_type
      where e.id = p_entity and c.capability = p_capability
    )
  );
$$;

-- Core workspace check: is the current (active) user a member of an ACTIVE
-- entity with at least `p_min_role`, and does the entity have the capability?
create or replace function private.entity_can(
  p_entity uuid,
  p_capability public.entity_capability,
  p_min_role public.membership_role default 'editor'
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_active_user()
    and exists (
      select 1
      from public.entity_memberships m
      join public.entities e on e.id = m.entity_id
      where m.entity_id = p_entity
        and m.user_id = (select auth.uid())
        and e.status = 'active'
        and private.membership_rank(m.role) >= private.membership_rank(p_min_role)
    )
    and private.entity_has_capability(p_entity, p_capability);
$$;

create or replace function private.is_entity_member(
  p_entity uuid,
  p_min_role public.membership_role default 'member'
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_active_user() and exists (
    select 1 from public.entity_memberships m
    where m.entity_id = p_entity
      and m.user_id = (select auth.uid())
      and private.membership_rank(m.role) >= private.membership_rank(p_min_role)
  );
$$;

create or replace function private.entity_is_public(p_entity uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.entities where id = p_entity and status = 'active');
$$;

grant execute on function private.entity_role(uuid) to anon, authenticated;
grant execute on function private.entity_community(uuid) to anon, authenticated;
grant execute on function private.entity_has_capability(uuid, public.entity_capability) to anon, authenticated;
grant execute on function private.entity_can(uuid, public.entity_capability, public.membership_role) to anon, authenticated;
grant execute on function private.is_entity_member(uuid, public.membership_role) to anon, authenticated;
grant execute on function private.entity_is_public(uuid) to anon, authenticated;

-- Effective capabilities for an entity (used by the workspace UI).
create or replace function public.entity_capabilities(p_entity uuid)
returns setof public.entity_capability
language sql
stable
security definer
set search_path = ''
as $$
  select cap
  from unnest(enum_range(null::public.entity_capability)) as cap
  where (private.entity_is_public(p_entity) or private.is_entity_member(p_entity)
         or private.has_permission('entities.read_all', private.entity_community(p_entity)))
    and private.entity_has_capability(p_entity, cap);
$$;
grant execute on function public.entity_capabilities(uuid) to anon, authenticated;

-- Workspaces the current user belongs to (context switcher).
create or replace function public.my_workspaces()
returns table (
  entity_id uuid,
  name text,
  slug text,
  entity_type public.entity_type,
  status public.entity_status,
  logo_path text,
  role public.membership_role
)
language sql
stable
security definer
set search_path = ''
as $$
  select e.id, e.name, e.slug, e.entity_type, e.status, e.logo_path, m.role
  from public.entity_memberships m
  join public.entities e on e.id = m.entity_id
  where m.user_id = (select auth.uid())
  order by e.name;
$$;
grant execute on function public.my_workspaces() to authenticated;

-- -----------------------------------------------------------------------------
-- Applications & verification
-- -----------------------------------------------------------------------------
create table public.entity_applications (
  id uuid primary key default gen_random_uuid(),
  applicant_id uuid not null references public.profiles (id) on delete cascade,
  entity_type public.entity_type not null,
  proposed_name text not null check (char_length(proposed_name) between 2 and 120),
  sector public.sector not null,
  community_id uuid not null references public.communities (id) on delete restrict,
  description text not null check (char_length(description) between 20 and 5000),
  address text check (char_length(address) <= 300),
  contact_phone text not null check (contact_phone ~ '^\+?[0-9 ]{7,20}$'),
  contact_email text check (contact_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' and char_length(contact_email) <= 254),
  -- Verification-only information. Never copied onto the public entity.
  registration_number text check (char_length(registration_number) <= 80),
  applicant_position text check (char_length(applicant_position) <= 80),
  status public.application_status not null default 'submitted',
  reviewer_id uuid references public.profiles (id) on delete set null,
  decision_reason text check (char_length(decision_reason) <= 2000),
  entity_id uuid references public.entities (id) on delete set null,
  submitted_at timestamptz not null default now(),
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index entity_applications_applicant_idx on public.entity_applications (applicant_id);
create index entity_applications_status_idx on public.entity_applications (status, submitted_at);
create index entity_applications_community_idx on public.entity_applications (community_id);

create trigger entity_applications_set_updated_at before update on public.entity_applications
  for each row execute function private.set_updated_at();

-- Abuse control: at most 3 open applications per applicant.
create or replace function private.limit_open_applications()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select count(*) from public.entity_applications
      where applicant_id = new.applicant_id
        and status in ('submitted', 'under_review', 'info_requested')) >= 3 then
    raise exception 'You already have 3 applications in progress' using errcode = '54000';
  end if;
  return new;
end;
$$;
create trigger entity_applications_limit_open
  before insert on public.entity_applications
  for each row execute function private.limit_open_applications();

create type public.verification_document_type as enum (
  'business_registration', 'tax_certificate', 'operating_license',
  'ngo_certificate', 'accreditation', 'identity_document', 'other'
);

create table public.application_documents (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.entity_applications (id) on delete cascade,
  document_type public.verification_document_type not null,
  -- Object path inside the private `verification-documents` bucket:
  -- {applicant_id}/{application_id}/{uuid}.{ext}
  storage_path text not null unique check (char_length(storage_path) <= 500),
  file_name text not null check (char_length(file_name) <= 200),
  mime_type text not null check (mime_type in ('application/pdf', 'image/jpeg', 'image/png', 'image/webp')),
  size_bytes int not null check (size_bytes > 0 and size_bytes <= 10485760),
  uploaded_by uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);
create index application_documents_application_idx on public.application_documents (application_id);

create type public.application_event_type as enum (
  'submitted', 'review_started', 'info_requested', 'resubmitted',
  'approved', 'rejected', 'withdrawn', 'note'
);

create table public.application_events (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.entity_applications (id) on delete cascade,
  actor_id uuid references public.profiles (id) on delete set null,
  event public.application_event_type not null,
  note text check (char_length(note) <= 2000),
  -- Internal reviewer notes are hidden from the applicant.
  is_internal boolean not null default false,
  created_at timestamptz not null default now()
);
create index application_events_application_idx on public.application_events (application_id, created_at);

create or replace function private.application_submitted()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.application_events (application_id, actor_id, event)
  values (new.id, new.applicant_id, 'submitted');
  return new;
end;
$$;
create trigger entity_applications_after_insert
  after insert on public.entity_applications
  for each row execute function private.application_submitted();

-- Applicant: resubmit after information was requested.
create or replace function public.resubmit_entity_application(p_application uuid, p_note text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  app public.entity_applications%rowtype;
begin
  select * into app from public.entity_applications where id = p_application for update;
  if not found or app.applicant_id <> (select auth.uid()) or not private.is_active_user() then
    raise exception 'Application not found' using errcode = 'P0002';
  end if;
  if app.status <> 'info_requested' then
    raise exception 'Application is not awaiting information' using errcode = '22023';
  end if;
  update public.entity_applications set status = 'submitted' where id = p_application;
  insert into public.application_events (application_id, actor_id, event, note)
  values (p_application, app.applicant_id, 'resubmitted', left(p_note, 2000));
  if app.reviewer_id is not null then
    perform private.notify(app.reviewer_id, 'verification.resubmitted',
      'Application resubmitted: ' || app.proposed_name, null,
      '/admin/verification/' || app.id::text);
  end if;
end;
$$;

-- Applicant: withdraw an application that has not been decided.
create or replace function public.withdraw_entity_application(p_application uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  app public.entity_applications%rowtype;
begin
  select * into app from public.entity_applications where id = p_application for update;
  if not found or app.applicant_id <> (select auth.uid()) then
    raise exception 'Application not found' using errcode = 'P0002';
  end if;
  if app.status not in ('submitted', 'under_review', 'info_requested') then
    raise exception 'Application can no longer be withdrawn' using errcode = '22023';
  end if;
  update public.entity_applications set status = 'withdrawn', decided_at = now()
  where id = p_application;
  insert into public.application_events (application_id, actor_id, event)
  values (p_application, app.applicant_id, 'withdrawn');
end;
$$;

-- Reviewer workflow. Actions: start_review | request_info | approve | reject | note.
-- Approval creates the entity, its type profile and the owner membership in one
-- transaction. Reviewers cannot review their own applications.
create or replace function public.review_entity_application(
  p_application uuid,
  p_action text,
  p_note text default null,
  p_internal boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  app public.entity_applications%rowtype;
  reviewer uuid := (select auth.uid());
  new_entity uuid;
begin
  select * into app from public.entity_applications where id = p_application for update;
  if not found then
    raise exception 'Application not found' using errcode = 'P0002';
  end if;
  if not private.has_permission('entities.verify', app.community_id) then
    raise exception 'Not permitted to review applications in this community' using errcode = '42501';
  end if;
  if app.applicant_id = reviewer then
    raise exception 'You cannot review your own application' using errcode = '42501';
  end if;

  if p_action = 'note' then
    insert into public.application_events (application_id, actor_id, event, note, is_internal)
    values (p_application, reviewer, 'note', left(p_note, 2000), coalesce(p_internal, true));
    return null;
  end if;

  if app.status not in ('submitted', 'under_review', 'info_requested') then
    raise exception 'Application has already been decided' using errcode = '22023';
  end if;

  if p_action = 'start_review' then
    if app.status <> 'submitted' then
      raise exception 'Only submitted applications can enter review' using errcode = '22023';
    end if;
    update public.entity_applications set status = 'under_review', reviewer_id = reviewer
    where id = p_application;
    insert into public.application_events (application_id, actor_id, event)
    values (p_application, reviewer, 'review_started');
    perform private.notify(app.applicant_id, 'verification.review_started',
      'Your application is being reviewed', app.proposed_name, '/apply/' || app.id::text);

  elsif p_action = 'request_info' then
    if char_length(coalesce(trim(p_note), '')) < 10 then
      raise exception 'Explain what information is needed' using errcode = '22023';
    end if;
    update public.entity_applications set status = 'info_requested', reviewer_id = reviewer
    where id = p_application;
    insert into public.application_events (application_id, actor_id, event, note)
    values (p_application, reviewer, 'info_requested', left(p_note, 2000));
    perform private.notify(app.applicant_id, 'verification.info_requested',
      'More information needed for ' || app.proposed_name, left(p_note, 300),
      '/apply/' || app.id::text);

  elsif p_action = 'reject' then
    if char_length(coalesce(trim(p_note), '')) < 10 then
      raise exception 'A rejection reason is required' using errcode = '22023';
    end if;
    update public.entity_applications
    set status = 'rejected', reviewer_id = reviewer, decision_reason = left(p_note, 2000), decided_at = now()
    where id = p_application;
    insert into public.application_events (application_id, actor_id, event, note)
    values (p_application, reviewer, 'rejected', left(p_note, 2000));
    perform private.notify(app.applicant_id, 'verification.rejected',
      'Application not approved: ' || app.proposed_name, left(p_note, 300),
      '/apply/' || app.id::text);

  elsif p_action = 'approve' then
    if app.status <> 'under_review' then
      raise exception 'Applications must be under review before approval' using errcode = '22023';
    end if;
    insert into public.entities (
      entity_type, name, slug, description, sector, community_id, address,
      phone, email, verified_by)
    values (
      app.entity_type, app.proposed_name,
      private.unique_slug('public.entities', app.proposed_name),
      app.description, app.sector, app.community_id, app.address,
      app.contact_phone, app.contact_email, reviewer)
    returning id into new_entity;

    if app.entity_type = 'business' then
      insert into public.business_profiles (entity_id) values (new_entity);
    else
      insert into public.organisation_profiles (entity_id) values (new_entity);
    end if;

    insert into public.entity_memberships (entity_id, user_id, role, invited_by)
    values (new_entity, app.applicant_id, 'owner', reviewer);

    update public.entity_applications
    set status = 'approved', reviewer_id = reviewer, decision_reason = left(p_note, 2000),
        decided_at = now(), entity_id = new_entity
    where id = p_application;
    insert into public.application_events (application_id, actor_id, event, note)
    values (p_application, reviewer, 'approved', left(p_note, 2000));
    perform private.notify(app.applicant_id, 'verification.approved',
      app.proposed_name || ' is verified', 'Your workspace is ready.',
      '/workspace/' || new_entity::text);
  else
    raise exception 'Unknown action' using errcode = '22023';
  end if;

  perform private.write_audit('verification.' || p_action, 'entity_applications',
    p_application::text,
    jsonb_build_object('note', left(p_note, 500), 'entity_id', new_entity),
    app.community_id);
  return new_entity;
end;
$$;

-- Administrator: suspend / reinstate / archive an entity.
create or replace function public.admin_set_entity_status(
  p_entity uuid,
  p_status public.entity_status,
  p_reason text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  e public.entities%rowtype;
  m record;
begin
  select * into e from public.entities where id = p_entity for update;
  if not found then
    raise exception 'Entity not found' using errcode = 'P0002';
  end if;
  if not private.has_permission('entities.manage', e.community_id) then
    raise exception 'Not permitted' using errcode = '42501';
  end if;
  if char_length(coalesce(trim(p_reason), '')) < 5 then
    raise exception 'A reason is required' using errcode = '22023';
  end if;
  update public.entities set status = p_status, status_reason = left(p_reason, 1000)
  where id = p_entity;
  for m in select user_id from public.entity_memberships
           where entity_id = p_entity and role in ('owner', 'manager') loop
    perform private.notify(m.user_id, 'entity.status_changed',
      e.name || ' is now ' || p_status::text, left(p_reason, 300),
      '/workspace/' || p_entity::text);
  end loop;
  perform private.write_audit('entities.set_status', 'entities', p_entity::text,
    jsonb_build_object('from', e.status, 'to', p_status, 'reason', p_reason), e.community_id);
end;
$$;

-- Administrator: enable/disable a capability for one entity.
create or replace function public.admin_set_entity_capability(
  p_entity uuid,
  p_capability public.entity_capability,
  p_enabled boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.has_permission('entities.manage', private.entity_community(p_entity)) then
    raise exception 'Not permitted' using errcode = '42501';
  end if;
  insert into public.entity_capability_overrides (entity_id, capability, enabled, set_by)
  values (p_entity, p_capability, p_enabled, (select auth.uid()))
  on conflict (entity_id, capability)
  do update set enabled = excluded.enabled, set_by = excluded.set_by, created_at = now();
  perform private.write_audit('entities.set_capability', 'entities', p_entity::text,
    jsonb_build_object('capability', p_capability, 'enabled', p_enabled),
    private.entity_community(p_entity));
end;
$$;

-- Workspace: add a member by email. Managers can add editors/members; only
-- owners can add managers or owners. Requires the `members` capability.
create or replace function public.entity_add_member(
  p_entity uuid,
  p_email text,
  p_role public.membership_role
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_role public.membership_role := private.entity_role(p_entity);
  target uuid;
  new_id uuid;
begin
  if not private.entity_can(p_entity, 'members', 'manager') then
    raise exception 'Not permitted' using errcode = '42501';
  end if;
  if private.membership_rank(p_role) >= private.membership_rank(caller_role)
     and caller_role <> 'owner' then
    raise exception 'You cannot grant a role equal to or above your own' using errcode = '42501';
  end if;
  select u.id into target from auth.users u
  join public.profiles p on p.id = u.id
  where lower(u.email) = lower(trim(p_email)) and p.account_status = 'active';
  if target is null then
    -- Same message whether or not the account exists, to avoid enumeration.
    raise exception 'No active BridgeConnect account could be added with that email'
      using errcode = 'P0002';
  end if;
  insert into public.entity_memberships (entity_id, user_id, role, invited_by)
  values (p_entity, target, p_role, (select auth.uid()))
  on conflict (entity_id, user_id) do nothing
  returning id into new_id;
  if new_id is null then
    raise exception 'That person is already a member' using errcode = '23505';
  end if;
  perform private.notify(target, 'workspace.member_added',
    'You were added to a workspace',
    (select name from public.entities where id = p_entity),
    '/workspace/' || p_entity::text);
  perform private.write_audit('workspace.add_member', 'entity_memberships', new_id::text,
    jsonb_build_object('entity_id', p_entity, 'role', p_role), private.entity_community(p_entity));
  return new_id;
end;
$$;

create or replace function public.entity_update_member_role(
  p_membership uuid,
  p_role public.membership_role
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  m public.entity_memberships%rowtype;
  caller_role public.membership_role;
begin
  select * into m from public.entity_memberships where id = p_membership for update;
  if not found then
    raise exception 'Membership not found' using errcode = 'P0002';
  end if;
  caller_role := private.entity_role(m.entity_id);
  if not private.entity_can(m.entity_id, 'members', 'manager') then
    raise exception 'Not permitted' using errcode = '42501';
  end if;
  if caller_role <> 'owner' and (
       private.membership_rank(m.role) >= private.membership_rank(caller_role)
       or private.membership_rank(p_role) >= private.membership_rank(caller_role)) then
    raise exception 'Not permitted' using errcode = '42501';
  end if;
  update public.entity_memberships set role = p_role where id = p_membership;
  perform private.write_audit('workspace.update_member_role', 'entity_memberships', p_membership::text,
    jsonb_build_object('entity_id', m.entity_id, 'from', m.role, 'to', p_role),
    private.entity_community(m.entity_id));
end;
$$;

create or replace function public.entity_remove_member(p_membership uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  m public.entity_memberships%rowtype;
  caller_role public.membership_role;
begin
  select * into m from public.entity_memberships where id = p_membership for update;
  if not found then
    raise exception 'Membership not found' using errcode = 'P0002';
  end if;
  caller_role := private.entity_role(m.entity_id);
  -- Anyone may leave; otherwise a manager+ may remove lower-ranked members.
  if m.user_id <> (select auth.uid()) then
    if not private.entity_can(m.entity_id, 'members', 'manager') then
      raise exception 'Not permitted' using errcode = '42501';
    end if;
    if caller_role <> 'owner'
       and private.membership_rank(m.role) >= private.membership_rank(caller_role) then
      raise exception 'Not permitted' using errcode = '42501';
    end if;
  end if;
  delete from public.entity_memberships where id = p_membership;
  perform private.write_audit('workspace.remove_member', 'entity_memberships', p_membership::text,
    jsonb_build_object('entity_id', m.entity_id, 'user_id', m.user_id),
    private.entity_community(m.entity_id));
end;
$$;

do $$
declare
  fn text;
begin
  foreach fn in array array[
    'public.resubmit_entity_application(uuid, text)',
    'public.withdraw_entity_application(uuid)',
    'public.review_entity_application(uuid, text, text, boolean)',
    'public.admin_set_entity_status(uuid, public.entity_status, text)',
    'public.admin_set_entity_capability(uuid, public.entity_capability, boolean)',
    'public.entity_add_member(uuid, text, public.membership_role)',
    'public.entity_update_member_role(uuid, public.membership_role)',
    'public.entity_remove_member(uuid)'
  ] loop
    execute format('revoke all on function %s from public, anon', fn);
    execute format('grant execute on function %s to authenticated', fn);
  end loop;
end;
$$;

-- -----------------------------------------------------------------------------
-- Row Level Security
-- -----------------------------------------------------------------------------
alter table public.entities enable row level security;
alter table public.business_profiles enable row level security;
alter table public.organisation_profiles enable row level security;
alter table public.entity_type_capabilities enable row level security;
alter table public.entity_capability_overrides enable row level security;
alter table public.entity_memberships enable row level security;
alter table public.entity_applications enable row level security;
alter table public.application_documents enable row level security;
alter table public.application_events enable row level security;

-- Entities: public when active; members and scoped admins see the rest.
-- No INSERT/DELETE grants: entities are only created by verification approval.
grant select on public.entities to anon, authenticated;
grant update (tagline, description, address, phone, email, website, whatsapp,
              logo_path, cover_path, opening_hours)
  on public.entities to authenticated;

create policy "Active entities are public"
  on public.entities for select to anon, authenticated
  using (status = 'active');
create policy "Members can see their entity"
  on public.entities for select to authenticated
  using (private.is_entity_member(id));
create policy "Scoped admins can see all entities"
  on public.entities for select to authenticated
  using (private.has_permission('entities.read_all', community_id));
create policy "Managers can edit their active entity profile"
  on public.entities for update to authenticated
  using (status = 'active' and private.is_entity_member(id, 'manager'))
  with check (status = 'active' and private.is_entity_member(id, 'manager'));

grant select on public.business_profiles, public.organisation_profiles to anon, authenticated;
grant update (year_established, delivery_available, accepts_mobile_money)
  on public.business_profiles to authenticated;
grant update (mission, year_established, beneficiaries)
  on public.organisation_profiles to authenticated;

create policy "Business profiles follow entity visibility"
  on public.business_profiles for select to anon, authenticated
  using (private.entity_is_public(entity_id) or private.is_entity_member(entity_id)
         or private.has_permission('entities.read_all', private.entity_community(entity_id)));
create policy "Managers edit business profile"
  on public.business_profiles for update to authenticated
  using (private.entity_is_public(entity_id) and private.is_entity_member(entity_id, 'manager'))
  with check (private.is_entity_member(entity_id, 'manager'));
create policy "Organisation profiles follow entity visibility"
  on public.organisation_profiles for select to anon, authenticated
  using (private.entity_is_public(entity_id) or private.is_entity_member(entity_id)
         or private.has_permission('entities.read_all', private.entity_community(entity_id)));
create policy "Managers edit organisation profile"
  on public.organisation_profiles for update to authenticated
  using (private.entity_is_public(entity_id) and private.is_entity_member(entity_id, 'manager'))
  with check (private.is_entity_member(entity_id, 'manager'));

grant select on public.entity_type_capabilities to anon, authenticated;
create policy "Capability defaults are public"
  on public.entity_type_capabilities for select to anon, authenticated using (true);

grant select on public.entity_capability_overrides to authenticated;
create policy "Members and admins see capability overrides"
  on public.entity_capability_overrides for select to authenticated
  using (private.is_entity_member(entity_id)
         or private.has_permission('entities.read_all', private.entity_community(entity_id)));

-- Memberships: visible to fellow members and scoped admins. Writes via RPCs.
grant select on public.entity_memberships to authenticated;
create policy "Members see memberships of their entities"
  on public.entity_memberships for select to authenticated
  using (user_id = (select auth.uid()) or private.is_entity_member(entity_id));
create policy "Scoped admins see memberships"
  on public.entity_memberships for select to authenticated
  using (private.has_permission('entities.read_all', private.entity_community(entity_id)));

-- Applications: applicants create and read their own; reviewers in scope read.
grant select on public.entity_applications to authenticated;
grant insert (entity_type, proposed_name, sector, community_id, description, address,
              contact_phone, contact_email, registration_number, applicant_position)
  on public.entity_applications to authenticated;
grant update (proposed_name, sector, description, address, contact_phone,
              contact_email, registration_number, applicant_position)
  on public.entity_applications to authenticated;

create policy "Applicants read their applications"
  on public.entity_applications for select to authenticated
  using (applicant_id = (select auth.uid()));
create policy "Reviewers read applications in scope"
  on public.entity_applications for select to authenticated
  using (private.has_permission('entities.verify', community_id));
create policy "Active residents can apply"
  on public.entity_applications for insert to authenticated
  with check (applicant_id = (select auth.uid()) and private.is_active_user());
create policy "Applicants edit applications awaiting information"
  on public.entity_applications for update to authenticated
  using (applicant_id = (select auth.uid()) and status in ('submitted', 'info_requested'))
  with check (applicant_id = (select auth.uid()) and status in ('submitted', 'info_requested'));

-- applicant_id must default to the caller.
alter table public.entity_applications alter column applicant_id set default auth.uid();

grant select, insert, delete on public.application_documents to authenticated;
create policy "Applicants and reviewers read documents"
  on public.application_documents for select to authenticated
  using (exists (
    select 1 from public.entity_applications a
    where a.id = application_id
      and (a.applicant_id = (select auth.uid())
           or private.has_permission('entities.verify', a.community_id))
  ));
create policy "Applicants attach documents to open applications"
  on public.application_documents for insert to authenticated
  with check (
    uploaded_by = (select auth.uid())
    and storage_path like ((select auth.uid())::text || '/' || application_id::text || '/%')
    and exists (
      select 1 from public.entity_applications a
      where a.id = application_id and a.applicant_id = (select auth.uid())
        and a.status in ('submitted', 'info_requested')
    )
  );
create policy "Applicants remove documents from open applications"
  on public.application_documents for delete to authenticated
  using (
    uploaded_by = (select auth.uid())
    and exists (
      select 1 from public.entity_applications a
      where a.id = application_id and a.applicant_id = (select auth.uid())
        and a.status in ('submitted', 'info_requested')
    )
  );
alter table public.application_documents alter column uploaded_by set default auth.uid();

grant select on public.application_events to authenticated;
create policy "Applicants see non-internal events"
  on public.application_events for select to authenticated
  using (not is_internal and exists (
    select 1 from public.entity_applications a
    where a.id = application_id and a.applicant_id = (select auth.uid())));
create policy "Reviewers see all events in scope"
  on public.application_events for select to authenticated
  using (exists (
    select 1 from public.entity_applications a
    where a.id = application_id and private.has_permission('entities.verify', a.community_id)));
