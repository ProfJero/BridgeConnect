-- =============================================================================
-- BridgeConnect · Engagement release security tests (pgTAP)
-- Reviews, follows, inbox, bookings, polls, support desk, account deletion and
-- the platform-owner bootstrap. Requires the development seed.
--
-- Personas: a…01 owner · a…02 district admin (AAK) · a…03 moderator (AAK)
--           a…05 owner of e…01 (business) · a…06 owner of e…02 (NGO), editor of e…03 (health)
--           a…07 resident (Kwamankese) · a…08 resident (Cape Coast)
-- =============================================================================
begin;
create extension if not exists pgtap with schema extensions;
select plan(73);

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
grant select on all tables in schema extensions to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 1. Reviews
-- ---------------------------------------------------------------------------
select pg_temp.login('a0000000-0000-4000-8000-000000000007');
select lives_ok($$insert into public.entity_reviews (entity_id, rating, title, body)
  values ('e0000000-0000-4000-8000-000000000001', 4, 'Great cassava', 'Fresh produce and friendly service.')$$,
  'resident reviews a verified business');
select is((select rating_count from public.entities where id = 'e0000000-0000-4000-8000-000000000001'), 1,
  'rating count is maintained');
select is((select rating_avg from public.entities where id = 'e0000000-0000-4000-8000-000000000001'), 4.00::numeric,
  'rating average is maintained');
select throws_ok($$insert into public.entity_reviews (entity_id, rating, body)
  values ('e0000000-0000-4000-8000-000000000001', 5, 'Reviewing again to inflate the score')$$,
  '23505', null, 'one review per user per entity');
select throws_ok($$update public.entity_reviews set status = 'published', response = 'fake reply'
  where author_id = 'a0000000-0000-4000-8000-000000000007' and entity_id = 'e0000000-0000-4000-8000-000000000001'$$,
  '42501', null, 'author cannot set status or the entity reply');
select throws_ok($$select public.respond_to_review(
  (select id from public.entity_reviews where author_id = 'a0000000-0000-4000-8000-000000000007'
   and entity_id = 'e0000000-0000-4000-8000-000000000001'), 'Thanks me')$$,
  '42501', null, 'author cannot reply as the entity');

select pg_temp.login('a0000000-0000-4000-8000-000000000005');
select throws_ok($$insert into public.entity_reviews (entity_id, rating, body)
  values ('e0000000-0000-4000-8000-000000000001', 5, 'Best farm in the district!')$$,
  '42501', null, 'owner cannot review their own entity');
select lives_ok($$select public.respond_to_review(
  (select id from public.entity_reviews where entity_id = 'e0000000-0000-4000-8000-000000000001'),
  'Thank you for buying local!')$$, 'entity owner replies to a review');

select pg_temp.login('a0000000-0000-4000-8000-000000000006');
select throws_ok($$select public.respond_to_review(
  (select id from public.entity_reviews where entity_id = 'e0000000-0000-4000-8000-000000000001'), 'Hijack')$$,
  '42501', null, 'another entity cannot reply (cross-entity)');

select pg_temp.login('a0000000-0000-4000-8000-000000000008');
update public.entity_reviews set body = 'Defaced by someone else' where entity_id = 'e0000000-0000-4000-8000-000000000001';
select pg_temp.superuser();
select is((select body from public.entity_reviews where entity_id = 'e0000000-0000-4000-8000-000000000001'),
  'Fresh produce and friendly service.', 'another user cannot edit a review (cross-user)');

insert into public.entity_capability_overrides (entity_id, capability, enabled)
values ('e0000000-0000-4000-8000-000000000002', 'reviews', false);
select pg_temp.login('a0000000-0000-4000-8000-000000000007');
select throws_ok($$insert into public.entity_reviews (entity_id, rating, body)
  values ('e0000000-0000-4000-8000-000000000002', 3, 'Reviews are switched off here')$$,
  '42501', null, 'entities without the reviews capability reject reviews');

select pg_temp.login('a0000000-0000-4000-8000-000000000003');
select lives_ok($$select public.moderate_content('review',
  (select id from public.entity_reviews where entity_id = 'e0000000-0000-4000-8000-000000000001'),
  'hide', 'Off-topic content')$$, 'moderator in scope hides a review');
select is((select rating_count from public.entities where id = 'e0000000-0000-4000-8000-000000000001'), 0,
  'hidden reviews leave the rating');
select pg_temp.logout();
select is((select count(*)::int from public.entity_reviews where entity_id = 'e0000000-0000-4000-8000-000000000001'), 0, 'anon cannot see hidden reviews');

