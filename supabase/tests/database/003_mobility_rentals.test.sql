-- =============================================================================
-- BridgeConnect · Owner fast-track, rentals, riders & trips (pgTAP)
-- Personas: a…01 platform owner · a…02 district admin (AAK) · a…03 moderator (AAK)
--           a…05 business owner · a…06 NGO owner · a…07 resident (Kwamankese) · a…08 resident (Cape Coast)
-- =============================================================================
begin;
create extension if not exists pgtap with schema extensions;
select plan(51);

create or replace function pg_temp.login(uid uuid) returns void language plpgsql as $$
begin
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
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
grant select on all tables in schema extensions to anon, authenticated;

-- Fixtures
insert into public.entity_applications (id, applicant_id, entity_type, proposed_name, sector, community_id,
  description, contact_phone) values
  ('b0000000-0000-4000-8000-0000000000f1', 'a0000000-0000-4000-8000-000000000001', 'business',
   'Owner Test Shop', 'commerce', '30000000-0000-4000-8000-000000000001',
   'A shop the platform owner sets up for testing the fast track.', '+233 24 111 0001'),
  ('b0000000-0000-4000-8000-0000000000f2', 'a0000000-0000-4000-8000-000000000002', 'business',
   'Admin Test Shop', 'commerce', '30000000-0000-4000-8000-000000000001',
   'A shop a district admin tries to approve for themselves.', '+233 24 111 0002');

-- ---------------------------------------------------------------------------
-- 1. Platform-owner fast track
-- ---------------------------------------------------------------------------
select pg_temp.login('a0000000-0000-4000-8000-000000000007');
select throws_ok($$select public.fast_track_entity_application(
  (select id from public.entity_applications where applicant_id = 'a0000000-0000-4000-8000-000000000007' limit 1))$$,
  '42501', null, 'residents cannot fast-track their application');
select pg_temp.login('a0000000-0000-4000-8000-000000000002');
select throws_ok($$select public.fast_track_entity_application('b0000000-0000-4000-8000-0000000000f2')$$,
  '42501', null, 'district admins cannot approve their own application');
select pg_temp.login('a0000000-0000-4000-8000-000000000001');
select throws_ok($$select public.fast_track_entity_application('b0000000-0000-4000-8000-0000000000f2')$$,
  '42501', null, 'owners cannot fast-track someone else''s application');
select lives_ok($$select public.fast_track_entity_application('b0000000-0000-4000-8000-0000000000f1')$$,
  'platform owner sets up their own business instantly');
select pg_temp.superuser();
select ok(exists (select 1 from public.entity_memberships m join public.entities e on e.id = m.entity_id
                  where e.name = 'Owner Test Shop' and m.user_id = 'a0000000-0000-4000-8000-000000000001'
                    and m.role = 'owner' and e.status = 'active'),
  'fast track creates an active entity owned by the owner');
select ok(exists (select 1 from public.audit_logs where action = 'verification.owner_fast_track'),
  'fast track is audited');
select pg_temp.login('a0000000-0000-4000-8000-000000000001');
select throws_ok($$select public.fast_track_entity_application('b0000000-0000-4000-8000-0000000000f1')$$,
  '22023', null, 'a decided application cannot be fast-tracked again');

-- ---------------------------------------------------------------------------
-- 2. Rentals
-- ---------------------------------------------------------------------------
select pg_temp.login('a0000000-0000-4000-8000-000000000007');
select lives_ok($$insert into public.rental_listings (community_id, rental_type, title, description, price,
  bedrooms, contact_phone) values ('30000000-0000-4000-8000-000000000001',
  'self_contain', 'Self-contain near the market', 'Tiled self-contain with a porch, water and prepaid meter.',
  450, 1, '+233 24 000 0007')$$, 'resident lists a rental');
