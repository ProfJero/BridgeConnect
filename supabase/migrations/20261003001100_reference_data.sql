-- =============================================================================
-- BridgeConnect · 0011 · Reference data (required in every environment)
-- Permissions, system roles, capability defaults and listing categories.
-- Location data and demo accounts are NOT here — see supabase/seed.sql.
-- =============================================================================

insert into public.permissions (key, category, description) values
  ('admin.access',            'Administration', 'Open the DBI administration console'),
  ('users.read',              'Users',          'View user accounts in scope'),
  ('users.manage',            'Users',          'Suspend and reinstate user accounts in scope'),
  ('roles.read',              'Roles',          'View roles, permissions and assignments'),
  ('roles.assign',            'Roles',          'Assign and revoke roles in scope (never beyond own permissions)'),
  ('roles.manage',            'Roles',          'Create and edit custom roles'),
  ('locations.manage',        'Locations',      'Manage regions, districts and communities in scope'),
  ('entities.read_all',       'Entities',       'View all entities in scope, including suspended ones'),
  ('entities.verify',         'Entities',       'Review and decide entity applications in scope'),
  ('entities.manage',         'Entities',       'Suspend entities and change their capabilities in scope'),
  ('content.moderate',        'Trust & Safety', 'Moderate posts and comments and handle reports in scope'),
  ('reports.read',            'Trust & Safety', 'View user reports in scope'),
  ('marketplace.manage',      'Marketplace',    'Moderate products and services, manage categories'),
  ('orders.read_all',         'Marketplace',    'View marketplace orders in scope'),
  ('jobs.manage',             'Jobs',           'Moderate job listings in scope'),
  ('events.manage',           'Events',         'Moderate events in scope'),
  ('ads.review',              'Advertising',    'Review advertisements in scope'),
  ('emergency.publish',       'Emergency',      'Issue emergency alerts and manage emergency contacts in scope'),
  ('analytics.read',          'Analytics',      'View platform analytics in scope'),
  ('notifications.broadcast', 'Notifications',  'Send broadcast notifications in scope'),
  ('audit.read',              'Audit',          'Read audit logs in scope'),
  ('settings.manage',         'Settings',       'Change platform settings'),
  ('platform.owner',          'Administration', 'Platform owner (reserved)')
on conflict (key) do update set category = excluded.category, description = excluded.description;

insert into public.roles (key, name, description, scope_level, is_system) values
  ('platform_owner', 'Platform Owner', 'Digital Bridge Initiative leadership. Full control.', 'platform', true),
  ('platform_admin', 'Platform Administrator', 'Operates the platform nationally.', 'platform', true),
  ('regional_admin', 'Regional Administrator', 'Administers one region.', 'region', true),
  ('district_admin', 'District Administrator', 'Administers one district.', 'district', true),
  ('verification_officer', 'Verification Officer', 'Reviews business and organisation applications.', 'district', true),
  ('moderator', 'Community Moderator', 'Moderates community content and reports.', 'district', true),
  ('emergency_coordinator', 'Emergency Coordinator', 'Publishes emergency alerts and contacts.', 'district', true)
on conflict (key) do update set name = excluded.name, description = excluded.description,
  scope_level = excluded.scope_level, is_system = true;

with grants(role_key, perms) as (values
  ('platform_owner', (select array_agg(key) from public.permissions)),
  ('platform_admin', (select array_agg(key) from public.permissions
                      where key not in ('platform.owner', 'roles.manage'))),
  ('regional_admin', array[
    'admin.access', 'users.read', 'users.manage', 'roles.read', 'roles.assign', 'locations.manage',
    'entities.read_all', 'entities.verify', 'entities.manage', 'content.moderate', 'reports.read',
    'marketplace.manage', 'orders.read_all', 'jobs.manage', 'events.manage', 'ads.review',
    'emergency.publish', 'analytics.read', 'notifications.broadcast', 'audit.read']),
  ('district_admin', array[
    'admin.access', 'users.read', 'users.manage', 'roles.read', 'roles.assign', 'locations.manage',
    'entities.read_all', 'entities.verify', 'entities.manage', 'content.moderate', 'reports.read',
    'marketplace.manage', 'orders.read_all', 'jobs.manage', 'events.manage', 'ads.review',
    'emergency.publish', 'analytics.read', 'notifications.broadcast', 'audit.read']),
  ('verification_officer', array['admin.access', 'users.read', 'entities.read_all', 'entities.verify']),
  ('moderator', array['admin.access', 'users.read', 'content.moderate', 'reports.read',
                      'jobs.manage', 'events.manage']),
  ('emergency_coordinator', array['admin.access', 'emergency.publish'])
)
insert into public.role_permissions (role_id, permission_key)
select r.id, unnest(g.perms)
from grants g join public.roles r on r.key = g.role_key
on conflict do nothing;

