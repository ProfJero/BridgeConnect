-- =============================================================================
-- BridgeConnect · Database security tests (pgTAP)
-- Run with: npm run test:db   (wraps `supabase test db`)
-- Requires the development seed (supabase/seed.sql).
--
-- Personas (from seed):
--   a…01 platform owner          a…02 district admin (AAK district)
--   a…03 moderator (AAK)         a…04 verification officer (AAK)
--   a…05 business owner (Kwamankese Fresh Farms, e…01)
--   a…06 NGO owner (e…02) + editor at health centre (e…03)
--   a…07 resident (Kwamankese)   a…08 resident (Cape Coast, other district)
-- =============================================================================
begin;
create extension if not exists pgtap with schema extensions;
select plan(53);

-- Helper: impersonate a user for the rest of the statement batch.
create or replace function pg_temp.login(uid uuid) returns void language plpgsql as $$
begin
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims',
    json_build_object('sub', uid, 'role', 'authenticated')::text, true);
end $$;
create or replace function pg_temp.logout() returns void language plpgsql as $$
begin
  perform set_config('role', 'anon', true);
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
end $$;
create or replace function pg_temp.superuser() returns void language plpgsql as $$
begin
  perform set_config('role', 'postgres', true);
  perform set_config('request.jwt.claims', '', true);
end $$;
grant execute on function pg_temp.login(uuid), pg_temp.logout(), pg_temp.superuser() to anon, authenticated;

-- Fixtures created as superuser.
insert into public.entity_applications (id, applicant_id, entity_type, proposed_name, sector, community_id,
  description, contact_phone)
values ('b0000000-0000-4000-8000-0000000000cc', 'a0000000-0000-4000-8000-000000000008', 'business',
  'Cape Coast Crafts', 'artisan', '30000000-0000-4000-8000-000000000004',
  'Handmade crafts and souvenirs for visitors to Cape Coast Castle.', '+233 24 111 1111');
insert into public.posts (id, author_id, community_id, body) values
  ('c0000000-0000-4000-8000-0000000000cc', 'a0000000-0000-4000-8000-000000000008',
   '30000000-0000-4000-8000-000000000004', 'A Cape Coast post for scope tests');
grant select on all tables in schema extensions to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 1. Anonymous visitors
-- ---------------------------------------------------------------------------
select pg_temp.logout();
select ok((select count(*) from public.entities) = 4, 'anon sees active entities');
select ok((select count(*) from public.posts) >= 3, 'anon sees published posts');
select throws_ok($$select * from public.entity_applications$$, '42501', null, 'anon cannot read applications');
select throws_ok($$select * from public.audit_logs$$, '42501', null, 'anon cannot read audit logs');
select throws_ok($$select * from public.orders$$, '42501', null, 'anon cannot read orders');
select throws_ok($$insert into public.posts (community_id, body) values ('30000000-0000-4000-8000-000000000001', 'hi')$$,
  '42501', null, 'anon cannot post');
select throws_ok($$select public.admin_list_users()$$, '42501', null, 'anon cannot list users');

-- ---------------------------------------------------------------------------
-- 2. Residents: trust model and self-service limits
-- ---------------------------------------------------------------------------
select pg_temp.login('a0000000-0000-4000-8000-000000000007');
select throws_ok($$insert into public.entities (entity_type, name, slug, sector, community_id)
  values ('business', 'Fake Biz', 'fake-biz', 'commerce', '30000000-0000-4000-8000-000000000001')$$,
  '42501', null, 'resident cannot create an entity directly');
select throws_ok($$update public.profiles set account_status = 'active', is_demo = false
  where id = 'a0000000-0000-4000-8000-000000000007'$$,
  '42501', null, 'resident cannot change protected profile columns');
select lives_ok($$update public.profiles set bio = 'Hello' where id = 'a0000000-0000-4000-8000-000000000007'$$,
  'resident can edit own bio');
update public.profiles set bio = 'hacked' where id = 'a0000000-0000-4000-8000-000000000008';
select pg_temp.superuser();
select isnt((select bio from public.profiles where id = 'a0000000-0000-4000-8000-000000000008'), 'hacked',
  'resident cannot edit another profile (cross-user)');
select pg_temp.login('a0000000-0000-4000-8000-000000000007');
select is((select count(*)::int from public.entity_applications), 1,
  'resident sees only their own application');
select throws_ok($$insert into public.entity_applications (entity_type, proposed_name, sector, community_id,
  description, contact_phone, status)
  values ('business', 'Sneaky', 'commerce', '30000000-0000-4000-8000-000000000001',
  'Trying to self-approve this application via status', '+233 24 000 0000', 'approved')$$,
  '42501', null, 'resident cannot set application status on insert (manipulated request)');
