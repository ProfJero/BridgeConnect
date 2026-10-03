-- =============================================================================
-- Remove ALL development/demo data before going live.
-- -----------------------------------------------------------------------------
-- Deletes every account flagged is_demo (and, via foreign keys, their posts,
-- orders, memberships and role assignments), the demo entities created by
-- supabase/seed.sql, and demo-only emergency contacts/alerts. Locations
-- (Central Region / AAK / Kwamankese…) are kept: deactivate them in the admin
-- console if they are not wanted.
--
-- Run from the Supabase SQL editor. Review the counts printed first.
-- =============================================================================
begin;

-- Entities owned only by demo accounts (seeded ones and any approved during
-- testing) and everything hanging off them.
create temporary table demo_entities on commit drop as
select e.id from public.entities e
where e.id::text like 'e0000000-0000-4000-8000-%'
   or not exists (
     select 1 from public.entity_memberships m
     join public.profiles p on p.id = m.user_id
     where m.entity_id = e.id and m.role = 'owner' and not p.is_demo
   );
delete from public.orders where entity_id in (select id from demo_entities);
delete from public.entity_applications where entity_id in (select id from demo_entities);
delete from public.entities where id in (select id from demo_entities);

-- Content authored by demo accounts that references restricting FKs.
delete from public.orders where buyer_id in (select id from public.profiles where is_demo);
delete from public.emergency_alerts where issued_by in (select id from public.profiles where is_demo);
delete from public.emergency_contacts where name like '%(demo)%';

-- Demo auth users (cascades to profiles and dependent rows).
delete from auth.users where id in (select id from public.profiles where is_demo);

-- Sanity check: should be zero.
select count(*) as remaining_demo_profiles from public.profiles where is_demo;

commit;