select pg_temp.superuser();
update public.rental_listings set id = 'd0000000-0000-4000-8000-0000000000a1' where title = 'Self-contain near the market';
select pg_temp.login('a0000000-0000-4000-8000-000000000007');
select throws_ok($$insert into public.rental_listings (owner_id, community_id, rental_type, title, description, price,
  contact_phone) values ('a0000000-0000-4000-8000-000000000008', '30000000-0000-4000-8000-000000000001', 'room',
  'Room listed as someone else', 'Trying to list a property on behalf of another user.', 100, '+233 24 000 0007')$$,
  '42501', null, 'cannot list on behalf of another user');
select throws_ok($$update public.rental_listings set status = 'removed'
  where id = 'd0000000-0000-4000-8000-0000000000a1'$$, '42501', null, 'owners cannot set the moderator-only status');
select pg_temp.logout();
select is((select count(*)::int from public.rental_listings where id = 'd0000000-0000-4000-8000-0000000000a1'), 1,
  'anon sees available rentals');
select pg_temp.login('a0000000-0000-4000-8000-000000000008');
update public.rental_listings set price = 1 where id = 'd0000000-0000-4000-8000-0000000000a1';
select pg_temp.superuser();
select is((select price from public.rental_listings where id = 'd0000000-0000-4000-8000-0000000000a1'), 450.00::numeric,
  'others cannot edit a rental (cross-user)');
select pg_temp.login('a0000000-0000-4000-8000-000000000008');
select lives_ok($$insert into public.rental_inquiries (rental_id, message, contact_phone)
  values ('d0000000-0000-4000-8000-0000000000a1', 'Can I view it on Saturday?', '+233 24 000 0008')$$,
  'resident sends a viewing request');
select pg_temp.login('a0000000-0000-4000-8000-000000000007');
select is((select count(*)::int from public.rental_inquiries), 1, 'listing owner sees the enquiry');
select throws_ok($$insert into public.rental_inquiries (rental_id, message, contact_phone)
  values ('d0000000-0000-4000-8000-0000000000a1', 'Enquiring about my own place', '+233 24 000 0007')$$,
  '22023', null, 'owners cannot enquire about their own listing');
select pg_temp.login('a0000000-0000-4000-8000-000000000005');
select is((select count(*)::int from public.rental_inquiries), 0, 'unrelated users cannot read enquiries');
select pg_temp.login('a0000000-0000-4000-8000-000000000003');
select lives_ok($$select public.moderate_content('rental', 'd0000000-0000-4000-8000-0000000000a1', 'remove',
  'Fake listing reported by residents')$$, 'moderator in scope removes a rental');
select pg_temp.logout();
select is((select count(*)::int from public.rental_listings where id = 'd0000000-0000-4000-8000-0000000000a1'), 0,
  'removed rentals disappear from public view');

-- ---------------------------------------------------------------------------
-- 3. Riders
-- ---------------------------------------------------------------------------
select pg_temp.login('a0000000-0000-4000-8000-000000000008');
select lives_ok($$insert into public.rider_profiles (user_id, vehicle_type, vehicle_description, plate_number,
  community_id, phone) values ('a0000000-0000-4000-8000-000000000008', 'motorbike', 'Red Honda motorbike',
  'GR 1234-24', '30000000-0000-4000-8000-000000000004', '+233 24 000 0008')$$, 'resident registers as a rider');
select is((select status::text from public.rider_profiles where user_id = 'a0000000-0000-4000-8000-000000000008'),
  'pending', 'new riders start pending');
select throws_ok($$update public.rider_profiles set status = 'approved'
  where user_id = 'a0000000-0000-4000-8000-000000000008'$$, '42501', null, 'riders cannot approve themselves');
select throws_ok($$select public.set_rider_online(true)$$, '42501', null, 'pending riders cannot go online');

