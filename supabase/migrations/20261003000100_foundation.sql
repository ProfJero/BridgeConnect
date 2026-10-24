-- =============================================================================
-- BridgeConnect · 0001 · Foundation
-- -----------------------------------------------------------------------------
-- * `private` schema holds authorization helpers and trigger functions. It is NOT
--   exposed through PostgREST, so nothing in it can be called directly as RPC.
-- * Shared utility functions (updated_at maintenance, slug generation).
-- =============================================================================

create extension if not exists pg_trgm with schema extensions;
create extension if not exists unaccent with schema extensions;

create schema if not exists private;
revoke all on schema private from public;
-- RLS policies evaluate helper functions as the calling role, so API roles need
-- USAGE on the schema and EXECUTE on the specific helpers (granted per function).
grant usage on schema private to anon, authenticated, service_role;

-- Supabase grants broad default privileges on new public objects. BridgeConnect
-- grants table privileges explicitly per table, so start from zero.
alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;
alter default privileges in schema public revoke execute on functions from public, anon, authenticated;
alter default privileges in schema private revoke execute on functions from public, anon, authenticated;

-- -----------------------------------------------------------------------------
-- updated_at maintenance
-- -----------------------------------------------------------------------------
create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- slugify: lower-case, accent-free, hyphen-separated identifier.
-- -----------------------------------------------------------------------------
create or replace function private.slugify(value text)
returns text
language sql
immutable
strict
set search_path = ''
as $$
  select trim(both '-' from regexp_replace(
    lower(extensions.unaccent(value)),
    '[^a-z0-9]+', '-', 'g'
  ));
$$;

-- Produce a slug that is unique within `target_table.slug` by suffixing a short
-- random token when the plain slug is taken. Used by SECURITY DEFINER workflows.
create or replace function private.unique_slug(target_table regclass, base text)
returns text
language plpgsql
volatile
set search_path = ''
as $$
declare
  candidate text := nullif(private.slugify(base), '');
  taken boolean;
begin
  if candidate is null then
    candidate := 'item';
  end if;
  candidate := left(candidate, 80);
  loop
    execute format('select exists(select 1 from %s where slug = $1)', target_table)
      into taken using candidate;
    exit when not taken;
    candidate := left(private.slugify(base), 72) || '-' || substr(md5(random()::text), 1, 6);
  end loop;
  return candidate;
end;
$$;

comment on schema private is
  'BridgeConnect internal helpers (authorization, triggers). Not exposed via the Data API.';