-- Capability defaults per entity type. Not every entity gets every module.
insert into public.entity_type_capabilities (entity_type, capability)
select t::public.entity_type, c::public.entity_capability
from (values
  ('business',           array['posts','products','services','jobs','events','media','members','analytics','advertising','orders']),
  ('cooperative',        array['posts','products','services','jobs','events','media','members','analytics','advertising','orders']),
  ('ngo',                array['posts','services','jobs','events','media','members','analytics','advertising']),
  ('school',             array['posts','services','jobs','events','media','members','analytics']),
  ('health_facility',    array['posts','services','jobs','events','media','members','analytics','emergency_alerts']),
  ('government_agency',  array['posts','services','jobs','events','media','members','analytics','emergency_alerts']),
  ('faith_organisation', array['posts','events','media','members']),
  ('community_group',    array['posts','events','media','members'])
) as d(t, caps), unnest(d.caps) as c
on conflict do nothing;

insert into public.listing_categories (domain, name, slug, sector, sort_order) values
  ('product', 'Food & Groceries', 'food-groceries', 'commerce', 1),
  ('product', 'Farm Produce', 'farm-produce', 'agriculture', 2),
  ('product', 'Farm Inputs & Tools', 'farm-inputs', 'agriculture', 3),
  ('product', 'Clothing & Fabrics', 'clothing-fabrics', 'commerce', 4),
  ('product', 'Electronics & Phones', 'electronics', 'technology', 5),
  ('product', 'Home & Household', 'home-household', 'commerce', 6),
  ('product', 'Health & Beauty', 'health-beauty', 'health', 7),
  ('product', 'Crafts & Artisan Goods', 'crafts', 'artisan', 8),
  ('product', 'Books & Stationery', 'books-stationery', 'education', 9),
  ('product', 'Other', 'other', 'other', 99),
  ('service', 'Repairs & Maintenance', 'repairs', 'artisan', 1),
  ('service', 'Health & Clinical', 'health', 'health', 2),
  ('service', 'Education & Training', 'education', 'education', 3),
  ('service', 'Agricultural Services', 'agriculture', 'agriculture', 4),
  ('service', 'Transport & Delivery', 'transport', 'transport', 5),
  ('service', 'Financial & Mobile Money', 'financial', 'finance', 6),
  ('service', 'Beauty & Personal Care', 'beauty', 'hospitality', 7),
  ('service', 'Events & Catering', 'events-catering', 'hospitality', 8),
  ('service', 'Public & Civic Services', 'public-services', 'government', 9),
  ('service', 'Other', 'other', 'other', 99),
  ('job', 'Agriculture', 'agriculture', 'agriculture', 1),
  ('job', 'Education', 'education', 'education', 2),
  ('job', 'Health', 'health', 'health', 3),
  ('job', 'Retail & Sales', 'retail', 'commerce', 4),
  ('job', 'Skilled Trades', 'trades', 'artisan', 5),
  ('job', 'Administration', 'administration', 'other', 6),
  ('job', 'Technology', 'technology', 'technology', 7),
  ('job', 'Other', 'other', 'other', 99),
  ('event', 'Community', 'community', 'civil_society', 1),
  ('event', 'Health Outreach', 'health', 'health', 2),
  ('event', 'Education & Training', 'education', 'education', 3),
  ('event', 'Agriculture', 'agriculture', 'agriculture', 4),
  ('event', 'Business & Markets', 'business', 'commerce', 5),
  ('event', 'Faith', 'faith', 'faith', 6),
  ('event', 'Government & Civic', 'civic', 'government', 7),
  ('event', 'Other', 'other', 'other', 99)
on conflict (domain, slug) do nothing;