select pg_temp.login('a0000000-0000-4000-8000-000000000007');
insert into public.rider_profiles (user_id, vehicle_type, vehicle_description, community_id, phone, offers_rides)
values ('a0000000-0000-4000-8000-000000000007', 'tricycle', 'Yellow tricycle', '30000000-0000-4000-8000-000000000001',
        '+233 24 000 0007', true);
select pg_temp.login('a0000000-0000-4000-8000-000000000006');
insert into public.rider_profiles (user_id, vehicle_type, vehicle_description, community_id, phone)
values ('a0000000-0000-4000-8000-000000000006', 'tricycle', 'Blue tricycle', '30000000-0000-4000-8000-000000000002',
        '+233 24 000 0006');

select pg_temp.login('a0000000-0000-4000-8000-000000000002');
select throws_ok($$select public.admin_review_rider('a0000000-0000-4000-8000-000000000008', 'approved')$$,
  '42501', null, 'district admins cannot approve riders outside their district');
select lives_ok($$select public.admin_review_rider('a0000000-0000-4000-8000-000000000007', 'approved')$$,
  'district admin approves a rider in scope');
select lives_ok($$select public.admin_review_rider('a0000000-0000-4000-8000-000000000006', 'approved')$$,
  'district admin approves a second rider');

select pg_temp.login('a0000000-0000-4000-8000-000000000005');
select throws_ok($$select last_lat from public.rider_profiles$$, '42501', null, 'rider coordinates are never readable');
select throws_ok($$select public.admin_review_rider('a0000000-0000-4000-8000-000000000008', 'approved')$$,
  '42501', null, 'residents cannot approve riders');

select pg_temp.login('a0000000-0000-4000-8000-000000000001');
insert into public.rider_profiles (user_id, vehicle_type, vehicle_description, community_id, phone)
values ('a0000000-0000-4000-8000-000000000001', 'car', 'White saloon', '30000000-0000-4000-8000-000000000001',
        '+233 24 000 0001');
select is((select status::text from public.rider_profiles where user_id = 'a0000000-0000-4000-8000-000000000001'),
  'approved', 'a platform owner registering as a rider is approved instantly');

-- ---------------------------------------------------------------------------
-- 4. Trips
-- ---------------------------------------------------------------------------
select pg_temp.login('a0000000-0000-4000-8000-000000000007');
select lives_ok($$select public.set_rider_online(true, 5.2, -1.2)$$, 'approved rider goes online');
select pg_temp.login('a0000000-0000-4000-8000-000000000006');
select public.set_rider_online(true);

select pg_temp.login('a0000000-0000-4000-8000-000000000005');
select throws_ok($$insert into public.trips (kind, customer_id, community_id, pickup_address, dropoff_address,
  customer_phone, offered_fare) values ('ride', 'a0000000-0000-4000-8000-000000000005',
  '30000000-0000-4000-8000-000000000001', 'Market', 'Clinic', '+233240000005', 5)$$,
  '42501', null, 'trips cannot be inserted directly');
select throws_ok($$select public.request_trip('delivery', '30000000-0000-4000-8000-000000000001', 'Shop', 'Home',
  '+233 24 000 0005', 10)$$, '22023', null, 'deliveries need a package description');
select lives_ok($$select public.request_trip('ride', '30000000-0000-4000-8000-000000000001', 'Kwamankese market',
  'Abakrampa Health Centre', '+233 24 000 0005', 15, 'tricycle', 5.20, -1.20, 5.25, -1.18)$$, 'customer requests a ride');
select ok((select distance_km > 0 from public.trips limit 1), 'distance is computed server-side');

select pg_temp.login('a0000000-0000-4000-8000-000000000007');
select is((select count(*)::int from public.open_trip_requests()), 1, 'eligible online rider sees the open request');
select pg_temp.login('a0000000-0000-4000-8000-000000000008');
select is((select count(*)::int from public.open_trip_requests()), 0, 'pending riders see no requests');
select throws_ok($$select public.accept_trip((select id from public.trips limit 1))$$, '22023', null,
  'pending riders cannot accept');