select throws_ok($$select public.review_entity_application(
  (select id from public.entity_applications where applicant_id = 'a0000000-0000-4000-8000-000000000007'),
  'approve')$$, '42501', null, 'resident cannot approve applications');
select throws_ok($$select public.admin_assign_role('a0000000-0000-4000-8000-000000000008', 'moderator',
  null, '20000000-0000-4000-8000-000000000001')$$, '42501', null, 'resident cannot assign roles');
select throws_ok($$insert into public.posts (community_id, kind, body)
  values ('30000000-0000-4000-8000-000000000001', 'announcement', 'Official!')$$,
  '42501', null, 'resident cannot publish announcements');
select throws_ok($$insert into public.posts (entity_id, community_id, body)
  values ('e0000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', 'As a business')$$,
  '42501', null, 'resident cannot post as an entity they do not belong to');
select lives_ok($$insert into public.posts (community_id, body)
  values ('30000000-0000-4000-8000-000000000001', 'Community post from a resident')$$,
  'resident can create a community post');
select throws_ok($$insert into public.products (entity_id, name, price)
  values ('e0000000-0000-4000-8000-000000000001', 'Fake product', 1)$$,
  '42501', null, 'resident cannot list products for an entity');
select is((select count(*)::int from public.notifications
  where recipient_id <> 'a0000000-0000-4000-8000-000000000007'), 0,
  'resident cannot read other users notifications');
select throws_ok($$insert into public.notifications (recipient_id, type, title)
  values ('a0000000-0000-4000-8000-000000000007', 'system.fake', 'Fake')$$,
  '42501', null, 'clients cannot create notifications');
select throws_ok($$insert into public.audit_logs (action) values ('fake.entry')$$,
  '42501', null, 'clients cannot write audit logs');
select throws_ok($$select public.issue_emergency_alert('Fake alert title', 'Fake alert body text', 'critical',
  'other', null, null, null, '30000000-0000-4000-8000-000000000001')$$,
  '42501', null, 'resident cannot issue emergency alerts');

-- ---------------------------------------------------------------------------
-- 3. Entity owners: cross-entity isolation, server-side pricing
-- ---------------------------------------------------------------------------
select pg_temp.login('a0000000-0000-4000-8000-000000000005');
select lives_ok($$insert into public.products (entity_id, name, price, status)
  values ('e0000000-0000-4000-8000-000000000001', 'Yam', 20, 'active')$$,
  'business owner can list a product for own entity');
select throws_ok($$insert into public.products (entity_id, name, price)
  values ('e0000000-0000-4000-8000-000000000002', 'Not mine', 1)$$,
  '42501', null, 'business owner cannot list for another entity (cross-entity)');
select throws_ok($$insert into public.products (entity_id, name, price, status)
  values ('e0000000-0000-4000-8000-000000000001', 'Bad', 1, 'removed')$$,
  '42501', null, 'owner cannot set moderator-only status');
select throws_ok($$update public.entities set name = 'Renamed' where id = 'e0000000-0000-4000-8000-000000000001'$$,
  '42501', null, 'verified name cannot be changed by the owner');
select throws_ok($$insert into public.jobs (entity_id, title, description, employment_type)
  values ('e0000000-0000-4000-8000-000000000004', 'Teacher', 'A job description of sufficient length.', 'full_time')$$,
  '42501', null, 'non-member cannot post jobs for a school');

-- NGO entity has no `products` capability.
select pg_temp.login('a0000000-0000-4000-8000-000000000006');
select throws_ok($$insert into public.products (entity_id, name, price)
  values ('e0000000-0000-4000-8000-000000000002', 'NGO product', 1)$$,
  '42501', null, 'NGO without products capability cannot list products');
-- Editor at the health centre cannot manage members (manager+ required).
select throws_ok($$select public.entity_add_member('e0000000-0000-4000-8000-000000000003',
  'resident@demo.bridgeconnect.test', 'owner')$$, '42501', null, 'editor cannot add members');

-- Resident orders: price comes from the database, not the client.
select pg_temp.login('a0000000-0000-4000-8000-000000000007');
select lives_ok($$select public.place_order('e0000000-0000-4000-8000-000000000001',
  jsonb_build_array(jsonb_build_object('product_id',
    (select id from public.products where name = 'Fresh Cassava'), 'quantity', 2, 'unit_price', 0.01)),
  'pickup', '+233 24 000 0007')$$, 'resident can place an order');
select is((select subtotal from public.orders where buyer_id = 'a0000000-0000-4000-8000-000000000007'
  order by created_at desc limit 1), 50.00::numeric(12,2), 'order is priced server-side (client price ignored)');
select throws_ok($$select public.place_order('e0000000-0000-4000-8000-000000000001',
  jsonb_build_array(jsonb_build_object('product_id', (select id from public.products where name = 'Fresh Cassava'),
  'quantity', 100000)), 'pickup', '+233 24 000 0007')$$, '22023', null, 'invalid quantity rejected');
