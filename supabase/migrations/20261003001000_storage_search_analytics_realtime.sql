-- =============================================================================
-- BridgeConnect · 0010 · Storage, search, analytics, realtime
-- =============================================================================

create or replace function private.try_uuid(value text)
returns uuid
language plpgsql
immutable
set search_path = ''
as $$
begin
  return value::uuid;
exception when invalid_text_representation then
  return null;
end;
$$;
grant execute on function private.try_uuid(text) to anon, authenticated;

-- -----------------------------------------------------------------------------
-- Storage buckets. Size and MIME limits are enforced by Storage itself; the
-- application validates again before upload, and RLS below scopes paths.
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('public-media', 'public-media', true, 5242880,
   array['image/jpeg', 'image/png', 'image/webp']),
  ('verification-documents', 'verification-documents', false, 10485760,
   array['application/pdf', 'image/jpeg', 'image/png', 'image/webp']),
  ('job-applications', 'job-applications', false, 5242880,
   array['application/pdf'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- public-media: users/{uid}/... or entities/{entity_id}/...
create policy "Public media is readable"
  on storage.objects for select to anon, authenticated
  using (bucket_id = 'public-media');

create policy "Users upload to their media folder"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'public-media' and private.is_active_user()
    and (
      ((storage.foldername(name))[1] = 'users'
        and (storage.foldername(name))[2] = (select auth.uid())::text)
      or ((storage.foldername(name))[1] = 'entities'
        and private.entity_can(private.try_uuid((storage.foldername(name))[2]), 'media', 'editor'))
    )
  );

create policy "Users delete from their media folder"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'public-media'
    and (
      ((storage.foldername(name))[1] = 'users'
        and (storage.foldername(name))[2] = (select auth.uid())::text)
      or ((storage.foldername(name))[1] = 'entities'
        and private.entity_can(private.try_uuid((storage.foldername(name))[2]), 'media', 'editor'))
    )
  );

-- verification-documents: {applicant_id}/{application_id}/{file}
create policy "Applicants upload verification documents"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'verification-documents'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and exists (
      select 1 from public.entity_applications a
      where a.id = private.try_uuid((storage.foldername(name))[2])
        and a.applicant_id = (select auth.uid())
        and a.status in ('submitted', 'info_requested')
    )
  );

create policy "Applicants and reviewers read verification documents"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'verification-documents'
    and exists (
      select 1 from public.entity_applications a
      where a.id = private.try_uuid((storage.foldername(name))[2])
        and (
          (a.applicant_id = (select auth.uid()) and (storage.foldername(name))[1] = (select auth.uid())::text)
          or private.has_permission('entities.verify', a.community_id)
        )
    )
  );

create policy "Applicants delete documents from open applications"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'verification-documents'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and exists (
      select 1 from public.entity_applications a
      where a.id = private.try_uuid((storage.foldername(name))[2])
        and a.applicant_id = (select auth.uid())
        and a.status in ('submitted', 'info_requested')
    )
  );

-- job-applications: {applicant_id}/{job_id}/{file}
create policy "Applicants upload CVs"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'job-applications'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and exists (select 1 from public.jobs j
                where j.id = private.try_uuid((storage.foldername(name))[2]) and j.status = 'open')
  );

create policy "Applicants and employers read CVs"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'job-applications'
    and (
      (storage.foldername(name))[1] = (select auth.uid())::text
      or exists (
        select 1 from public.job_applications ja
        join public.jobs j on j.id = ja.job_id
        where ja.cv_path = name
          and private.entity_can(j.entity_id, 'jobs', 'editor')
      )
    )
  );

