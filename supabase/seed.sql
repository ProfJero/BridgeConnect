-- =============================================================================
-- BridgeConnect · Development seed data
-- -----------------------------------------------------------------------------
-- Runs automatically after migrations on `supabase db reset` (local only).
--
-- * Locations: Central Region → Abura-Asebu-Kwamankese District → Kwamankese
--   (plus neighbours for cross-community / cross-district testing).
-- * DEMO ACCOUNTS: every account below has `is_demo = true`, an email on the
--   reserved `.test` TLD and the shared development password. They must NEVER
--   exist in production — run supabase/scripts/remove_demo_data.sql first.
--
-- Demo password (local development only): BridgeDemo#2026
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Locations
-- ---------------------------------------------------------------------------
insert into public.regions (id, name, slug) values
  ('10000000-0000-4000-8000-000000000001', 'Central Region', 'central-region');

insert into public.districts (id, region_id, name, slug) values
  ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001',
   'Abura-Asebu-Kwamankese District', 'abura-asebu-kwamankese'),
  ('20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001',
   'Cape Coast Metropolitan', 'cape-coast-metropolitan');

insert into public.communities (id, district_id, name, slug, description) values
  ('30000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001',
   'Kwamankese', 'kwamankese', 'Farming and trading community in the Abura-Asebu-Kwamankese District.'),
  ('30000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000001',
   'Abakrampa', 'abakrampa', 'District capital of Abura-Asebu-Kwamankese.'),
  ('30000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-000000000001',
   'Asebu', 'asebu', 'Historic Fante community.'),
  ('30000000-0000-4000-8000-000000000004', '20000000-0000-4000-8000-000000000002',
   'Cape Coast', 'cape-coast', 'Regional capital of the Central Region.');

-- ---------------------------------------------------------------------------
-- Demo accounts
-- ---------------------------------------------------------------------------
create temporary table demo_users (id uuid, email text, display_name text, home uuid) on commit drop;
insert into demo_users values
  ('a0000000-0000-4000-8000-000000000001', 'owner@demo.bridgeconnect.test',      'Ama Owusu (Platform Owner)',  '30000000-0000-4000-8000-000000000001'),
  ('a0000000-0000-4000-8000-000000000002', 'district.admin@demo.bridgeconnect.test', 'Kofi Mensah (District Admin)', '30000000-0000-4000-8000-000000000002'),
  ('a0000000-0000-4000-8000-000000000003', 'moderator@demo.bridgeconnect.test',  'Efua Asante (Moderator)',     '30000000-0000-4000-8000-000000000001'),
  ('a0000000-0000-4000-8000-000000000004', 'verifier@demo.bridgeconnect.test',   'Yaw Boateng (Verifier)',      '30000000-0000-4000-8000-000000000003'),
  ('a0000000-0000-4000-8000-000000000005', 'business@demo.bridgeconnect.test',   'Akosua Darko',                '30000000-0000-4000-8000-000000000001'),
  ('a0000000-0000-4000-8000-000000000006', 'ngo@demo.bridgeconnect.test',        'Kwesi Appiah',                '30000000-0000-4000-8000-000000000001'),
  ('a0000000-0000-4000-8000-000000000007', 'resident@demo.bridgeconnect.test',   'Abena Quaye',                 '30000000-0000-4000-8000-000000000001'),
  ('a0000000-0000-4000-8000-000000000008', 'capecoast@demo.bridgeconnect.test',  'Nana Yeboah',                 '30000000-0000-4000-8000-000000000004');

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, email_change, email_change_token_new, recovery_token)
select '00000000-0000-0000-0000-000000000000', d.id, 'authenticated', 'authenticated', d.email,
  extensions.crypt('BridgeDemo#2026', extensions.gen_salt('bf')), now(),
  jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email'), 'is_demo', true),
  jsonb_build_object('display_name', d.display_name), now(), now(), '', '', '', ''
from demo_users d;

insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
select gen_random_uuid(), d.id, d.id::text,
  jsonb_build_object('sub', d.id::text, 'email', d.email, 'email_verified', true),
  'email', now(), now(), now()
from demo_users d;

update public.profiles p set home_community_id = d.home
from demo_users d where p.id = d.id;

