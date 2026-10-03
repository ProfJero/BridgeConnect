-- =============================================================================
-- BridgeConnect · 0002 · Location hierarchy
-- Region → District → Community. No location is hard-coded: Kwamankese and the
-- Central Region are seed data only (supabase/seed.sql).
-- =============================================================================

create table public.regions (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 120),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.districts (
  id uuid primary key default gen_random_uuid(),
  region_id uuid not null references public.regions (id) on delete restrict,
  name text not null check (char_length(name) between 2 and 120),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (region_id, name)
);
create index districts_region_id_idx on public.districts (region_id);

create table public.communities (
  id uuid primary key default gen_random_uuid(),
  district_id uuid not null references public.districts (id) on delete restrict,
  name text not null check (char_length(name) between 2 and 120),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  description text check (char_length(description) <= 2000),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (district_id, name)
);
create index communities_district_id_idx on public.communities (district_id);

create trigger regions_set_updated_at before update on public.regions
  for each row execute function private.set_updated_at();
create trigger districts_set_updated_at before update on public.districts
  for each row execute function private.set_updated_at();
create trigger communities_set_updated_at before update on public.communities
  for each row execute function private.set_updated_at();

-- Resolve the district / region that a community belongs to. Used by
-- geographically scoped authorization.
create or replace function private.community_district(p_community uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select district_id from public.communities where id = p_community;
$$;

create or replace function private.district_region(p_district uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select region_id from public.districts where id = p_district;
$$;

grant execute on function private.community_district(uuid) to anon, authenticated;
grant execute on function private.district_region(uuid) to anon, authenticated;

-- Flattened, read-only view used by pickers and filters.
create view public.location_directory
with (security_invoker = true) as
select
  c.id as community_id,
  c.name as community_name,
  c.slug as community_slug,
  d.id as district_id,
  d.name as district_name,
  d.slug as district_slug,
  r.id as region_id,
  r.name as region_name,
  r.slug as region_slug
from public.communities c
join public.districts d on d.id = c.district_id
join public.regions r on r.id = d.region_id
where c.is_active and d.is_active and r.is_active;

alter table public.regions enable row level security;
alter table public.districts enable row level security;
alter table public.communities enable row level security;

grant select on public.regions, public.districts, public.communities to anon, authenticated;
grant select on public.location_directory to anon, authenticated;
-- Write grants and all RLS policies for locations are defined in 0003, after the
-- permission helpers exist. Deletion is never granted: locations are deactivated.