-- -----------------------------------------------------------------------------
-- Unified search (SECURITY INVOKER: RLS decides what each caller may see)
-- -----------------------------------------------------------------------------
create or replace function public.search_directory(
  p_query text,
  p_community uuid default null,
  p_kinds text[] default null,
  p_limit int default 30
)
returns table (
  kind text,
  id uuid,
  title text,
  subtitle text,
  slug text,
  community_id uuid,
  rank real
)
language sql
stable
security invoker
set search_path = ''
as $$
  with q as (
    select websearch_to_tsquery('simple', p_query) as tsq,
           trim(p_query) as raw
  ),
  results as (
    select 'entity'::text as kind, e.id, e.name as title, e.tagline as subtitle, e.slug, e.community_id,
           ts_rank(e.search, q.tsq) + extensions.similarity(e.name, q.raw) as rank
    from public.entities e, q
    where e.status = 'active' and (e.search @@ q.tsq or e.name operator(extensions.%) q.raw)
    union all
    select 'product', p.id, p.name, left(p.description, 140), p.slug, en.community_id,
           ts_rank(p.search, q.tsq) + extensions.similarity(p.name, q.raw)
    from public.products p join public.entities en on en.id = p.entity_id, q
    where p.status in ('active', 'out_of_stock') and (p.search @@ q.tsq or p.name operator(extensions.%) q.raw)
    union all
    select 'service', s.id, s.name, left(s.description, 140), s.slug, en.community_id,
           ts_rank(s.search, q.tsq) + extensions.similarity(s.name, q.raw)
    from public.services s join public.entities en on en.id = s.entity_id, q
    where s.status = 'active' and (s.search @@ q.tsq or s.name operator(extensions.%) q.raw)
    union all
    select 'job', j.id, j.title, left(j.description, 140), j.slug, j.community_id,
           ts_rank(j.search, q.tsq) + extensions.similarity(j.title, q.raw)
    from public.jobs j, q
    where j.status = 'open' and (j.search @@ q.tsq or j.title operator(extensions.%) q.raw)
    union all
    select 'event', ev.id, ev.title, ev.venue, ev.slug, ev.community_id,
           ts_rank(ev.search, q.tsq) + extensions.similarity(ev.title, q.raw)
    from public.events ev, q
    where ev.status = 'published' and ev.starts_at > now() - interval '1 day'
      and (ev.search @@ q.tsq or ev.title operator(extensions.%) q.raw)
    union all
    select 'post', po.id, coalesce(po.title, left(po.body, 80)), left(po.body, 140), null, po.community_id,
           ts_rank(po.search, q.tsq)
    from public.posts po, q
    where po.status = 'published' and po.search @@ q.tsq
  )
  select r.kind, r.id, r.title, r.subtitle, r.slug, r.community_id, r.rank::real
  from results r
  where char_length(trim(p_query)) >= 2
    and (p_kinds is null or r.kind = any (p_kinds))
  order by (p_community is not null and r.community_id = p_community) desc, r.rank desc
  limit least(greatest(p_limit, 1), 50);
$$;
grant execute on function public.search_directory(text, uuid, text[], int) to anon, authenticated;

