-- =============================================================================
-- BridgeConnect · Initial PRODUCTION reference data (idempotent)
-- -----------------------------------------------------------------------------
-- Launch area: Central Region → Abura-Asebu-Kwamankese (AAK) District, plus the
-- regional capital. Administrators add further regions, districts and
-- communities from /admin/locations. Safe to run more than once.
-- Sources: aakda.gov.gh (district capital: Abura-Dunkwa), Wikipedia settlement
-- list for the district.
-- =============================================================================
insert into public.regions (name, slug) values ('Central Region', 'central-region')
on conflict (slug) do nothing;

insert into public.districts (region_id, name, slug)
select r.id, d.name, d.slug
from public.regions r,
  (values ('Abura-Asebu-Kwamankese District', 'abura-asebu-kwamankese'),
          ('Cape Coast Metropolitan', 'cape-coast-metropolitan')) as d(name, slug)
where r.slug = 'central-region'
on conflict (slug) do nothing;

insert into public.communities (district_id, name, slug, description)
select d.id, c.name, c.slug, c.description
from public.districts d,
  (values
    ('Abura-Dunkwa', 'abura-dunkwa', 'District capital of Abura-Asebu-Kwamankese.'),
    ('Kwamankese', 'kwamankese', 'Farming and trading community; seat of the Kwamankese paramountcy.'),
    ('Abakrampa', 'abakrampa', 'Traditional capital; seat of the Omanhene of Abura.'),
    ('Asebu', 'asebu', 'Historic Fante community; seat of the Asebu paramountcy.'),
    ('Aboenu', 'aboenu', null),
    ('Akonoma', 'akonoma', null),
    ('Amosima', 'amosima', null),
    ('Asebu Ekroful', 'asebu-ekroful', null),
    ('Asuansi', 'asuansi', null),
    ('Gyabankrom', 'gyabankrom', null)
  ) as c(name, slug, description)
where d.slug = 'abura-asebu-kwamankese'
on conflict (slug) do nothing;

insert into public.communities (district_id, name, slug, description)
select d.id, 'Cape Coast', 'cape-coast', 'Regional capital of the Central Region.'
from public.districts d where d.slug = 'cape-coast-metropolitan'
on conflict (slug) do nothing;

-- National emergency numbers (Ghana).
insert into public.emergency_contacts (name, service, phone, sort_order)
select v.name, v.service::public.emergency_service, v.phone, v.sort_order
from (values
  ('National Emergency', 'other', '112', 0),
  ('Ghana Police Service', 'police', '191', 1),
  ('Ghana National Fire Service', 'fire', '192', 2),
  ('National Ambulance Service', 'ambulance', '193', 3)
) as v(name, service, phone, sort_order)
where not exists (
  select 1 from public.emergency_contacts e
  where e.phone = v.phone and e.region_id is null and e.district_id is null and e.community_id is null
);