-- Role assignments (scoped).
insert into public.user_role_assignments (user_id, role_id, district_id)
select 'a0000000-0000-4000-8000-000000000002', id, '20000000-0000-4000-8000-000000000001'
from public.roles where key = 'district_admin';
insert into public.user_role_assignments (user_id, role_id, district_id)
select 'a0000000-0000-4000-8000-000000000003', id, '20000000-0000-4000-8000-000000000001'
from public.roles where key = 'moderator';
insert into public.user_role_assignments (user_id, role_id, district_id)
select 'a0000000-0000-4000-8000-000000000004', id, '20000000-0000-4000-8000-000000000001'
from public.roles where key = 'verification_officer';
insert into public.user_role_assignments (user_id, role_id)
select 'a0000000-0000-4000-8000-000000000001', id from public.roles where key = 'platform_owner';

-- ---------------------------------------------------------------------------
-- Demo verified entities (seeded directly; in real use they come only from
-- approved applications).
-- ---------------------------------------------------------------------------
insert into public.entities (id, entity_type, name, slug, tagline, description, sector, community_id,
  address, phone, email, verified_by) values
  ('e0000000-0000-4000-8000-000000000001', 'business', 'Kwamankese Fresh Farms', 'kwamankese-fresh-farms',
   'Fresh cassava, plantain and vegetables from local farms',
   'A family-run farm supplying fresh produce to Kwamankese and the wider district since 2012.',
   'agriculture', '30000000-0000-4000-8000-000000000001', 'Main Road, Kwamankese',
   '+233 24 000 0001', 'hello@freshfarms.example', 'a0000000-0000-4000-8000-000000000004'),
  ('e0000000-0000-4000-8000-000000000002', 'ngo', 'Bridge Youth Foundation', 'bridge-youth-foundation',
   'Skills and digital literacy for young people',
   'A community NGO offering digital-skills training, mentorship and scholarships.',
   'civil_society', '30000000-0000-4000-8000-000000000001', 'Community Centre, Kwamankese',
   '+233 24 000 0002', 'info@bridgeyouth.example', 'a0000000-0000-4000-8000-000000000004'),
  ('e0000000-0000-4000-8000-000000000003', 'health_facility', 'Abakrampa Health Centre', 'abakrampa-health-centre',
   'Primary healthcare for the district',
   'Outpatient services, maternal health, immunisation and health education.',
   'health', '30000000-0000-4000-8000-000000000002', 'Hospital Road, Abakrampa',
   '+233 24 000 0003', null, 'a0000000-0000-4000-8000-000000000004'),
  ('e0000000-0000-4000-8000-000000000004', 'school', 'Asebu Community School', 'asebu-community-school',
   'Basic and JHS education', 'A public basic school serving Asebu and surrounding villages.',
   'education', '30000000-0000-4000-8000-000000000003', 'Asebu', '+233 24 000 0004', null,
   'a0000000-0000-4000-8000-000000000004');

insert into public.business_profiles (entity_id, year_established, delivery_available, accepts_mobile_money)
values ('e0000000-0000-4000-8000-000000000001', 2012, true, true);
insert into public.organisation_profiles (entity_id, mission, year_established) values
  ('e0000000-0000-4000-8000-000000000002', 'Equip every young person in our district with digital skills.', 2019),
  ('e0000000-0000-4000-8000-000000000003', 'Accessible, quality primary healthcare.', 1998),
  ('e0000000-0000-4000-8000-000000000004', 'Quality basic education for every child.', 1975);

insert into public.entity_memberships (entity_id, user_id, role) values
  ('e0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000005', 'owner'),
  ('e0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000006', 'owner'),
  ('e0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000006', 'editor');

-- Pending application in the verification queue.
insert into public.entity_applications (applicant_id, entity_type, proposed_name, sector, community_id,
  description, address, contact_phone, contact_email, registration_number, applicant_position)
values ('a0000000-0000-4000-8000-000000000007', 'business', 'Abena''s Tailoring', 'artisan',
  '30000000-0000-4000-8000-000000000001',
  'Custom tailoring, school uniforms and kente alterations for the Kwamankese community.',
  'Market Square, Kwamankese', '+233 24 000 0007', null, 'BN-DEMO-0007', 'Owner');