-- -----------------------------------------------------------------------------
-- Analytics
-- -----------------------------------------------------------------------------
create or replace function public.admin_platform_stats(
  p_region uuid default null,
  p_district uuid default null,
  p_community uuid default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  result jsonb;
begin
  if num_nonnulls(p_region, p_district, p_community) > 1 then
    raise exception 'Specify at most one scope' using errcode = '22023';
  end if;
  if not private.has_permission('analytics.read', p_community, p_district, p_region) then
    raise exception 'Not permitted' using errcode = '42501';
  end if;

  with scoped_communities as (
    select c.id from public.communities c
    join public.districts d on d.id = c.district_id
    where (p_community is null or c.id = p_community)
      and (p_district is null or c.district_id = p_district)
      and (p_region is null or d.region_id = p_region)
  ),
  days as (
    select generate_series(current_date - 29, current_date, interval '1 day')::date as day
  )
  select jsonb_build_object(
    'residents', (select count(*) from public.profiles p
                  where p.account_status = 'active'
                    and (num_nonnulls(p_region, p_district, p_community) = 0
                         or p.home_community_id in (select id from scoped_communities))),
    'entities_by_type', coalesce((select jsonb_object_agg(entity_type, n) from (
        select e.entity_type, count(*) n from public.entities e
        where e.status = 'active' and e.community_id in (select id from scoped_communities)
        group by e.entity_type) t), '{}'::jsonb),
    'pending_applications', (select count(*) from public.entity_applications a
        where a.status in ('submitted', 'under_review', 'info_requested')
          and a.community_id in (select id from scoped_communities)),
    'open_reports', (select count(*) from public.reports r
        where r.status in ('open', 'reviewing')
          and (r.community_id in (select id from scoped_communities)
               or (r.community_id is null and num_nonnulls(p_region, p_district, p_community) = 0))),
    'active_products', (select count(*) from public.products p
        join public.entities e on e.id = p.entity_id
        where p.status = 'active' and e.community_id in (select id from scoped_communities)),
    'open_jobs', (select count(*) from public.jobs j
        where j.status = 'open' and j.community_id in (select id from scoped_communities)),
    'upcoming_events', (select count(*) from public.events ev
        where ev.status = 'published' and ev.starts_at > now()
          and ev.community_id in (select id from scoped_communities)),
    'orders_30d', (select count(*) from public.orders o
        join public.entities e on e.id = o.entity_id
        where o.created_at > now() - interval '30 days'
          and e.community_id in (select id from scoped_communities)),
    'active_alerts', (select count(*) from public.emergency_alerts a
        where a.status = 'active' and (a.expires_at is null or a.expires_at > now())),
    'pending_ads', (select count(*) from public.advertisements ad
        join public.entities e on e.id = ad.entity_id
        where ad.status = 'pending_review' and e.community_id in (select id from scoped_communities)),
    'daily', (select jsonb_agg(jsonb_build_object(
        'day', d.day,
        'signups', (select count(*) from public.profiles p where p.created_at::date = d.day
                    and (num_nonnulls(p_region, p_district, p_community) = 0
                         or p.home_community_id in (select id from scoped_communities))),
        'posts', (select count(*) from public.posts po where po.created_at::date = d.day
                  and po.community_id in (select id from scoped_communities)),
        'orders', (select count(*) from public.orders o join public.entities e on e.id = o.entity_id
                   where o.created_at::date = d.day and e.community_id in (select id from scoped_communities))
      ) order by d.day) from days d)
  ) into result;
  return result;
end;
$$;

create or replace function public.entity_analytics(p_entity uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not private.entity_can(p_entity, 'analytics', 'manager') then
    raise exception 'Not permitted' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'favourites', (select count(*) from public.favourites where entity_id = p_entity),
    'products_active', (select count(*) from public.products where entity_id = p_entity and status = 'active'),
    'orders_by_status', coalesce((select jsonb_object_agg(status, n) from (
        select status, count(*) n from public.orders where entity_id = p_entity group by status) t), '{}'::jsonb),
    'revenue_30d', coalesce((select sum(subtotal) from public.orders
        where entity_id = p_entity and status = 'completed' and created_at > now() - interval '30 days'), 0),
    'job_applications', (select count(*) from public.job_applications ja
        join public.jobs j on j.id = ja.job_id where j.entity_id = p_entity),
    'event_rsvps', (select coalesce(sum(going_count), 0) from public.events where entity_id = p_entity),
    'post_reactions', (select coalesce(sum(reaction_count), 0) from public.posts where entity_id = p_entity),
    'ad_clicks', (select coalesce(sum(clicks), 0) from public.advertisements where entity_id = p_entity),
    'daily_orders', (select jsonb_agg(jsonb_build_object('day', d.day, 'orders',
        (select count(*) from public.orders o where o.entity_id = p_entity and o.created_at::date = d.day))
        order by d.day)
      from (select generate_series(current_date - 29, current_date, interval '1 day')::date as day) d)
  );
end;
$$;

revoke all on function public.admin_platform_stats(uuid, uuid, uuid) from public, anon;
revoke all on function public.entity_analytics(uuid) from public, anon;
grant execute on function public.admin_platform_stats(uuid, uuid, uuid) to authenticated;
grant execute on function public.entity_analytics(uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- Realtime: only where it adds real value — live notification badges and
-- emergency alerts. RLS applies to Realtime postgres_changes subscriptions.
-- -----------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.notifications;
    alter publication supabase_realtime add table public.emergency_alerts;
  end if;
end;
$$;