-- ---------------------------------------------------------------------------
-- 2. Follows
-- ---------------------------------------------------------------------------
select pg_temp.login('a0000000-0000-4000-8000-000000000007');
select lives_ok($$insert into public.entity_follows (entity_id) values ('e0000000-0000-4000-8000-000000000001')$$,
  'resident follows an entity');
select is((select follower_count from public.entities where id = 'e0000000-0000-4000-8000-000000000001'), 1,
  'follower count is maintained');
select throws_ok($$insert into public.entity_follows (entity_id, user_id)
  values ('e0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000008')$$,
  '42501', null, 'cannot follow on behalf of someone else');
select pg_temp.login('a0000000-0000-4000-8000-000000000008');
select is((select count(*)::int from public.entity_follows), 0, 'follows are private to the follower');
select pg_temp.login('a0000000-0000-4000-8000-000000000005');
insert into public.posts (entity_id, community_id, body)
values ('e0000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', 'Fresh plantain arrived today');
select pg_temp.superuser();
select is((select count(*)::int from public.notifications
           where recipient_id = 'a0000000-0000-4000-8000-000000000007' and type = 'follow.new_post'), 1,
  'followers are notified of entity posts');

-- ---------------------------------------------------------------------------
-- 3. Inbox
-- ---------------------------------------------------------------------------
select pg_temp.logout();
select throws_ok($$select * from public.conversations$$, '42501', null, 'anon cannot read conversations');
select pg_temp.login('a0000000-0000-4000-8000-000000000007');
select lives_ok($$select public.start_conversation('e0000000-0000-4000-8000-000000000001',
  'Bulk cassava', 'Can you deliver 10 bags on Friday?')$$, 'resident messages a business');
select throws_ok($$insert into public.conversation_messages (conversation_id, sender_side, body)
  values ((select id from public.conversations limit 1), 'entity', 'spoofed')$$,
  '42501', null, 'messages cannot be inserted directly (no spoofing the entity side)');
select throws_ok($$select public.set_conversation_status((select id from public.conversations limit 1), 'blocked')$$,
  '42501', null, 'residents cannot block the entity side');

select pg_temp.login('a0000000-0000-4000-8000-000000000005');
select is((select count(*)::int from public.conversations), 1, 'entity owner sees the conversation');
select is(public.entity_unread_message_count('e0000000-0000-4000-8000-000000000001'), 1, 'entity has 1 unread thread');
select lives_ok($$select public.send_message((select id from public.conversations limit 1), 'Yes, we can.')$$,
  'entity replies');
select throws_ok($$select public.start_conversation('e0000000-0000-4000-8000-000000000001', null, 'Hi me')$$,
  '22023', null, 'members cannot open a conversation with their own entity');

select pg_temp.login('a0000000-0000-4000-8000-000000000006');
select is((select count(*)::int from public.conversations), 0, 'other entities cannot see the thread (cross-entity)');
select is(public.entity_unread_message_count('e0000000-0000-4000-8000-000000000001'), 0,
  'non-members get no unread count for another entity');

select pg_temp.login('a0000000-0000-4000-8000-000000000008');
select is((select count(*)::int from public.conversation_messages), 0, 'other residents cannot read messages');
select pg_temp.superuser();
select pg_temp.login('a0000000-0000-4000-8000-000000000008');
select throws_ok($$select public.send_message(
  (select id from public.conversations where user_id = 'a0000000-0000-4000-8000-000000000007'), 'butting in')$$,
  '42501', null, 'outsiders cannot post into a conversation');

select pg_temp.login('a0000000-0000-4000-8000-000000000007');
select is(public.my_unread_message_count(), 1, 'resident sees the reply as unread');
select lives_ok($$select public.mark_conversation_read((select id from public.conversations limit 1))$$, 'mark read');
select is(public.my_unread_message_count(), 0, 'unread count clears');

select pg_temp.login('a0000000-0000-4000-8000-000000000005');
select lives_ok($$select public.set_conversation_status((select id from public.conversations limit 1), 'blocked')$$,
  'entity owner blocks a contact');
select pg_temp.login('a0000000-0000-4000-8000-000000000007');
select throws_ok($$select public.send_message((select id from public.conversations limit 1), 'hello?')$$,
  '42501', null, 'blocked residents cannot keep messaging');

-- ---------------------------------------------------------------------------
-- 4. Bookings (service of e…03, where a…06 is an editor)
-- ---------------------------------------------------------------------------
select pg_temp.login('a0000000-0000-4000-8000-000000000007');
select lives_ok($$select public.request_booking(
  (select id from public.services where entity_id = 'e0000000-0000-4000-8000-000000000003' limit 1),
  current_date + 2, '10:00', 'For my daughter', '+233 24 555 0000')$$, 'resident requests a booking');
