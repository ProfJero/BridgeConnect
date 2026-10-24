-- =============================================================================
-- BridgeConnect · 0003 · Identity, RBAC, authorization helpers, audit log
-- -----------------------------------------------------------------------------
-- One identity system (Supabase Auth). Every signed-in user is a Resident.
-- Additional platform powers come from ROLE ASSIGNMENTS that are scoped to the
-- whole platform, a region, a district or a community. Roles are bundles of
-- PERMISSIONS. Entity powers (business/organisation workspaces) come from
-- ENTITY MEMBERSHIPS (migration 0004) — a separate, orthogonal context.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Profiles (1:1 with auth.users)
-- -----------------------------------------------------------------------------
create type public.account_status as enum ('active', 'suspended', 'deactivated');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(display_name) between 2 and 80),
  username text unique check (username ~ '^[a-z0-9_]{3,30}$'),
  avatar_path text check (char_length(avatar_path) <= 500),
  bio text check (char_length(bio) <= 500),
  home_community_id uuid references public.communities (id) on delete set null,
  account_status public.account_status not null default 'active',
  -- Seed/demo accounts are flagged so they can be found and purged before launch.
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index profiles_home_community_idx on public.profiles (home_community_id);
create index profiles_display_name_trgm_idx on public.profiles
  using gin (display_name extensions.gin_trgm_ops);

create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function private.set_updated_at();

-- Create a profile whenever an auth user is created. Only `raw_user_meta_data`
-- display_name is read from the client, and it is length-checked. Privileged
-- flags (is_demo) come from `raw_app_meta_data`, which clients cannot write.
create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested_name text := nullif(trim(new.raw_user_meta_data ->> 'display_name'), '');
  requested_community uuid;
begin
  if requested_name is null or char_length(requested_name) < 2 then
    requested_name := split_part(coalesce(new.email, 'Resident'), '@', 1);
  end if;
  if char_length(requested_name) < 2 then
    requested_name := 'Resident';
  end if;

  -- Optional home community chosen at sign-up; kept only if it is a real,
  -- active community (a preference, never an authorization input).
  begin
    requested_community := (new.raw_user_meta_data ->> 'home_community_id')::uuid;
  exception when others then
    requested_community := null;
  end;
  if requested_community is not null and not exists (
    select 1 from public.communities where id = requested_community and is_active
  ) then
    requested_community := null;
  end if;

  insert into public.profiles (id, display_name, home_community_id, is_demo)
  values (
    new.id,
    left(requested_name, 80),
    requested_community,
    coalesce((new.raw_app_meta_data ->> 'is_demo')::boolean, false)
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

-- -----------------------------------------------------------------------------
-- Permissions, roles, scoped role assignments
-- -----------------------------------------------------------------------------
create type public.scope_level as enum ('platform', 'region', 'district', 'community');

create table public.permissions (
  key text primary key check (key ~ '^[a-z_]+\.[a-z_]+$'),
  category text not null,
  description text not null
);

create table public.roles (
  id uuid primary key default gen_random_uuid(),
  key text not null unique check (key ~ '^[a-z_]{3,40}$'),
  name text not null check (char_length(name) between 2 and 80),
  description text check (char_length(description) <= 500),
  -- Broadest scope at which this role may be assigned. Assignments may be
  -- equal to or narrower than this (e.g. a district role at community scope).
  scope_level public.scope_level not null,
  is_system boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger roles_set_updated_at before update on public.roles
  for each row execute function private.set_updated_at();

create table public.role_permissions (
  role_id uuid not null references public.roles (id) on delete cascade,
  permission_key text not null references public.permissions (key) on delete cascade,
  primary key (role_id, permission_key)
);
create index role_permissions_permission_idx on public.role_permissions (permission_key);

create table public.user_role_assignments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  role_id uuid not null references public.roles (id) on delete restrict,
  region_id uuid references public.regions (id) on delete cascade,
  district_id uuid references public.districts (id) on delete cascade,
  community_id uuid references public.communities (id) on delete cascade,
  granted_by uuid references public.profiles (id) on delete set null,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  -- At most one scope column is set; none = platform-wide.
  constraint user_role_assignments_single_scope
    check (num_nonnulls(region_id, district_id, community_id) <= 1)
);
create unique index user_role_assignments_unique_idx on public.user_role_assignments (
  user_id, role_id,
  coalesce(region_id, '00000000-0000-0000-0000-000000000000'::uuid),
  coalesce(district_id, '00000000-0000-0000-0000-000000000000'::uuid),
  coalesce(community_id, '00000000-0000-0000-0000-000000000000'::uuid)
);
create index user_role_assignments_user_idx on public.user_role_assignments (user_id);
create index user_role_assignments_role_idx on public.user_role_assignments (role_id);

create or replace function private.scope_rank(level public.scope_level)
returns int
language sql
immutable
set search_path = ''
as $$
  select case level
    when 'platform' then 0 when 'region' then 1
    when 'district' then 2 when 'community' then 3 end;
$$;

-- Assignment scope must be equal to or narrower than the role's scope_level.
create or replace function private.validate_role_assignment_scope()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  role_level public.scope_level;
  assignment_level public.scope_level;
begin
  select scope_level into role_level from public.roles where id = new.role_id;
  assignment_level := case
    when new.community_id is not null then 'community'
    when new.district_id is not null then 'district'
    when new.region_id is not null then 'region'
    else 'platform' end;
  if private.scope_rank(assignment_level) < private.scope_rank(role_level) then
    raise exception 'Role cannot be assigned at % scope (role scope is %)',
      assignment_level, role_level using errcode = '22023';
  end if;
  return new;
end;
$$;

create trigger user_role_assignments_validate_scope
  before insert or update on public.user_role_assignments
  for each row execute function private.validate_role_assignment_scope();

-- -----------------------------------------------------------------------------
-- Authorization helpers
-- All are STABLE SECURITY DEFINER with an empty search_path, and only read
-- `auth.uid()` — never a caller-supplied user id — so they cannot be used to
-- impersonate another user.
-- -----------------------------------------------------------------------------
create or replace function private.is_active_user()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and account_status = 'active'
  );