select throws_ok($$select public.place_order('e0000000-0000-4000-8000-000000000001',
  jsonb_build_array(jsonb_build_object('product_id', 'not-a-uuid', 'quantity', 1)), 'pickup', '+233 24 000 0007')$$,
  null, null, 'invalid product id rejected');
select throws_ok($$select public.update_order_status(
  (select id from public.orders where buyer_id = 'a0000000-0000-4000-8000-000000000007' limit 1), 'completed')$$,
  '22023', null, 'buyer cannot mark their own order completed');

select pg_temp.login('a0000000-0000-4000-8000-000000000008');
select is((select count(*)::int from public.orders), 0, 'other resident cannot see the order (cross-user)');

-- ---------------------------------------------------------------------------
-- 4. Verification: scoped reviewers, approval creates the workspace
-- ---------------------------------------------------------------------------
select pg_temp.login('a0000000-0000-4000-8000-000000000004');
select is((select count(*)::int from public.entity_applications), 1,
  'AAK verifier sees only applications in their district');
select throws_ok($$select public.review_entity_application('b0000000-0000-4000-8000-0000000000cc', 'start_review')$$,
  '42501', null, 'AAK verifier cannot review a Cape Coast application (cross-district)');
select throws_ok($$select public.review_entity_application(
  (select id from public.entity_applications where proposed_name = 'Abena''s Tailoring'), 'approve')$$,
  '22023', null, 'approval requires review to have started');
select lives_ok($$select public.review_entity_application(
  (select id from public.entity_applications where proposed_name = 'Abena''s Tailoring'), 'start_review')$$,
  'verifier starts review');
select isnt((select public.review_entity_application(
  (select id from public.entity_applications where proposed_name = 'Abena''s Tailoring'), 'approve', 'Documents verified')),
  null, 'verifier approves and an entity is created');
select pg_temp.superuser();
select is((select role::text from public.entity_memberships m join public.entities e on e.id = m.entity_id
  where e.name = 'Abena''s Tailoring'), 'owner', 'applicant becomes the workspace owner');
select ok(exists(select 1 from public.audit_logs where action = 'verification.approve'), 'approval is audited');

-- ---------------------------------------------------------------------------
-- 5. Moderation scope and role escalation
-- ---------------------------------------------------------------------------
select pg_temp.login('a0000000-0000-4000-8000-000000000003');
select lives_ok($$select public.moderate_content('post',
  (select id from public.posts where title = 'Borehole repair'), 'hide', 'Testing moderation')$$,
  'AAK moderator can hide an AAK post');
select throws_ok($$select public.moderate_content('post', 'c0000000-0000-4000-8000-0000000000cc', 'hide', 'Out of scope')$$,
  '42501', null, 'AAK moderator cannot moderate a Cape Coast post (cross-community)');
select pg_temp.logout();
select is((select count(*)::int from public.posts where title = 'Borehole repair'), 0, 'hidden post is no longer public');

select pg_temp.login('a0000000-0000-4000-8000-000000000002');
select throws_ok($$select public.admin_assign_role('a0000000-0000-4000-8000-000000000007', 'platform_owner')$$,
  '42501', null, 'district admin cannot grant platform owner (escalation)');
select throws_ok($$select public.admin_assign_role('a0000000-0000-4000-8000-000000000007', 'district_admin',
  null, '20000000-0000-4000-8000-000000000002')$$,
  '42501', null, 'district admin cannot assign roles in another district');
select throws_ok($$select public.admin_assign_role('a0000000-0000-4000-8000-000000000002', 'moderator',
  null, '20000000-0000-4000-8000-000000000001')$$, '42501', null, 'admins cannot change their own roles');
select lives_ok($$select public.admin_assign_role('a0000000-0000-4000-8000-000000000007', 'moderator',
  null, '20000000-0000-4000-8000-000000000001')$$, 'district admin can assign a moderator in their district');
select throws_ok($$insert into public.user_role_assignments (user_id, role_id)
  select 'a0000000-0000-4000-8000-000000000007', id from public.roles where key = 'platform_owner'$$,
  '42501', null, 'role assignments cannot be inserted directly');

-- ---------------------------------------------------------------------------
-- 6. Suspended accounts lose write access
-- ---------------------------------------------------------------------------
select lives_ok($$select public.admin_set_account_status('a0000000-0000-4000-8000-000000000007',
  'suspended', 'Repeated spam')$$, 'district admin suspends a resident in scope');
select pg_temp.login('a0000000-0000-4000-8000-000000000007');
select throws_ok($$insert into public.posts (community_id, body)
  values ('30000000-0000-4000-8000-000000000001', 'Still posting?')$$,
  '42501', null, 'suspended user cannot post');

select * from finish();
rollback;