select throws_ok($$select public.request_booking(
  (select id from public.services where entity_id = 'e0000000-0000-4000-8000-000000000003' limit 1),
  current_date - 1)$$, '22023', null, 'bookings in the past are rejected');
select throws_ok($$insert into public.service_bookings (service_id, entity_id, customer_id, requested_date, status)
  values ((select id from public.services limit 1), 'e0000000-0000-4000-8000-000000000003',
          'a0000000-0000-4000-8000-000000000007', current_date + 3, 'confirmed')$$,
  '42501', null, 'bookings cannot be inserted directly');
select throws_ok($$select public.update_booking_status(
  (select id from public.service_bookings limit 1), 'confirmed')$$,
  '22023', null, 'customer cannot confirm their own booking');

select pg_temp.login('a0000000-0000-4000-8000-000000000008');
select is((select count(*)::int from public.service_bookings), 0, 'other residents cannot see bookings');
select pg_temp.login('a0000000-0000-4000-8000-000000000005');
select is((select count(*)::int from public.service_bookings), 0, 'other entities cannot see bookings');
select throws_ok($$select public.update_booking_status(
  (select id from public.service_bookings where customer_id = 'a0000000-0000-4000-8000-000000000007' limit 1),
  'declined')$$, 'P0002', null, 'other entities cannot change bookings (not visible / not found)');

select pg_temp.login('a0000000-0000-4000-8000-000000000006');
select is((select count(*)::int from public.service_bookings), 1, 'entity editor sees the booking');
select lives_ok($$select public.update_booking_status((select id from public.service_bookings limit 1),
  'confirmed', 'See you at 10am')$$, 'entity editor confirms');
select throws_ok($$select public.request_booking(
  (select id from public.services where entity_id = 'e0000000-0000-4000-8000-000000000003' limit 1),
  current_date + 2)$$, '22023', null, 'members cannot book their own service');
select lives_ok($$select public.update_booking_status((select id from public.service_bookings limit 1), 'completed')$$,
  'entity editor completes');
select pg_temp.login('a0000000-0000-4000-8000-000000000007');
select throws_ok($$select public.update_booking_status((select id from public.service_bookings limit 1), 'cancelled')$$,
  '22023', null, 'completed bookings cannot be cancelled');
select pg_temp.superuser();
select is((select count(*)::int from public.notifications
           where recipient_id = 'a0000000-0000-4000-8000-000000000007' and type like 'booking.%'), 2,
  'customer is notified of confirmation and completion');

-- ---------------------------------------------------------------------------
-- 5. Polls
-- ---------------------------------------------------------------------------
insert into public.posts (id, author_id, community_id, kind, title, body) values
  ('c0000000-0000-4000-8000-0000000000dd', 'a0000000-0000-4000-8000-000000000007',
   '30000000-0000-4000-8000-000000000001', 'poll', 'Market day', 'Which day should the market open?');
select pg_temp.login('a0000000-0000-4000-8000-000000000007');
select lives_ok($$insert into public.poll_options (post_id, label, position) values
  ('c0000000-0000-4000-8000-0000000000dd', 'Saturday', 0),
  ('c0000000-0000-4000-8000-0000000000dd', 'Sunday', 1)$$, 'author adds poll options');
select pg_temp.login('a0000000-0000-4000-8000-000000000008');
select throws_ok($$insert into public.poll_options (post_id, label, position)
  values ('c0000000-0000-4000-8000-0000000000dd', 'Rigged', 2)$$,
  '42501', null, 'others cannot add options to a poll');
select lives_ok($$insert into public.poll_votes (post_id, option_id) values ('c0000000-0000-4000-8000-0000000000dd',
  (select id from public.poll_options where post_id = 'c0000000-0000-4000-8000-0000000000dd' and position = 0))$$,
  'resident votes');
select is((select vote_count from public.poll_options
           where post_id = 'c0000000-0000-4000-8000-0000000000dd' and position = 0), 1, 'vote is counted');
select throws_ok($$insert into public.poll_votes (post_id, option_id) values ('c0000000-0000-4000-8000-0000000000dd',
  (select id from public.poll_options where post_id = 'c0000000-0000-4000-8000-0000000000dd' and position = 1))$$,
  '23505', null, 'one vote per user');
select throws_ok($$insert into public.poll_votes (post_id, option_id, user_id) values
  ('c0000000-0000-4000-8000-0000000000dd',
   (select id from public.poll_options where post_id = 'c0000000-0000-4000-8000-0000000000dd' and position = 1),
   'a0000000-0000-4000-8000-000000000006')$$, '42501', null, 'cannot vote on behalf of others');