-- Listings
insert into public.products (entity_id, category_id, name, description, price, unit, stock_quantity, status, created_by)
select 'e0000000-0000-4000-8000-000000000001', c.id, v.name, v.description, v.price, v.unit, v.stock, 'active',
  'a0000000-0000-4000-8000-000000000005'
from (values
  ('Fresh Cassava', 'Freshly harvested cassava tubers.', 25.00, 'per bag', 40),
  ('Plantain Bunch', 'Ripe and unripe plantain available.', 35.00, 'per bunch', 25),
  ('Garden Eggs', 'Locally grown garden eggs.', 15.00, 'per basket', null)
) as v(name, description, price, unit, stock)
join public.listing_categories c on c.domain = 'product' and c.slug = 'farm-produce';

insert into public.services (entity_id, category_id, name, description, price_from, price_note, service_area, status, created_by)
select 'e0000000-0000-4000-8000-000000000003', c.id, 'Child Immunisation',
  'Routine childhood immunisations every Tuesday and Thursday.', null, 'Free', 'Abura-Asebu-Kwamankese', 'active',
  'a0000000-0000-4000-8000-000000000006'
from public.listing_categories c where c.domain = 'service' and c.slug = 'health';

insert into public.jobs (entity_id, category_id, title, description, employment_type, salary_min, salary_max,
  salary_period, application_deadline, status, created_by)
select 'e0000000-0000-4000-8000-000000000002', c.id, 'Digital Skills Trainer',
  'Lead weekend digital literacy classes for young people aged 15–25. Experience with computers and teaching required.',
  'part_time', 800, 1200, 'month', current_date + 30, 'open', 'a0000000-0000-4000-8000-000000000006'
from public.listing_categories c where c.domain = 'job' and c.slug = 'education';

insert into public.events (entity_id, category_id, title, description, venue, starts_at, ends_at, capacity, status, created_by)
select 'e0000000-0000-4000-8000-000000000002', c.id, 'Youth Coding Bootcamp',
  'A free one-day introduction to coding for young people. Laptops provided.',
  'Kwamankese Community Centre', date_trunc('day', now()) + interval '10 days 9 hours',
  date_trunc('day', now()) + interval '10 days 16 hours', 40, 'published',
  'a0000000-0000-4000-8000-000000000006'
from public.listing_categories c where c.domain = 'event' and c.slug = 'education';

insert into public.posts (author_id, community_id, kind, title, body) values
  ('a0000000-0000-4000-8000-000000000007', '30000000-0000-4000-8000-000000000001', 'question',
   'Borehole repair', 'Does anyone know when the borehole near the market will be repaired?'),
  ('a0000000-0000-4000-8000-000000000008', '30000000-0000-4000-8000-000000000004', 'recommendation',
   null, 'Great service at the Cape Coast library this week — highly recommend the new reading room.');
insert into public.posts (author_id, entity_id, community_id, kind, title, body) values
  ('a0000000-0000-4000-8000-000000000006', 'e0000000-0000-4000-8000-000000000002',
   '30000000-0000-4000-8000-000000000001', 'announcement', 'Scholarship applications open',
   'Applications for the 2027 Bridge Youth scholarship are now open. Visit our profile for details.');

-- Emergency contacts (national numbers are real Ghana emergency lines).
insert into public.emergency_contacts (name, service, phone, sort_order) values
  ('National Emergency', 'other', '112', 0),
  ('Ghana Police Service', 'police', '191', 1),
  ('Ghana National Fire Service', 'fire', '192', 2),
  ('National Ambulance Service', 'ambulance', '193', 3);
insert into public.emergency_contacts (name, service, phone, district_id, sort_order) values
  ('Abakrampa Health Centre', 'hospital', '+233 24 000 0003', '20000000-0000-4000-8000-000000000001', 10),
  ('NADMO District Office (demo)', 'disaster_management', '+233 24 000 0010', '20000000-0000-4000-8000-000000000001', 11);

insert into public.emergency_alerts (title, body, instructions, severity, category, district_id, issued_by) values
  ('Heavy rainfall expected this weekend',
   'The district assembly advises residents to prepare for heavy rainfall and possible flooding in low-lying areas.',
   'Clear gutters, avoid crossing flooded roads and keep emergency numbers at hand.',
   'advisory', 'weather', '20000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000002');