$$;

-- Does the current user hold `p_perm` at a scope that covers the target?
-- Pass the most specific location known (community, else district, else region).
-- With no target location only platform-wide assignments qualify.
create or replace function private.has_permission(
  p_perm text,
  p_community uuid default null,
  p_district uuid default null,
  p_region uuid default null
)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  target_district uuid := p_district;
  target_region uuid := p_region;
begin
  if uid is null or not private.is_active_user() then
    return false;
  end if;
  if p_community is not null and target_district is null then
    target_district := private.community_district(p_community);
  end if;
  if target_district is not null and target_region is null then
    target_region := private.district_region(target_district);
  end if;

  return exists (
    select 1
    from public.user_role_assignments a
    join public.role_permissions rp on rp.role_id = a.role_id
    where a.user_id = uid
      and rp.permission_key = p_perm
      and (a.expires_at is null or a.expires_at > now())
      and (
        (a.region_id is null and a.district_id is null and a.community_id is null)
        or (a.region_id is not null and a.region_id = target_region)
        or (a.district_id is not null and a.district_id = target_district)
        or (a.community_id is not null and a.community_id = p_community)
      )
  );
end;
$$;

-- Does the current user hold `p_perm` at ANY scope? Used to gate access to the
-- admin console; row-level checks still use has_permission with a location.
create or replace function private.has_permission_anywhere(p_perm text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_active_user() and exists (
    select 1
    from public.user_role_assignments a
    join public.role_permissions rp on rp.role_id = a.role_id
    where a.user_id = (select auth.uid())
      and rp.permission_key = p_perm
      and (a.expires_at is null or a.expires_at > now())
  );
$$;

grant execute on function private.is_active_user() to anon, authenticated;
grant execute on function private.has_permission(text, uuid, uuid, uuid) to anon, authenticated;
grant execute on function private.has_permission_anywhere(text) to anon, authenticated;

-- Effective permissions of the current user, for UX (menus, buttons). The
-- server and database re-check every operation; this is never trusted alone.
create or replace function public.my_access()
returns table (
  permission_key text,
  scope public.scope_level,
  region_id uuid,
  district_id uuid,
  community_id uuid
)
language sql
stable
security definer
set search_path = ''
as $$
  select distinct rp.permission_key,
    case
      when a.community_id is not null then 'community'::public.scope_level
      when a.district_id is not null then 'district'::public.scope_level
      when a.region_id is not null then 'region'::public.scope_level
      else 'platform'::public.scope_level end,
    a.region_id, a.district_id, a.community_id
  from public.user_role_assignments a
  join public.role_permissions rp on rp.role_id = a.role_id
  where a.user_id = (select auth.uid())
    and (a.expires_at is null or a.expires_at > now())
    and private.is_active_user();
$$;
grant execute on function public.my_access() to authenticated;

-- -----------------------------------------------------------------------------
-- Audit log (append-only)
-- -----------------------------------------------------------------------------
create table public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles (id) on delete set null,
  action text not null check (char_length(action) between 3 and 80),
  target_table text,
  target_id text,
  region_id uuid references public.regions (id) on delete set null,
  district_id uuid references public.districts (id) on delete set null,
  community_id uuid references public.communities (id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index audit_logs_created_at_idx on public.audit_logs (created_at desc);
create index audit_logs_actor_idx on public.audit_logs (actor_id);
create index audit_logs_target_idx on public.audit_logs (target_table, target_id);

-- Internal writer used by workflows and triggers.
create or replace function private.write_audit(
  p_action text,
  p_target_table text,
  p_target_id text,
  p_metadata jsonb default '{}'::jsonb,
  p_community uuid default null,
  p_district uuid default null,
  p_region uuid default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  d uuid := coalesce(p_district, private.community_district(p_community));
begin
  insert into public.audit_logs (
    actor_id, action, target_table, target_id, metadata,
    community_id, district_id, region_id
  ) values (
    (select auth.uid()), p_action, p_target_table, p_target_id,
    coalesce(p_metadata, '{}'::jsonb),
    p_community, d, coalesce(p_region, private.district_region(d))
  );
end;
$$;

-- Generic row-change audit trigger for administrative tables.
create or replace function private.audit_row_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  row_id text;
  diff jsonb := '{}'::jsonb;
  k text;
begin
  if tg_op = 'DELETE' then
    row_id := (to_jsonb(old) ->> 'id');
    diff := jsonb_build_object('old', to_jsonb(old));
  elsif tg_op = 'INSERT' then
    row_id := (to_jsonb(new) ->> 'id');
    diff := jsonb_build_object('new', to_jsonb(new));
  else
    row_id := (to_jsonb(new) ->> 'id');
    for k in select jsonb_object_keys(to_jsonb(new)) loop
      if k <> 'updated_at' and (to_jsonb(new) -> k) is distinct from (to_jsonb(old) -> k) then
        diff := diff || jsonb_build_object(k, jsonb_build_object(
          'from', to_jsonb(old) -> k, 'to', to_jsonb(new) -> k));
      end if;
    end loop;
    if diff = '{}'::jsonb then
      return new;
    end if;
  end if;
  perform private.write_audit(
    lower(tg_table_name || '.' || tg_op), tg_table_name, row_id, diff);
  return coalesce(new, old);
end;
$$;

create trigger audit_regions after insert or update or delete on public.regions
  for each row execute function private.audit_row_change();
create trigger audit_districts after insert or update or delete on public.districts
  for each row execute function private.audit_row_change();
create trigger audit_communities after insert or update or delete on public.communities
  for each row execute function private.audit_row_change();
create trigger audit_roles after insert or update or delete on public.roles
  for each row execute function private.audit_row_change();
create trigger audit_role_permissions after insert or delete on public.role_permissions
  for each row execute function private.audit_row_change();
create trigger audit_user_role_assignments after insert or update or delete on public.user_role_assignments
  for each row execute function private.audit_row_change();

-- Account status changes on profiles are audited (but not routine edits).
create or replace function private.audit_profile_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.account_status is distinct from old.account_status then
    perform private.write_audit('profiles.status_change', 'profiles', new.id::text,
      jsonb_build_object('from', old.account_status, 'to', new.account_status),
      new.home_community_id);
  end if;
  return new;
end;
$$;
create trigger audit_profile_status after update of account_status on public.profiles
  for each row execute function private.audit_profile_status();

-- -----------------------------------------------------------------------------
-- Admin workflows
-- -----------------------------------------------------------------------------

-- Assign a role. The granter must hold `roles.assign` at the target scope AND
-- already hold every permission the role confers at that scope (no escalation).
create or replace function public.admin_assign_role(
  p_user uuid,
  p_role_key text,
  p_region uuid default null,
  p_district uuid default null,
  p_community uuid default null,
  p_expires_at timestamptz default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_role public.roles%rowtype;
  new_id uuid;
begin
  if num_nonnulls(p_region, p_district, p_community) > 1 then
    raise exception 'Specify at most one scope' using errcode = '22023';
  end if;
  if not private.has_permission('roles.assign', p_community, p_district, p_region) then
    raise exception 'Not permitted to assign roles at this scope' using errcode = '42501';
  end if;
  select * into target_role from public.roles where key = p_role_key;
  if not found then
    raise exception 'Unknown role' using errcode = '22023';
  end if;
  if exists (
    select 1 from public.role_permissions rp
    where rp.role_id = target_role.id
      and not private.has_permission(rp.permission_key, p_community, p_district, p_region)
  ) then
    raise exception 'Cannot grant a role with permissions you do not hold' using errcode = '42501';
  end if;
  if p_user = (select auth.uid()) then
    raise exception 'You cannot change your own roles' using errcode = '42501';
  end if;

  insert into public.user_role_assignments (
    user_id, role_id, region_id, district_id, community_id, granted_by, expires_at)
  values (p_user, target_role.id, p_region, p_district, p_community, (select auth.uid()), p_expires_at)
  returning id into new_id;
  return new_id;
end;
$$;

create or replace function public.admin_revoke_role(p_assignment uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  a public.user_role_assignments%rowtype;
begin
  select * into a from public.user_role_assignments where id = p_assignment;
  if not found then
    raise exception 'Assignment not found' using errcode = 'P0002';
  end if;
  if a.user_id = (select auth.uid()) then
    raise exception 'You cannot change your own roles' using errcode = '42501';
  end if;
  if not private.has_permission('roles.assign', a.community_id, a.district_id, a.region_id)
     or exists (
       select 1 from public.role_permissions rp
       where rp.role_id = a.role_id
         and not private.has_permission(rp.permission_key, a.community_id, a.district_id, a.region_id)
     ) then
    raise exception 'Not permitted to revoke this assignment' using errcode = '42501';
  end if;
  delete from public.user_role_assignments where id = p_assignment;
end;
$$;

-- Suspend / reinstate an account. Scoped by the user's home community.
create or replace function public.admin_set_account_status(
  p_user uuid,
  p_status public.account_status,
  p_reason text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.profiles%rowtype;
begin
  select * into target from public.profiles where id = p_user;
  if not found then
    raise exception 'User not found' using errcode = 'P0002';
  end if;
  if p_user = (select auth.uid()) then
    raise exception 'You cannot change your own account status' using errcode = '42501';
  end if;
  if not private.has_permission('users.manage', target.home_community_id) then
    raise exception 'Not permitted' using errcode = '42501';
  end if;
  -- Platform owners can only be suspended by another platform owner.
  if exists (
    select 1 from public.user_role_assignments a
    join public.role_permissions rp on rp.role_id = a.role_id
    where a.user_id = p_user and rp.permission_key = 'platform.owner'
  ) and not private.has_permission('platform.owner') then
    raise exception 'Not permitted' using errcode = '42501';
  end if;
  if char_length(coalesce(trim(p_reason), '')) < 5 then
    raise exception 'A reason is required' using errcode = '22023';
  end if;

  update public.profiles set account_status = p_status where id = p_user;
  perform private.write_audit('users.set_status', 'profiles', p_user::text,
    jsonb_build_object('status', p_status, 'reason', p_reason), target.home_community_id);
end;
$$;

-- User directory for administrators, including auth email and last sign-in.
-- Platform-scoped admins see everyone; scoped admins see users whose home
-- community falls within their scope.
create or replace function public.admin_list_users(
  p_search text default null,
  p_status public.account_status default null,
  p_limit int default 25,
  p_offset int default 0
)
returns table (
  id uuid,
  email text,
  display_name text,
  username text,
  account_status public.account_status,
  is_demo boolean,
  home_community_id uuid,
  created_at timestamptz,
  last_sign_in_at timestamptz,
  role_keys text[],
  total_count bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not private.has_permission_anywhere('users.read') then
    raise exception 'Not permitted' using errcode = '42501';
  end if;
  return query
  with visible as (
    select p.*, u.email::text as email, u.last_sign_in_at
    from public.profiles p
    join auth.users u on u.id = p.id
    where (private.has_permission('users.read')
           or (p.home_community_id is not null
               and private.has_permission('users.read', p.home_community_id)))
      and (p_status is null or p.account_status = p_status)
      and (p_search is null or p_search = ''
           or p.display_name ilike '%' || p_search || '%'
           or u.email ilike '%' || p_search || '%'
           or p.username ilike '%' || p_search || '%')
  )
  select v.id, v.email, v.display_name, v.username, v.account_status, v.is_demo,
    v.home_community_id, v.created_at, v.last_sign_in_at,
    coalesce((select array_agg(distinct r.key order by r.key)
              from public.user_role_assignments a
              join public.roles r on r.id = a.role_id
              where a.user_id = v.id), '{}'),
    count(*) over ()
  from visible v
  order by v.created_at desc
  limit least(greatest(p_limit, 1), 100)
  offset greatest(p_offset, 0);
end;
$$;

revoke all on function public.admin_assign_role(uuid, text, uuid, uuid, uuid, timestamptz) from public, anon;
revoke all on function public.admin_revoke_role(uuid) from public, anon;
revoke all on function public.admin_set_account_status(uuid, public.account_status, text) from public, anon;
revoke all on function public.admin_list_users(text, public.account_status, int, int) from public, anon;
grant execute on function public.admin_assign_role(uuid, text, uuid, uuid, uuid, timestamptz) to authenticated;
grant execute on function public.admin_revoke_role(uuid) to authenticated;
grant execute on function public.admin_set_account_status(uuid, public.account_status, text) to authenticated;
grant execute on function public.admin_list_users(text, public.account_status, int, int) to authenticated;

-- -----------------------------------------------------------------------------
-- Row Level Security
-- -----------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.permissions enable row level security;
alter table public.roles enable row level security;
alter table public.role_permissions enable row level security;
alter table public.user_role_assignments enable row level security;
alter table public.audit_logs enable row level security;

-- Profiles: public identity cards for active users; full access to self.
grant select on public.profiles to anon, authenticated;
grant update (display_name, username, avatar_path, bio, home_community_id)
  on public.profiles to authenticated;

create policy "Active profiles are publicly visible"
  on public.profiles for select to anon, authenticated
  using (account_status = 'active');
create policy "Users can see their own profile"
  on public.profiles for select to authenticated
  using (id = (select auth.uid()));
create policy "Scoped admins can see profiles"
  on public.profiles for select to authenticated
  using (private.has_permission('users.read', home_community_id));
create policy "Active users can update their own profile"
  on public.profiles for update to authenticated
  using (id = (select auth.uid()) and private.is_active_user())
  with check (id = (select auth.uid()));

-- Permissions / roles: readable by admins with roles.read; editable by roles.manage.
grant select on public.permissions, public.roles, public.role_permissions to authenticated;
grant insert, update, delete on public.roles to authenticated;
grant insert, delete on public.role_permissions to authenticated;

create policy "Role readers can list permissions"
  on public.permissions for select to authenticated
  using (private.has_permission_anywhere('roles.read'));
create policy "Role readers can list roles"
  on public.roles for select to authenticated
  using (private.has_permission_anywhere('roles.read'));
create policy "Role managers can create roles"
  on public.roles for insert to authenticated
  with check (private.has_permission('roles.manage') and not is_system);
create policy "Role managers can edit custom roles"
  on public.roles for update to authenticated
  using (private.has_permission('roles.manage') and not is_system)
  with check (private.has_permission('roles.manage') and not is_system);
create policy "Role managers can delete custom roles"
  on public.roles for delete to authenticated
  using (private.has_permission('roles.manage') and not is_system);
create policy "Role readers can list role permissions"
  on public.role_permissions for select to authenticated
  using (private.has_permission_anywhere('roles.read'));
-- Custom roles only, and never with a permission the manager lacks.
create policy "Role managers can grant permissions to custom roles"
  on public.role_permissions for insert to authenticated
  with check (
    private.has_permission('roles.manage')
    and private.has_permission(permission_key)
    and exists (select 1 from public.roles r where r.id = role_id and not r.is_system)
  );
create policy "Role managers can remove permissions from custom roles"
  on public.role_permissions for delete to authenticated
  using (
    private.has_permission('roles.manage')
    and exists (select 1 from public.roles r where r.id = role_id and not r.is_system)
  );

-- Role assignments: users see their own; scoped admins see within scope.
-- Writes only via admin_assign_role / admin_revoke_role.
grant select on public.user_role_assignments to authenticated;
create policy "Users can see their own role assignments"
  on public.user_role_assignments for select to authenticated
  using (user_id = (select auth.uid()));
create policy "Role readers can see assignments in scope"
  on public.user_role_assignments for select to authenticated
  using (private.has_permission('roles.read', community_id, district_id, region_id));

-- Audit log: read-only for auditors within scope. No write grants at all.
grant select on public.audit_logs to authenticated;
create policy "Auditors can read audit logs in scope"
  on public.audit_logs for select to authenticated
  using (
    private.has_permission('audit.read')
    or (community_id is not null and private.has_permission('audit.read', community_id))
    or (district_id is not null and private.has_permission('audit.read', null, district_id))
    or (region_id is not null and private.has_permission('audit.read', null, null, region_id))
  );

-- Locations (tables created in 0002).
grant insert, update on public.regions, public.districts, public.communities to authenticated;

create policy "Active regions are public" on public.regions for select to anon, authenticated
  using (is_active or private.has_permission('locations.manage', null, null, id));
create policy "Active districts are public" on public.districts for select to anon, authenticated
  using (is_active or private.has_permission('locations.manage', null, id));
create policy "Active communities are public" on public.communities for select to anon, authenticated
  using (is_active or private.has_permission('locations.manage', id));

create policy "Platform location managers can add regions" on public.regions
  for insert to authenticated with check (private.has_permission('locations.manage'));
create policy "Platform location managers can edit regions" on public.regions
  for update to authenticated
  using (private.has_permission('locations.manage'))
  with check (private.has_permission('locations.manage'));
create policy "Regional location managers can add districts" on public.districts
  for insert to authenticated
  with check (private.has_permission('locations.manage', null, null, region_id));
create policy "Regional location managers can edit districts" on public.districts
  for update to authenticated
  using (private.has_permission('locations.manage', null, id))
  with check (private.has_permission('locations.manage', null, null, region_id));
create policy "District location managers can add communities" on public.communities
  for insert to authenticated
  with check (private.has_permission('locations.manage', null, district_id));
create policy "District location managers can edit communities" on public.communities
  for update to authenticated
  using (private.has_permission('locations.manage', id))
  with check (private.has_permission('locations.manage', null, district_id));