select pg_temp.superuser();
create temp table _trip as select id from public.trips limit 1;
grant select on _trip to authenticated;
select pg_temp.login('a0000000-0000-4000-8000-000000000007');
select lives_ok($$select public.accept_trip((select id from _trip))$$, 'rider accepts the trip');
select pg_temp.login('a0000000-0000-4000-8000-000000000006');
select throws_ok($$select public.accept_trip((select id from _trip))$$, '22023', null, 'first accept wins');
select is((select count(*)::int from public.trips), 0, 'other riders cannot see an assigned trip');

select pg_temp.login('a0000000-0000-4000-8000-000000000005');
select throws_ok($$select public.update_trip_status((select id from _trip), 'completed')$$, '22023', null,
  'customers cannot mark a trip completed');

select pg_temp.login('a0000000-0000-4000-8000-000000000007');
select lives_ok($$select public.update_trip_status((select id from _trip), 'arrived')$$, 'rider arrives');
select lives_ok($$select public.update_trip_status((select id from _trip), 'in_progress')$$, 'trip starts');
select lives_ok($$select public.update_trip_status((select id from _trip), 'completed', null, 18)$$, 'trip completes');

select pg_temp.login('a0000000-0000-4000-8000-000000000005');
select lives_ok($$select public.rate_trip((select id from _trip), 5::smallint, 'Smooth ride')$$, 'customer rates');
select throws_ok($$select public.rate_trip((select id from _trip), 1::smallint)$$, '22023', null, 'trips are rated once');
select pg_temp.superuser();
select ok((select rating_avg = 5 and completed_trips = 1 from public.rider_profiles
           where user_id = 'a0000000-0000-4000-8000-000000000007'), 'rider stats are maintained');

select pg_temp.logout();
select ok(not has_function_privilege('anon', 'public.available_riders(uuid, public.trip_kind, public.vehicle_type)', 'execute'),
  'anon cannot list riders');

-- ---------------------------------------------------------------------------
-- 5. Contact channels and locations
-- ---------------------------------------------------------------------------
select pg_temp.login('a0000000-0000-4000-8000-000000000005');
select throws_ok($$update public.entities set social_links = '{"facebook":"javascript:alert(1)"}'
  where id = 'e0000000-0000-4000-8000-000000000001'$$, '23514', null, 'social links must be https URLs');
select throws_ok($$update public.entities set social_links = '{"myspace":"https://example.com"}'
  where id = 'e0000000-0000-4000-8000-000000000001'$$, '23514', null, 'only known social networks are accepted');
select lives_ok($$update public.entities set whatsapp = '+233 55 000 0001', latitude = 5.2, longitude = -1.2,
  social_links = '{"instagram":"https://instagram.com/freshfarms"}' where id = 'e0000000-0000-4000-8000-000000000001'$$,
  'managers set WhatsApp, socials and a map pin');
select pg_temp.superuser();
insert into public.entity_applications (id, applicant_id, entity_type, proposed_name, sector, community_id, description, contact_phone,
  whatsapp, latitude, longitude) values ('b0000000-0000-4000-8000-0000000000f3', 'a0000000-0000-4000-8000-000000000001', 'business', 'Owner WhatsApp Shop',
  'commerce', '30000000-0000-4000-8000-000000000001', 'Checking that approval copies contact fields.', '+233 24 111 0003',
  '+233 55 111 0003', 5.21, -1.21);
select pg_temp.login('a0000000-0000-4000-8000-000000000001');
select public.fast_track_entity_application('b0000000-0000-4000-8000-0000000000f3');
select pg_temp.superuser();
select ok((select whatsapp = '+233 55 111 0003' and phone = '+233 24 111 0003' and latitude = 5.21
           from public.entities where name = 'Owner WhatsApp Shop'), 'approval keeps WhatsApp separate from phone and copies the pin');

select * from finish();
rollback;