select throws_ok($$insert into public.poll_votes (post_id, option_id) values ((select id from public.posts where kind = 'general' and status = 'published' limit 1),
  (select id from public.poll_options where post_id = 'c0000000-0000-4000-8000-0000000000dd' and position = 1))$$,
  null, null, 'votes on a non-poll post are rejected');
select pg_temp.login('a0000000-0000-4000-8000-000000000007');
select throws_ok($$insert into public.poll_options (post_id, label, position)
  values ('c0000000-0000-4000-8000-0000000000dd', 'Late option', 2)$$,
  '22023', null, 'options are frozen once voting starts');

-- ---------------------------------------------------------------------------
-- 6. Support desk
-- ---------------------------------------------------------------------------
select lives_ok($$select public.create_support_ticket('account', 'Cannot change my phone',
  'I need help updating the phone number on my profile.')$$, 'resident opens a ticket');
select throws_ok($$select public.create_support_ticket('account', 'For a business',
  'Opening a ticket for an entity I do not belong to.', 'e0000000-0000-4000-8000-000000000001')$$,
  '42501', null, 'cannot open tickets on behalf of an unrelated entity');
select throws_ok($$select public.update_support_ticket((select id from public.support_tickets limit 1),
  null, 'urgent')$$, '42501', null, 'requester cannot change priority');

select pg_temp.login('a0000000-0000-4000-8000-000000000008');
select is((select count(*)::int from public.support_tickets), 0, 'other residents cannot see tickets');
select throws_ok($$select public.reply_support_ticket(
  (select id from public.support_tickets where requester_id = 'a0000000-0000-4000-8000-000000000007'), 'hi')$$,
  'P0002', null, 'other residents cannot reply to tickets');

select pg_temp.login('a0000000-0000-4000-8000-000000000002');
select is((select count(*)::int from public.support_tickets), 0, 'district admins without support.manage see none');

select pg_temp.login('a0000000-0000-4000-8000-000000000001');
select lives_ok($$select public.reply_support_ticket((select id from public.support_tickets limit 1),
  'You can change it under Profile → Edit.')$$, 'support staff reply');
select is((select status::text from public.support_tickets limit 1), 'pending', 'staff reply sets pending');

-- ---------------------------------------------------------------------------
-- 7. Account deletion
-- ---------------------------------------------------------------------------
select pg_temp.login('a0000000-0000-4000-8000-000000000005');
select throws_ok($$select public.delete_my_account('DELETE')$$, '23514', null,
  'sole owners must transfer ownership first');
select throws_ok($$select public.delete_my_account('yes')$$, '22023', null, 'deletion requires typed confirmation');
select pg_temp.logout();
select ok(not has_function_privilege('anon', 'public.delete_my_account(text)', 'execute'),
  'anon cannot call delete_my_account');

-- ---------------------------------------------------------------------------
-- 8. Platform-owner bootstrap
-- ---------------------------------------------------------------------------
select pg_temp.login('a0000000-0000-4000-8000-000000000007');
select throws_ok($$select * from private.owner_bootstrap$$, '42501', null, 'API roles cannot read the bootstrap list');
select pg_temp.superuser();
insert into private.owner_bootstrap (email) values ('capecoast@demo.bridgeconnect.test');
update auth.users set email_confirmed_at = null where id = 'a0000000-0000-4000-8000-000000000008';
select ok(not exists (select 1 from public.user_role_assignments a join public.roles r on r.id = a.role_id
                      where a.user_id = 'a0000000-0000-4000-8000-000000000008' and r.key = 'platform_owner'),
  'unconfirmed email is not granted owner');
update auth.users set email_confirmed_at = now() where id = 'a0000000-0000-4000-8000-000000000008';
select ok(exists (select 1 from public.user_role_assignments a join public.roles r on r.id = a.role_id
                  where a.user_id = 'a0000000-0000-4000-8000-000000000008' and r.key = 'platform_owner')
          and not exists (select 1 from private.owner_bootstrap),
  'confirmed email is granted owner once and the entry is consumed');

-- ---------------------------------------------------------------------------
-- 9. Public feature flags
-- ---------------------------------------------------------------------------
select pg_temp.logout();
select ok((select messages and reviews from public.entity_public_features('e0000000-0000-4000-8000-000000000001')),
  'anon sees engagement flags of an active entity');
select pg_temp.superuser();
update public.entities set status = 'suspended' where id = 'e0000000-0000-4000-8000-000000000004';
select pg_temp.logout();
select is((select count(*)::int from public.entity_public_features('e0000000-0000-4000-8000-000000000004')), 0,
  'suspended entities reveal nothing');

select * from finish();
rollback;
