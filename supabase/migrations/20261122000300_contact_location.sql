-- =============================================================================
-- BridgeConnect · 0020 · Contact channels, social links and map locations
-- -----------------------------------------------------------------------------
-- * WhatsApp is its own number (never assumed to be the phone), collected at
--   registration together with website and social profiles.
-- * Organisations and rentals can pin a map location so "Directions" goes to the
--   exact spot. Coordinates are public for these listings by the owner's choice.
-- * Approval copies the new fields onto the entity.
-- =============================================================================

-- Allowed social networks; values must be https links of reasonable length.
create or replace function private.valid_social_links(p jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select jsonb_typeof(p) = 'object'
    and not exists (
      select 1 from jsonb_each(p) as e(k, v)
      where e.k not in ('facebook', 'instagram', 'tiktok', 'x', 'linkedin', 'youtube')
         or jsonb_typeof(e.v) <> 'string'
         or char_length(e.v #>> '{}') > 300
         or (e.v #>> '{}') !~* '^https://[^\s]+$'
    );
$$;

alter table public.entities
  add column social_links jsonb not null default '{}'::jsonb check (private.valid_social_links(social_links)),
  add column latitude numeric(8, 5) check (latitude between -90 and 90),
  add column longitude numeric(8, 5) check (longitude between -180 and 180),
  add constraint entities_location_pair check ((latitude is null) = (longitude is null));
grant update (social_links, latitude, longitude) on public.entities to authenticated;

alter table public.entity_applications
  add column whatsapp text check (whatsapp ~ '^\+?[0-9 ]{7,20}$'),
  add column website text check (website ~* '^https://' and char_length(website) <= 300),
  add column social_links jsonb not null default '{}'::jsonb check (private.valid_social_links(social_links)),
  add column latitude numeric(8, 5) check (latitude between -90 and 90),
  add column longitude numeric(8, 5) check (longitude between -180 and 180),
  add constraint entity_applications_location_pair check ((latitude is null) = (longitude is null));
grant insert (whatsapp, website, social_links, latitude, longitude) on public.entity_applications to authenticated;
grant update (whatsapp, website, social_links, latitude, longitude) on public.entity_applications to authenticated;

alter table public.rental_listings
  add column latitude numeric(8, 5) check (latitude between -90 and 90),
  add column longitude numeric(8, 5) check (longitude between -180 and 180),
  add constraint rental_listings_location_pair check ((latitude is null) = (longitude is null));
grant insert (latitude, longitude), update (latitude, longitude) on public.rental_listings to authenticated;

-- Approval and the owner fast track copy the new contact fields.
create or replace function public.review_entity_application(
  p_application uuid,
  p_action text,
  p_note text default null,
  p_internal boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  app public.entity_applications%rowtype;
  reviewer uuid := (select auth.uid());
  new_entity uuid;
begin
  select * into app from public.entity_applications where id = p_application for update;
  if not found then
    raise exception 'Application not found' using errcode = 'P0002';
  end if;
  if not private.has_permission('entities.verify', app.community_id) then
    raise exception 'Not permitted to review applications in this community' using errcode = '42501';
  end if;
  if app.applicant_id = reviewer then
    raise exception 'You cannot review your own application' using errcode = '42501';
  end if;

  if p_action = 'note' then
    insert into public.application_events (application_id, actor_id, event, note, is_internal)
    values (p_application, reviewer, 'note', left(p_note, 2000), coalesce(p_internal, true));
    return null;
  end if;

  if app.status not in ('submitted', 'under_review', 'info_requested') then
    raise exception 'Application has already been decided' using errcode = '22023';
  end if;

  if p_action = 'start_review' then
    if app.status <> 'submitted' then
      raise exception 'Only submitted applications can enter review' using errcode = '22023';
    end if;
    update public.entity_applications set status = 'under_review', reviewer_id = reviewer
    where id = p_application;
    insert into public.application_events (application_id, actor_id, event)
    values (p_application, reviewer, 'review_started');
    perform private.notify(app.applicant_id, 'verification.review_started',
      'Your application is being reviewed', app.proposed_name, '/apply/' || app.id::text);

  elsif p_action = 'request_info' then
    if char_length(coalesce(trim(p_note), '')) < 10 then
      raise exception 'Explain what information is needed' using errcode = '22023';
    end if;
    update public.entity_applications set status = 'info_requested', reviewer_id = reviewer
    where id = p_application;
    insert into public.application_events (application_id, actor_id, event, note)
    values (p_application, reviewer, 'info_requested', left(p_note, 2000));
    perform private.notify(app.applicant_id, 'verification.info_requested',
      'More information needed for ' || app.proposed_name, left(p_note, 300),
      '/apply/' || app.id::text);

  elsif p_action = 'reject' then
    if char_length(coalesce(trim(p_note), '')) < 10 then
      raise exception 'A rejection reason is required' using errcode = '22023';
    end if;
    update public.entity_applications
    set status = 'rejected', reviewer_id = reviewer, decision_reason = left(p_note, 2000), decided_at = now()
    where id = p_application;
    insert into public.application_events (application_id, actor_id, event, note)
    values (p_application, reviewer, 'rejected', left(p_note, 2000));
    perform private.notify(app.applicant_id, 'verification.rejected',
      'Application not approved: ' || app.proposed_name, left(p_note, 300),
      '/apply/' || app.id::text);

  elsif p_action = 'approve' then
    if app.status <> 'under_review' then
      raise exception 'Applications must be under review before approval' using errcode = '22023';
    end if;
    insert into public.entities (
      entity_type, name, slug, description, sector, community_id, address,
      phone, email, whatsapp, website, social_links, latitude, longitude, verified_by)
    values (
      app.entity_type, app.proposed_name,
      private.unique_slug('public.entities', app.proposed_name),
      app.description, app.sector, app.community_id, app.address,
      app.contact_phone, app.contact_email, app.whatsapp, app.website, app.social_links,
      app.latitude, app.longitude, reviewer)
    returning id into new_entity;

    if app.entity_type = 'business' then
      insert into public.business_profiles (entity_id) values (new_entity);
    else
      insert into public.organisation_profiles (entity_id) values (new_entity);
    end if;

    insert into public.entity_memberships (entity_id, user_id, role, invited_by)
    values (new_entity, app.applicant_id, 'owner', reviewer);

    update public.entity_applications
    set status = 'approved', reviewer_id = reviewer, decision_reason = left(p_note, 2000),
        decided_at = now(), entity_id = new_entity
    where id = p_application;
    insert into public.application_events (application_id, actor_id, event, note)
    values (p_application, reviewer, 'approved', left(p_note, 2000));
    perform private.notify(app.applicant_id, 'verification.approved',
      app.proposed_name || ' is verified', 'Your workspace is ready.',
      '/workspace/' || new_entity::text);
  else
    raise exception 'Unknown action' using errcode = '22023';
  end if;

  perform private.write_audit('verification.' || p_action, 'entity_applications',
    p_application::text,
    jsonb_build_object('note', left(p_note, 500), 'entity_id', new_entity),
    app.community_id);
  return new_entity;
end;
$$;


create or replace function public.fast_track_entity_application(p_application uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  app public.entity_applications%rowtype;
  uid uuid := (select auth.uid());
  new_entity uuid;
begin
  select * into app from public.entity_applications where id = p_application for update;
  if not found then
    raise exception 'Application not found' using errcode = 'P0002';
  end if;
  -- Only a platform owner, and only for their OWN application. Owners already
  -- hold every permission, so independent review adds no extra assurance.
  if app.applicant_id <> uid or not private.has_permission('platform.owner') then
    raise exception 'Not permitted' using errcode = '42501';
  end if;
  if app.status not in ('submitted', 'under_review', 'info_requested') then
    raise exception 'Application has already been decided' using errcode = '22023';
  end if;

  insert into public.entities (
    entity_type, name, slug, description, sector, community_id, address, phone, email,
    whatsapp, website, social_links, latitude, longitude, verified_by)
  values (
    app.entity_type, app.proposed_name, private.unique_slug('public.entities', app.proposed_name),
    app.description, app.sector, app.community_id, app.address, app.contact_phone, app.contact_email,
    app.whatsapp, app.website, app.social_links, app.latitude, app.longitude, uid)
  returning id into new_entity;

  if app.entity_type = 'business' then
    insert into public.business_profiles (entity_id) values (new_entity);
  else
    insert into public.organisation_profiles (entity_id) values (new_entity);
  end if;
  insert into public.entity_memberships (entity_id, user_id, role, invited_by)
  values (new_entity, uid, 'owner', uid);

  update public.entity_applications
  set status = 'approved', reviewer_id = uid, decided_at = now(), entity_id = new_entity,
      decision_reason = 'Set up directly by a platform owner'
  where id = p_application;
  insert into public.application_events (application_id, actor_id, event, note)
  values (p_application, uid, 'approved', 'Set up directly by a platform owner');

  perform private.write_audit('verification.owner_fast_track', 'entity_applications', p_application::text,
    jsonb_build_object('entity_id', new_entity, 'name', app.proposed_name), app.community_id);
  return new_entity;
end;
$$;
